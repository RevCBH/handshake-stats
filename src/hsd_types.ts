export interface Logger {
    context: (module: string) => LoggerContext
}

export interface LoggerContext {
    error: (msg: string) => void
    info: (msg: string) => void
    open: () => void
}

export interface Node {
    logger: Logger
    network: string
    get: (propname: 'chain') => Chain
    on: (msg: string, cb: Function) => void
}

export interface Block {
    hash: () => Hash
    hashHex: () => string
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
export interface Covenant { }

export interface Chain {
    on: (msg: 'block', handler: (block: Block) => void) => void
    getBlock: (hash: Hash) => Promise<Block>
    getBlockView: (block: Block) => Promise<CoinView>
}

export interface CoinView { }