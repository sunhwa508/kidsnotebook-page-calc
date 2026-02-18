"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_OFFSET_WIDTH = exports.OFFSET_SIZES = exports.COMMENT_PADDING = exports.COMMENT_HEADER_HEIGHT = exports.COMMENT_LINE_HEIGHT = exports.COMMENT_FONT_SIZE = exports.COMMENT_BUBBLE_HORIZONTAL_PADDING = exports.COMMENT_TITLE_GAP = exports.COMMENT_TITLE_WIDTH = exports.TEXT_BLOCK_PADDING = exports.TEXT_LINE_HEIGHT = exports.TEXT_FONT_SIZE = exports.TEXT_CONTENT_WIDTH = exports.TEXT_HORIZONTAL_PADDING = exports.ALBUM_ITEM_GAP = exports.REPORT_ITEM_GAP = exports.CONTENT_BOX_WIDTH = exports.CONTENT_WIDTH = exports.ALBUM_HEADER_HEIGHT = exports.GAP_AFTER_HEADER = exports.REPORT_HEADER_HEIGHT = exports.IMAGE_MAX_HEIGHT = exports.IMAGE_MIN_HEIGHT = exports.IMAGE_GRID_PADDING = exports.MAIN_CONTENT_RIGHT_GAP = exports.CSS_CONTENT_PADDING_RIGHT = exports.CSS_CONTENT_PADDING_LEFT = void 0;
const types_1 = require("./types");
exports.CSS_CONTENT_PADDING_LEFT = 80;
exports.CSS_CONTENT_PADDING_RIGHT = 80;
exports.MAIN_CONTENT_RIGHT_GAP = 0;
exports.IMAGE_GRID_PADDING = 12;
exports.IMAGE_MIN_HEIGHT = 136;
exports.IMAGE_MAX_HEIGHT = 344;
exports.REPORT_HEADER_HEIGHT = 42;
exports.GAP_AFTER_HEADER = 5;
exports.ALBUM_HEADER_HEIGHT = 38;
exports.CONTENT_WIDTH = types_1.KN_BOOK_SIZE.WIDTH -
    exports.CSS_CONTENT_PADDING_LEFT -
    exports.CSS_CONTENT_PADDING_RIGHT -
    types_1.KN_BOOK_SIZE.MAIN_CONTENT_MARGIN_LEFT -
    exports.MAIN_CONTENT_RIGHT_GAP;
exports.CONTENT_BOX_WIDTH = exports.CONTENT_WIDTH;
exports.REPORT_ITEM_GAP = 32;
exports.ALBUM_ITEM_GAP = 32;
exports.TEXT_HORIZONTAL_PADDING = 28;
exports.TEXT_CONTENT_WIDTH = exports.CONTENT_WIDTH - exports.TEXT_HORIZONTAL_PADDING;
exports.TEXT_FONT_SIZE = 14;
exports.TEXT_LINE_HEIGHT = 21;
exports.TEXT_BLOCK_PADDING = 24;
exports.COMMENT_TITLE_WIDTH = 0;
exports.COMMENT_TITLE_GAP = 0;
exports.COMMENT_BUBBLE_HORIZONTAL_PADDING = 32;
exports.COMMENT_FONT_SIZE = 12;
exports.COMMENT_LINE_HEIGHT = 18;
exports.COMMENT_HEADER_HEIGHT = 20;
exports.COMMENT_PADDING = 27;
// offset 표시 크기 (원본 비율 유지, scale factor: 0.28)
exports.OFFSET_SIZES = [
    { name: 'sm', width: 112, height: 300, variants: 3 },
    { name: 'md', width: 172, height: 300, variants: 3 },
    { name: 'lg', width: 232, height: 300, variants: 2 },
    { name: 'xl', width: 292, height: 300, variants: 3 },
];
exports.MIN_OFFSET_WIDTH = exports.OFFSET_SIZES[0].width; // sm = 112
