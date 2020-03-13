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
        _this.chain = node.get('chain');
        // TODO - figure out why logger output isn't working
        console.log('namebase-stats connecting to: %s', node.network);
        // this.logger.error(`namebase-stats connecting to: ${node.network}`)
        _this.db = db.init();
        return _this;
    }
    Plugin.prototype.insertBlock = function (block) {
        return __awaiter(this, void 0, void 0, function () {
            var stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getBlockStats(block)];
                    case 1:
                        stats = _a.sent();
                        this.db.insertBlockStats(stats);
                        // let prevBlock = await this.chain.getBlock(block.prevBlock)
                        // if (prevBlock != null) {
                        //     if (!await this.db.blockExists(prevBlock.hashHex())) {
                        //         console.log(`namebase-stats: Inserting missing block ${block.hashHex()}`)
                        //         setImmediate(() => this.insertBlock(prevBlock).catch(e => {
                        //             this.emit('error', `namebase-stats: Failed to insert block ${block.hashHex()}`)
                        //             console.error(`namebase-stats: Failed to insert block ${block.hashHex()}`)
                        //             console.error(e)
                        //         }))
                        //     }
                        // }
                        console.log("namebase-stats: Inserted block " + block.hashHex());
                        return [2 /*return*/];
                }
            });
        });
    };
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
                                // opens: [],
                                numopens: 0,
                                numrunning: 0
                            }];
                }
            });
        });
    };
    Plugin.prototype.getOpenStats = function (block) {
        var results = [];
        block.txs.forEach(function (tx) {
            tx.outputs.filter(function (o) { return o.covenant.isOpen(); })
                .forEach(function (o) {
                var name = o.covenant.items[2];
                if (Buffer.isBuffer(name)) {
                    name = name.toString('ascii');
                }
                results.push({ name: name });
            });
        });
        return results;
    };
    Plugin.prototype.getBlockStats = function (block) {
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
                                        // let name = output.covenant.items[2]
                                        // if (Buffer.isBuffer(name)) {
                                        //     name = name.toString('ascii')
                                        // }
                                        // stats.opens.push({
                                        //     name: name
                                        // })
                                    }
                                });
                            }
                        });
                        // console.log("namebase-stats current block opens:", stats.opens)
                        // let expiringEntry = await this.chain.getEntryByHeight(stats.height - NUM_BLOCKS_AUCTION_IS_OPEN)
                        // if (expiringEntry !== null) {
                        //     let expiringAuctionsBlock = await this.chain.getBlock(expiringEntry.hash)
                        //     // TODO - unify with logic above, cleanup
                        //     let closingAuctions = this.getOpenStats(expiringAuctionsBlock)
                        //     stats.numcloses = closingAuctions.length
                        //     console.log("namebase-stats current block closes:", closingAuctions)
                        // }
                        return [2 /*return*/, stats];
                }
            });
        });
    };
    Plugin.prototype.open = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                console.log('namebase-stats open called');
                this.chain.on('block', function (block) {
                    console.log('namebase-stats got block', block.hashHex(), 'at time', block.time);
                    _this.insertBlock(block).catch(function (e) {
                        console.error("namebase-stats: Failed to insert block " + block.hashHex());
                        console.error(e);
                    });
                });
                // TODO - make port configurable
                this.httpServer = api.init(this.db).listen(8080);
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
exports.id = 'namebase-stats';
function init(node) {
    return new Plugin(node);
}
exports.init = init;
