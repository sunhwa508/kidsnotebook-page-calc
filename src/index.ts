import { WorkspaceReport, WorkspaceAlbum } from './types';
import { generatePages } from './generatePages';
import { calculateTotalPageCount } from './pageCalculator';
import { toKstDateString } from './kstDate';

export interface CalcPagesInput {
  reports: WorkspaceReport[];
  albums: WorkspaceAlbum[];
  hiddenIds?: string[];
}

export interface CalcPagesOutput {
  totalPages: number;
  innerPages: number;
  startDate: string;
  endDate: string;
}

export function calcPages(input: CalcPagesInput): CalcPagesOutput {
  const { reports, albums, hiddenIds = [] } = input;

  // 데이터 전처리: 빈 comments 필터링, 빈 미디어 앨범 제외
  const filteredReports = reports.map((report) => ({
    ...report,
    comments: report.comments.filter(
      (comment) => comment.text && comment.text.trim() !== '',
    ),
  }));
  const filteredAlbums = albums.filter(
    (album) =>
      (album.images && album.images.length > 0) ||
      (album.videos && album.videos.length > 0),
  );

  if (filteredReports.length === 0 && filteredAlbums.length === 0) {
    return { totalPages: 0, innerPages: 0, startDate: '', endDate: '' };
  }

  const innerPageList = generatePages(
    filteredReports,
    filteredAlbums,
    hiddenIds,
  );
  const totalPages = calculateTotalPageCount(innerPageList);

  const allDates = [
    ...filteredReports.map((r) => toKstDateString(r.created)),
    ...filteredAlbums.map((a) => toKstDateString(a.created)),
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
