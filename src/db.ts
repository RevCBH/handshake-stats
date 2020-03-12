import * as api from './api'
import { sql, DatabasePoolConnectionType, createPool, DatabasePoolType } from 'slonik';

export interface BlockStats {
    hash: string
    prevhash: string
    time: number
    issuance: number
    fees: number
    numAirdrops: number
    airdropAmt: number
}

export interface Client extends api.Query {
    insertBlockStats: (blockStats: BlockStats) => Promise<void>
    blockExists: (blockHash: string) => Promise<boolean>
    close: () => Promise<void>
}

type DbFunc<TArgs, TResult> = (connection: DatabasePoolConnectionType, args: TArgs) => Promise<TResult>

export function init(): Client {
    // TODO - make connection string configurable
    const pool = createPool('postgres://namebase-stats:test123@localhost/postgres')

    function withPool<TArgs, TResult>(f: DbFunc<TArgs, TResult>): (args: TArgs) => Promise<TResult> {
        return (args: TArgs) => {
            return pool.connect(connection => {
                return f(connection, args)
            })
        }
    }

    return {
        close: async () => pool.end(),
        insertBlockStats: withPool(insertBlockStats),
        blockExists: withPool(blockExists),

        // API queries
        timeseries: withPool(timeseries)
    }
}


async function insertBlockStats(connection: DatabasePoolConnectionType, blockStats: BlockStats): Promise<void> {
    await connection.query(sql`
        INSERT INTO blocks (hash, prevHash, time, issuance, fees, numAirdrops, airdropAmt)
        VALUES (
            ${blockStats.hash},
            ${blockStats.prevhash},
            to_timestamp(${blockStats.time}),
            ${blockStats.issuance},
            ${blockStats.fees},
            ${blockStats.numAirdrops},
            ${blockStats.airdropAmt}
        )
    `)
}

async function blockExists(connection: DatabasePoolConnectionType, blockHash: string): Promise<boolean> {
    const result = await connection.oneFirst(sql`
        SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ${blockHash});
    `)

    // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
    return <boolean><unknown>result.valueOf()
}

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