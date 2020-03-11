import { Client } from 'pg'
import chalk = require('chalk')

const argv = require('yargs')
    .command('init_db', 'Initializes or re-initalized the database for')
    .option('drop', {
        description: "Delete everything this script manages",
        type: 'boolean',
    })
    .option('nocreate', {
        description: "Don't create anything",
        type: 'boolean',
    })
    .argv

const createBlocksTable = `
CREATE TABLE blocks (
    hash CHAR(64) PRIMARY KEY,
    prevHash CHAR(64) NOT NULL,
    createdAt integer NOT NULL,
    -- numTx integer NOT NULL,
    issuance bigint NOT NULL
);
`

const dropBlocksTable = `
DROP TABLE blocks;
`

const createServiceUser = `
CREATE ROLE "namebase-stats" NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT LOGIN PASSWORD 'test123';
`

const dropServiceUser = `
DROP ROLE "namebase-stats";`

// TODO - narrow privileges
const grantBlocksAccess = `
GRANT ALL PRIVILEGES ON blocks TO "namebase-stats";
`

const OK = chalk.greenBright("OK")
const SKIPPED = chalk.yellowBright("SKIPPED")
const ERROR = chalk.redBright("ERROR")

async function main() {
    const client = new Client({
        host: '/var/run/postgresql',
        user: 'postgres',
        database: 'postgres'
    })

    async function tryOrSkipOn(msg: string, code: string, query: string) {
        try {
            process.stdout.write(msg + ": ")
            await client.query(query)
            console.log(OK)
        }
        catch (e) {
            if (e.code === code) {
                console.log(SKIPPED)
            }
            else {
                console.log(ERROR)
                console.log(e)
            }
        }

    }

    try {
        await client.connect()
        console.log("Connected to database:", OK)

        if (argv.drop) {
            await tryOrSkipOn("Dropping 'blocks' table", '42P01', dropBlocksTable)
            await tryOrSkipOn("Deleting `namebase-stats` role", '42704', dropServiceUser)

        }

        if (!argv.nocreate) {

            await tryOrSkipOn("Creating 'namebase-stats' role", '42710', createServiceUser)
            await tryOrSkipOn("Creating 'blocks' table", '42P07', createBlocksTable)
            await tryOrSkipOn("Granting access 'blocks'", '', grantBlocksAccess)

        }
    }
    catch (e) {
        console.error(`Unrecoverable error:`, e)
    }

    client.end();
}

main()
