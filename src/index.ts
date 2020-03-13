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
        await this.db.insertBlockStats(stats)

        let prevBlock = await this.chain.getBlock(block.prevBlock)
        if (prevBlock != null) {
            if (!await this.db.blockExists(prevBlock.hashHex())) {
                console.log(`namebase-stats: Inserting missing block ${block.hashHex()}`)
                setImmediate(() => this.insertBlock(prevBlock).catch(e => {
                    this.emit('error', `namebase-stats: Failed to insert block ${block.hashHex()}`)
                    console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                    console.error(e)
                }))
            }
        }

        console.log(`namebase-stats: Inserted block ${block.hashHex()}`)
    }

    async getBlockStats(block: hsd.Block): Promise<db.BlockStats> {

        let view = await this.chain.getBlockView(block)
        let result = {
            hash: block.hashHex(),
            prevhash: block.prevBlock.toString('hex'),
            time: block.time,
            issuance: 0,
            fees: 0,
            numAirdrops: 0,
            airdropAmt: 0,
            opens: 0
        }

        result.fees =
            block.txs[0].outputs[0].value - consensus.getReward(block.getCoinbaseHeight(), this.node.network.halvingInterval)

        block.txs.forEach(tx => {
            if (tx.isCoinbase()) {
                result.issuance += tx.getOutputValue()

                tx.outputs.slice(1).forEach(output => {
                    result.numAirdrops += 1
                    result.airdropAmt += output.value
                })
            } else {
                tx.outputs.forEach(output => {
                    if (output.covenant.isOpen()) {
                        result.opens += 1
                    }
                })
            }
        })

        return result;
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