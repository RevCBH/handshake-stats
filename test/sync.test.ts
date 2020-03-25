// import { mocked } from 'ts-jest/utils'
import { createMock } from 'ts-auto-mock'
import { On, method } from 'ts-auto-mock/extension'

// const index = require('../src/index')
import { init, Plugin } from '../src/index'
import { init as dbInit, Client as DbClient } from '../src/db'
// import * as api from '../src/api'
import * as hsd from '../src/hsd_types'

jest.mock('../src/db')
jest.mock('../src/hsd_types')

describe("When handling sync events", () => {
    let mockNode: hsd.Node
    let plugin: Plugin
    // let mockDb: DbClient
    let mockBlock: hsd.Block
    // let mockChain: hsd.Chain

    beforeEach(() => {
        // mockChain = createMock<hsd.Chain>()
        // mockNode = createMock<hsd.Node>()

        mockNode = {
            logger: {
                context: jest.fn(),
            },
            network: {
                halvingInterval: 0
            },
            config: {
                str: (_, fallback) => fallback,
                filter: jest.fn().mockReturnThis(),
                open: jest.fn(),
                uint: jest.fn()
            },
            get: jest.fn(),
            on: jest.fn()
        }

        mockBlock = createMock<hsd.Block>({
            txs: [
                createMock<hsd.TX>({
                    outputs: [createMock<hsd.Output>()]
                })
            ]
        })

        // mockDb = createMock<db.Client>()
        plugin = init(mockNode)
        // plugin.db = mockDb
        // plugin.chain = mockChain
    })

    // it('should add the genesis block on startup if missing', async () => {
    //     const mockGetEntryByHeight = <jest.Mock>On(mockChain).get(method(mock => mock.getEntryByHeight))
    //     mockGetEntryByHeight.mockResolvedValueOnce(createMock<hsd.ChainEntry>({
    //             hash: Buffer.from('deadbeef', 'hex')
    //     }))

    //     const mockGetBlockStatsByHash = <jest.Mock>On(mockDb).get(method(mock => mock.getBlockStatsByHash))
    //             mockGetBlockStatsByHash.mockRejectedValueOnce(new db.MissingBlockError(""))

    //     const mockGetBlock = <jest.Mock>On(mockChain).get(method(mock => mock.getBlock))
    //                 mockGetBlock.mockResolvedValue(mockBlock)

    //                 const mockInsertBlockStats = On(mockDb).get(method('insertBlockStats'))

    //                 await plugin.open()

    //                 expect(mockGetBlockStatsByHash).toBeCalledWith('deadbeef')
    //                 expect(mockInsertBlockStats).toBeCalledTimes(1)

    //                 return plugin.close()
    //                 })

    it('should insert new blocks in the db', async () => {
        // const MockDb = jest.fn(() => ({}))
        const mockInsertBlockStats = jest.fn()
        // await plugin.handleNewBlock()
        // const mockInsertBlockStats = On(mockDb).get(method('insertBlockStats'))

        // await plugin.handleNewBlock(mockBlock, createMock<hsd.ChainEntry>())
        // expect(mockInsertBlockStats).toBeCalledTimes(1)
    })
})