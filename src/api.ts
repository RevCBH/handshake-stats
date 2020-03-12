'use strict';

import express, { Express } from 'express'

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
}