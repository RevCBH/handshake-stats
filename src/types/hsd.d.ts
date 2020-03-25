type Hash = Buffer

declare module 'hsd/lib/blockchain/chain' {
    import { Block } from 'hsd/lib/primitives/block'
    import { ChainEntry } from 'hsd/lib/blockchain/chainentry'

    interface Chain {
        on(msg: 'block', handler: (block: Block, entry: ChainEntry) => void): void
        on(msg: 'tip', handler: (entry: ChainEntry) => void): void
        removeListener(msg: 'block', handler: (block: Block, entry: ChainEntry) => void): void

        getBlock(hash: Hash): Promise<Block>
        getBlockView(block: Block): Promise<CoinView>
        getEntryByHeight(height: number): Promise<ChainEntry>
        getEntry(hash: Buffer): Promise<ChainEntry>
        getEntry(height: number): Promise<ChainEntry>
        getHeight(block: Hash): number
        getPrevious(entry: ChainEntry): Promise<ChainEntry>

        tip: ChainEntry
        height: number

        // TODO - this is @private in hsd! Find another way?
        findFork(fork: ChainEntry, longer: ChainEntry): Promise<ChainEntry>
    }
}

declare module 'hsd/lib/blockchain/chainentry' {
    interface ChainEntry {
        hash: Hash
        isGenesis(): boolean
        height: number
    }
}

declare module 'hsd/lib/node/node' {
    import { Logger } from 'blgr'
    import { Config } from 'bcfg'
    import { Chain } from 'hsd/lib/blockchain/chain'
    import { Network } from 'hsd/lib/protocol/network'

    interface Node {
        logger: Logger
        network: Network
        config: Config
        get: (propname: 'chain') => Chain
        on: (msg: string, cb: Function) => void
    }
}

declare module 'hsd/lib/protocol/network' {
    interface Network {
        halvingInterval: number
        toString: () => string
    }
}

declare module 'hsd/lib/primitives/block' {
    import { TX } from 'hsd/lib/primitives/tx'
    interface Block {
        hash: () => Hash
        hashHex: () => string
        getCoinbaseHeight: () => number
        prevBlock: Hash
        time: number
        txs: [TX]
    }
}

declare module 'hsd/lib/primitives/tx' {
    import { Input } from 'hsd/lib/primitives/input'
    import { Output } from 'hsd/lib/primitives/output'

    interface TX {
        inputs: [Input]
        outputs: [Output]
        isCoinbase: () => boolean
        getOutputValue: () => number
        getFee: (view: CoinView) => number
    }
}

declare module 'hsd/lib/primitives/input' {
    interface Input {
    }
}

declare module 'hsd/lib/primitives/output' {
    interface Output {
        value: number
        address: Address
        covenant: Covenant
    }
}

interface Address { }
interface Covenant {
    isOpen: () => boolean
    items: any[]
}

interface CoinView { }