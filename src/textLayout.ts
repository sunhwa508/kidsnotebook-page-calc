// Pretendard Regular 14px 기준 글자 너비 테이블 (브라우저 Canvas API로 측정)
// font-family: 'Pretendard', 'Tossface', 'Noto Color Emoji', -apple-system, BlinkMacSystemFont, sans-serif
// 다른 fontSize는 선형 비례(fontSize / 14)로 스케일한다.
const BASE_FONT_SIZE = 14;

// ASCII 32(' ')~126('~') 너비 at 14px, index = charCode - 32
// prettier-ignore
const ASCII_WIDTHS_14: readonly number[] = [
  3.513671875, 3.595703125, 5.3046875, 8.39453125, 8.50390625,
  12.072265625, 8.53125, 2.81640625, 4.771484375, 4.771484375,
  6.58984375, 8.77734375, 3.609375, 6.056640625, 3.5546875,
  4.67578125, 8.33984375, 6.138671875, 8.216796875, 8.640625,
  8.736328125, 8.353515625, 8.5859375, 7.724609375, 8.490234375,
  8.5859375, 3.5546875, 3.5546875, 8.77734375, 8.77734375,
  8.77734375, 6.712890625, 12.318359375, 9.037109375, 8.66796875,
  9.70703125, 9.59765625, 7.943359375, 7.79296875, 9.92578125,
  9.884765625, 3.41796875, 7.21875, 8.6953125, 7.46484375,
  11.935546875, 10.048828125, 10.171875, 8.462890625, 10.171875,
  8.517578125, 8.50390625, 8.55859375, 9.8984375, 9.037109375,
  12.810546875, 8.572265625, 8.873046875, 8.326171875, 4.771484375,
  4.67578125, 4.771484375, 6.193359375, 5.947265625, 6.5625,
  7.4921875, 8.271484375, 7.41015625, 8.271484375, 7.73828125,
  4.716796875, 8.107421875, 7.875, 3.048828125, 3.048828125,
  7.232421875, 3.048828125, 11.67578125, 7.79296875, 7.943359375,
  8.107421875, 8.107421875, 4.89453125, 6.9453125, 4.7578125,
  7.73828125, 7.41015625, 10.8828125, 7.177734375, 7.41015625,
  7.177734375, 4.771484375, 4.279296875, 4.771484375, 8.77734375,
];

const KOREAN_WIDTH_14 = 12.099609375;
const CJK_FULLWIDTH_14 = 13.125;

const CJK_REGEX =
  /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff01-\uffee\uac00-\ud7af]/;
const SPACE_REGEX = /^\s+$/;
// 커닝 보정 계수: 브라우저 Canvas measureText()는 커닝을 적용하지만
// 글자별 합산은 커닝을 반영하지 못함. ASCII 텍스트에서 합산값이 실제보다 ~1-2% 크다.
// 예: "Hello World" 합산 72.1465 vs 실제 71.4424 (비율 ≈ 0.9903)
const ASCII_KERNING_FACTOR = 0.99;
const ASCII_LONG_KERNING_FACTOR = 0.98;
const ASCII_LONG_THRESHOLD = 120;

// Intl.Segmenter를 사용하여 grapheme cluster 단위로 분리 (ZWJ 이모지 지원)
const segmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('ko', { granularity: 'grapheme' })
    : null;

/** 문자열을 grapheme 단위로 분리 (ZWJ 이모지를 1개로 처리) */
function splitGraphemes(text: string): string[] {
  if (segmenter) {
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  // fallback: Array.from은 surrogate pair는 처리하지만 ZWJ는 처리 못함
  return Array.from(text);
}

const getEffectiveMaxWidth = (paragraph: string, maxWidth: number): number => {
  // 커닝 보정은 measureTextWidth에서 처리하므로 maxWidth 축소 불필요
  return maxWidth;
};

const splitBySpaces = (paragraph: string): string[] => {
  return paragraph.split(/(\s+)/).filter((token) => token.length > 0);
};

const countLinesByChars = (
  paragraph: string,
  maxWidth: number,
  fontSize: number,
  startWidth = 0,
): { lines: number; lineWidth: number } => {
  let lines = 1;
  let lineWidth = startWidth;

  // grapheme 단위로 분리하여 ZWJ 이모지를 1개로 처리
  const graphemes = splitGraphemes(paragraph);
  for (const char of graphemes) {
    const charWidth = measureTextWidth(char, fontSize);
    if (lineWidth + charWidth > maxWidth) {
      lines += 1;
      lineWidth = charWidth;
    } else {
      lineWidth += charWidth;
    }
  }

  return { lines, lineWidth };
};

function measureCodePointWidth(code: number, fontSize: number): number {
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

  // 전각 공백/구두점, 히라가나, 가타카나
  if (
    (code >= 0x3000 && code <= 0x30ff) ||
    (code >= 0xff61 && code <= 0xff9f)
  ) {
    return CJK_FULLWIDTH_14 * scale;
  }

  // CJK 통합 한자 및 확장 (3400-4DBF, 4E00-9FFF, F900-FAFF)
  if (
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff)
  ) {
    return CJK_FULLWIDTH_14 * scale;
  }

  // 전각 문자 (FF01-FF60, FFE0-FFEE)
  if (
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffee)
  ) {
    return CJK_FULLWIDTH_14 * scale;
  }

  // 기타 non-ASCII (특수문자, 이모지 등) - 한글 너비를 기본값으로 사용
  if (code > 127) {
    return KOREAN_WIDTH_14 * scale;
  }

  // 제어 문자 등 fallback
  return 0;
}

