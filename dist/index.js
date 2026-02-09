"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTotalPageCount = exports.generatePages = void 0;
exports.calcPages = calcPages;
const generatePages_1 = require("./generatePages");
const pageCalculator_1 = require("./pageCalculator");
const kstDate_1 = require("./kstDate");
function calcPages(input) {
    const { reports, albums, hiddenIds = [] } = input;
    // 데이터 전처리: 빈 comments 필터링, 빈 미디어 앨범 제외
    const filteredReports = reports.map((report) => ({
        ...report,
        comments: report.comments.filter((comment) => comment.text && comment.text.trim() !== ''),
    }));
    const filteredAlbums = albums.filter((album) => (album.images && album.images.length > 0) ||
        (album.videos && album.videos.length > 0));
    if (filteredReports.length === 0 && filteredAlbums.length === 0) {
        return { totalPages: 0, innerPages: 0, startDate: '', endDate: '' };
    }
    const innerPageList = (0, generatePages_1.generatePages)(filteredReports, filteredAlbums, hiddenIds);
    const totalPages = (0, pageCalculator_1.calculateTotalPageCount)(innerPageList);
    const allDates = [
        ...filteredReports.map((r) => (0, kstDate_1.toKstDateString)(r.created)),
        ...filteredAlbums.map((a) => (0, kstDate_1.toKstDateString)(a.created)),
    ].sort((a, b) => a.localeCompare(b));
    return {
        totalPages,
        innerPages: innerPageList.length,
        startDate: allDates[0] ?? '',
        endDate: allDates[allDates.length - 1] ?? '',
    };
}
var generatePages_2 = require("./generatePages");
Object.defineProperty(exports, "generatePages", { enumerable: true, get: function () { return generatePages_2.generatePages; } });
var pageCalculator_2 = require("./pageCalculator");
Object.defineProperty(exports, "calculateTotalPageCount", { enumerable: true, get: function () { return pageCalculator_2.calculateTotalPageCount; } });
