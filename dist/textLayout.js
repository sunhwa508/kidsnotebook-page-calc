"use strict";
// Pretendard Regular 14px 기준 글자 너비 테이블 (브라우저 Canvas API로 측정)
// font-family: 'Pretendard', 'Tossface', 'Noto Color Emoji', -apple-system, BlinkMacSystemFont, sans-serif
// 다른 fontSize는 선형 비례(fontSize / 14)로 정확히 스케일됨 (검증 완료)
// 커닝 없음: 개별 글자 너비 합 === 전체 문자열 너비 (검증 완료)
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureTextWidth = measureTextWidth;
exports.calculateTextLines = calculateTextLines;
exports.splitTextByLines = splitTextByLines;
const BASE_FONT_SIZE = 14;
// ASCII 32(' ')~126('~') 너비 at 14px, index = charCode - 32
// prettier-ignore
const ASCII_WIDTHS_14 = [
    3.513671875, // 32  ' '
    3.595703125, // 33  '!'
    5.3046875, // 34  '"'
    8.39453125, // 35  '#'
    8.50390625, // 36  '$'
    12.072265625, // 37  '%'
    8.53125, // 38  '&'
    2.81640625, // 39  "'"
    4.771484375, // 40  '('
    4.771484375, // 41  ')'
    6.58984375, // 42  '*'
    8.77734375, // 43  '+'
    3.609375, // 44  ','
    6.056640625, // 45  '-'
    3.5546875, // 46  '.'
    4.67578125, // 47  '/'
    8.33984375, // 48  '0'
    6.138671875, // 49  '1'
    8.216796875, // 50  '2'
    8.640625, // 51  '3'
    8.736328125, // 52  '4'
    8.353515625, // 53  '5'
    8.5859375, // 54  '6'
    7.724609375, // 55  '7'
    8.490234375, // 56  '8'
    8.5859375, // 57  '9'
    3.5546875, // 58  ':'
    3.5546875, // 59  ';'
    8.77734375, // 60  '<'
    8.77734375, // 61  '='
    8.77734375, // 62  '>'
    6.712890625, // 63  '?'
    12.318359375, // 64  '@'
    9.037109375, // 65  'A'
    8.66796875, // 66  'B'
    9.70703125, // 67  'C'
    9.59765625, // 68  'D'
    7.943359375, // 69  'E'
    7.79296875, // 70  'F'
    9.92578125, // 71  'G'
    9.884765625, // 72  'H'
    3.41796875, // 73  'I'
    7.21875, // 74  'J'
    8.6953125, // 75  'K'
    7.46484375, // 76  'L'
    11.935546875, // 77  'M'
    10.048828125, // 78  'N'
    10.171875, // 79  'O'
    8.462890625, // 80  'P'
    10.171875, // 81  'Q'
    8.517578125, // 82  'R'
    8.50390625, // 83  'S'
    8.55859375, // 84  'T'
    9.8984375, // 85  'U'
    9.037109375, // 86  'V'
    12.810546875, // 87  'W'
    8.572265625, // 88  'X'
    8.873046875, // 89  'Y'
    8.326171875, // 90  'Z'
    4.771484375, // 91  '['
    4.67578125, // 92  '\'
    4.771484375, // 93  ']'
    6.193359375, // 94  '^'
    5.947265625, // 95  '_'
    6.5625, // 96  '`'
    7.4921875, // 97  'a'
    8.271484375, // 98  'b'
    7.41015625, // 99  'c'
    8.271484375, // 100 'd'
    7.73828125, // 101 'e'
    4.716796875, // 102 'f'
    8.107421875, // 103 'g'
    7.875, // 104 'h'
    3.048828125, // 105 'i'
    3.048828125, // 106 'j'
    7.232421875, // 107 'k'
    3.048828125, // 108 'l'
    11.67578125, // 109 'm'
    7.79296875, // 110 'n'
    7.943359375, // 111 'o'
    8.107421875, // 112 'p'
    8.107421875, // 113 'q'
    4.89453125, // 114 'r'
    6.9453125, // 115 's'
    4.7578125, // 116 't'
    7.73828125, // 117 'u'
    7.41015625, // 118 'v'
    10.8828125, // 119 'w'
    7.177734375, // 120 'x'
    7.41015625, // 121 'y'
    7.177734375, // 122 'z'
    4.771484375, // 123 '{'
    4.279296875, // 124 '|'
    4.771484375, // 125 '}'
    8.77734375, // 126 '~'
];
// 한글 음절 (AC00-D7AF) 너비 at 14px - 모든 음절 동일 너비
const KOREAN_WIDTH_14 = 12.099609375;
// 히라가나/가타카나/전각문자 너비 at 14px
const CJK_FULLWIDTH_14 = 13.125;
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
const SPACE_REGEX = /^\s+$/;
const ASCII_WIDTH_SCALE = 0.94;
const ASCII_LONG_WIDTH_SCALE = 0.92;
const ASCII_LONG_THRESHOLD = 120;
// Intl.Segmenter를 사용하여 grapheme cluster 단위로 분리 (ZWJ 이모지 지원)
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('ko', { granularity: 'grapheme' })
    : null;
