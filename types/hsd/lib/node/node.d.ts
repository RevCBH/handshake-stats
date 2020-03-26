declare module 'hsd/lib/node/node' {
    import { Logger } from 'blgr'
    import { Config } from 'bcfg'
    import Chain from 'hsd/lib/blockchain/chain'
    import Network from 'hsd/lib/protocol/network'

    export default class Node {
        logger: Logger
        network: Network
        config: Config
        get: (propname: 'chain') => Chain
        on: (msg: string, cb: Function) => void
    }
}