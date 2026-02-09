import { WorkspaceReport, WorkspaceAlbum } from './types';
import { generatePages } from './generatePages';
import { calculateTotalPageCount } from './pageCalculator';
import { toKstDateString } from './kstDate';

export interface FilterSettings {
  excludeAlbum?: boolean;
  excludeReport?: boolean;
  excludeHomeReport?: boolean;
  excludeNoPhotoReport?: boolean;
  excludeComment?: boolean;
}

export interface CalcPagesInput {
  reports: WorkspaceReport[];
  albums: WorkspaceAlbum[];
  hiddenIds?: string[];
  filter?: FilterSettings;
}

export interface CalcPagesOutput {
  totalPages: number;
  innerPages: number;
  startDate: string;
  endDate: string;
}

/**
 * 필터 설정에 따라 reports 필터링
 */
function filterReports(
  reports: WorkspaceReport[],
  filter: FilterSettings,
): WorkspaceReport[] {
  if (filter.excludeReport) return [];

  return reports
    .filter((report) => {
      if (filter.excludeHomeReport && !report.is_sent_from_center) return false;
      if (filter.excludeNoPhotoReport) {
        if (!report.images || report.images.length === 0) return false;
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
function filterAlbums(
  albums: WorkspaceAlbum[],
  filter: FilterSettings,
): WorkspaceAlbum[] {
  if (filter.excludeAlbum) return [];
  return albums;
}

/**
 * is_selected: false인 항목을 hiddenIds로 변환
 * (프론트엔드 extractInitialDeselectedIds와 동일 로직)
 */
function buildHiddenIdsFromSelection(
  reports: WorkspaceReport[],
  albums: WorkspaceAlbum[],
  existingHiddenIds: string[],
): string[] {
  const hiddenSet = new Set(existingHiddenIds);

  for (const report of reports) {
    if (!report.created) continue;
    const date = toKstDateString(report.created);
    const reportId = String(report.id);

    // 텍스트: report.is_selected로 판단
    if (!report.is_selected) {
      hiddenSet.add(`text-${reportId}-${date}`);
    }

    // 비디오 썸네일: 개별 is_selected 체크 (인덱스 0부터)
    (report.videos ?? []).forEach((video, idx) => {
      if (!video.is_selected) {
        hiddenSet.add(`report-${reportId}-img-${date}-${idx}`);
      }
    });

    // 이미지: 개별 is_selected 체크 (비디오 뒤 인덱스)
    const videoOffset = report.videos?.length ?? 0;
    (report.images ?? []).forEach((img, idx) => {
      if (!img.is_selected) {
        hiddenSet.add(`report-${reportId}-img-${date}-${videoOffset + idx}`);
      }
    });

    // 댓글: 개별 is_selected 체크
    (report.comments ?? []).forEach((comment, idx) => {
      if (!comment.is_selected) {
        hiddenSet.add(`comment-${reportId}-${date}-${idx}`);
      }
    });
  }

  for (const album of albums) {
    if (!album.created) continue;
    const date = toKstDateString(album.created);
    const albumId = String(album.id);

    // 비디오 썸네일: 개별 is_selected 체크
    (album.videos ?? []).forEach((video, idx) => {
      if (!video.is_selected) {
        hiddenSet.add(`album-${albumId}-img-${date}-${idx}`);
      }
    });

    // 이미지: 개별 is_selected 체크 (비디오 뒤 인덱스)
    const videoOffset = album.videos?.length ?? 0;
    (album.images ?? []).forEach((img, idx) => {
      if (!img.is_selected) {
        hiddenSet.add(`album-${albumId}-img-${date}-${videoOffset + idx}`);
      }
    });
  }

  return Array.from(hiddenSet);
}

export function calcPages(input: CalcPagesInput): CalcPagesOutput {
  const { reports, albums, hiddenIds = [], filter = {} } = input;

  // 1. 필터 설정 적용 (앨범 제거, 가정 알림장 제거 등)
  const filteredBySettings = {
    reports: filterReports(reports, filter),
    albums: filterAlbums(albums, filter),
  };

  // 2. is_selected: false → hiddenIds 변환
  const allHiddenIds = buildHiddenIdsFromSelection(
    filteredBySettings.reports,
    filteredBySettings.albums,
    hiddenIds,
  );

  // 3. 데이터 전처리: 빈 comments 필터링, 빈 미디어 앨범 제외
  const processedReports = filteredBySettings.reports.map((report) => ({
    ...report,
    comments: report.comments.filter(
      (comment) => comment.text && comment.text.trim() !== '',
    ),
  }));
  const processedAlbums = filteredBySettings.albums.filter(
    (album) =>
      (album.images && album.images.length > 0) ||
      (album.videos && album.videos.length > 0),
  );

  if (processedReports.length === 0 && processedAlbums.length === 0) {
    return { totalPages: 0, innerPages: 0, startDate: '', endDate: '' };
  }

  const innerPageList = generatePages(
    processedReports,
    processedAlbums,
    allHiddenIds,
  );
  const totalPages = calculateTotalPageCount(innerPageList);

  const allDates = [
    ...processedReports.map((r) => toKstDateString(r.created)),
    ...processedAlbums.map((a) => toKstDateString(a.created)),
  ].sort((a, b) => a.localeCompare(b));

  return {
    totalPages,
    innerPages: innerPageList.length,
    startDate: allDates[0] ?? '',
    endDate: allDates[allDates.length - 1] ?? '',
  };
}

export { generatePages } from './generatePages';
export { calculateTotalPageCount } from './pageCalculator';
export type { WorkspaceReport, WorkspaceAlbum } from './types';
