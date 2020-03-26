declare module 'blgr' {
    interface Logger {
        context: (module: string) => LoggerContext
    }

    interface LoggerContext {
        error: (...args: any[]) => void
        warning: (...args: any[]) => void
        info: (...args: any[]) => void
        debug: (...args: any[]) => void
        spam: (...args: any[]) => void

        open: () => void
    }
}