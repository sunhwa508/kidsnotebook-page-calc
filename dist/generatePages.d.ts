/**
 * 페이지 생성 로직 (Node.js용 - React useMemo 제거)
 */
import { NotebookPage, WorkspaceReport, WorkspaceAlbum } from './types';
export declare function generatePages(reports: WorkspaceReport[], albums: WorkspaceAlbum[], hiddenIds?: string[]): NotebookPage[];
