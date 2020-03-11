'use strict';
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import hsd = require('hsd')
var pg = __importStar(require("pg"));
var assert_1 = __importDefault(require("assert"));
var Logger = require('blgr');
// const pool = new pg.Pool({
//     user: 'namebase-stats',
//     host: 'localhost',
//     database: 'postgres',
//     password: 'test123'
// })
var Plugin = /** @class */ (function () {
    function Plugin(node) {
        this.node = node;
        assert_1.default(typeof node.logger === 'object');
        this.logger = node.logger.context("stats");
        this.chain = node.get('chain');
        // TODO - figure out why logger output isn't working
        console.log('namebase-stats connecting to: %s', node.network);
        // this.logger.error(`namebase-stats connecting to: ${node.network}`)
        this.db = new pg.Client({
            host: 'localhost',
            user: 'namebase-stats',
            password: 'test123',
            database: 'postgres',
        });
    }
    Plugin.prototype.open = function () {
        return __awaiter(this, void 0, void 0, function () {
            var chain;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('namebase-stats open called');
                        return [4 /*yield*/, this.db.connect()];
                    case 1:
                        _a.sent();
                        chain = this.node.get('chain');
                        chain.on('block', function (block) {
                            console.log('namebase-stats got block', block.hashHex(), 'at time', block.time);
                            // console.log(JSON.stringify(block))
                            _this.db.query("INSERT INTO blocks (hash, prevHash, numTx, createdAt) VALUES ('" + block.hashHex() + "', '" + block.prevBlock.toString('hex') + "', " + block.txs.length + ", " + block.time + ")")
                                .then(function (_) { return console.log("namebase-stats: Inserted block " + block.hashHex()); })
                                .catch(function (e) {
                                console.error("namebase-stats: Failed to insert block " + block.hashHex());
                                console.error(e);
                            });
                        });
                        console.log('namebase-stats db connected');
                        return [2 /*return*/];
                }
            });
        });
    };
    return Plugin;
}());
exports.id = 'namebase-stats';
function init(node) {
    return new Plugin(node);
}
exports.init = init;
