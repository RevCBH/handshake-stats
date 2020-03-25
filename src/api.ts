'use strict';

import express, { Express } from 'express'
import { LoggerContext } from './hsd_types'


export interface Query {
    timeseries(options: TimeseriesParams): Promise<Bucket[]>
    getBlockStatsByHeight(height: number): Promise<BlockStats>
    getBlockStatsByHash(hash: string): Promise<BlockStats>
}

export interface BlockStats {
    hash: string
    prevhash: string
    onwinningchain: boolean
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

function headersMiddleware(req: express.Request, res: express.Response, next: Function) {
    res.contentType('application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
}

export function init(logger: LoggerContext, query: Query): Express {
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
                logger.debug('getting block stats for hash', blockId)
                res.send(await query.getBlockStatsByHash(blockId))
            } else {
                logger.debug('getting block stats at height', blockId)
                res.send(await query.getBlockStatsByHeight(Number(blockId)))
            }

        }))
}