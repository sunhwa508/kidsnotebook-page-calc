import { KN_BOOK_SIZE } from './types';

export const CSS_CONTENT_PADDING_LEFT = 80;
export const CSS_CONTENT_PADDING_RIGHT = 80;
export const MAIN_CONTENT_RIGHT_GAP = 0;
export const IMAGE_GRID_PADDING = 12;
export const IMAGE_MIN_HEIGHT = 136;
export const IMAGE_MAX_HEIGHT = 344;
export const REPORT_HEADER_HEIGHT = 42;
export const GAP_AFTER_HEADER = 5;
export const ALBUM_HEADER_HEIGHT = 38;

export const CONTENT_WIDTH =
  KN_BOOK_SIZE.WIDTH -
  CSS_CONTENT_PADDING_LEFT -
  CSS_CONTENT_PADDING_RIGHT -
  KN_BOOK_SIZE.MAIN_CONTENT_MARGIN_LEFT -
  MAIN_CONTENT_RIGHT_GAP;

export const CONTENT_BOX_WIDTH = CONTENT_WIDTH;
export const REPORT_ITEM_GAP = 32;
export const ALBUM_ITEM_GAP = 32;

export const TEXT_HORIZONTAL_PADDING = 28;
export const TEXT_CONTENT_WIDTH = CONTENT_WIDTH - TEXT_HORIZONTAL_PADDING;
export const TEXT_FONT_SIZE = 14;
export const TEXT_LINE_HEIGHT = 21;
export const TEXT_BLOCK_PADDING = 24;

export const COMMENT_TITLE_WIDTH = 0;
export const COMMENT_TITLE_GAP = 0;
export const COMMENT_BUBBLE_HORIZONTAL_PADDING = 32;
export const COMMENT_FONT_SIZE = 12;
export const COMMENT_LINE_HEIGHT = 18;
export const COMMENT_HEADER_HEIGHT = 20;
export const COMMENT_PADDING = 27;

// offset 표시 크기 (원본 비율 유지, scale factor: 0.28)
export const OFFSET_SIZES = [
  { name: 'sm', width: 112, height: 300, variants: 3 },
  { name: 'md', width: 172, height: 300, variants: 3 },
  { name: 'lg', width: 232, height: 300, variants: 2 },
  { name: 'xl', width: 292, height: 300, variants: 3 },
] as const;

export const MIN_OFFSET_WIDTH = OFFSET_SIZES[0].width; // sm = 112
