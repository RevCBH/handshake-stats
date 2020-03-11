import { Client } from 'pg'
import chalk = require('chalk')

const argv = require('yargs')
    .command('init_db', 'Initializes or re-initalized the database for')
    .option('nuke', {
        description: 'Delete everything this script manages',
        type: 'boolean',
    })
    .argv

const createBlocksTable = `
CREATE TABLE blocks (
    hash CHAR(64)
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

    console.log(argv)

    try {
        if (argv.nuke) {
            await client.connect()
            console.log("Connected to database:", chalk.greenBright("OK"))

            await tryOrSkipOn("Dropping 'blocks' table", '42P01', dropBlocksTable)
            await tryOrSkipOn("Deleting `namebase-stats` role", '42704', dropServiceUser)

        } else {
            await client.connect()
            console.log("Connected to database:", chalk.greenBright("OK"))

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
