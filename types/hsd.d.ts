type Hash = Buffer

declare module 'hsd/lib/blockchain/chain' {
    import Block from 'hsd/lib/primitives/block'
    import ChainEntry from 'hsd/lib/blockchain/chainentry'
    import CoinView from 'hsd/lib/coins/coinview'

    export default class Chain {
        tip: ChainEntry
        height: number

        constructor(options: object)
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

        open(): Promise<void>
        close(): Promise<void>

        // TODO - this is @private in hsd! Find another way?
        findFork(fork: ChainEntry, longer: ChainEntry): Promise<ChainEntry>
    }
}

declare module 'hsd/lib/blockchain/chainentry' {
    export default class ChainEntry {
        hash: Buffer
        prevBlock: Buffer
        height: number
        isGenesis(): boolean
    }
}

declare module 'hsd/lib/protocol/network' {
    export default class Network {
        halvingInterval: number
        toString(): string
        static get(type: Network): Network
        static get(type: 'regtest'): Network
    }
}

declare module 'hsd/lib/primitives/block' {
    import TX from 'hsd/lib/primitives/tx'
    export default interface Block {
        hash: () => Hash
        hashHex: () => string
        getCoinbaseHeight: () => number
        prevBlock: Hash
        time: number
        txs: [TX]
    }
}

declare module 'hsd/lib/primitives/tx' {
    import Input from 'hsd/lib/primitives/input'
    import Output from 'hsd/lib/primitives/output'
    import CoinView from 'hsd/lib/coins/coinview'

    export default interface TX {
        inputs: [Input]
        outputs: [Output]
        isCoinbase: () => boolean
        getOutputValue: () => number
        getFee: (view: CoinView) => number
    }
}

declare module 'hsd/lib/primitives/input' {
    export default interface Input {
    }
}

declare module 'hsd/lib/primitives/output' {
    import Address from 'hsd/lib/primitives/address'
    import Covenant from 'hsd/lib/primitives/covenant'

    export default interface Output {
        value: number
        address: Address
        covenant: Covenant
    }
}

declare module 'hsd/lib/primitives/address' {
    export default interface Address { }
}

declare module 'hsd/lib/primitives/covenant' {
    export default interface Covenant {
        isOpen: () => boolean
        items: any[]
    }
}

declare module 'hsd/lib/coins/coinview' {
    export default interface CoinView { }
}

interface IMiner {
}

declare module 'hsd/lib/mining/miner' {
    import CPUMiner from 'hsd/lib/mining/cpuminer'

    export default class Miner implements IMiner {
        constructor(options: object)
        open(): Promise<void>
        close(): Promise<void>
        cpu: CPUMiner

    }
}

declare module 'hsd/lib/mining/cpuminer' {
    import ChainEntry from 'hsd/lib/blockchain/chainentry'
    import Address from 'hsd/lib/primitives/address'
    import Block from 'hsd/lib/primitives/block'

    export default class CPUMiner {
        constructor(miner: IMiner)
        mineBlock(tip?: ChainEntry, address?: Address): Promise<Block>
    }
}