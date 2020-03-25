"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var slonik_1 = require("slonik");
// TODO - verify this math is correct
exports.NUM_BLOCKS_AUCTION_IS_OPEN = 37 + 720 + 1440; // opening, bidding, revealing
var MissingBlockError = /** @class */ (function (_super) {
    __extends(MissingBlockError, _super);
    function MissingBlockError(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        _this.name = MissingBlockError.name;
        return _this;
    }
    return MissingBlockError;
}(Error));
exports.MissingBlockError = MissingBlockError;
// type DbFunc<TArgs, TResult> = (connection: DatabasePoolConnectionType, args: TArgs) => Promise<TResult>
var DbRunner = /** @class */ (function () {
    function DbRunner(logger, connectionString) {
        this.logger = logger;
        this.blockQueue = [];
        this.insertExecutor = null;
        this.pool = slonik_1.createPool(connectionString);
    }
    // This burns through the queue until it's empty
    DbRunner.prototype.startWork = function () {
        return __awaiter(this, void 0, void 0, function () {
            var item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(item = this.blockQueue.shift())) return [3 /*break*/, 2];
                        return [4 /*yield*/, insertBlockStats(this.pool, this.logger, item)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2:
                        this.insertExecutor = null;
                        return [2 /*return*/];
                }
            });
        });
    };
    DbRunner.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.pool.end()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        }); });
    };
    DbRunner.prototype.blockExists = function (blockHash) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.connect(function (connection) { return __awaiter(_this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, connection.oneFirst(slonik_1.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ", ");\n        "], ["\n            SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ", ");\n        "])), blockHash))
                                    // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
                                ];
                                case 1:
                                    result = _a.sent();
                                    // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
                                    return [2 /*return*/, result.valueOf()];
                            }
                        });
                    }); })];
            });
        });
    };
    DbRunner.prototype.getChainHeight = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.connect(function (connection) { return __awaiter(_this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, connection.maybeOne(slonik_1.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n                SELECT max(height) AS chainheight FROM blocks\n                WHERE onwinningchain = true;\n            "], ["\n                SELECT max(height) AS chainheight FROM blocks\n                WHERE onwinningchain = true;\n            "]))))];
                                case 1:
                                    result = _a.sent();
                                    if ((result === null || result === void 0 ? void 0 : result.chainheight) != null) {
                                        return [2 /*return*/, result.chainheight];
                                    }
                                    else {
                                        return [2 /*return*/, -1];
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DbRunner.prototype.timeseries = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.connect(function (connection) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, timeseries(connection, params)];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); })];
            });
        });
    };
    DbRunner.prototype.getBlockStatsByHeight = function (height) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.connect(function (connection) { return __awaiter(_this, void 0, void 0, function () {
                        var maybeStats;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, connection.maybeOne(slonik_1.sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n                SELECT * FROM blocks\n                WHERE height = ", "\n            "], ["\n                SELECT * FROM blocks\n                WHERE height = ", "\n            "])), height))];
                                case 1:
                                    maybeStats = _a.sent();
                                    if (maybeStats !== null) {
                                        return [2 /*return*/, maybeStats];
                                    }
                                    else {
                                        throw new MissingBlockError("No block at height: " + height);
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DbRunner.prototype.getBlockStatsByHash = function (hash) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.connect(function (connection) { return __awaiter(_this, void 0, void 0, function () {
                        var maybeStats;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, connection.maybeOne(slonik_1.sql(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n                SELECT * FROM blocks\n                WHERE hash = ", "\n            "], ["\n                SELECT * FROM blocks\n                WHERE hash = ", "\n            "])), hash))];
                                case 1:
                                    maybeStats = _a.sent();
                                    if (maybeStats !== null) {
                                        return [2 /*return*/, maybeStats];
                                    }
                                    else {
                                        throw new MissingBlockError("No block at hash: " + hash);
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    // This queues blocks to insert 1 at a time and avoid races
    // since we want to compute stats based on previous blocks
    // and that fails if it's not inserted yet
    DbRunner.prototype.insertBlockStats = function (blockStats) {
        // Queue a block to insert 
        this.blockQueue.push(blockStats);
        this.logger.spam('Queued block for insertion', blockStats.hash);
        // If we're not currently pulling from the queue, start
        if (this.insertExecutor === null) {
            this.insertExecutor = this.startWork();
        }
    };
    return DbRunner;
}());
function init(_a) {
    var logger = _a.logger, connectionString = _a.connectionString;
    return new DbRunner(logger, connectionString);
}
exports.init = init;
function insertBlockStats(pool, logger, blockStats) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.transaction(function (txConnection) { return __awaiter(_this, void 0, void 0, function () {
                        var lastBlock, expiring, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, txConnection.maybeOne(slonik_1.sql(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n            SELECT numrunning, onwinningchain\n            FROM blocks WHERE height = ", " - 1;\n        "], ["\n            SELECT numrunning, onwinningchain\n            FROM blocks WHERE height = ", " - 1;\n        "])), blockStats.height))];
                                case 1:
                                    lastBlock = _a.sent();
                                    return [4 /*yield*/, txConnection.maybeOne(slonik_1.sql(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n            SELECT numopens FROM blocks WHERE height = ", ";\n        "], ["\n            SELECT numopens FROM blocks WHERE height = ", ";\n        "])), blockStats.height - exports.NUM_BLOCKS_AUCTION_IS_OPEN))];
                                case 2:
                                    expiring = _a.sent();
                                    if (lastBlock != null) {
                                        blockStats.numrunning = lastBlock.numrunning;
                                        blockStats.onwinningchain = lastBlock.onwinningchain;
                                    }
                                    else if (blockStats.height === 0) {
                                        blockStats.onwinningchain = true; // The genesis block is always winning
                                    }
                                    if (expiring != null) {
                                        blockStats.numrunning -= expiring.numopens;
                                    }
                                    blockStats.numrunning += blockStats.numopens;
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 5, , 6]);
                                    return [4 /*yield*/, txConnection.query(slonik_1.sql(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n            INSERT INTO blocks (\n                hash, prevHash, onwinningchain, time, height, issuance, \n                fees, numAirdrops, airdropAmt, numopens, numrunning\n            ) VALUES (\n                ", ",\n                ", ",\n                ", ",\n                to_timestamp(", "),\n                ", ",\n                ", ",\n                ", ",\n                ", ",\n                ", ",\n                ", ",\n                ", "\n            )\n        "], ["\n            INSERT INTO blocks (\n                hash, prevHash, onwinningchain, time, height, issuance, \n                fees, numAirdrops, airdropAmt, numopens, numrunning\n            ) VALUES (\n                ", ",\n                ", ",\n                ", ",\n                to_timestamp(", "),\n                ", ",\n                ", ",\n                ", ",\n                ", ",\n                ", ",\n                ", ",\n                ", "\n            )\n        "])), blockStats.hash, blockStats.prevhash, blockStats.onwinningchain, blockStats.time, blockStats.height, blockStats.issuance, blockStats.fees, blockStats.numAirdrops, blockStats.airdropAmt, blockStats.numopens, blockStats.numrunning))];
                                case 4:
                                    _a.sent();
                                    logger.info('Inserted block', blockStats.hash);
                                    return [3 /*break*/, 6];
                                case 5:
                                    e_1 = _a.sent();
                                    logger.error("error inserting block:", e_1);
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function timeseries(connection, params) {
    return __awaiter(this, void 0, void 0, function () {
        var operation, series, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    operation = slonik_1.sql(templateObject_8 || (templateObject_8 = __makeTemplateObject([""], [""])));
                    series = slonik_1.sql(templateObject_9 || (templateObject_9 = __makeTemplateObject([""], [""])));
                    switch (params.series) {
                        case 'issuance':
                            series = slonik_1.sql(templateObject_10 || (templateObject_10 = __makeTemplateObject(["issuance - fees"], ["issuance - fees"])));
                            break;
                        case 'fees':
                            series = slonik_1.sql(templateObject_11 || (templateObject_11 = __makeTemplateObject(["fees"], ["fees"])));
                            break;
                        case 'num-airdrops':
                            series = slonik_1.sql(templateObject_12 || (templateObject_12 = __makeTemplateObject(["numAirdrops"], ["numAirdrops"])));
                            break;
                        case 'airdrops':
                            series = slonik_1.sql(templateObject_13 || (templateObject_13 = __makeTemplateObject(["airdropAmt"], ["airdropAmt"])));
                            break;
                        case 'num-blocks':
                            series = slonik_1.sql(templateObject_14 || (templateObject_14 = __makeTemplateObject(["1"], ["1"])));
                            break;
                        case 'opens':
                            series = slonik_1.sql(templateObject_15 || (templateObject_15 = __makeTemplateObject(["numopens"], ["numopens"])));
                            break;
                        case 'running-auctions':
                            series = slonik_1.sql(templateObject_16 || (templateObject_16 = __makeTemplateObject(["numrunning"], ["numrunning"])));
                            break;
                        default:
                            throw new Error("Invalid timeseries: " + params.series);
                    }
                    switch (params.operation) {
                        case 'avg':
                            operation = slonik_1.sql(templateObject_17 || (templateObject_17 = __makeTemplateObject(["avg(", ")"], ["avg(", ")"])), series);
                            break;
                        case 'sum':
                            operation = slonik_1.sql(templateObject_18 || (templateObject_18 = __makeTemplateObject(["sum(", ")"], ["sum(", ")"])), series);
                            break;
                        default:
                            throw new Error("Invalid timeseries operation: " + params.operation + " ");
                    }
                    return [4 /*yield*/, connection.query(slonik_1.sql(templateObject_19 || (templateObject_19 = __makeTemplateObject(["\n        SELECT time_bucket(", ", time) AS label, ", " AS value\n        FROM blocks\n        GROUP BY label\n        ORDER BY label ASC\n    "], ["\n        SELECT time_bucket(", ", time) AS label, ", " AS value\n        FROM blocks\n        GROUP BY label\n        ORDER BY label ASC\n    "])), params.bucketSize, operation))];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) {
                            var rowTime = new Date(row.label);
                            return { label: rowTime.toString(), value: row.value };
                        })];
            }
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19;
