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

function headersMiddleware(req: express.Request, res: express.Response, next: Function) {
    res.contentType('application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
}

export function init(query: Query): Express {
    function handleErrors(handler: express.RequestHandler): express.RequestHandler {
        return (req, res, next) => {
            handler(req, res, next).catch(next)
        }
    }

    return express()
        .use(headersMiddleware)
        .get('/timeseries/:series/:operation', handleErrors(async (req, res) => {
            res.send(await query.timeseries({
                series: req.params.series,
                operation: req.params.operation,
                bucketSize: req.query.bucketSize || '1 hour'
            }))
        }))
        .get('/block-stats/:hashOrNumber', handleErrors(async (req, res) => {
            let blockId = req.params.hashOrNumber
            if (Number.isNaN(Number(blockId))) {
                console.log('handshake-stats attempting to get by hash')
                res.send(await query.getBlockStatsByHash(blockId))
            } else {
                console.log('handshake-stats attempting to get by number')
                res.send(await query.getBlockStatsByHeight(Number(blockId)))
            }

        }))
}