"use strict";
// Pretendard 폰트 글자별 너비 비율 (width / fontSize)
// 브라우저 Canvas API + PretendardVariable.woff2 에서 100px로 측정한 비율값
// 브라우저와 동일한 텍스트 측정 결과를 보장
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureTextWidth = measureTextWidth;
exports.calculateTextLines = calculateTextLines;
exports.splitTextByLines = splitTextByLines;
// ASCII printable characters (0x20 ~ 0x7E) 너비 비율
const ASCII_WIDTH_RATIOS = {
    ' ': 0.20508, '!': 0.2666, '"': 0.40332, '#': 0.60449, '$': 0.60449,
    '%': 0.80811, '&': 0.66895, "'": 0.25391, '(': 0.32227, ')': 0.32227,
    '*': 0.40039, '+': 0.60449, ',': 0.21484, '-': 0.42871, '.': 0.21484,
    '/': 0.2793, '0': 0.60645, '1': 0.44336, '2': 0.56592, '3': 0.5918,
    '4': 0.60449, '5': 0.58496, '6': 0.61719, '7': 0.54688, '8': 0.59961,
    '9': 0.61719, ':': 0.21484, ';': 0.21484, '<': 0.60449, '=': 0.60449,
    '>': 0.60449, '?': 0.48926, '@': 0.87451, 'A': 0.63525, 'B': 0.60449,
    'C': 0.68604, 'D': 0.67871, 'E': 0.55225, 'F': 0.52783, 'G': 0.70654,
    'H': 0.69922, 'I': 0.22461, 'J': 0.49512, 'K': 0.60059, 'L': 0.52441,
    'M': 0.83105, 'N': 0.69922, 'O': 0.73145, 'P': 0.57764, 'Q': 0.73145,
    'R': 0.59912, 'S': 0.59326, 'T': 0.58105, 'U': 0.69629, 'V': 0.63086,
    'W': 0.92383, 'X': 0.63477, 'Y': 0.6123, 'Z': 0.6167, '[': 0.32227,
    '\\': 0.2793, ']': 0.32227, '^': 0.60449, '_': 0.52686, '`': 0.5,
    'a': 0.50195, 'b': 0.55371, 'c': 0.50098, 'd': 0.55371, 'e': 0.51221,
    'f': 0.30371, 'g': 0.54883, 'h': 0.53906, 'i': 0.20605, 'j': 0.20508,
    'k': 0.48535, 'l': 0.2041, 'm': 0.80322, 'n': 0.52686, 'o': 0.53076,
    'p': 0.54932, 'q': 0.54883, 'r': 0.30811, 's': 0.46533, 't': 0.30127,
    'u': 0.52686, 'v': 0.48291, 'w': 0.71533, 'x': 0.46826, 'y': 0.48633,
    'z': 0.46777, '{': 0.32227, '|': 0.21582, '}': 0.32227, '~': 0.60449,
};
// 한글 음절 (U+AC00-U+D7AF) 너비 비율
const KOREAN_SYLLABLE_RATIO = 0.865;
// CJK 한자 (U+4E00-U+9FFF 등) 너비 비율
const CJK_RATIO = 0.865;
// 일본어 히라가나/카타카나 (U+3040-U+30FF) 너비 비율
const KANA_RATIO = 0.865;
// 이모지 너비 비율
const EMOJI_RATIO = 1.0;
// 기타 전각 문자 fallback
const FULLWIDTH_FALLBACK_RATIO = 0.865;
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
function getCharWidthRatio(char) {
    // ASCII lookup
    const asciiRatio = ASCII_WIDTH_RATIOS[char];
    if (asciiRatio !== undefined)
        return asciiRatio;
    const code = char.charCodeAt(0);
    // 한글 음절 (가-힣)
    if (code >= 0xAC00 && code <= 0xD7AF)
        return KOREAN_SYLLABLE_RATIO;
    // 히라가나 (U+3040-U+309F), 카타카나 (U+30A0-U+30FF)
    if (code >= 0x3040 && code <= 0x30FF)
        return KANA_RATIO;
    // CJK 통합 한자 및 확장
    if ((code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0xF900 && code <= 0xFAFF))
        return CJK_RATIO;
    // 한글 자모 (ㄱ-ㅎ, ㅏ-ㅣ)
    if (code >= 0x3131 && code <= 0x318E)
        return KOREAN_SYLLABLE_RATIO;
    // 전각 영숫자/기호 (U+FF01-U+FF5E)
    if (code >= 0xFF01 && code <= 0xFF5E)
        return FULLWIDTH_FALLBACK_RATIO;
    // 이모지 (서로게이트 페어 또는 길이 > 1)
    if (char.length > 1 || code > 0xFFFF)
        return EMOJI_RATIO;
    // 기타 넓은 문자
    if (code > 127)
        return FULLWIDTH_FALLBACK_RATIO;
    // ASCII fallback (도달하지 않아야 함)
    return 0.5;
}
const textWidthCache = new Map();
function measureTextWidth(text, fontSize) {
    if (text.length === 0)
        return 0;
    if (text.length === 1) {
        const cacheKey = `${fontSize}-${text}`;
        const cached = textWidthCache.get(cacheKey);
        if (cached !== undefined)
            return cached;
        const width = fontSize * getCharWidthRatio(text);
        textWidthCache.set(cacheKey, width);
        return width;
    }
    // 여러 글자: 각 글자의 비율을 합산
    let width = 0;
    for (const char of splitGraphemes(text)) {
        width += fontSize * getCharWidthRatio(char);
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
