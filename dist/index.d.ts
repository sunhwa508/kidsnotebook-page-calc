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
    /** top-level selected_filter_type (filter의 alias) */
    selected_filter_type?: FilterSettings;
    /** user_data.selected_filter_type으로 저장된 필터 */
    user_data?: {
        selected_filter_type?: FilterSettings;
    };
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
