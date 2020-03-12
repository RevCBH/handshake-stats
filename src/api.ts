'use strict';

import assert from 'assert'
import express, { Express, Request, Response } from 'express'

export class Bucket {
    label: string
    value: number

    constructor(label: string, value: number) {
        this.label = label;
        this.value = value;
    }
}

export interface Query {
    getIssuance: (bucketSize: string) => Promise<Bucket[]>
}

export function init(query: Query): Express {
    let app = express()

    function handleErrors(handler: express.RequestHandler): express.RequestHandler {
        return (req, res, next) => {
            handler(req, res, next).catch(next)
        }
    }

    app.get('/stats/issuance', handleErrors(async (req, res) => {
        let bucketSize = req.query.bucketSize || '1 hour'
        let buckets = await query.getIssuance(bucketSize)

        res.contentType('application/json')
        res.send(buckets)
    }))

    return app
}