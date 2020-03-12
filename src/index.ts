'use strict';

import * as pg from 'pg'
import assert from 'assert'
import * as api from './api'
import * as hsd from './hsd_types'
import { EventEmitter } from 'events';
import * as http from 'http'


interface BlockStats {
    issuance: number
    fees: number
}

function blockInsertSql(block: hsd.Block, stats: BlockStats): string {
    return `
        INSERT INTO blocks (hash, prevHash, time, issuance, fees)
        VALUES (
            '${block.hashHex()}', 
            '${block.prevBlock.toString('hex')}',
            to_timestamp(${block.time}),
            ${stats.issuance},
            ${stats.fees}
        )
    `
}

function blockExistsSql(block: hsd.Block): string {
    return `
        SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = '${block.hashHex()}');
    `
}

class Plugin extends EventEmitter implements api.Query {
    logger: hsd.LoggerContext
    db: pg.Client
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

        this.db = new pg.Client({
            host: 'localhost',
            user: 'namebase-stats',
            password: 'test123',
            database: 'postgres',
        })
    }

    async insertBlock(block: hsd.Block) {
        let stats = await this.getBlockStats(block)
        await this.db.query(blockInsertSql(block, stats))
        let prevBlock = await this.chain.getBlock(block.prevBlock)
        if (prevBlock != null) {
            if (!await this.isBlockInDb(prevBlock)) {
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

    async isBlockInDb(block: hsd.Block): Promise<boolean> {
        let result = await this.db.query(blockExistsSql(block))
        return result.rows[0].exists == true
    }

    async getBlockStats(block: hsd.Block): Promise<BlockStats> {
        let view = await this.chain.getBlockView(block)
        let issuance = 0;
        let fees = 0;
        block.txs.forEach(tx => {
            if (tx.isCoinbase()) {
                issuance += tx.getOutputValue();
            } else {
                fees += tx.getFee(view)
            }
        })
        return {
            issuance: issuance,
            fees: fees
        };
    }

    async open() {
        console.log('namebase-stats open called')

        await this.db.connect()
        console.log('namebase-stats: db connected')

        this.chain.on('block', (block: hsd.Block) => {
            console.log('namebase-stats got block', block.hashHex(), 'at time', block.time)
            this.insertBlock(block).catch(e => {
                console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                console.error(e)
            })
        })

        // TODO - make port configurable
        this.httpServer = api.init(this).listen(8080)
    }

    async close() {
        await this.httpServer?.close();
        await this.db.end()
    }

    async getIssuance(bucketSize: string): Promise<api.Bucket[]> {
        let result = await this.db.query(`
            SELECT time_bucket('${bucketSize}', time) AS label, sum(issuance - fees) AS value
            FROM blocks
            GROUP BY label
            ORDER BY label ASC
        `)
        return result.rows.map(r => {
            return new api.Bucket(r.label, r.value)
        })
    }
}

export const id = 'namebase-stats'

export function init(node: hsd.Node) {
    return new Plugin(node);
}