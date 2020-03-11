'use strict';

// import hsd = require('hsd')
import * as pg from 'pg'
import assert from 'assert'
const Logger = require('blgr')

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
    txs: [Tx]
}

type Hash = Buffer

interface Tx {
    inputs: [Input]
    outputs: [Output]
    isCoinbase: () => boolean
    getOutputValue: () => number
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
}

// const pool = new pg.Pool({
//     user: 'namebase-stats',
//     host: 'localhost',
//     database: 'postgres',
//     password: 'test123'
// })

function blockIssuance(block: Block): number {
    let total = 0;
    block.txs.forEach(tx => {
        if (tx.isCoinbase()) {
            total += tx.getOutputValue();
        }
    })
    return total;
}

function blockInsertSql(block: Block): string {
    return `
        INSERT INTO blocks (hash, prevHash, createdAt, issuance) 
        VALUES (
            '${block.hashHex()}', 
            '${block.prevBlock.toString('hex')}',
            ${block.time},
            ${blockIssuance(block)}
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
        await this.db.query(blockInsertSql(block))
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

    isBlockInDb(block: Block): Promise<boolean> {
        return this.db.query(blockExistsSql(block)).then(result =>
            result.rows[0].exists == true
        )
    }

    async open() {
        console.log('namebase-stats open called')

        await this.db.connect()
        console.log('namebase-stats: db connected')

        // let genisisBlock = await this.chain.getBlock(Buffer.from('5b6ef2d3c1f3cdcadfd9a030ba1811efdd17740f14e166489760741d075992e0', 'hex'))
        // console.log(genisisBlock)
        // await this.insertBlock(genisisBlock)
        // throw null;

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