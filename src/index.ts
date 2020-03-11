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
    logger: Logger,
    network: string,
    get: (propname: 'chain') => Chain,
    on: (msg: string, cb: Function) => void
}

interface Block {
    hashHex: () => string
}

interface Chain {
    on: (msg: 'block', handler: (block: Block) => void) => void
}

// const pool = new pg.Pool({
//     user: 'namebase-stats',
//     host: 'localhost',
//     database: 'postgres',
//     password: 'test123'
// })

class Plugin {
    logger: LoggerContext
    db: pg.Client
    node: HsdNode
    chain: Chain

    constructor(node: HsdNode) {
        this.node = node
        assert(typeof node.logger === 'object')
        // this.logger = node.logger.context("stats")
        this.logger = Logger.global.context("stats")
        this.chain = node.get('chain')

        this.logger.open()
        console.log('node.logger:', node.logger)
        console.log('this.logger:', this.logger)
        console.log('namebase-stats connecting to: %s', node.network)
        // this.logger.error(`namebase-stats connecting to: ${node.network}`)
        throw null;

        this.db = new pg.Client({
            host: 'localhost',
            user: 'namebase-stats',
            password: 'test123',
            database: 'postgres',
        })
    }

    async open() {
        console.log('namebase-stats open called')

        await this.db.connect()
        let chain = this.node.get('chain')
        chain.on('block', (block: Block) => {
            console.log('namebase-stats got block:', block)
            this.db.query(`INSERT INTO blocks (hash) VALUES ('${block.hashHex()}')`)
                .then(_ => console.log(`namebase-stats: Inserted block ${block.hashHex()}`))
                .catch(e => {
                    console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                    console.error(e)
                })
        })

        console.log('namebase-stats db connected')
    }
}

export const id = 'namebase-stats'

export function init(node: HsdNode) {
    return new Plugin(node);
}