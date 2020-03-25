import { Client } from 'pg'
import chalk = require('chalk')

const argv = require('yargs')
    .command('init_db', 'Initializes or re-initalized the database for')
    .option('drop', {
        description: "Delete everything this script manages, given the other parameters.",
        type: 'boolean',
    })
    .option('nocreate', {
        description: "Don't create anything",
        type: 'boolean',
    })
    .option('connection-string', {
        description: "A postgres connection string",
        type: 'string'
    })
    .option('service-user', {
        description: "The postgres user to create for the stats service",
        type: 'string'
    })
    .option('service-password', {
        description: "The password for the postgres stats user",
        type: 'string'
    })
    .default({
        'connection-string': 'postgresql://postgres:test123@localhost/postgres',
        'service-user': 'handshake-stats',
        'service-password': 'test123'
    })
    .argv

// TODO - make issuance -> blockreward and compute rest
const createBlocksTable = `
CREATE TABLE blocks (
    time            timestamp without time zone not null,
    hash            char(64) not null,
    prevhash        char(64) not null,
    onwinningchain  boolean not null,
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

function createServiceUser(name: string, password: string): string {
    return `
        CREATE ROLE "${name}"
        NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT LOGIN
        PASSWORD '${password}';
    `
}

function dropServiceUser(name: string): string {
    return `DROP ROLE "${name}";`
}

// TODO - narrow privileges?
function grantAccess(name: string): string {
    return `
        GRANT ALL PRIVILEGES ON blocks TO "${name}";
        -- GRANT ALL PRIVILEGES ON auctions TO "${name}";
    `
}

const OK = chalk.greenBright("OK")
const SKIPPED = chalk.yellowBright("SKIPPED")
const ERROR = chalk.redBright("ERROR")

async function main() {
    const client = new Client({ connectionString: argv['connection-string'] })
    const serviceUser = argv['service-user']
    const servicePassword = argv['service-password']

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
            // await tryOrSkipOn("Dropping 'auctions' table", '42P01', dropTable('auctions'))
            await tryOrSkipOn("Dropping 'blocks' table", '42P01', dropTable('blocks'))
            await tryOrSkipOn(`Deleting '${serviceUser}' role`, '42704', dropServiceUser(serviceUser))
        }

        if (!argv.nocreate) {
            await tryOrSkipOn(`Creating '${serviceUser}' role`, '42710',
                createServiceUser(serviceUser, servicePassword))
            await tryOrSkipOn("Creating 'blocks' table", '42P07', createBlocksTable)
            // await tryOrSkipOn("Creating 'auctions' table", '42P07', createAuctionsTable)
            await tryOrSkipOn(`Granting access to '${serviceUser}'`, '', grantAccess(serviceUser))

        }
    }
    catch (e) {
        console.error(`Unrecoverable error:`, e)
    }

    client.end();
}

main()