/** 문자열을 grapheme 단위로 분리 (ZWJ 이모지를 1개로 처리) */
function splitGraphemes(text) {
    if (segmenter) {
        return Array.from(segmenter.segment(text), (s) => s.segment);
    }
    // fallback: Array.from은 surrogate pair는 처리하지만 ZWJ는 처리 못함
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
    // grapheme 단위로 분리하여 ZWJ 이모지를 1개로 처리
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
/** 단일 문자의 너비를 14px 기준 테이블에서 조회 후 fontSize로 스케일 */
function measureCharWidth(char, fontSize) {
    const code = char.charCodeAt(0);
    const scale = fontSize / BASE_FONT_SIZE;
    // ASCII 32-126
    if (code >= 32 && code <= 126) {
        return ASCII_WIDTHS_14[code - 32] * scale;
    }
    // 한글 음절 (가-힣)
    if (code >= 0xac00 && code <= 0xd7af) {
        return KOREAN_WIDTH_14 * scale;
    }
    // 한글 자모 (ㄱ-ㅎ, ㅏ-ㅣ)
    if (code >= 0x3131 && code <= 0x3163) {
        return KOREAN_WIDTH_14 * scale;
    }
    // 히라가나 (3040-309F), 가타카나 (30A0-30FF)
    if (code >= 0x3040 && code <= 0x30ff) {
        return CJK_FULLWIDTH_14 * scale;
    }
    // CJK 통합 한자 및 확장 (3400-4DBF, 4E00-9FFF, F900-FAFF)
    if ((code >= 0x3400 && code <= 0x4dbf) ||
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0xf900 && code <= 0xfaff)) {
        return CJK_FULLWIDTH_14 * scale;
    }
    // 전각 문자 (FF01-FF60)
    if (code >= 0xff01 && code <= 0xff60) {
        return CJK_FULLWIDTH_14 * scale;
    }
    // 기타 non-ASCII (특수문자, 이모지 등) - 한글 너비를 기본값으로 사용
    if (code > 127 || char.length > 1) {
        return KOREAN_WIDTH_14 * scale;
    }
    // 제어 문자 등 fallback
    return 0;
}
function measureTextWidth(text, fontSize) {
    if (text.length === 0)
        return 0;
    let width = 0;
    for (const char of text) {
        width += measureCharWidth(char, fontSize);
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
        // 문단 끝 공백이 다음 줄로 넘어가는 것 방지 (렌더링과 계산 일치)
        totalLines += countLinesByWidth(paragraph.trimEnd(), maxWidth, fontSize);
    }
    return totalLines;
}
// 텍스트를 주어진 줄 수와 폭 기준으로 분할하는 함수
// 문단 단위로 순회하며 각 문단의 폭을 계산해 줄 수를 추정한다.
// 남은 줄 수를 초과하면 가능한 범위에서 문자를 잘라 fit에 담고 나머지는 rest로 넘긴다.
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
        // 문단 끝 공백이 다음 줄로 넘어가는 것 방지
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
                    // grapheme 단위로 분리하여 ZWJ 이모지를 1개로 처리
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
                        charIdx += char.length; // 원본 문자열에서의 실제 길이
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
                        // grapheme 단위로 분리하여 ZWJ 이모지를 1개로 처리
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
                            cursor += char.length; // 원본 문자열에서의 실제 길이
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
