import * as api from './api'
import { sql, DatabasePoolConnectionType, createPool, DatabasePoolType } from 'slonik'
import { LoggerContext } from 'blgr'

export interface OpenStats {
    name: string
}

// TODO - verify this math is correct
export const NUM_BLOCKS_AUCTION_IS_OPEN = 37 + 720 + 1440 // opening, bidding, revealing

export interface Client extends api.Query {
    insertBlockStats(blockStats: api.BlockStats): void
    blockExists(blockHash: string): Promise<boolean>
    getChainHeight(): Promise<number>
    disconnectBlock(blockHash: string): Promise<void>
    connectBlock(blockHash: string): Promise<void>
    getChainTipHash(): Promise<string>
    close(): Promise<void>
}

export class MissingBlockError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, new.target.prototype)
        this.name = MissingBlockError.name
    }
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

    async getChainHeight(): Promise<number> {
        return this.pool.connect(async connection => {
            const result = await connection.maybeOne<{ chainheight: number }>(sql`
                SELECT max(height) AS chainheight FROM blocks
                WHERE onwinningchain = true;
            `)
            if (result?.chainheight != null) {
                return result.chainheight
            } else {
                return -1
            }
        })
    }

    async getChainTipHash(): Promise<string> {
        return this.pool.connect(async connection => {
            const result = await connection.maybeOne<{ hash: string }>(sql`
                SELECT hash FROM blocks
                WHERE height = (SELECT MAX(height) FROM blocks) 
                AND   onwinningchain = true;
            `)
            if (result?.hash != null) {
                return result.hash
            } else {
                throw new MissingBlockError("No chain tip found")
            }
        })
    }

    async connectBlock(blockHash: string): Promise<void> {
        await this.setBlockWinning(blockHash, true)
    }

    async disconnectBlock(blockHash: string): Promise<void> {
        await this.setBlockWinning(blockHash, false)
    }

    private async setBlockWinning(blockHash: string, isWinning: boolean): Promise<void> {
        return this.pool.connect(async connection => {
            await connection.query(sql`
                UPDATE blocks
                SET onwinningchain = ${isWinning}
                WHERE hash = ${blockHash}
            `)
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
                throw new MissingBlockError(`No block at height: ${height}`)
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
                throw new MissingBlockError(`No block at hash: ${hash}`)
            }
        })
    }

    // This queues blocks to insert 1 at a time and avoid races
    // since we want to compute stats based on previous blocks
    // and that fails if it's not inserted yet
    insertBlockStats(blockStats: api.BlockStats) {

        // Queue a block to insert 
        this.blockQueue.push(blockStats)
        this.logger.spam('Queued block for insertion', blockStats.hash)

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
        let lastBlock = await txConnection.maybeOne<
            { numrunning: number, onwinningchain: boolean }
        >(sql`
            SELECT numrunning, onwinningchain
            FROM blocks WHERE height = ${blockStats.height} - 1;
        `)
        let expiring = await txConnection.maybeOne<{ numopens: number }>(sql`
            SELECT numopens FROM blocks WHERE height = ${blockStats.height - NUM_BLOCKS_AUCTION_IS_OPEN};
        `)

        if (lastBlock != null) {
            blockStats.numrunning = lastBlock.numrunning;
            blockStats.onwinningchain = lastBlock.onwinningchain;
        } else if (blockStats.height === 0) {
            blockStats.onwinningchain = true; // The genesis block is always winning
        }

        if (expiring != null) {

            blockStats.numrunning -= expiring.numopens
        }
        blockStats.numrunning += blockStats.numopens

        // Insert the full
        try {
            await txConnection.query(sql`
            INSERT INTO blocks (
                hash, prevHash, onwinningchain, time, height, issuance, 
                fees, numAirdrops, airdropAmt, numopens, numrunning
            ) VALUES (
                ${blockStats.hash},
                ${blockStats.prevhash},
                ${blockStats.onwinningchain},
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