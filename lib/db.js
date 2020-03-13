"use strict";
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
function init() {
    var _this = this;
    // TODO - make connection string configurable
    var pool = slonik_1.createPool('postgres://namebase-stats:test123@localhost/postgres');
    function withPool(f) {
        return function (args) {
            return pool.connect(function (connection) {
                return f(connection, args);
            });
        };
    }
    return {
        close: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, pool.end()];
        }); }); },
        insertBlockStats: withPool(insertBlockStats),
        blockExists: withPool(blockExists),
        // API queries
        timeseries: withPool(timeseries)
    };
}
exports.init = init;
function insertBlockStats(connection, blockStats) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connection.query(slonik_1.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        INSERT INTO blocks (hash, prevHash, time, issuance, fees, numAirdrops, airdropAmt, opens)\n        VALUES (\n            ", ",\n            ", ",\n            to_timestamp(", "),\n            ", ",\n            ", ",\n            ", ",\n            ", ",\n            ", "\n        )\n    "], ["\n        INSERT INTO blocks (hash, prevHash, time, issuance, fees, numAirdrops, airdropAmt, opens)\n        VALUES (\n            ", ",\n            ", ",\n            to_timestamp(", "),\n            ", ",\n            ", ",\n            ", ",\n            ", ",\n            ", "\n        )\n    "])), blockStats.hash, blockStats.prevhash, blockStats.time, blockStats.issuance, blockStats.fees, blockStats.numAirdrops, blockStats.airdropAmt, blockStats.opens))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function blockExists(connection, blockHash) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connection.oneFirst(slonik_1.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ", ");\n    "], ["\n        SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = ", ");\n    "])), blockHash))
                    // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
                ];
                case 1:
                    result = _a.sent();
                    // ISSUE - forced typing, see: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41477
                    return [2 /*return*/, result.valueOf()];
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
                    operation = slonik_1.sql(templateObject_3 || (templateObject_3 = __makeTemplateObject([""], [""])));
                    series = slonik_1.sql(templateObject_4 || (templateObject_4 = __makeTemplateObject([""], [""])));
                    switch (params.series) {
                        case 'issuance':
                            series = slonik_1.sql(templateObject_5 || (templateObject_5 = __makeTemplateObject(["issuance - fees"], ["issuance - fees"])));
                            break;
                        case 'num-airdrops':
                            series = slonik_1.sql(templateObject_6 || (templateObject_6 = __makeTemplateObject(["numAirdrops"], ["numAirdrops"])));
                            break;
                        case 'airdrops':
                            series = slonik_1.sql(templateObject_7 || (templateObject_7 = __makeTemplateObject(["airdropAmt"], ["airdropAmt"])));
                            break;
                        case 'num-blocks':
                            series = slonik_1.sql(templateObject_8 || (templateObject_8 = __makeTemplateObject(["1"], ["1"])));
                            break;
                        case 'opens':
                            series = slonik_1.sql(templateObject_9 || (templateObject_9 = __makeTemplateObject(["opens"], ["opens"])));
                            break;
                        default:
                            throw new Error("Invalid timeseries: " + params.series);
                    }
                    switch (params.operation) {
                        case 'avg':
                            operation = slonik_1.sql(templateObject_10 || (templateObject_10 = __makeTemplateObject(["avg(", ")"], ["avg(", ")"])), series);
                            break;
                        case 'sum':
                            operation = slonik_1.sql(templateObject_11 || (templateObject_11 = __makeTemplateObject(["sum(", ")"], ["sum(", ")"])), series);
                            break;
                        default:
                            throw new Error("Invalid timeseries operation: " + params.operation + " ");
                    }
                    return [4 /*yield*/, connection.query(slonik_1.sql(templateObject_12 || (templateObject_12 = __makeTemplateObject(["\n        SELECT time_bucket(", ", time) AS label, ", " AS value\n        FROM blocks\n        GROUP BY label\n        ORDER BY label ASC\n    "], ["\n        SELECT time_bucket(", ", time) AS label, ", " AS value\n        FROM blocks\n        GROUP BY label\n        ORDER BY label ASC\n    "])), params.bucketSize, operation))];
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
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12;
