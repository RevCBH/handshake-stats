import * as api from './api'
import { sql, DatabasePoolConnectionType, createPool, DatabasePoolType } from 'slonik'
import { LoggerContext } from './hsd_types'

export interface OpenStats {
    name: string
}

// TODO - verify this math is correct
export const NUM_BLOCKS_AUCTION_IS_OPEN = 37 + 720 + 1440 // opening, bidding, revealing

export interface Client extends api.Query {
    insertBlockStats: (blockStats: api.BlockStats) => void
    blockExists: (blockHash: string) => Promise<boolean>
    close: () => Promise<void>
}

// type DbFunc<TArgs, TResult> = (connection: DatabasePoolConnectionType, args: TArgs) => Promise<TResult>
class DbRunner implements Client {
    pool: DatabasePoolType

    // to ensure ordered insertion, we work off a queue
    blockQueue: api.BlockStats[]
    insertExecutor: Promise<void> | null
    logger: LoggerContext

    constructor(logger: LoggerContext, connectionString: string) {
        this.logger = logger
        this.blockQueue = []
        this.insertExecutor = null
        this.pool = createPool(connectionString)
    }

    // This burns through the queue until it's empty
    private async startWork(): Promise<void> {
        var item: api.BlockStats | undefined
        while (item = this.blockQueue.shift()) {
            await insertBlockStats(this.pool, this.logger, item)
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

    async getBlockStatsByHeight(height: number): Promise<api.BlockStats> {
        return this.pool.connect(async connection => {
            let maybeStats = await connection.maybeOne<api.BlockStats>(sql`
                SELECT * FROM blocks
                WHERE height = ${height}
            `)

            if (maybeStats !== null) {
                return maybeStats
            }
            else {
                throw new Error(`No block at height: ${height}`)
            }
        })
    }

    async getBlockStatsByHash(hash: string): Promise<api.BlockStats> {
        return this.pool.connect(async connection => {
            let maybeStats = await connection.maybeOne<api.BlockStats>(sql`
                SELECT * FROM blocks
                WHERE hash = ${hash}
            `)

            if (maybeStats !== null) {
                return maybeStats
            }
            else {
                throw new Error(`No block at hash: ${hash}`)
            }
        })
    }

    // This queues blocks to insert 1 at a time and avoid races
    // since we want to compute stats based on previous blocks
    // and that fails if it's not inserted yet
    insertBlockStats(blockStats: api.BlockStats) {

        // Queue a block to insert 
        this.blockQueue.push(blockStats)

        // If we're not currently pulling from the queue, start
        if (this.insertExecutor === null) {
            this.insertExecutor = this.startWork()
        }
    }
}

type InitParams = { logger: LoggerContext, connectionString: string }
export function init({ logger, connectionString }: InitParams): Client {
    return new DbRunner(logger, connectionString);
}

async function insertBlockStats(pool: DatabasePoolType, logger: LoggerContext, blockStats: api.BlockStats): Promise<void> {
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

        if (lastNumRunning != null) {
            blockStats.numrunning = lastNumRunning.numrunning;
        }

        if (expiring != null) {

            blockStats.numrunning -= expiring.numopens
        }
        blockStats.numrunning += blockStats.numopens

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

            logger.info('Inserted block', blockStats.hash)
        }
        catch (e) {
            logger.error("error inserting block:", e)
        }
    })
}

async function timeseries(connection: DatabasePoolConnectionType, params: api.TimeseriesParams): Promise<api.Bucket[]> {
    var operation = sql``;
    var series = sql``
    switch (params.series) {
        case 'issuance':
            series = sql`issuance - fees`
            break
        case 'fees':
            series = sql`fees`
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
            series = sql`numopens`
            break
        case 'running-auctions':
            series = sql`numrunning`
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