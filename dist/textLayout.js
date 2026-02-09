"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureTextWidth = measureTextWidth;
exports.calculateTextLines = calculateTextLines;
exports.splitTextByLines = splitTextByLines;
const canvas_1 = require("canvas");
const path = __importStar(require("path"));
// Pretendard 폰트 등록 (브라우저와 동일한 텍스트 측정)
const fontPath = path.resolve(__dirname, '..', 'fonts', 'Pretendard-Regular.otf');
try {
    (0, canvas_1.registerFont)(fontPath, { family: 'Pretendard' });
}
catch {
    // 폰트 파일 없으면 fallback 사용
}
const HALF_WIDTH_RATIO = 0.6;
const FULL_WIDTH_RATIO = 1.0;
const SPACE_WIDTH_RATIO = 0.3;
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
const SPACE_REGEX = /^\s+$/;
const ASCII_WIDTH_SCALE = 0.94;
const ASCII_LONG_WIDTH_SCALE = 0.92;
const ASCII_LONG_THRESHOLD = 120;
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('ko', { granularity: 'grapheme' })
    : null;
function splitGraphemes(text) {
    if (segmenter) {
        return Array.from(segmenter.segment(text), (s) => s.segment);
    }
    return Array.from(text);
}
const getEffectiveMaxWidth = (paragraph, maxWidth) => {
    if (CJK_REGEX.test(paragraph))
        return maxWidth;
    if (paragraph.length >= ASCII_LONG_THRESHOLD) {
        return maxWidth * ASCII_LONG_WIDTH_SCALE;
    }
    return maxWidth * ASCII_WIDTH_SCALE;
};
const splitBySpaces = (paragraph) => {
    return paragraph.split(/(\s+)/).filter((token) => token.length > 0);
};
const countLinesByChars = (paragraph, maxWidth, fontSize, startWidth = 0) => {
    let lines = 1;
    let lineWidth = startWidth;
    const graphemes = splitGraphemes(paragraph);
    for (const char of graphemes) {
        const charWidth = measureTextWidth(char, fontSize);
        if (lineWidth + charWidth > maxWidth) {
            lines += 1;
            lineWidth = charWidth;
        }
        else {
            lineWidth += charWidth;
        }
    }
    return { lines, lineWidth };
};
// CSS .textItem p의 font-family와 일치
const DEFAULT_FONT_FAMILY = "'Pretendard', 'Tossface', 'Noto Color Emoji', -apple-system, BlinkMacSystemFont, sans-serif";
const textWidthCache = new Map();
let measureCtx = null;
function getMeasureContext(fontSize) {
    if (!measureCtx) {
        const canvas = (0, canvas_1.createCanvas)(1, 1);
        measureCtx = canvas.getContext('2d');
    }
    if (measureCtx) {
        measureCtx.font = `${fontSize}px ${DEFAULT_FONT_FAMILY}`;
    }
    return measureCtx;
}
function measureTextWidth(text, fontSize) {
    if (text.length === 0)
        return 0;
    if (text.length === 1) {
        const cacheKey = `${fontSize}-${text}`;
        const cached = textWidthCache.get(cacheKey);
        if (cached !== undefined)
            return cached;
        const ctx = getMeasureContext(fontSize);
        if (ctx) {
            const width = ctx.measureText(text).width;
            textWidthCache.set(cacheKey, width);
            return width;
        }
    }
    const ctx = getMeasureContext(fontSize);
    if (ctx) {
        return ctx.measureText(text).width;
    }
    // fallback: 문자 비율 근사치
    let width = 0;
    for (const char of text) {
        const code = char.charCodeAt(0);
        const ratio = char === ' '
            ? SPACE_WIDTH_RATIO
            : code > 127 || char.length > 1
                ? FULL_WIDTH_RATIO
                : HALF_WIDTH_RATIO;
        width += fontSize * ratio;
    }
    return width;
}
function countLinesByWidth(paragraph, maxWidth, fontSize) {
    if (paragraph.length === 0)
        return 1;
    const effectiveMaxWidth = getEffectiveMaxWidth(paragraph, maxWidth);
    if (CJK_REGEX.test(paragraph)) {
        return countLinesByChars(paragraph, effectiveMaxWidth, fontSize).lines;
    }
    const tokensBySpace = splitBySpaces(paragraph);
    let lines = 1;
    let lineWidth = 0;
    for (const token of tokensBySpace) {
        const tokenWidth = measureTextWidth(token, fontSize);
        const isSpace = SPACE_REGEX.test(token);
        if (lineWidth + tokenWidth <= effectiveMaxWidth) {
            lineWidth += tokenWidth;
            continue;
        }
        if (!isSpace && tokenWidth <= effectiveMaxWidth) {
            lines += 1;
            lineWidth = tokenWidth;
            continue;
        }
        if (lineWidth > 0) {
            lines += 1;
            lineWidth = 0;
        }
        const { lines: tokenLines, lineWidth: nextWidth } = countLinesByChars(token, effectiveMaxWidth, fontSize, lineWidth);
        lines += tokenLines - 1;
        lineWidth = nextWidth;
    }
    return lines;
}
function calculateTextLines(text, maxWidth, fontSize) {
    const paragraphs = text.split('\n');
    let totalLines = 0;
    for (const paragraph of paragraphs) {
        totalLines += countLinesByWidth(paragraph.trimEnd(), maxWidth, fontSize);
    }
    return totalLines;
}
function splitTextByLines(text, maxLines, maxWidth, fontSize) {
    const paragraphs = text.split('\n');
    let usedLines = 0;
    const fitParagraphs = [];
    const restParagraphs = [];
    let exceeded = false;
    for (const paragraph of paragraphs) {
        if (exceeded) {
            restParagraphs.push(paragraph);
            continue;
        }
        if (paragraph.length === 0) {
            if (usedLines + 1 <= maxLines) {
                fitParagraphs.push(paragraph);
                usedLines += 1;
            }
            else {
                exceeded = true;
                restParagraphs.push(paragraph);
            }
            continue;
        }
        const trimmedParagraph = paragraph.trimEnd();
        const paragraphLines = countLinesByWidth(trimmedParagraph, maxWidth, fontSize);
        if (usedLines + paragraphLines <= maxLines) {
            fitParagraphs.push(trimmedParagraph);
            usedLines += paragraphLines;
        }
        else {
            const remainingLines = maxLines - usedLines;
            if (remainingLines > 0) {
                const effectiveMaxWidth = getEffectiveMaxWidth(paragraph, maxWidth);
                let splitIdx = 0;
                let lineWidth = 0;
                let linesUsed = 1;
                if (CJK_REGEX.test(paragraph)) {
                    const graphemes = splitGraphemes(paragraph);
                    let charIdx = 0;
                    for (const char of graphemes) {
                        const charWidth = measureTextWidth(char, fontSize);
                        if (lineWidth + charWidth > effectiveMaxWidth) {
                            linesUsed += 1;
                            if (linesUsed > remainingLines)
                                break;
                            lineWidth = charWidth;
                        }
                        else {
                            lineWidth += charWidth;
                        }
                        charIdx += char.length;
                        splitIdx = charIdx;
                    }
                    const lastSpace = paragraph.lastIndexOf(' ', splitIdx);
                    if (lastSpace > 0 && splitIdx - lastSpace <= 10) {
                        splitIdx = lastSpace;
                    }
                }
                else {
                    const tokensBySpace = splitBySpaces(paragraph);
                    let cursor = 0;
                    let lastFitIndex = 0;
                    for (const token of tokensBySpace) {
                        const tokenWidth = measureTextWidth(token, fontSize);
                        const isSpace = SPACE_REGEX.test(token);
                        if (lineWidth + tokenWidth <= effectiveMaxWidth) {
                            lineWidth += tokenWidth;
                            cursor += token.length;
                            lastFitIndex = cursor;
                            continue;
                        }
                        if (!isSpace && tokenWidth <= effectiveMaxWidth) {
                            linesUsed += 1;
                            if (linesUsed > remainingLines)
                                break;
                            lineWidth = tokenWidth;
                            cursor += token.length;
                            lastFitIndex = cursor;
                            continue;
                        }
                        if (lineWidth > 0) {
                            linesUsed += 1;
                            if (linesUsed > remainingLines)
                                break;
                            lineWidth = 0;
                        }
                        const tokenGraphemes = splitGraphemes(token);
                        for (const char of tokenGraphemes) {
                            const charWidth = measureTextWidth(char, fontSize);
                            if (lineWidth + charWidth > effectiveMaxWidth) {
                                linesUsed += 1;
                                if (linesUsed > remainingLines)
                                    break;
                                lineWidth = charWidth;
                            }
                            else {
                                lineWidth += charWidth;
                            }
                            cursor += char.length;
                            if (linesUsed <= remainingLines) {
                                lastFitIndex = cursor;
                            }
                            else {
                                break;
                            }
                        }
                        if (linesUsed > remainingLines)
                            break;
                    }
                    splitIdx = lastFitIndex;
                }
                fitParagraphs.push(paragraph.substring(0, splitIdx));
                restParagraphs.push(paragraph.substring(splitIdx).trim());
            }
            else {
                restParagraphs.push(paragraph);
            }
            exceeded = true;
        }
    }
    return {
        fit: fitParagraphs.join('\n').trimEnd(),
        rest: restParagraphs.join('\n').trimEnd(),
    };
}
