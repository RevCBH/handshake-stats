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
    config: Config
    get: (propname: 'chain') => Chain
    on: (msg: string, cb: Function) => void
}


export interface Config {
    filter: (name: string) => Config
    open: (file: string) => void
    str: (key: string, fallback: string) => string
    uint: (key: string, fallback: number) => number
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
    on(msg: 'block', handler: (block: Block, entry: ChainEntry) => void): void
    on(msg: 'tip', handler: (entry: ChainEntry) => void): void
    removeListener(msg: 'block', handler: (block: Block, entry: ChainEntry) => void): void

    getBlock(hash: Hash): Promise<Block>
    getBlockView: (block: Block) => Promise<CoinView>
    getEntryByHeight: (height: number) => Promise<ChainEntry>
    getHeight: (block: Hash) => number

    tip: ChainEntry
    height: number
}

export interface CoinView { }

export interface ChainEntry {
    hash: Hash
    isGenesis(): boolean
    height: number
}