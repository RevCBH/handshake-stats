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

        this.db = db.init(this.logger)
    }

    async insertBlock(block: hsd.Block): Promise<void> {
        let stats = await this.getBlockStats(block)
        this.db.insertBlockStats(stats)
        this.logger.debug('Queued block for insertion', block.hashHex())
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
            numrunning: 0
        }
    }

    async getBlockStats(block: hsd.Block): Promise<api.BlockStats> {
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

        this.chain.on('block', (block: hsd.Block) => {
            this.logger.info('got block', block.hashHex(), 'at time', block.time)
            this.insertBlock(block).catch(e => {
                this.logger.error('Failed to queue block for insert', block.hashHex())
                console.error(e)
            })
        })

        // TODO - make port configurable
        this.httpServer = api.init(this.logger, this.db).listen(8080)
    }

    async close() {
        await this.httpServer?.close()
        await this.db.close()
    }
}

export const id = 'handshake-stats'

export function init(node: hsd.Node) {
    return new Plugin(node);
}