function isZeroWidthCodePoint(code: number): boolean {
  return (
    code === 0x200d || // ZWJ
    (code >= 0x0300 && code <= 0x036f) || // Combining Diacritical Marks
    (code >= 0x1ab0 && code <= 0x1aff) || // Combining Diacritical Marks Extended
    (code >= 0x1dc0 && code <= 0x1dff) || // Combining Diacritical Marks Supplement
    (code >= 0x20d0 && code <= 0x20ff) || // Combining Diacritical Marks for Symbols
    (code >= 0xfe00 && code <= 0xfe0f) // Variation Selectors
  );
}

/** grapheme cluster 기준 너비 계산 */
function measureCharWidth(char: string, fontSize: number): number {
  const codePoints = Array.from(char, (value) => value.codePointAt(0) ?? 0);

  if (codePoints.length === 0) return 0;
  if (codePoints.length === 1) {
    return measureCodePointWidth(codePoints[0], fontSize);
  }

  // ZWJ 시퀀스나 regional indicator 조합 등은 렌더상 1개의 이모지 폭으로 취급
  if (
    codePoints.includes(0x200d) ||
    codePoints.every(
      (code) =>
        (code >= 0x1f1e6 && code <= 0x1f1ff) || isZeroWidthCodePoint(code),
    )
  ) {
    return measureCodePointWidth(0x1f600, fontSize);
  }

  const baseCodePoint = codePoints.find((code) => !isZeroWidthCodePoint(code));
  if (baseCodePoint === undefined) return 0;

  return measureCodePointWidth(baseCodePoint, fontSize);
}

export function measureTextWidth(text: string, fontSize: number): number {
  if (text.length === 0) return 0;

  let width = 0;
  let asciiRunWidth = 0;
  let asciiRunLength = 0;

  const flush = () => {
    if (asciiRunLength > 1) {
      const factor =
        asciiRunLength >= ASCII_LONG_THRESHOLD
          ? ASCII_LONG_KERNING_FACTOR
          : ASCII_KERNING_FACTOR;
      width += asciiRunWidth * factor;
    } else {
      width += asciiRunWidth;
    }
    asciiRunWidth = 0;
    asciiRunLength = 0;
  };

  for (const char of splitGraphemes(text)) {
    const code = char.codePointAt(0) ?? 0;
    const charWidth = measureCharWidth(char, fontSize);

    if (code >= 32 && code <= 126) {
      asciiRunWidth += charWidth;
      asciiRunLength += 1;
    } else {
      flush();
      width += charWidth;
    }
  }
  flush();

  return width;
}

function countLinesByWidth(
  paragraph: string,
  maxWidth: number,
  fontSize: number,
): number {
  if (paragraph.length === 0) return 1;
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

    const { lines: tokenLines, lineWidth: nextWidth } = countLinesByChars(
      token,
      effectiveMaxWidth,
      fontSize,
      lineWidth,
    );
    lines += tokenLines - 1;
    lineWidth = nextWidth;
  }

  return lines;
}

export function calculateTextLines(
  text: string,
  maxWidth: number,
  fontSize: number,
): number {
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
export function splitTextByLines(
  text: string,
  maxLines: number,
  maxWidth: number,
  fontSize: number,
): { fit: string; rest: string } {
  const paragraphs = text.split('\n');
  let usedLines = 0;
  const fitParagraphs: string[] = [];
  const restParagraphs: string[] = [];
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
      } else {
        exceeded = true;
        restParagraphs.push(paragraph);
      }
      continue;
    }

    // 문단 끝 공백이 다음 줄로 넘어가는 것 방지
    const trimmedParagraph = paragraph.trimEnd();
    const paragraphLines = countLinesByWidth(
      trimmedParagraph,
      maxWidth,
      fontSize,
    );

    if (usedLines + paragraphLines <= maxLines) {
      fitParagraphs.push(trimmedParagraph);
      usedLines += paragraphLines;
    } else {
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
              if (linesUsed > remainingLines) break;
              lineWidth = charWidth;
            } else {
              lineWidth += charWidth;
            }
            charIdx += char.length; // 원본 문자열에서의 실제 길이
            splitIdx = charIdx;
          }

          const lastSpace = paragraph.lastIndexOf(' ', splitIdx);
          if (lastSpace > 0 && splitIdx - lastSpace <= 10) {
            splitIdx = lastSpace;
          }
        } else {
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
              if (linesUsed > remainingLines) break;
              lineWidth = tokenWidth;
              cursor += token.length;
              lastFitIndex = cursor;
              continue;
            }

            if (lineWidth > 0) {
              linesUsed += 1;
              if (linesUsed > remainingLines) break;
              lineWidth = 0;
            }

            // grapheme 단위로 분리하여 ZWJ 이모지를 1개로 처리
            const tokenGraphemes = splitGraphemes(token);
            for (const char of tokenGraphemes) {
              const charWidth = measureTextWidth(char, fontSize);
              if (lineWidth + charWidth > effectiveMaxWidth) {
                linesUsed += 1;
                if (linesUsed > remainingLines) break;
                lineWidth = charWidth;
              } else {
                lineWidth += charWidth;
              }
              cursor += char.length; // 원본 문자열에서의 실제 길이
              if (linesUsed <= remainingLines) {
                lastFitIndex = cursor;
              } else {
                break;
              }
            }

            if (linesUsed > remainingLines) break;
          }

          splitIdx = lastFitIndex;
        }

        fitParagraphs.push(paragraph.substring(0, splitIdx));
        restParagraphs.push(paragraph.substring(splitIdx).trim());
      } else {
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
