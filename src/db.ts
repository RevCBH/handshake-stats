import Knex from 'knex'
import * as api from './api'

export interface BlockStats {
    hash: string
    prevhash: string
    time: Date
    issuance: number
    fees: number
}

export interface Client extends api.Query {
    insertBlockStats: (blockStats: BlockStats) => Promise<BlockStats>
    blockExists: (blockHash: string) => Promise<boolean>
    close: () => Promise<void>
}

export function init(): Client {
    const knex = Knex({
        client: 'pg',
        connection: {
            host: 'localhost',
            user: 'namebase-stats',
            password: 'test123',
            database: 'postgres',
        }
    })

    return {
        insertBlockStats: insertBlockStats(knex),
        blockExists: blockExists(knex),
        close: async () => knex.destroy(),

        // API queries
        getIssuance: getIssuance(knex)
    }
}

function insertBlockStats(knex: Knex) {
    return async (blockStats: BlockStats) => {
        return knex('blocks').insert<BlockStats>(blockStats)
    }
}

function blockExists(knex: Knex) {
    return async (blockHash: string) => {
        return knex('blocks')
            .select()
            .where({ hash: blockHash })
            .then(res => res.length > 0)
    }
}

function getIssuance(knex: Knex) {
    return async (bucketSize: string) => {
        return knex('blocks')
            .select(knex.raw('time_bucket(?, time) AS label, sum(issuance - fees) AS value', bucketSize))
            .groupBy('label')
            .orderBy('label', 'asc')

    }
}