"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageMonth = getPageMonth;
exports.extractUniqueMonths = extractUniqueMonths;
exports.calculateInnerPageStartNumber = calculateInnerPageStartNumber;
exports.calculateIndexPageCount = calculateIndexPageCount;
exports.extractUniqueMonthsByType = extractUniqueMonthsByType;
exports.calculateTotalPageCount = calculateTotalPageCount;
function normalizeYearMonth(value) {
    if (!value)
        return null;
    const match = value.match(/^\d{4}-\d{2}$/);
    return match ? value : null;
}
function getPageMonth(page) {
    const metaMonth = normalizeYearMonth(page.metadata?.yearmonth);
    if (metaMonth)
        return metaMonth;
    for (const item of page.items) {
        const match = item.id.match(/(\d{4}-\d{2})-\d{2}/);
        if (match) {
            return match[1];
        }
    }
    return null;
}
function extractUniqueMonths(pages) {
    const monthSet = new Set();
    const monthList = [];
    for (const page of pages) {
        const month = getPageMonth(page);
        if (!month)
            continue;
        if (!monthSet.has(month)) {
            monthSet.add(month);
            monthList.push(month);
        }
    }
    return monthList;
}
function calculateInnerPageStartNumber(monthCount, indexPageCount) {
    if (monthCount === 0)
        return 1;
    const cover = 1;
    const index = indexPageCount ?? Math.ceil(monthCount / 7);
    const firstSectionCover = 1;
    return cover + index + firstSectionCover + 1;
}
function calculateIndexPageCount(reportMonthCount, albumMonthCount, itemsPerPage = 7) {
    const countFor = (count) => count > 0 ? Math.ceil(count / itemsPerPage) : 0;
    return countFor(reportMonthCount) + countFor(albumMonthCount);
}
function extractUniqueMonthsByType(pages) {
    const reportPages = pages.filter((page) => page.metadata?.reportId);
    const albumPages = pages.filter((page) => page.metadata?.albumId);
    return {
        reportMonths: extractUniqueMonths(reportPages),
        albumMonths: extractUniqueMonths(albumPages),
    };
}
function calculateTotalPageCount(pages) {
    if (pages.length === 0)
        return 0;
    const uniqueMonths = extractUniqueMonths(pages);
    const { reportMonths, albumMonths } = extractUniqueMonthsByType(pages);
    const indexPageCount = calculateIndexPageCount(reportMonths.length, albumMonths.length);
    const cover = 1;
    const outro = 1;
    const sectionCovers = uniqueMonths.length;
    const innerPages = pages.length;
    return cover + indexPageCount + sectionCovers + innerPages + outro;
}
