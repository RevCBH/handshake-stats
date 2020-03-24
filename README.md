`handshake-stats` is an [HSD](https://github.com/handshake-org/hsd) plugin that stores timeseries data about [handshake](https://handshake.org/).

## Installation

The plugin isn't published to npm yet, so to use it, first clone this repository locally and run:

```bash
npm install
npm link
```

If `npm install` fails, you might have to install libpq. The [npm package](https://www.npmjs.com/package/libpq#install) has details.

Then, in the HSD directory, run:

```bash
npm link handshake-stats
npm install handshake-stats
```

In addition to the handshake daemon, this plugin also requires a running [TimescaleDB](https://github.com/timescale/timescaledb) instance. It's available as a docker container by going back to the folder for this repository and doing:

```bash
npm run docker-pull-db
npm run docker-run-db

# You can get a shell with
npm run docker-psql
```

Finally, once the DB is running, we need to initalize the database with:

```bash
npm run init-db
```

## Usage

To start the handshake daemon with this plugin, add the flag

```
--plugins=handshake-stats
```

This will start an HTTP API endpoint on `localhost:8080`.

## Config

The following flags are available:

* Use `--stats-connection-string` to provide a database connection string. It defaults to 
* Use `--stats-port` to change the API port

The `--db-connection-string` option can also be passed to `npm run init-db`. In addition, it supports:
* `--service-user` to configure the username the plugin will connect to the database with
* `--service-password` to configure the service user's password
```bash
npm run init-db -- --stats-connection-string='postgres://someuser:password@somehost:port/somedatabase'
```
`npm run init-db` requires privilges to create roles and tables.

### API Spec
#### `GET /timeseries/:series/:operation?bucketSize=:bucket-size`

The available paths for `:series` are:

| :series          | Description                                     |
| ---------------- | ----------------------------------------------- |
| issuance         | HNS issued through block reward or airdrop      |
| fees             | Fees taken by miners                            |
| num-airdrops     | Number of airdrops claimed                      |
| airdrops         | HNS issued through airdrops                     |
| num-blocks       | Number of blocks found                          |
| opens            | Number of auctions started via an OPEN covenant |
| running-auctions | The number of concurrently running auctions     |

More to come. See the `timeseries` function in [src/db.ts] for the place to add new types.

Available `:operations` are `:sum` and `:avg`. They work on per-block level. Sometimes this leads to weirdness like `/timeseries/num-blocks/avg` returning 1 for every bucket.

The `:bucket-size` parameter is a string like "1 day". The timeframe can be any of "second" "minute" "hour" or "day" (or a plural of one of those). Any granularity less than ~6 hours will probably lead to slow query times.

#### `GET /block-stats/:hash-or-height`

This will get the recorded stats for any given block, in JSON.

## Limitations and Future Work

Config values including postgres passwords are hard coded!

Data ingestion only really works when starting from the genisis block. A more robust ingestion method is required.

Along a similar vein, adding additional per-block statistics requires rebuilding from scratch. The ability to rescan and update blocks when new stats are added would be good.