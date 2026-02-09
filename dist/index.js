"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTotalPageCount = exports.generatePages = void 0;
exports.calcPages = calcPages;
const generatePages_1 = require("./generatePages");
const pageCalculator_1 = require("./pageCalculator");
const kstDate_1 = require("./kstDate");
/**
 * 필터 설정에 따라 reports 필터링
 */
function filterReports(reports, filter) {
    if (filter.excludeReport)
        return [];
    return reports
        .filter((report) => {
        if (filter.excludeHomeReport && !report.is_sent_from_center)
            return false;
        if (filter.excludeNoPhotoReport) {
            if (!report.images || report.images.length === 0)
                return false;
        }
        return true;
    })
        .map((report) => {
        if (filter.excludeComment && report.comments?.length) {
            return { ...report, comments: [] };
        }
        return report;
    });
}
/**
 * 필터 설정에 따라 albums 필터링
 */
function filterAlbums(albums, filter) {
    if (filter.excludeAlbum)
        return [];
    return albums;
}
/**
 * is_selected: false인 항목을 hiddenIds로 변환
 */
function buildHiddenIdsFromSelection(reports, albums, existingHiddenIds) {
    const hiddenSet = new Set(existingHiddenIds);
    for (const report of reports) {
        if (!report.created)
            continue;
        const date = (0, kstDate_1.toKstDateString)(report.created);
        const reportId = String(report.id);
        // 알림장 자체가 is_selected: false → 텍스트, 이미지, 댓글, 생활기록 모두 숨김
        if (!report.is_selected) {
            hiddenSet.add(`text-${reportId}-${date}`);
            const mediaCount = (report.videos?.length ?? 0) + (report.images?.length ?? 0);
            for (let i = 0; i < mediaCount; i++) {
                hiddenSet.add(`report-${reportId}-img-${date}-${i}`);
            }
            (report.comments ?? []).forEach((_, idx) => {
                hiddenSet.add(`comment-${reportId}-${date}-${idx}`);
            });
            continue;
        }
        // 개별 이미지 is_selected 체크
        let mediaIdx = 0;
        (report.videos ?? []).forEach((video) => {
            if (!video.is_selected) {
                hiddenSet.add(`report-${reportId}-img-${date}-${mediaIdx}`);
            }
            mediaIdx++;
        });
        (report.images ?? []).forEach((img) => {
            if (!img.is_selected) {
                hiddenSet.add(`report-${reportId}-img-${date}-${mediaIdx}`);
            }
            mediaIdx++;
        });
        // 개별 댓글 is_selected 체크
        (report.comments ?? []).forEach((comment, idx) => {
            if (!comment.is_selected) {
                hiddenSet.add(`comment-${reportId}-${date}-${idx}`);
            }
        });
    }
    for (const album of albums) {
        if (!album.created)
            continue;
        const date = (0, kstDate_1.toKstDateString)(album.created);
        const albumId = String(album.id);
        if (!album.is_selected) {
            const mediaCount = (album.videos?.length ?? 0) + (album.images?.length ?? 0);
            for (let i = 0; i < mediaCount; i++) {
                hiddenSet.add(`album-${albumId}-img-${date}-${i}`);
            }
            continue;
        }
        let mediaIdx = 0;
        (album.videos ?? []).forEach((video) => {
            if (!video.is_selected) {
                hiddenSet.add(`album-${albumId}-img-${date}-${mediaIdx}`);
            }
            mediaIdx++;
        });
        (album.images ?? []).forEach((img) => {
            if (!img.is_selected) {
                hiddenSet.add(`album-${albumId}-img-${date}-${mediaIdx}`);
            }
            mediaIdx++;
        });
    }
    return Array.from(hiddenSet);
}
function calcPages(input) {
    const { reports, albums, hiddenIds = [], filter = {} } = input;
    // 1. 필터 설정 적용 (앨범 제거, 가정 알림장 제거 등)
    const filteredBySettings = {
        reports: filterReports(reports, filter),
        albums: filterAlbums(albums, filter),
    };
    // 2. is_selected: false → hiddenIds 변환
    const allHiddenIds = buildHiddenIdsFromSelection(filteredBySettings.reports, filteredBySettings.albums, hiddenIds);
    // 3. 데이터 전처리: 빈 comments 필터링, 빈 미디어 앨범 제외
    const processedReports = filteredBySettings.reports.map((report) => ({
        ...report,
        comments: report.comments.filter((comment) => comment.text && comment.text.trim() !== ''),
    }));
    const processedAlbums = filteredBySettings.albums.filter((album) => (album.images && album.images.length > 0) ||
        (album.videos && album.videos.length > 0));
    if (processedReports.length === 0 && processedAlbums.length === 0) {
        return { totalPages: 0, innerPages: 0, startDate: '', endDate: '' };
    }
    const innerPageList = (0, generatePages_1.generatePages)(processedReports, processedAlbums, allHiddenIds);
    const totalPages = (0, pageCalculator_1.calculateTotalPageCount)(innerPageList);
    const allDates = [
        ...processedReports.map((r) => (0, kstDate_1.toKstDateString)(r.created)),
        ...processedAlbums.map((a) => (0, kstDate_1.toKstDateString)(a.created)),
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
