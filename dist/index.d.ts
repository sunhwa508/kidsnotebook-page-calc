import { WorkspaceReport, WorkspaceAlbum } from './types';
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
export declare function calcPages(input: CalcPagesInput): CalcPagesOutput;
export { generatePages } from './generatePages';
export { calculateTotalPageCount } from './pageCalculator';
export type { WorkspaceReport, WorkspaceAlbum } from './types';
