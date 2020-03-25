import { createMock } from 'ts-auto-mock'
import { On, method } from 'ts-auto-mock/extension'

import { init, Plugin } from '../src/index'
import * as db from '../src/db'

import { Chain } from 'hsd/lib/blockchain/chain'
import { ChainEntry } from 'hsd/lib/blockchain/chainentry'
import { Block } from 'hsd/lib/primitives/block'
import { Output } from 'hsd/lib/primitives/output'
import { TX } from 'hsd/lib/primitives/tx'
import { Node as HsdNode } from 'hsd/lib/node/node'

describe("When handling sync events", () => {
    let mockNode: HsdNode
    let plugin: Plugin
    let mockDb: db.Client
    let mockBlock: Block
    let mockChain: Chain

    beforeEach(() => {
        mockChain = createMock<Chain>()
        mockNode = createMock<HsdNode>({
            get: jest.fn((key: string) => {
                if (key === 'chain') {
                    return mockChain
                } else {
                    throw new Error(`Unexpected Node.get key: ${key}`)
                }
            })
        })

        mockBlock = createMock<Block>({
            txs: [
                createMock<TX>({
                    outputs: [createMock<Output>()]
                })
            ]
        })

        mockDb = createMock<db.Client>()
        plugin = init(mockNode)
        plugin.db = mockDb
    })

    it('should insert new blocks in the db', async () => {
        const mockInsertBlockStats = On(mockDb).get(method(m => m.insertBlockStats))
        await plugin.handleNewBlock(mockBlock, createMock<ChainEntry>())
        expect(mockInsertBlockStats).toBeCalledTimes(1)
    })

    it('should handle a reorganization', async () => {

    })

})