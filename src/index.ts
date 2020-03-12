'use strict';

import * as pg from 'pg'
import assert from 'assert'

interface Logger {
    context: (module: string) => LoggerContext
}

interface LoggerContext {
    error: (msg: string) => void
    info: (msg: string) => void
    open: () => void
}

interface HsdNode {
    logger: Logger
    network: string
    get: (propname: 'chain') => Chain
    on: (msg: string, cb: Function) => void
}

interface Block {
    hash: () => Hash
    hashHex: () => string
    prevBlock: Hash
    time: number
    txs: [TX]
}

type Hash = Buffer

interface TX {
    inputs: [Input]
    outputs: [Output]
    isCoinbase: () => boolean
    getOutputValue: () => number
    getFee: (view: CoinView) => number
}

interface Input {
}

interface Output {
    value: number
    address: Address
    covenant: Covenant
}

interface Address { }
interface Covenant { }

interface Chain {
    on: (msg: 'block', handler: (block: Block) => void) => void
    getBlock: (hash: Hash) => Promise<Block>
    getBlockView: (block: Block) => Promise<CoinView>
}

interface CoinView { }

interface BlockStats {
    issuance: number
    fees: number
}

function blockInsertSql(block: Block, stats: BlockStats): string {
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

function blockExistsSql(block: Block): string {
    return `
        SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = '${block.hashHex()}');
    `
}

class Plugin {
    logger: LoggerContext
    db: pg.Client
    node: HsdNode
    chain: Chain

    constructor(node: HsdNode) {
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

    async insertBlock(block: Block) {
        let stats = await this.getBlockStats(block)
        await this.db.query(blockInsertSql(block, stats))
        let prevBlock = await this.chain.getBlock(block.prevBlock)
        if (prevBlock != null) {
            if (!await this.isBlockInDb(prevBlock)) {
                console.log(`namebase-stats: Inserting missing block ${block.hashHex()}`)
                setImmediate(() => this.insertBlock(prevBlock).catch(e => {
                    console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                    console.error(e)
                }))
            }
        }

        console.log(`namebase-stats: Inserted block ${block.hashHex()}`)
    }

    async isBlockInDb(block: Block): Promise<boolean> {
        let result = await this.db.query(blockExistsSql(block))
        return result.rows[0].exists == true
    }

    async getBlockStats(block: Block): Promise<BlockStats> {
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

        this.chain.on('block', (block: Block) => {
            console.log('namebase-stats got block', block.hashHex(), 'at time', block.time)
            this.insertBlock(block).catch(e => {
                console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                console.error(e)
            })
        })
    }

    async close() {
        await this.db.end()
    }
}

export const id = 'namebase-stats'

export function init(node: HsdNode) {
    return new Plugin(node);
}