'use strict';

import express, { Express } from 'express'

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

export class Bucket {
    label: string
    value: number

    constructor(label: string, value: number) {
        this.label = label;
        this.value = value;
    }
}

export interface TimeseriesParams {
    series: string
    operation: string
    bucketSize: string
}

export interface Query {
    timeseries: (options: TimeseriesParams) => Promise<Bucket[]>
    getBlockStatsByHeight: (height: number) => Promise<BlockStats>
    getBlockStatsByHash: (hash: string) => Promise<BlockStats>
}

export function init(query: Query): Express {
    function handleErrors(handler: express.RequestHandler): express.RequestHandler {
        return (req, res, next) => {
            handler(req, res, next).catch(next)
        }
    }

    return express()
        .get('/timeseries/:series/:operation', handleErrors(async (req, res) => {
            res.contentType('application/json')
            res.send(await query.timeseries({
                series: req.params.series,
                operation: req.params.operation,
                bucketSize: req.query.bucketSize || '1 hour'
            }))
        }))
        .get('/block-stats/:hashOrNumber', handleErrors(async (req, res) => {
            res.contentType('application/json')

            let blockId = req.params.hashOrNumber
            if (Number.isNaN(Number(blockId))) {
                console.log('namebase-stats attempting to get by hash')
                res.send(await query.getBlockStatsByHash(blockId))
            } else {
                console.log('namebase-stats attempting to get by number')
                res.send(await query.getBlockStatsByHeight(Number(blockId)))
            }

        }))
}