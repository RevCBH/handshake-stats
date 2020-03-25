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
        this.logger.debug('open called')

        const genesisEntry = await this.chain.getEntryByHeight(0)
        const genesisHash = genesisEntry.hash.toString('hex')
        try {
            await this.db.getBlockStatsByHash(genesisHash)
        } catch (err) {
            if (err instanceof db.MissingBlockError) {
                await this.handleNewBlock(
                    await this.chain.getBlock(genesisEntry.hash),
                    genesisEntry
                )
            }
            else {
                throw err
            }
        }

        this.chain.on('block', this.handleNewBlock.bind(this))

        this.httpServer = api.init(this.logger, this.db).listen(this.config.uint('port', 8080))
    }

    async handleNewBlock(block: hsd.Block, entry: hsd.ChainEntry): Promise<void> {
        this.logger.info('got block', block.hashHex(), 'at time', block.time)
        try {
            let stats = await this.calcBlockStats(block)
            stats.onwinningchain = entry.height === 0 // the genesis block is always on the winning chain
            this.db.insertBlockStats(stats)
            this.logger.debug('Queued block for insertion', block.hashHex())
        } catch (e) {
            this.logger.error('Failed to queue block for insert', block.hashHex())
            console.error(e)
        }
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