'use strict';
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = __importDefault(require("assert"));
var api = __importStar(require("./api"));
var events_1 = require("events");
var db = __importStar(require("./db"));
var consensus = require("hsd/lib/protocol/consensus");
var Plugin = /** @class */ (function (_super) {
    __extends(Plugin, _super);
    function Plugin(node) {
        var _this = _super.call(this) || this;
        _this.node = node;
        assert_1.default(typeof node.logger === 'object');
        _this.logger = node.logger.context("stats");
        _this.config = node.config.filter("stats");
        _this.chain = node.get('chain');
        _this.db = db.init({
            logger: _this.logger,
            connectionString: _this.config.str('connection-string', 'postgres://handshake-stats:test123@localhost/postgres')
        });
        return _this;
    }
    Plugin.prototype.basicBlockStats = function (block) {
        return __awaiter(this, void 0, void 0, function () {
            var height;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.chain.getHeight(block.hash())];
                    case 1:
                        height = _a.sent();
                        return [2 /*return*/, {
                                hash: block.hashHex(),
                                prevhash: block.prevBlock.toString('hex'),
                                time: block.time,
                                height: height,
                                issuance: 0,
                                fees: 0,
                                numAirdrops: 0,
                                airdropAmt: 0,
                                numopens: 0,
                                numrunning: 0,
                                onwinningchain: false
                            }];
                }
            });
        });
    };
    Plugin.prototype.calcBlockStats = function (block) {
        return __awaiter(this, void 0, void 0, function () {
            var stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.basicBlockStats(block)];
                    case 1:
                        stats = _a.sent();
                        stats.fees =
                            block.txs[0].outputs[0].value - consensus.getReward(stats.height, this.node.network.halvingInterval);
                        block.txs.forEach(function (tx) {
                            if (tx.isCoinbase()) {
                                stats.issuance += tx.getOutputValue();
                                tx.outputs.slice(1).forEach(function (output) {
                                    stats.numAirdrops += 1;
                                    stats.airdropAmt += output.value;
                                });
                            }
                            else {
                                tx.outputs.forEach(function (output) {
                                    if (output.covenant.isOpen()) {
                                        stats.numopens += 1;
                                    }
                                });
                            }
                        });
                        return [2 /*return*/, stats];
                }
            });
        });
    };
    Plugin.prototype.open = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.catchUpWithChain()
                        // TODO - track the created promises and ensure that we don't
                        //        exit before handling them, if possible
                    ];
                    case 1:
                        _a.sent();
                        // TODO - track the created promises and ensure that we don't
                        //        exit before handling them, if possible
                        this.chain.on('block', this.handleNewBlock.bind(this));
                        this.httpServer = api.init(this.logger, this.db).listen(this.config.uint('port', 8080));
                        return [2 /*return*/];
                }
            });
        });
    };
    /* The plan - check our DB's chain height vs the node's chain height.
     * If we're behind, catch up, and queue incoming blocks. In theory, this
     * let's us blow away the DB and rebuild from scratch. It's more practically
     * useful if the sync gets interrupted on the first run.
     */
    Plugin.prototype.catchUpWithChain = function () {
        return __awaiter(this, void 0, void 0, function () {
            var dbChainHeight, nodeChainHeight, inboundQueue_1, pushItem, i, entry, block, stats;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.db.getChainHeight()];
                    case 1:
                        dbChainHeight = _a.sent();
                        nodeChainHeight = this.chain.height;
                        if (!(dbChainHeight < nodeChainHeight)) return [3 /*break*/, 8];
                        this.logger.info("DB is " + (nodeChainHeight - dbChainHeight) + " blocks behind. Catching up.");
                        inboundQueue_1 = [];
                        pushItem = function (block) { return __awaiter(_this, void 0, void 0, function () {
                            var stats;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.calcBlockStats(block)];
                                    case 1:
                                        stats = _a.sent();
                                        inboundQueue_1.push(stats);
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        this.chain.on('block', pushItem);
                        i = dbChainHeight + 1;
                        _a.label = 2;
                    case 2:
                        if (!(i < nodeChainHeight)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.chain.getEntryByHeight(i)];
                    case 3:
                        entry = _a.sent();
                        return [4 /*yield*/, this.chain.getBlock(entry.hash)];
                    case 4:
                        block = _a.sent();
                        return [4 /*yield*/, this.calcBlockStats(block)];
                    case 5:
                        stats = _a.sent();
                        this.db.insertBlockStats(stats);
                        _a.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 2];
                    case 7:
                        this.chain.removeListener('block', pushItem);
                        inboundQueue_1.forEach(function (stats) { return _this.db.insertBlockStats(stats); });
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    Plugin.prototype.handleNewBlock = function (block, entry) {
        return __awaiter(this, void 0, void 0, function () {
            var prevHash, dbTipHash, stats, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info('got block', block.hashHex(), 'at time', block.time);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        prevHash = block.prevBlock.toString('hex');
                        return [4 /*yield*/, this.db.blockExists(prevHash)];
                    case 2:
                        if (!!(_a.sent())) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.catchUpWithChain()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this.db.getChainTipHash()];
                    case 5:
                        dbTipHash = _a.sent();
                        if (!(dbTipHash != prevHash)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.reorganize(dbTipHash, prevHash)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [4 /*yield*/, this.calcBlockStats(block)];
                    case 8:
                        stats = _a.sent();
                        this.db.insertBlockStats(stats);
                        return [3 /*break*/, 10];
                    case 9:
                        e_1 = _a.sent();
                        this.logger.error('Failed to queue block for insert', block.hashHex());
                        throw e_1;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    Plugin.prototype.reorganize = function (oldTipHash, newTipHash) {
        return __awaiter(this, void 0, void 0, function () {
            var oldTip, newTip, forkPoint, currentEntry, currentHash, toConnect, next, nextHash, nextBlock, stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.warning("Preparing to handle a reorg from current tip " + oldTipHash + " to new tip " + newTipHash);
                        return [4 /*yield*/, this.chain.getEntry(Buffer.from(oldTipHash, 'hex'))];
                    case 1:
                        oldTip = _a.sent();
                        return [4 /*yield*/, this.chain.getEntry(Buffer.from(newTipHash, 'hex'))];
                    case 2:
                        newTip = _a.sent();
                        return [4 /*yield*/, this.chain.findFork(oldTip, newTip)];
                    case 3:
                        forkPoint = _a.sent();
                        this.logger.debug("fork point:", forkPoint);
                        currentEntry = oldTip;
                        _a.label = 4;
                    case 4:
                        if (!!currentEntry.hash.equals(forkPoint.hash)) return [3 /*break*/, 7];
                        currentHash = currentEntry.hash.toString('hex');
                        this.logger.debug("disconnecting block at:", currentHash);
                        return [4 /*yield*/, this.db.disconnectBlock(currentHash)];
                    case 5:
                        _a.sent();
                        this.logger.debug("disconnect successful");
                        return [4 /*yield*/, this.chain.getPrevious(currentEntry)];
                    case 6:
                        currentEntry = _a.sent();
                        return [3 /*break*/, 4];
                    case 7:
                        this.logger.debug("disconnects complete");
                        toConnect = [];
                        currentEntry = newTip;
                        _a.label = 8;
                    case 8:
                        if (!!currentEntry.hash.equals(forkPoint.hash)) return [3 /*break*/, 10];
                        toConnect.push(currentEntry);
                        return [4 /*yield*/, this.chain.getPrevious(currentEntry)];
                    case 9:
                        currentEntry = _a.sent();
                        return [3 /*break*/, 8];
                    case 10:
                        this.logger.debug("finished scanning blocks to connect");
                        _a.label = 11;
                    case 11:
                        if (!(toConnect.length > 0)) return [3 /*break*/, 18];
                        next = toConnect.pop();
                        if (!next) return [3 /*break*/, 17];
                        nextHash = next.hash.toString('hex');
                        return [4 /*yield*/, this.db.blockExists(nextHash)];
                    case 12:
                        if (!_a.sent()) return [3 /*break*/, 14];
                        return [4 /*yield*/, this.db.connectBlock(nextHash)];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 17];
                    case 14: return [4 /*yield*/, this.chain.getBlock(Buffer.from(nextHash, 'hex'))];
                    case 15:
                        nextBlock = _a.sent();
                        return [4 /*yield*/, this.calcBlockStats(nextBlock)];
                    case 16:
                        stats = _a.sent();
                        this.db.insertBlockStats(stats);
                        _a.label = 17;
                    case 17: return [3 /*break*/, 11];
                    case 18:
                        this.logger.info("Reorg complete");
                        return [2 /*return*/];
                }
            });
        });
    };
    Plugin.prototype.handleDisconnect = function (entry) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.db.disconnectBlock(entry.hash.toString('hex'));
                return [2 /*return*/];
            });
        });
    };
    Plugin.prototype.close = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, ((_a = this.httpServer) === null || _a === void 0 ? void 0 : _a.close())];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.db.close()];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Plugin;
}(events_1.EventEmitter));
exports.Plugin = Plugin;
exports.id = 'handshake-stats';
function init(node) {
    return new Plugin(node);
}
exports.init = init;
