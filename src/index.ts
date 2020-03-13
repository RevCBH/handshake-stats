'use strict';

import * as pg from 'pg'
import assert from 'assert'
import * as api from './api'
import * as hsd from './hsd_types'
import { EventEmitter } from 'events';
import * as http from 'http'
import * as db from './db'
const consensus = require("hsd/lib/protocol/consensus")

class Plugin extends EventEmitter {
    logger: hsd.LoggerContext
    db: db.Client
    node: hsd.Node
    chain: hsd.Chain
    httpServer: http.Server | undefined

    constructor(node: hsd.Node) {
        super();

        this.node = node
        assert(typeof node.logger === 'object')
        this.logger = node.logger.context("stats")
        this.chain = node.get('chain')

        // TODO - figure out why logger output isn't working
        console.log('namebase-stats connecting to: %s', node.network)
        // this.logger.error(`namebase-stats connecting to: ${node.network}`)

        this.db = db.init()
    }

    async insertBlock(block: hsd.Block) {
        let stats = await this.getBlockStats(block)
        this.db.insertBlockStats(stats)

        // let prevBlock = await this.chain.getBlock(block.prevBlock)
        // if (prevBlock != null) {
        //     if (!await this.db.blockExists(prevBlock.hashHex())) {
        //         console.log(`namebase-stats: Inserting missing block ${block.hashHex()}`)
        //         setImmediate(() => this.insertBlock(prevBlock).catch(e => {
        //             this.emit('error', `namebase-stats: Failed to insert block ${block.hashHex()}`)
        //             console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
        //             console.error(e)
        //         }))
        //     }
        // }

        console.log(`namebase-stats: Inserted block ${block.hashHex()}`)
    }

    async basicBlockStats(block: hsd.Block): Promise<db.BlockStats> {
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
            // opens: [],
            numopens: 0,
            numrunning: 0
        }
    }

    getOpenStats(block: hsd.Block) {
        let results: db.OpenStats[] = []
        block.txs.forEach(tx => {
            tx.outputs.filter(o => o.covenant.isOpen())
                .forEach(o => {
                    let name = o.covenant.items[2]
                    if (Buffer.isBuffer(name)) {
                        name = name.toString('ascii')
                    }
                    results.push({ name: name })
                })
        })

        return results
    }

    async getBlockStats(block: hsd.Block): Promise<db.BlockStats> {

        // let view = await this.chain.getBlockView(block)
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
                        // let name = output.covenant.items[2]
                        // if (Buffer.isBuffer(name)) {
                        //     name = name.toString('ascii')
                        // }
                        // stats.opens.push({
                        //     name: name
                        // })
                    }
                })
            }
        })

        // console.log("namebase-stats current block opens:", stats.opens)
        // let expiringEntry = await this.chain.getEntryByHeight(stats.height - NUM_BLOCKS_AUCTION_IS_OPEN)
        // if (expiringEntry !== null) {
        //     let expiringAuctionsBlock = await this.chain.getBlock(expiringEntry.hash)
        //     // TODO - unify with logic above, cleanup
        //     let closingAuctions = this.getOpenStats(expiringAuctionsBlock)
        //     stats.numcloses = closingAuctions.length
        //     console.log("namebase-stats current block closes:", closingAuctions)
        // }

        return stats;
    }

    async open() {
        console.log('namebase-stats open called')

        this.chain.on('block', (block: hsd.Block) => {
            console.log('namebase-stats got block', block.hashHex(), 'at time', block.time)
            this.insertBlock(block).catch(e => {
                console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                console.error(e)
            })
        })

        // TODO - make port configurable
        this.httpServer = api.init(this.db).listen(8080)
    }

    async close() {
        await this.httpServer?.close()
        await this.db.close()
    }
}

export const id = 'namebase-stats'

export function init(node: hsd.Node) {
    return new Plugin(node);
}