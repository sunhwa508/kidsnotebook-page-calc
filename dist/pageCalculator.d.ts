import { NotebookPage } from './types';
export declare function getPageMonth(page: NotebookPage): string | null;
export declare function extractUniqueMonths(pages: NotebookPage[]): string[];
export declare function calculateInnerPageStartNumber(monthCount: number, indexPageCount?: number): number;
export declare function calculateIndexPageCount(reportMonthCount: number, albumMonthCount: number, itemsPerPage?: number): number;
export declare function extractUniqueMonthsByType(pages: NotebookPage[]): {
    reportMonths: string[];
    albumMonths: string[];
};
export declare function calculateTotalPageCount(pages: NotebookPage[]): number;
