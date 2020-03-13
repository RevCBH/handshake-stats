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
    time            timestamp without time zone not null,
    hash            char(64) not null,
    prevhash        char(64) not null,
    height          bigint not null,
    issuance        bigint not null,
    fees            bigint not null,
    numairdrops     int not null,
    airdropamt      bigint not null,
    numopens        int not null,
    numrunning      int not null
);

SELECT create_hypertable('blocks', 'time');

CREATE INDEX ON blocks (hash);
CREATE UNIQUE INDEX block_hash ON blocks (time ASC, hash);
`

const createAuctionsTable = `
CREATE TABLE auctions (
    name        varchar(255) not null,
    fromblock   bigint not null
);

CREATE INDEX ON auctions (fromblock);
`

function dropTable(name: string): string { return `DROP TABLE "${name}";` }

const createServiceUser = `
CREATE ROLE "namebase-stats" NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT LOGIN PASSWORD 'test123';
`

const dropServiceUser = `
DROP ROLE "namebase-stats";`

// TODO - narrow privileges?
const grantAccess = `
GRANT ALL PRIVILEGES ON blocks TO "namebase-stats";
GRANT ALL PRIVILEGES ON auctions TO "namebase-stats";
`

const OK = chalk.greenBright("OK")
const SKIPPED = chalk.yellowBright("SKIPPED")
const ERROR = chalk.redBright("ERROR")

async function main() {
    const client = new Client({
        host: 'localhost',
        user: 'postgres',
        password: 'test123',
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
            await tryOrSkipOn("Dropping 'auctions' table", '42P01', dropTable('auctions'))
            await tryOrSkipOn("Dropping 'blocks' table", '42P01', dropTable('blocks'))
            await tryOrSkipOn("Deleting `namebase-stats` role", '42704', dropServiceUser)
        }

        if (!argv.nocreate) {
            await tryOrSkipOn("Creating 'namebase-stats' role", '42710', createServiceUser)
            await tryOrSkipOn("Creating 'blocks' table", '42P07', createBlocksTable)
            await tryOrSkipOn("Creating 'auctions' table", '42P07', createAuctionsTable)
            await tryOrSkipOn("Granting access to 'namebase-stats''", '', grantAccess)

        }
    }
    catch (e) {
        console.error(`Unrecoverable error:`, e)
    }

    client.end();
}

main()
