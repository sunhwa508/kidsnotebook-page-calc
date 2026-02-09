import { WorkspaceReport, WorkspaceAlbum } from './types';
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
export declare function calcPages(input: CalcPagesInput): CalcPagesOutput;
export { generatePages } from './generatePages';
export { calculateTotalPageCount } from './pageCalculator';
export type { WorkspaceReport, WorkspaceAlbum } from './types';
