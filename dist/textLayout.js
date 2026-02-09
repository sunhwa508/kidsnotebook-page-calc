"use strict";
// Pretendard 폰트 글자별 너비 비율 (width / fontSize)
// PretendardVariable.ttf 에서 100px로 측정한 정확한 비율값
// canvas 패키지 없이 폰트 있는 환경과 동일한 텍스트 측정 가능
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureTextWidth = measureTextWidth;
exports.calculateTextLines = calculateTextLines;
exports.splitTextByLines = splitTextByLines;
// ASCII printable characters (0x20 ~ 0x7E) 너비 비율
const ASCII_WIDTH_RATIOS = {
    ' ': 0.25098, '!': 0.25684, '"': 0.37891, '#': 0.59961, '$': 0.60742,
    '%': 0.8623, '&': 0.60938, "'": 0.20117, '(': 0.34082, ')': 0.34082,
    '*': 0.4707, '+': 0.62695, ',': 0.25781, '-': 0.43262, '.': 0.25391,
    '/': 0.33398, '0': 0.5957, '1': 0.43848, '2': 0.58691, '3': 0.61719,
    '4': 0.62402, '5': 0.59668, '6': 0.61328, '7': 0.55176, '8': 0.60645,
    '9': 0.61328, ':': 0.25391, ';': 0.25391, '<': 0.62695, '=': 0.62695,
    '>': 0.62695, '?': 0.47949, '@': 0.87988, 'A': 0.64551, 'B': 0.61914,
    'C': 0.69336, 'D': 0.68555, 'E': 0.56738, 'F': 0.55664, 'G': 0.70898,
    'H': 0.70605, 'I': 0.24414, 'J': 0.51563, 'K': 0.62109, 'L': 0.5332,
    'M': 0.85254, 'N': 0.71777, 'O': 0.72656, 'P': 0.60449, 'Q': 0.72656,
    'R': 0.6084, 'S': 0.60742, 'T': 0.61133, 'U': 0.70703, 'V': 0.64551,
    'W': 0.91504, 'X': 0.6123, 'Y': 0.63379, 'Z': 0.59473, '[': 0.34082,
    '\\': 0.33398, ']': 0.34082, '^': 0.44238, '_': 0.4248, '`': 0.46875,
    'a': 0.53516, 'b': 0.59082, 'c': 0.5293, 'd': 0.59082, 'e': 0.55273,
    'f': 0.33691, 'g': 0.5791, 'h': 0.5625, 'i': 0.21777, 'j': 0.21777,
    'k': 0.5166, 'l': 0.21777, 'm': 0.83398, 'n': 0.55664, 'o': 0.56738,
    'p': 0.5791, 'q': 0.5791, 'r': 0.34961, 's': 0.49609, 't': 0.33984,
    'u': 0.55273, 'v': 0.5293, 'w': 0.77734, 'x': 0.5127, 'y': 0.5293,
    'z': 0.5127, '{': 0.34082, '|': 0.30566, '}': 0.34082, '~': 0.62695,
};
// 한글 음절 (U+AC00-U+D7AF) 너비 비율 - 11,172자 모두 동일
const KOREAN_SYLLABLE_RATIO = 0.86426;
// CJK 한자 (U+4E00-U+9FFF 등) 너비 비율
const CJK_RATIO = 0.865;
// 일본어 히라가나/카타카나 (U+3040-U+30FF) 너비 비율
const KANA_RATIO = 0.9375;
// 이모지 너비 비율
const EMOJI_RATIO = 1.0;
// 기타 전각 문자 fallback
const FULLWIDTH_FALLBACK_RATIO = 0.86426;
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
