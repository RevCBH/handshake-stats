'use strict';

// import hsd = require('hsd')
import * as pg from 'pg'

interface Logger {
    error: (msg: string) => void
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
    logger: Logger
    db: pg.Client
    node: HsdNode
    chain: Chain

    constructor(node: HsdNode) {
        this.node = node
        this.logger = node.logger
        this.chain = node.get('chain')

        console.log('namebase-stats connecting to: %s', node.network)

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