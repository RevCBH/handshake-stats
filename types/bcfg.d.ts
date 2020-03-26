declare module 'bcfg' {
    interface Config {
        filter: (name: string) => Config
        open: (file: string) => void
        str: (key: string, fallback: string) => string
        uint: (key: string, fallback: number) => number
    }
}