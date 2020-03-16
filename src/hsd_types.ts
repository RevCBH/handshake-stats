export interface Logger {
    context: (module: string) => LoggerContext
}

export interface LoggerContext {
    error: (...args: any[]) => void
    warning: (...args: any[]) => void
    info: (...args: any[]) => void
    debug: (...args: any[]) => void
    spam: (...args: any[]) => void

    open: () => void
}

export interface Node {
    logger: Logger
    network: Network
    get: (propname: 'chain') => Chain
    on: (msg: string, cb: Function) => void
}

export interface Network {
    halvingInterval: number
    toString: () => string
}

export interface Block {
    hash: () => Hash
    hashHex: () => string
    getCoinbaseHeight: () => number
    prevBlock: Hash
    time: number
    txs: [TX]
}

export type Hash = Buffer

export interface TX {
    inputs: [Input]
    outputs: [Output]
    isCoinbase: () => boolean
    getOutputValue: () => number
    getFee: (view: CoinView) => number
}

export interface Input {
}

export interface Output {
    value: number
    address: Address
    covenant: Covenant
}

export interface Address { }
export interface Covenant {
    isOpen: () => boolean
    items: any[]
}

export interface Chain {
    on: (msg: 'block', handler: (block: Block) => void) => void
    getBlock: (hash: Hash) => Promise<Block>
    getBlockView: (block: Block) => Promise<CoinView>
    getEntryByHeight: (height: number) => Promise<ChainEntry>
    getHeight: (block: Hash) => number
}

export interface CoinView { }

export interface ChainEntry {
    hash: Hash
}