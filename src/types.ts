/**
 * 키즈노트북 타입 정의 (Node.js용 - React 의존성 제거)
 */

export type ItemType = 'image' | 'text' | 'comment' | 'life-log';

export interface ImageData {
  url?: string;
  access_key?: string;
  is_video?: boolean;
  width: number;
  height: number;
}

export interface NotebookItem {
  id: string;
  type: ItemType;
  content: string;
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  imageData?: ImageData;
  author?: string;
  createdAt?: string;
  isFirstComment?: boolean;
  totalComments?: number;
  isContinuation?: boolean;
  isContinued?: boolean;
  lifeLog?: LifeLog;
  headerTitle?: string;
  headerAuthor?: string;
  headerWeather?: string;
}

export interface NotebookPage {
  id: string;
  items: NotebookItem[];
  metadata?: {
    isMonthFirstPage?: boolean;
    yearmonth?: string;
    albumId?: string;
    reportId?: string;
    title?: string;
    author?: string;
    weather?: string;
    lifeLog?: LifeLog;
  };
}

export interface KidsnotebookData {
  pages: NotebookPage[];
  metadata: {
    startDate: string;
    endDate: string;
    totalPages: number;
  };
}

export const KN_BOOK_SIZE = {
  WIDTH: 812,
  HEIGHT: 984,
  PADDING: 0,
  FOOTER_HEIGHT: 50,
  MAIN_CONTENT_MARGIN_LEFT: 72,
  CONTENT_TITLE_OFFSET: 15,
  HEADER_HEIGHT: 66,
  MONTH_HEADER_HEIGHT: 213,
  MONTH_FIRST_CONTENT_START: 0,
} as const;

export interface WorkspaceImage {
  url?: string;
  access_key?: string;
  width: number;
  height: number;
  is_selected: boolean;
}

export interface WorkspaceVideo {
  access_key: string;
  width: number;
  height: number;
  is_selected: boolean;
}

export interface WorkspaceComment {
  id: number;
  text: string;
  author: WorkspaceAuthor;
  created_at: string;
  is_selected: boolean;
}

export interface WorkspaceAuthor {
  id: number | null;
  name: string;
}

export interface LifeLog {
  mood_status: string;
  health_status: string;
  temperature_status: string;
  meal_status: string;
  sleep_hour: string;
}

export interface WorkspaceReport {
  id: number;
  type: 'report';
  yearmonth: string;
  created: string;
  title: string;
  content: string;
  author: WorkspaceAuthor;
  is_selected: boolean;
  is_day_selected?: boolean;
  is_sent_from_center: boolean;
  weather: string;
  life_log: LifeLog;
  comments: WorkspaceComment[];
  images: WorkspaceImage[];
  videos: WorkspaceVideo[];
}

export interface WorkspaceAlbum {
  id: number;
  type: 'album';
  yearmonth: string;
  created: string;
  title: string;
  author_name: string;
  is_selected: boolean;
  is_day_selected?: boolean;
  images: WorkspaceImage[];
  videos: WorkspaceVideo[];
}
