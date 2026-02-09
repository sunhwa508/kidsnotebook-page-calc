import { NotebookPage } from './types';

function normalizeYearMonth(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^\d{4}-\d{2}$/);
  return match ? value : null;
}

export function getPageMonth(page: NotebookPage): string | null {
  const metaMonth = normalizeYearMonth(page.metadata?.yearmonth);
  if (metaMonth) return metaMonth;

  for (const item of page.items) {
    const match = item.id.match(/(\d{4}-\d{2})-\d{2}/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function extractUniqueMonths(pages: NotebookPage[]): string[] {
  const monthSet = new Set<string>();
  const monthList: string[] = [];

  for (const page of pages) {
    const month = getPageMonth(page);
    if (!month) continue;
    if (!monthSet.has(month)) {
      monthSet.add(month);
      monthList.push(month);
    }
  }

  return monthList;
}

export function calculateInnerPageStartNumber(
  monthCount: number,
  indexPageCount?: number,
): number {
  if (monthCount === 0) return 1;

  const cover = 1;
  const index = indexPageCount ?? Math.ceil(monthCount / 7);
  const firstSectionCover = 1;

  return cover + index + firstSectionCover + 1;
}

export function calculateIndexPageCount(
  reportMonthCount: number,
  albumMonthCount: number,
  itemsPerPage: number = 7,
): number {
  const countFor = (count: number) =>
    count > 0 ? Math.ceil(count / itemsPerPage) : 0;
  return countFor(reportMonthCount) + countFor(albumMonthCount);
}

export function extractUniqueMonthsByType(pages: NotebookPage[]): {
  reportMonths: string[];
  albumMonths: string[];
} {
  const reportPages = pages.filter((page) => page.metadata?.reportId);
  const albumPages = pages.filter((page) => page.metadata?.albumId);
  return {
    reportMonths: extractUniqueMonths(reportPages),
    albumMonths: extractUniqueMonths(albumPages),
  };
}

export function calculateTotalPageCount(pages: NotebookPage[]): number {
  if (pages.length === 0) return 0;
  const uniqueMonths = extractUniqueMonths(pages);
  const { reportMonths, albumMonths } = extractUniqueMonthsByType(pages);
  const indexPageCount = calculateIndexPageCount(
    reportMonths.length,
    albumMonths.length,
  );
  const cover = 1;
  const outro = 1;
  const sectionCovers = uniqueMonths.length;
  const innerPages = pages.length;
  return cover + indexPageCount + sectionCovers + innerPages + outro;
}
