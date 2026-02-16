"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureTextWidth = measureTextWidth;
exports.calculateTextLines = calculateTextLines;
exports.splitTextByLines = splitTextByLines;
// 프론트엔드 SSR fallback과 동일한 비율 기반 너비 계산
// (kidsnote-web-store textLayout.ts의 Canvas 미사용 경로와 일치)
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
function measureTextWidth(text, fontSize) {
    if (text.length === 0)
        return 0;
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
