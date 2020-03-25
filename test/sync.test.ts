import { createMock } from 'ts-auto-mock'
import { On, method } from 'ts-auto-mock/extension'

import { init as initPlugin, Plugin } from '../src/index'
import * as db from '../src/db'
import * as api from '../src/api'
import * as hsd from '../src/hsd_types'

describe("When handling sync events", () => {
    let mockNode: hsd.Node
    let plugin: Plugin
    let mockDb: db.Client
    let mockBlock: hsd.Block
    let mockChain: hsd.Chain

    beforeEach(() => {
        mockChain = createMock<hsd.Chain>()
        mockNode = createMock<hsd.Node>()
        mockBlock = createMock<hsd.Block>({
            txs: [
                createMock<hsd.TX>({
                    outputs: [createMock<hsd.Output>()]
                })
            ]
        })

        mockDb = createMock<db.Client>()
        plugin = initPlugin(mockNode)
        plugin.db = mockDb
        plugin.chain = mockChain
    })

    it('should add the genesis block on startup if missing', async () => {
        const mockGetEntryByHeight = <jest.Mock>On(mockChain).get(method(mock => mock.getEntryByHeight))
        mockGetEntryByHeight.mockResolvedValueOnce(createMock<hsd.ChainEntry>({
            hash: Buffer.from('deadbeef', 'hex')
        }))

        const mockGetBlockStatsByHash = <jest.Mock>On(mockDb).get(method(mock => mock.getBlockStatsByHash))
        mockGetBlockStatsByHash.mockRejectedValueOnce(new db.MissingBlockError(""))

        const mockGetBlock = <jest.Mock>On(mockChain).get(method(mock => mock.getBlock))
        mockGetBlock.mockResolvedValue(mockBlock)

        const mockInsertBlockStats = On(mockDb).get(method('insertBlockStats'))

        await plugin.open()

        expect(mockGetBlockStatsByHash).toBeCalledWith('deadbeef')
        expect(mockInsertBlockStats).toBeCalledTimes(1)

        return plugin.close()
    })

    it('should insert new blocks in the db', async () => {
        const mockInsertBlockStats = On(mockDb).get(method('insertBlockStats'))
        await plugin.handleNewBlock(mockBlock, createMock<hsd.ChainEntry>())
        expect(mockInsertBlockStats).toBeCalledTimes(1)
    })
})