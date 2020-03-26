import { createMock } from 'ts-auto-mock'
import { On, method } from 'ts-auto-mock/extension'

import { init, Plugin } from '../src/index'
import * as db from '../src/db'

import Chain from 'hsd/lib/blockchain/chain'
import ChainEntry from 'hsd/lib/blockchain/chainentry'
import Block from 'hsd/lib/primitives/block'
import Output from 'hsd/lib/primitives/output'
import TX from 'hsd/lib/primitives/tx'
import Network from 'hsd/lib/protocol/network'
import Miner from 'hsd/lib/mining/miner'
import Node from 'hsd/lib/node/node'

const network = Network.get('regtest')

function randomMockBlock(): Block {
    return createMock<Block>({
        txs: [
            createMock<TX>({
                outputs: [createMock<Output>()]
            })
        ]
    })
}

describe("When handling sync events", () => {
    let mockNode: Node
    let plugin: Plugin
    let mockDb: db.Client
    let mockBlock: Block
    let chain: Chain
    let miner: Miner

    beforeEach(async () => {
        // TODO - use a real Chain
        // ISSUE - mining fails an asserion in bcrypto when it tries to generate
        //         a random integer :(
        chain = createMock<Chain>()

        mockNode = createMock<Node>({
            get: jest.fn((key: string) => {
                if (key === 'chain') {
                    return chain
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
        await plugin.open()

    })

    afterEach(async () => {
        await plugin.close()
    })

    it('should insert new blocks in the db', async () => {
        const mockInsertBlockStats = On(mockDb).get(method(m => m.insertBlockStats))
        await plugin.handleNewBlock(mockBlock, createMock<ChainEntry>())
        expect(mockInsertBlockStats).toBeCalledTimes(1)
    })

    it('should trigger a reorganization when appropriate', async () => {
        const mockBlockExists = <jest.Mock>On(mockDb).get(method(m => m.blockExists))
        mockBlockExists.mockReturnValue(true)

        const mockGetChainTipHash = <jest.Mock>On(mockDb).get(method(m => m.getChainTipHash))
        mockGetChainTipHash.mockReturnValueOnce('00') // return old block hash the first time
        mockGetChainTipHash.mockReturnValueOnce('01') // return new block hash the second time

        const mockReorganize = jest.fn().mockResolvedValue(null)
        plugin.reorganize = mockReorganize

        const mockNewBlock = randomMockBlock()
        mockNewBlock.prevBlock = Buffer.from('01', 'hex')
        const mockNewEntry = createMock<ChainEntry>()

        await plugin.handleNewBlock(mockNewBlock, mockNewEntry)
        await plugin.handleNewBlock(mockNewBlock, mockNewEntry)

        // Ancillary checks
        expect(mockBlockExists).toBeCalledTimes(2)
        expect(mockGetChainTipHash).toBeCalledTimes(2)

        // Core checks
        // .reorganize should only be called once w/ the different hashes
        expect(mockReorganize).toBeCalledWith('00', '01')
        expect(mockReorganize).toBeCalledTimes(1)
    })

    it('should update the databse on reorganization', async () => {
        const genesisHash = Buffer.from('ffffff', 'hex')
        const oldTipHash = Buffer.from('010000', 'hex')
        const losingBlockHash = Buffer.from('001000', 'hex')
        const newTipHash = Buffer.from('000001', 'hex')
        const winningBlockHash = Buffer.from('000010', 'hex')
        const forkPointHash = Buffer.from('000100', 'hex')

        function mkEntry(height: number, hash: Buffer, prevBlock: Buffer): ChainEntry {
            return createMock<ChainEntry>(<ChainEntry>{
                height,
                hash,
                prevBlock
            })
        }

        const forkPoint = mkEntry(1, forkPointHash, genesisHash)
        const losingBlock = mkEntry(2, losingBlockHash, forkPointHash)
        const oldTip = mkEntry(3, oldTipHash, losingBlockHash)
        const winningBlock = mkEntry(2, winningBlockHash, forkPointHash)
        const newTip = mkEntry(3, newTipHash, winningBlockHash)

        const entries: Record<string, ChainEntry> = {
            // 'fffff': mkEntry(genesisHash, Buffer.from('00000')),
            '010000': oldTip,
            '001000': losingBlock,
            '000100': forkPoint,
            '000010': winningBlock,
            '000001': newTip
        }


        const mockDisconnectBlock = <jest.Mock>On(mockDb).get(method(m => m.disconnectBlock))
        const mockConnectBlock = <jest.Mock>On(mockDb).get(method(m => m.connectBlock))
        const mockInsertBlockStats = <jest.Mock>On(mockDb).get(method(m => m.insertBlockStats))
        const mockBlockExists = <jest.Mock>On(mockDb).get(method(m => m.blockExists))
        mockBlockExists.mockImplementation((hash: string) => hash !== '000010')

        const mockFindFork = <jest.Mock>On(chain).get(method(m => m.findFork))
        mockFindFork.mockResolvedValue(forkPoint)

        const mockGetEntry = <jest.Mock>On(chain).get(method(m => m.getEntry))
        mockGetEntry.mockImplementation((hash: Buffer) => {
            return entries[hash.toString('hex')]
        })

        const mockGetPrevious = <jest.Mock>On(chain).get(method(m => m.getPrevious))
        mockGetPrevious.mockImplementation((entry: ChainEntry) => {
            return entries[entry.prevBlock.toString('hex')]
        })

        const mockGetBlock = <jest.Mock>On(chain).get(method(m => m.getBlock))
        mockGetBlock.mockResolvedValue(mockBlock)

        await plugin.reorganize('010000', '000001')

        expect(mockDisconnectBlock).toBeCalledTimes(2)
        expect(mockDisconnectBlock).toBeCalledWith('010000')
        expect(mockDisconnectBlock).toBeCalledWith('001000')

        expect(mockConnectBlock).toBeCalledTimes(1)
        expect(mockConnectBlock).toBeCalledWith('000001')

        expect(mockInsertBlockStats).toBeCalledTimes(1)
    })

})