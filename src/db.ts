import * as api from './api'
import { sql, DatabasePoolConnectionType, createPool, DatabasePoolType } from 'slonik';
import { Block } from './hsd_types';
import { Stats } from 'fs';
import { Pool } from 'pg';

export interface OpenStats {
    name: string
}

export interface BlockStats {
    hash: string
    prevhash: string
    time: number
    height: number
    issuance: number
    fees: number
    numAirdrops: number
    airdropAmt: number
    numopens: number
    // numcloses: number
    numrunning: number
}

// TODO - verify this math is correct
export const NUM_BLOCKS_AUCTION_IS_OPEN = 37 + 720 + 1440 // opening, bidding, revealing

export interface Client extends api.Query {
    insertBlockStats: (blockStats: BlockStats) => void
    blockExists: (blockHash: string) => Promise<boolean>
    close: () => Promise<void>
}

// type DbFunc<TArgs, TResult> = (connection: DatabasePoolConnectionType, args: TArgs) => Promise<TResult>

class DbRunner implements Client {
    pool: DatabasePoolType

    // to ensure ordered insertion, we work off a queue and use the
    // presence of insertExecutor as a lock
    blockQueue: BlockStats[]
    insertExecutor: Promise<void> | null

    constructor() {
        this.blockQueue = []
        this.insertExecutor = null
        this.pool = createPool('postgres://namebase-stats:test123@localhost/postgres')
    }

    // This takes an item 
    private async startWork(): Promise<void> {
        var item: BlockStats | undefined
        while (item = this.blockQueue.shift()) {
            await insertBlockStats(this.pool, item)
        }
        this.insertExecutor = null
    }

    async close() { await this.pool.end() }

    async blockExists(blockHash: string): Promise<boolean> {
        return this.pool.connect(async connection => {
            const result = await connection.oneFirst(sql`
            SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ${blockHash});
        `)

            // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
            return <boolean><unknown>result.valueOf()
        })
    }

    async timeseries(params: api.TimeseriesParams) {
        return this.pool.connect(async connection => {
            return await timeseries(connection, params)
        })
    }

    // This queues blocks to insert 1 at a time and avoid races
    // since we want to compute stats based on previous blocks
    // and that fails if it's not inserted yet
    insertBlockStats(blockStats: BlockStats) {

        // Queue a block to insert 
        this.blockQueue.push(blockStats)

        // If we're not currently pulling from the queue, start
        if (this.insertExecutor === null) {
            this.insertExecutor = this.startWork()
        }

        // Return a promise that resolves when the queue is empty
        // TODO - does this need to be more granular?
    }
}

export function init(): Client {
    return new DbRunner();
}

// export function init(): Client {
//     // TODO - make connection string configurable
//     const pool = createPool('postgres://namebase-stats:test123@localhost/postgres')

//     function withConnection<TArgs, TResult>(f: DbFunc<TArgs, TResult>): (args: TArgs) => Promise<TResult> {
//         return (args: TArgs) => {
//             return pool.connect(connection => {
//                 return f(connection, args)
//             })
//         }
//     }

//     return {
//         // close: async () => pool.end(),
//         insertBlockStats: (args) => insertBlockStats(pool, args),
//         blockExists: withConnection(blockExists),

//         // API queries
//         timeseries: withConnection(timeseries)
//     }
// }

async function insertBlockStats(pool: DatabasePoolType, blockStats: BlockStats): Promise<void> {
    // await pool.transaction(async txConnection => {
    //     // Insert new auctions
    //     for (let i = 0; i < blockStats.opens.length; i++) {
    //         const open = blockStats.opens[i]
    //         await txConnection.query(sql`
    //             INSERT INTO auctions (name, fromblock)
    //             VALUES (
    //                 ${open.name},
    //                 ${blockStats.height}
    //             )
    //         `)
    //     }
    // })

    await pool.transaction(async txConnection => {
        // Calculate running auctions at this block
        // TODO - consider doing this from chain data instead?
        // TODO - combine these two queries? Do the math in SQL?
        let lastNumRunning = await txConnection.maybeOne<{ numrunning: number }>(sql`
            SELECT numrunning FROM blocks WHERE height = ${blockStats.height} - 1;
        `)
        let expiring = await txConnection.maybeOne<{ numopens: number }>(sql`
            SELECT numopens FROM blocks WHERE height = ${blockStats.height - NUM_BLOCKS_AUCTION_IS_OPEN};
        `)

        console.log(`##### lastNumRunning:`, lastNumRunning)
        if (lastNumRunning != null) {
            blockStats.numrunning = lastNumRunning.numrunning;
        }

        if (expiring != null) {
            console.log(`##### expiring:`, expiring)
            blockStats.numrunning -= expiring.numopens
        }

        console.log("##### blockStats.numopens:", blockStats.numopens)
        blockStats.numrunning += blockStats.numopens

        console.log(`##### numrunning at ${blockStats.height}:`, blockStats.numrunning)

        // let numrunning = await txConnection.one<{ count: number }>(sql`
        //     SELECT count(1) FROM auctions WHERE fromblock > ${blockStats.height} - 2197 AND fromblock <= ${blockStats.height};
        // `)
        // console.log(`##### numrunning at ${blockStats.height}:`, numrunning)

        // Insert the full
        try {
            await txConnection.query(sql`
            INSERT INTO blocks (hash, prevHash, time, height, issuance, fees, numAirdrops, airdropAmt, numopens, numrunning)
            VALUES (
                ${blockStats.hash},
                ${blockStats.prevhash},
                to_timestamp(${blockStats.time}),
                ${blockStats.height},
                ${blockStats.issuance},
                ${blockStats.fees},
                ${blockStats.numAirdrops},
                ${blockStats.airdropAmt},
                ${blockStats.numopens},
                ${blockStats.numrunning}
            )
        `)
        }
        catch (e) {
            console.log("!!!!! error inserting:", e)
        }
    })
}

// async function blockExists(connection: DatabasePoolConnectionType, blockHash: string): Promise<boolean> {
//     const result = await connection.oneFirst(sql`
//         SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ${blockHash});
//     `)

//     // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
//     return <boolean><unknown>result.valueOf()
// }

async function timeseries(connection: DatabasePoolConnectionType, params: api.TimeseriesParams): Promise<api.Bucket[]> {
    var operation = sql``;
    var series = sql``
    switch (params.series) {
        case 'issuance':
            series = sql`issuance - fees`
            break
        case 'num-airdrops':
            series = sql`numAirdrops`
            break
        case 'airdrops':
            series = sql`airdropAmt`
            break
        case 'num-blocks':
            series = sql`1`
            break
        case 'opens':
            series = sql`opens`
            break
        default:
            throw new Error(`Invalid timeseries: ${params.series}`)
    }

    switch (params.operation) {
        case 'avg':
            operation = sql`avg(${series})`
            break
        case 'sum':
            operation = sql`sum(${series})`
            break
        default:
            throw new Error(`Invalid timeseries operation: ${params.operation} `)
    }

    const result = await connection.query(sql`
        SELECT time_bucket(${ params.bucketSize}, time) AS label, ${operation} AS value
        FROM blocks
        GROUP BY label
        ORDER BY label ASC
    `)

    return result.rows.map(row => {
        let rowTime = new Date(row.label)
        return { label: rowTime.toString(), value: <number>row.value }
    })
}