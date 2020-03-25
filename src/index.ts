'use strict';

import assert from 'assert'
import * as api from './api'
import * as hsd from './hsd_types'
import { EventEmitter } from 'events';
import * as http from 'http'
import * as db from './db'
import { connect } from 'http2';
const consensus = require("hsd/lib/protocol/consensus")

export class Plugin extends EventEmitter {
    logger: hsd.LoggerContext
    db: db.Client
    node: hsd.Node
    chain: hsd.Chain
    config: hsd.Config
    httpServer: http.Server | undefined

    constructor(node: hsd.Node) {
        super();

        this.node = node
        assert(typeof node.logger === 'object')
        this.logger = node.logger.context("stats")
        this.config = node.config.filter("stats")
        this.chain = node.get('chain')

        this.db = db.init({
            logger: this.logger,
            connectionString: this.config.str('connection-string', 'postgres://handshake-stats:test123@localhost/postgres')
        })
    }

    async basicBlockStats(block: hsd.Block): Promise<api.BlockStats> {
        let height = await this.chain.getHeight(block.hash())
        return {
            hash: block.hashHex(),
            prevhash: block.prevBlock.toString('hex'),
            time: block.time,
            height: height,
            issuance: 0,
            fees: 0,
            numAirdrops: 0,
            airdropAmt: 0,
            numopens: 0,
            numrunning: 0,
            onwinningchain: false
        }
    }

    async calcBlockStats(block: hsd.Block): Promise<api.BlockStats> {
        let stats = await this.basicBlockStats(block)

        stats.fees =
            block.txs[0].outputs[0].value - consensus.getReward(stats.height, this.node.network.halvingInterval)

        block.txs.forEach(tx => {
            if (tx.isCoinbase()) {
                stats.issuance += tx.getOutputValue()

                tx.outputs.slice(1).forEach(output => {
                    stats.numAirdrops += 1
                    stats.airdropAmt += output.value
                })
            } else {
                tx.outputs.forEach(output => {
                    if (output.covenant.isOpen()) {
                        stats.numopens += 1
                    }
                })
            }
        })

        return stats;
    }

    async open() {
        await this.catchUpWithChain()

        // TODO - track the created promises and ensure that we don't
        //        exit before handling them, if possible
        this.chain.on('block', this.handleNewBlock.bind(this))

        this.httpServer = api.init(this.logger, this.db).listen(this.config.uint('port', 8080))
    }

    /* The plan - check our DB's chain height vs the node's chain height.
     * If we're behind, catch up, and queue incoming blocks. In theory, this
     * let's us blow away the DB and rebuild from scratch. It's more practically
     * useful if the sync gets interrupted on the first run.
     */
    async catchUpWithChain(): Promise<void> {
        const dbChainHeight = await this.db.getChainHeight()
        const nodeChainHeight = this.chain.height

        if (dbChainHeight < nodeChainHeight) {
            this.logger.info(`DB is ${nodeChainHeight - dbChainHeight} blocks behind. Catching up.`)
            // TODO - track the created promises and ensure that we don't
            //        exit before handling them, if possible
            const inboundQueue: api.BlockStats[] = []
            const pushItem = async (block: hsd.Block) => {
                let stats = await this.calcBlockStats(block)
                inboundQueue.push(stats)
            }
            this.chain.on('block', pushItem)

            for (let i = dbChainHeight + 1; i < nodeChainHeight; i++) {
                const entry = await this.chain.getEntryByHeight(i)
                const block = await this.chain.getBlock(entry.hash)
                const stats = await this.calcBlockStats(block)
                this.db.insertBlockStats(stats)
            }

            this.chain.removeListener('block', pushItem)
            inboundQueue.forEach(stats => this.db.insertBlockStats(stats))
        }
    }

    async handleNewBlock(block: hsd.Block, entry: hsd.ChainEntry): Promise<void> {
        this.logger.info('got block', block.hashHex(), 'at time', block.time)

        try {
            const prevHash = block.prevBlock.toString('hex')
            if (!await this.db.blockExists(prevHash)) {
                await this.catchUpWithChain()
            }

            const dbTipHash = await this.db.getChainTipHash()
            if (dbTipHash != prevHash) {
                await this.reorganize(dbTipHash, prevHash)
            }

            const stats = await this.calcBlockStats(block)
            this.db.insertBlockStats(stats)
        } catch (e) {
            this.logger.error('Failed to queue block for insert', block.hashHex())
            console.error(e)
        }
    }

    async reorganize(oldTipHash: string, newTipHash: string): Promise<void> {
        this.logger.warning(`Preparing to handle a reorg from current tip ${oldTipHash} to new tip ${newTipHash}`)
        const oldTip = await this.chain.getEntry(Buffer.from(oldTipHash, 'hex'))
        const newTip = await this.chain.getEntry(Buffer.from(newTipHash, 'hex'))
        const forkPoint = await this.chain.findFork(oldTip, newTip)
        this.logger.debug("fork point:", forkPoint)

        // Disconnect old blocks on the way down
        let currentEntry = oldTip;
        while (!currentEntry.hash.equals(forkPoint.hash)) {
            let currentHash = currentEntry.hash.toString('hex')
            this.logger.debug("disconnecting block at:", currentHash)
            await this.db.disconnectBlock(currentHash)
            this.logger.debug("disconnect successful")
            currentEntry = await this.chain.getPrevious(currentEntry)
        }
        this.logger.debug("disconnects complete")

        // Find all the new blocks
        const toConnect = []
        currentEntry = newTip;
        while (!currentEntry.hash.equals(forkPoint.hash)) {
            toConnect.push(currentEntry)
            currentEntry = await this.chain.getPrevious(currentEntry)
        }
        this.logger.debug("finished scanning blocks to connect")

        // Connect or insert them on the way up (so they're connected)
        while (toConnect.length > 0) {
            const next = toConnect.pop()
            if (next) {
                const nextHash = next.hash.toString('hex')
                if (await this.db.blockExists(nextHash)) {
                    await this.db.connectBlock(nextHash)
                } else {
                    const nextBlock = await this.chain.getBlock(Buffer.from(nextHash, 'hex'))
                    const stats = await this.calcBlockStats(nextBlock)
                    this.db.insertBlockStats(stats)
                }
            }
        }

        this.logger.info("Reorg complete")
    }

    async handleDisconnect(entry: hsd.ChainEntry): Promise<void> {
        this.db.disconnectBlock(entry.hash.toString('hex'))
    }

    async close() {
        await this.httpServer?.close()
        await this.db.close()
    }
}

export const id = 'handshake-stats'

export function init(node: hsd.Node): Plugin {
    return new Plugin(node);
}