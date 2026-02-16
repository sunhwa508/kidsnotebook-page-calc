/**
 * 페이지 생성 로직 (Node.js용 - React useMemo 제거)
 */

import {
  KN_BOOK_SIZE,
  NotebookPage,
  NotebookItem,
  WorkspaceReport,
  WorkspaceAlbum,
  LifeLog,
  ImageData,
} from './types';
import { formatKstDateTimeKo, toKstDateString } from './kstDate';
import { calculateJustifiedGridLayout } from './layoutCalculator';
import {
  COMMENT_BUBBLE_HORIZONTAL_PADDING,
  COMMENT_FONT_SIZE,
  COMMENT_HEADER_HEIGHT,
  COMMENT_LINE_HEIGHT,
  COMMENT_PADDING,
  COMMENT_TITLE_GAP,
  COMMENT_TITLE_WIDTH,
  ALBUM_HEADER_HEIGHT,
  ALBUM_ITEM_GAP,
  CONTENT_WIDTH,
  IMAGE_GRID_PADDING,
  REPORT_ITEM_GAP,
  REPORT_HEADER_HEIGHT,
  TEXT_BLOCK_PADDING,
  TEXT_CONTENT_WIDTH,
  TEXT_FONT_SIZE,
  TEXT_LINE_HEIGHT,
} from './layoutConstants';
import { LIFE_LOG_KEYS } from './lifeLog';
import { calculateTextLines, splitTextByLines } from './textLayout';

const PAGE_BOTTOM_MARGIN = 24;
const PAGE_MAX_HEIGHT =
  KN_BOOK_SIZE.HEIGHT -
  KN_BOOK_SIZE.HEADER_HEIGHT -
  KN_BOOK_SIZE.FOOTER_HEIGHT -
  PAGE_BOTTOM_MARGIN;

const GAP_AFTER_IMAGE = 8;
const GAP_AFTER_DATE_HEADER = 8;
const GAP_AFTER_COMMENT = 8;
const GAP_BETWEEN_COMMENTS = 8;
const GAP_BEFORE_COMMENTS = 10;
const EXTRA_GAP_BEFORE_COMMENTS_WHEN_WEATHER_TEXT_ONLY = 24;
const COMMENT_EXTRA_HEIGHT = 4;
const COMMENT_MAX_WIDTH_RATIO = 0.98;
const LIFE_LOG_EXTRA_GROUP_GAP = 14;
const MIN_TEXT_LINES = 1;
const TITLE_FONT_SIZE = 14;
const TITLE_LINE_HEIGHT = 16;
const TITLE_MAX_LINES = 2;
const VIDEO_THUMBNAIL_SIZE = 640;

const MONTH_FIRST_CONTENT_START = KN_BOOK_SIZE.MONTH_FIRST_CONTENT_START;
const LIFE_LOG_HEIGHT = 38;
const LIFE_LOG_GAP = 8;
const LIFE_LOG_GAP_MEDIA_ONLY = 4;

const getTextLines = (text: string): number =>
  calculateTextLines(text, TEXT_CONTENT_WIDTH, TEXT_FONT_SIZE);
const getCommentLines = (text: string, maxWidth: number): number =>
  calculateTextLines(
    text,
    Math.floor(maxWidth * COMMENT_MAX_WIDTH_RATIO),
    COMMENT_FONT_SIZE,
  );

function calculateCommentHeight(
  text: string,
  maxWidth: number,
  isContinuation: boolean = false,
): number {
  const textLines = getCommentLines(text, maxWidth);
  const headerHeight = isContinuation ? 0 : COMMENT_HEADER_HEIGHT;
  return (
    headerHeight +
    textLines * COMMENT_LINE_HEIGHT +
    COMMENT_PADDING +
    COMMENT_EXTRA_HEIGHT
  );
}

class PageBuilder {
  private pages: NotebookPage[] = [];
  private currentPageItems: NotebookItem[] = [];
  private currentY: number = 0;
  private pageNumber: number = 1;
  private hiddenIds: Set<string>;
  private currentMonth: string = '';
  private isMonthFirstPage: boolean = false;
  private contentType: 'report' | 'album' = 'report';
  private currentContentId: string = '';
  private currentTitle: string = '';
  private currentAuthor: string = '';
  private currentWeather: string = '';
  private currentLifeLog: LifeLog | null = null;
  private currentGroupHasImages: boolean = false;
  private currentGroupHasLifeLog: boolean = false;
  private currentGroupHasText: boolean = false;
  private currentGroupTextLineCount: number = 0;
  private currentGroupExtraCommentGapApplied: boolean = false;
  private currentGroupCommentGapApplied: boolean = false;
  private pendingHeaderId: string | null = null;
  private pendingHeaderContentKey: string | null = null;
  private pendingHeaderHasContent: boolean = false;
  private lastItemGap: number = 0;
  private pendingGroupGap: number = 0;
  private lastGroupItemType: 'image' | 'text' | 'comment' | 'life-log' | null =
    null;

  constructor(hiddenIds: string[] = []) {
    this.hiddenIds = new Set(hiddenIds);
  }

  setContentType(
    type: 'report' | 'album',
    contentId: string,
    title?: string,
    author?: string,
    weather?: string,
    lifeLog?: LifeLog,
  ): void {
    this.contentType = type;
    this.currentContentId = contentId;
    this.currentTitle = title || '';
    this.currentAuthor = author || '';
    this.currentWeather = weather || '';
    this.currentLifeLog = lifeLog || null;
    this.currentGroupHasImages = false;
    this.currentGroupHasLifeLog = false;
    this.currentGroupHasText = false;
    this.currentGroupTextLineCount = 0;
    this.currentGroupExtraCommentGapApplied = false;
    this.currentGroupCommentGapApplied = false;
    this.lastItemGap = 0;
    this.lastGroupItemType = null;
  }

  private isHidden(itemId: string): boolean {
    return this.hiddenIds.has(itemId);
  }

  addLifeLogItem(
    lifeLog: LifeLog | undefined,
    reportId: string,
    date: string,
    gap: number = LIFE_LOG_GAP,
  ): void {
    const lifeLogId = `life-log-${reportId}-${date}`;
    if (this.isHidden(lifeLogId)) return;
    if (!lifeLog) return;
    const hasContent = LIFE_LOG_KEYS.some((key) => {
      const value = lifeLog[key];
      return value && value !== '';
    });
    if (!hasContent) return;

    const requiredHeight = LIFE_LOG_HEIGHT + gap;
    const maxHeight = this.getPageMaxHeight();
    if (
      this.currentY + requiredHeight > maxHeight &&
      this.currentPageItems.length > 0
    ) {
      this.startNewPageWithHeaderCarry();
    }

    const itemY = this.currentY + gap;
    this.currentPageItems.push({
      id: `life-log-${reportId}-${date}`,
      type: 'life-log',
      content: '',
      position: { x: 0, y: itemY },
      size: { width: CONTENT_WIDTH, height: LIFE_LOG_HEIGHT },
      lifeLog,
    });
    this.markContentAdded(`life-log-${reportId}-${date}`);
    this.currentGroupHasLifeLog = true;
    this.currentY = itemY + LIFE_LOG_HEIGHT;
    this.lastItemGap = 0;
    this.lastGroupItemType = 'life-log';
  }

  startNewPage(): void {
    if (this.currentPageItems.length > 0) {
      const metadata: NotebookPage['metadata'] =
        this.contentType === 'report'
          ? {
              isMonthFirstPage: this.isMonthFirstPage,
              yearmonth: this.currentMonth || undefined,
              reportId: this.currentContentId,
              title: this.currentTitle,
              author: this.currentAuthor,
              weather: this.currentWeather,
              lifeLog: this.currentLifeLog || undefined,
            }
          : {
              isMonthFirstPage: this.isMonthFirstPage,
              yearmonth: this.currentMonth || undefined,
              albumId: this.currentContentId,
              title: this.currentTitle,
              author: this.currentAuthor,
            };

      this.pages.push({
        id: `page-${this.pageNumber}`,
        items: this.currentPageItems,
        metadata,
      });
      this.pageNumber++;
    }
    this.currentPageItems = [];
    this.currentY = 0;
    this.isMonthFirstPage = false;
    this.pendingHeaderId = null;
    this.pendingHeaderContentKey = null;
    this.pendingHeaderHasContent = false;
    this.lastItemGap = 0;
    this.pendingGroupGap = 0;
    this.lastGroupItemType = null;
  }

  private startNewPageWithHeaderCarry(): void {
    if (!this.pendingHeaderId || this.pendingHeaderHasContent) {
      this.startNewPage();
      return;
    }

    const headerIndex = this.currentPageItems.findIndex(
      (item) => item.id === this.pendingHeaderId,
    );
    if (headerIndex === -1) {
      this.startNewPage();
      return;
    }
    if (headerIndex !== this.currentPageItems.length - 1) {
      this.startNewPage();
      return;
    }

    const headerItem = this.currentPageItems[headerIndex];
    const headerHeight = headerItem.size?.height ?? REPORT_HEADER_HEIGHT;
    this.currentPageItems.splice(headerIndex, 1);
    this.currentY = Math.max(
      0,
      this.currentY - (headerHeight + GAP_AFTER_DATE_HEADER),
    );

    this.startNewPage();
    this.currentPageItems.push({
      ...headerItem,
      position: { ...headerItem.position, y: this.currentY },
    });
    this.currentY += headerHeight + GAP_AFTER_DATE_HEADER;
  }

  private extractContentKeyFromId(itemId: string): string | null {
    const headerMatch = itemId.match(
      /^date-header-(report|album)-(\d+)-(\d{4}-\d{2}-\d{2})$/,
    );
    if (headerMatch) {
      const [, type, id, date] = headerMatch;
      return `${type}-${id}-${date}`;
    }

    const reportImageMatch = itemId.match(
      /^report-(\d+)-img-(\d{4}-\d{2}-\d{2})/,
    );
    if (reportImageMatch) {
      return `report-${reportImageMatch[1]}-${reportImageMatch[2]}`;
    }

    const albumImageMatch = itemId.match(
      /^album-(\d+)-img-(\d{4}-\d{2}-\d{2})/,
    );
    if (albumImageMatch) {
      return `album-${albumImageMatch[1]}-${albumImageMatch[2]}`;
    }

    const textMatch = itemId.match(/^text-(\d+)-(\d{4}-\d{2}-\d{2})/);
    if (textMatch) {
      return `report-${textMatch[1]}-${textMatch[2]}`;
    }

    const commentMatch = itemId.match(/^comment-(\d+)-(\d{4}-\d{2}-\d{2})/);
    if (commentMatch) {
      return `report-${commentMatch[1]}-${commentMatch[2]}`;
    }

    const lifeLogMatch = itemId.match(/^life-log-(\d+)-(\d{4}-\d{2}-\d{2})/);
    if (lifeLogMatch) {
      return `report-${lifeLogMatch[1]}-${lifeLogMatch[2]}`;
    }

    return null;
  }

  private setPendingHeader(itemId: string): void {
    this.pendingHeaderId = itemId;
    this.pendingHeaderContentKey = this.extractContentKeyFromId(itemId);
    this.pendingHeaderHasContent = false;
  }

  private markContentAdded(itemId: string): void {
    if (!this.pendingHeaderContentKey) return;
    const contentKey = this.extractContentKeyFromId(itemId);
    if (contentKey && contentKey === this.pendingHeaderContentKey) {
      this.pendingHeaderHasContent = true;
    }
  }

  startNewMonth(month: string): void {
    if (this.currentMonth !== month) {
      this.startNewPage();
      this.currentMonth = month;
      this.isMonthFirstPage = true;
      this.currentY = MONTH_FIRST_CONTENT_START;
    }
  }

  getPageMaxHeight(): number {
    const monthHeaderExtra = this.isMonthFirstPage
      ? KN_BOOK_SIZE.MONTH_HEADER_HEIGHT - KN_BOOK_SIZE.HEADER_HEIGHT
      : 0;
    return PAGE_MAX_HEIGHT - monthHeaderExtra;
  }

  endContentGroup(): void {
    const groupGap =
      this.contentType === 'report' ? REPORT_ITEM_GAP : ALBUM_ITEM_GAP;
    this.currentY = this.currentY - this.lastItemGap;
    this.lastItemGap = 0;
    this.pendingGroupGap =
      groupGap +
      (this.lastGroupItemType === 'life-log' ? LIFE_LOG_EXTRA_GROUP_GAP : 0);
    this.lastGroupItemType = null;
  }

  applyPendingGroupGap(nextItemHeight: number): void {
    if (this.pendingGroupGap <= 0) return;
    if (this.currentPageItems.length === 0) {
      this.pendingGroupGap = 0;
      return;
    }

    const maxHeight = this.getPageMaxHeight();
    if (this.currentY + this.pendingGroupGap + nextItemHeight > maxHeight) {
      this.startNewPageWithHeaderCarry();
      this.pendingGroupGap = 0;
      return;
    }

    this.currentY += this.pendingGroupGap;
    this.pendingGroupGap = 0;
  }

  private needsExtraGapBeforeComments(): boolean {
    return (
      this.contentType === 'report' &&
      this.currentWeather !== '' &&
      this.currentGroupHasText &&
      this.currentGroupTextLineCount === 1 &&
      !this.currentGroupHasImages &&
      !this.currentGroupHasLifeLog
    );
  }

  private applyExtraGapBeforeComments(): void {
    if (this.currentGroupExtraCommentGapApplied) return;
    if (!this.needsExtraGapBeforeComments()) return;

    const maxHeight = this.getPageMaxHeight();
    if (
      this.currentY + EXTRA_GAP_BEFORE_COMMENTS_WHEN_WEATHER_TEXT_ONLY >
        maxHeight &&
      this.currentPageItems.length > 0
    ) {
      this.startNewPageWithHeaderCarry();
    }

    this.currentY += EXTRA_GAP_BEFORE_COMMENTS_WHEN_WEATHER_TEXT_ONLY;
    this.currentGroupExtraCommentGapApplied = true;
  }

  private applyGapBeforeComments(): void {
    if (this.currentGroupCommentGapApplied) return;
    const hasContent =
      this.currentGroupHasImages ||
      this.currentGroupHasText ||
      this.currentGroupHasLifeLog;
    const requiredGap = hasContent ? GAP_BEFORE_COMMENTS : 0;

    if (requiredGap <= 0) return;
    const maxHeight = this.getPageMaxHeight();
    if (
      this.currentY + requiredGap > maxHeight &&
      this.currentPageItems.length > 0
    ) {
      this.startNewPageWithHeaderCarry();
    }

    this.currentY += requiredGap;
    this.currentGroupCommentGapApplied = true;
  }

  addItem(item: NotebookItem, itemHeight: number): void {
    const maxHeight = this.getPageMaxHeight();
    if (
      this.currentY + itemHeight > maxHeight &&
      this.currentPageItems.length > 0
    ) {
      this.startNewPageWithHeaderCarry();
    }
    if (item.id.startsWith('date-header-')) {
      this.setPendingHeader(item.id);
    }
    this.currentPageItems.push({
      ...item,
      position: { ...item.position, y: this.currentY },
    });
    if (!item.id.startsWith('date-header-')) {
      this.markContentAdded(item.id);
    }
    this.currentY += itemHeight;
  }

  addImages(images: ImageData[], date: string, idPrefix: string): void {
    if (images.length === 0) return;

    const visibleImages: (ImageData & { originalIdx: number })[] = [];
    images.forEach((img, idx) => {
      const itemId = `${idPrefix}-${date}-${idx}`;
      if (!this.isHidden(itemId)) {
        visibleImages.push({ ...img, originalIdx: idx });
      }
    });

    if (visibleImages.length === 0) return;
    this.currentGroupHasImages = true;
    this.lastGroupItemType = 'image';

    const validVisibleImages = visibleImages.filter(
      (img) => img.width > 0 && img.height > 0,
    );
    if (validVisibleImages.length === 0) return;

    const layoutImages = validVisibleImages.map((img) => ({
      url: String(img.originalIdx),
      width: img.width,
      height: img.height,
    }));

    let remainingImages = [...layoutImages];
    let remainingVisibleImages = [...validVisibleImages];

    while (remainingImages.length > 0) {
      const imagePositions = calculateJustifiedGridLayout(remainingImages, {
        preserveOrder: true,
      });

      const startY = this.currentY;
      const maxHeight = this.getPageMaxHeight();

      const fittingItems: NotebookItem[] = [];
      const placedIds = new Set<string>();
      let maxBottom = startY;

      const visibleImageMap = new Map(
        remainingVisibleImages.map((img) => [String(img.originalIdx), img]),
      );

      for (let i = 0; i < imagePositions.length; i++) {
        const imgPos = imagePositions[i];
        const imgBottom =
          startY + imgPos.y + imgPos.height + IMAGE_GRID_PADDING * 2;

        if (imgBottom + GAP_AFTER_IMAGE > maxHeight) break;

        const originalImg = visibleImageMap.get(imgPos.url);
        if (!originalImg) continue;
        placedIds.add(imgPos.url);
        fittingItems.push({
          id: `${idPrefix}-${date}-${originalImg.originalIdx}`,
          type: 'image',
          content: '',
          position: { x: imgPos.x, y: startY + imgPos.y },
          size: { width: imgPos.width, height: imgPos.height },
          imageData: {
            url: originalImg.url,
            access_key: originalImg.access_key,
            is_video: originalImg.is_video,
            width: originalImg.width,
            height: originalImg.height,
          },
        });
        maxBottom = Math.max(maxBottom, imgBottom);
      }

      const fittingCount = fittingItems.length;

      if (fittingCount > 0) {
        this.currentPageItems.push(...fittingItems);
        fittingItems.forEach((item) => this.markContentAdded(item.id));
        this.currentY = maxBottom + GAP_AFTER_IMAGE;
        remainingImages = remainingImages.filter(
          (img) => !placedIds.has(img.url),
        );
        remainingVisibleImages = remainingVisibleImages.filter(
          (img) => !placedIds.has(String(img.originalIdx)),
        );
      } else if (this.currentPageItems.length > 0) {
        this.startNewPageWithHeaderCarry();
      } else {
        const imgPos = imagePositions[0];
        const originalImg = visibleImageMap.get(imgPos.url);
        if (!originalImg) break;
        this.currentPageItems.push({
          id: `${idPrefix}-${date}-${originalImg.originalIdx}`,
          type: 'image',
          content: '',
          position: { x: imgPos.x, y: startY + imgPos.y },
          size: { width: imgPos.width, height: imgPos.height },
          imageData: {
            url: originalImg.url,
            access_key: originalImg.access_key,
            is_video: originalImg.is_video,
            width: originalImg.width,
            height: originalImg.height,
          },
        });
        this.markContentAdded(`${idPrefix}-${date}-${originalImg.originalIdx}`);
        this.currentY =
          startY +
          imgPos.y +
          imgPos.height +
          IMAGE_GRID_PADDING * 2 +
          GAP_AFTER_IMAGE;
        remainingImages = remainingImages.filter(
          (img) => img.url !== imgPos.url,
        );
        remainingVisibleImages = remainingVisibleImages.filter(
          (img) => String(img.originalIdx) !== imgPos.url,
        );
      }

      if (remainingImages.length > 0 && fittingCount > 0) {
        this.startNewPageWithHeaderCarry();
      }
    }

    if (this.currentPageItems.length > 0) {
      this.lastItemGap = GAP_AFTER_IMAGE;
    }
  }

  addText(content: string, date: string, reportId: string): void {
    if (!content) return;
    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+$/g, '');
    if (!normalizedContent) return;

    const textHiddenKey = `text-${reportId}-${date}`;
    if (this.isHidden(textHiddenKey)) return;

    this.currentGroupHasText = true;
    this.currentGroupTextLineCount = getTextLines(normalizedContent);
    this.lastGroupItemType = 'text';

    let remainingText = normalizedContent;
    let textPartIndex = 0;

    while (remainingText.length > 0) {
      const maxHeight = this.getPageMaxHeight();
      const availableHeight = maxHeight - this.currentY;
      const availableTextHeight = availableHeight - TEXT_BLOCK_PADDING;

      if (availableTextHeight < TEXT_LINE_HEIGHT * MIN_TEXT_LINES) {
        this.startNewPageWithHeaderCarry();
        continue;
      }

      const maxLinesOnPage = Math.floor(availableTextHeight / TEXT_LINE_HEIGHT);
      const { fit: textForThisPage, rest: textForNextPage } = splitTextByLines(
        remainingText,
        maxLinesOnPage,
        TEXT_CONTENT_WIDTH,
        TEXT_FONT_SIZE,
      );

      if (!textForThisPage) {
        remainingText = textForNextPage;
        continue;
      }

      const totalLines = getTextLines(textForThisPage);
      const textHeightForThisPage =
        totalLines * TEXT_LINE_HEIGHT + TEXT_BLOCK_PADDING;

      const hasNextPart = textForNextPage.length > 0;
      this.currentPageItems.push({
        id: `text-${reportId}-${date}-part${textPartIndex}`,
        type: 'text',
        content: textForThisPage,
        position: { x: 0, y: this.currentY },
        size: { width: CONTENT_WIDTH, height: textHeightForThisPage },
        ...(textPartIndex > 0 && { isContinuation: true }),
        ...(hasNextPart && { isContinued: true }),
      });
      this.markContentAdded(`text-${reportId}-${date}-part${textPartIndex}`);

      this.currentY += textHeightForThisPage;
      remainingText = textForNextPage;
      textPartIndex++;

      if (remainingText.length > 0) {
        this.startNewPageWithHeaderCarry();
      }
    }
    this.lastItemGap = 0;
  }

  addCommentGroup(
    comments: {
      id: string;
      text: string;
      authorName: string;
      createdAt: string;
    }[],
    date: string,
    reportId: string,
    hiddenSet: Set<string>,
  ): void {
    if (!comments || comments.length === 0) return;

    const visibleComments = comments
      .map((comment, idx) => ({
        ...comment,
        originalIdx: idx,
        commentId: `comment-${reportId}-${date}-${idx}`,
      }))
      .filter((c) => !hiddenSet.has(c.commentId));

    if (visibleComments.length === 0) return;
    this.lastGroupItemType = 'comment';

    this.applyGapBeforeComments();
    this.applyExtraGapBeforeComments();

    const commentWidth = CONTENT_WIDTH;
    const bubbleWidth = commentWidth - COMMENT_TITLE_WIDTH - COMMENT_TITLE_GAP;
    const textMaxWidth = bubbleWidth - COMMENT_BUBBLE_HORIZONTAL_PADDING;
    const adjustedTextMaxWidth = Math.floor(
      textMaxWidth * COMMENT_MAX_WIDTH_RATIO,
    );
    const maxHeight = this.getPageMaxHeight();

    const MIN_CONTINUATION_HEIGHT =
      COMMENT_LINE_HEIGHT + COMMENT_PADDING + COMMENT_EXTRA_HEIGHT;
    const MIN_COMMENT_HEIGHT =
      COMMENT_HEADER_HEIGHT +
      COMMENT_LINE_HEIGHT +
      COMMENT_PADDING +
      COMMENT_EXTRA_HEIGHT;

    for (let i = 0; i < visibleComments.length; i++) {
      const comment = visibleComments[i];
      const isFirstComment = i === 0;
      let remainingText = comment.text;
      let partIndex = 0;

      while (remainingText.length > 0) {
        const isContinuation = partIndex > 0;
        const minHeight = isContinuation
          ? MIN_CONTINUATION_HEIGHT
          : MIN_COMMENT_HEIGHT;

        const availableHeight = maxHeight - this.currentY;

        if (availableHeight < minHeight) {
          if (this.currentPageItems.length > 0) {
            this.startNewPageWithHeaderCarry();
            continue;
          }
        }

        const fullHeight = calculateCommentHeight(
          remainingText,
          adjustedTextMaxWidth,
          isContinuation,
        );

        if (fullHeight <= availableHeight) {
          this.currentPageItems.push({
            id:
              partIndex === 0
                ? comment.commentId
                : `${comment.commentId}-part${partIndex}`,
            type: 'comment',
            content: remainingText,
            author: comment.authorName,
            createdAt: comment.createdAt,
            position: { x: 0, y: this.currentY },
            size: {
              width: commentWidth,
              height: fullHeight,
            },
            ...(isFirstComment &&
              partIndex === 0 && {
                isFirstComment: true,
                totalComments: visibleComments.length,
              }),
            ...(isContinuation && { isContinuation: true }),
          });
          this.markContentAdded(
            partIndex === 0
              ? comment.commentId
              : `${comment.commentId}-part${partIndex}`,
          );

          this.currentY += fullHeight + GAP_BETWEEN_COMMENTS;
          remainingText = '';
        } else {
          const headerHeight = isContinuation ? 0 : COMMENT_HEADER_HEIGHT;
          const availableTextHeight =
            availableHeight - headerHeight - COMMENT_PADDING;
          const maxLines = Math.max(
            1,
            Math.floor(availableTextHeight / COMMENT_LINE_HEIGHT),
          );

          const { fit, rest } = splitTextByLines(
            remainingText,
            maxLines,
            adjustedTextMaxWidth,
            COMMENT_FONT_SIZE,
          );

          if (fit.length === 0) {
            if (this.currentPageItems.length > 0) {
              this.startNewPageWithHeaderCarry();
              continue;
            }
          }

          const partHeight = calculateCommentHeight(
            fit,
            adjustedTextMaxWidth,
            isContinuation,
          );
          this.currentPageItems.push({
            id:
              partIndex === 0
                ? comment.commentId
                : `${comment.commentId}-part${partIndex}`,
            type: 'comment',
            content: fit,
            author: comment.authorName,
            createdAt: comment.createdAt,
            position: { x: 0, y: this.currentY },
            size: {
              width: commentWidth,
              height: partHeight,
            },
            ...(isFirstComment &&
              partIndex === 0 && {
                isFirstComment: true,
                totalComments: visibleComments.length,
              }),
            ...(isContinuation && { isContinuation: true }),
          });
          this.markContentAdded(
            partIndex === 0
              ? comment.commentId
              : `${comment.commentId}-part${partIndex}`,
          );

          this.currentY += partHeight + GAP_BETWEEN_COMMENTS;
          remainingText = rest;
          partIndex++;

          if (remainingText.length > 0) {
            this.startNewPageWithHeaderCarry();
          }
        }
      }
    }

    if (visibleComments.length > 0) {
      this.currentY += GAP_AFTER_COMMENT - GAP_BETWEEN_COMMENTS;
      this.lastItemGap = GAP_AFTER_COMMENT;
    }
  }

  getPages(): NotebookPage[] {
    return this.pages;
  }
}

export function generatePages(
  reports: WorkspaceReport[],
  albums: WorkspaceAlbum[],
  hiddenIds: string[] = [],
): NotebookPage[] {
  const builder = new PageBuilder(hiddenIds);
  const hiddenSet = new Set(hiddenIds);

  for (const report of reports) {
    if (!report.created) continue;
    if (report.is_day_selected === false) continue;
    const date = toKstDateString(report.created);
    const reportId = String(report.id);
    const month = date.substring(0, 7);

    const textHiddenKey = `text-${reportId}-${date}`;
    const hasVisibleText =
      report.is_selected !== false &&
      report.content &&
      !hiddenSet.has(textHiddenKey);
    const reportMediaCount =
      (report.videos?.length ?? 0) + (report.images?.length ?? 0);
    const hasVisibleMedia =
      reportMediaCount > 0 &&
      Array.from({ length: reportMediaCount }).some(
        (_, idx) => !hiddenSet.has(`report-${reportId}-img-${date}-${idx}`),
      );
    const hasVisibleComments =
      report.comments &&
      report.comments.some(
        (_, idx) => !hiddenSet.has(`comment-${reportId}-${date}-${idx}`),
      );
    const lifeLogHiddenKey = `life-log-${reportId}-${date}`;
    const hasVisibleLifeLog =
      !hiddenSet.has(lifeLogHiddenKey) &&
      LIFE_LOG_KEYS.some((key) => {
        const value = report.life_log?.[key];
        return value && value !== '';
      });

    if (
      !hasVisibleText &&
      !hasVisibleMedia &&
      !hasVisibleComments &&
      !hasVisibleLifeLog
    ) {
      continue;
    }

    builder.startNewMonth(month);

    const reportTitle =
      report.is_sent_from_center === false
        ? '가정에서 원으로'
        : '원에서 가정으로';
    builder.setContentType(
      'report',
      reportId,
      reportTitle,
      report.author?.name ?? '',
      report.weather ?? '',
      report.life_log,
    );

    builder.applyPendingGroupGap(REPORT_HEADER_HEIGHT + GAP_AFTER_DATE_HEADER);
    builder.addItem(
      {
        id: `date-header-report-${reportId}-${date}`,
        type: 'text',
        content: `📅 ${date}`,
        position: { x: 0, y: 0 },
        size: {
          width: KN_BOOK_SIZE.WIDTH,
          height: REPORT_HEADER_HEIGHT,
        },
        headerTitle: reportTitle,
        headerAuthor: report.author?.name ?? '',
        headerWeather: report.weather ?? '',
      },
      REPORT_HEADER_HEIGHT + GAP_AFTER_DATE_HEADER,
    );

    const reportMedia: ImageData[] = [];
    if (report.videos && report.videos.length > 0) {
      report.videos.forEach((video) => {
        if (!video.access_key) return;
        reportMedia.push({
          access_key: video.access_key,
          is_video: true,
          width: video.width || VIDEO_THUMBNAIL_SIZE,
          height: video.height || VIDEO_THUMBNAIL_SIZE,
        });
      });
    }
    if (report.images && report.images.length > 0) {
      report.images.forEach((img) => {
        if (!img.url && !img.access_key) return;
        reportMedia.push({
          url: img.url,
          access_key: img.access_key,
          width: img.width,
          height: img.height,
        });
      });
    }
    if (reportMedia.length > 0) {
      builder.addImages(reportMedia, date, `report-${reportId}-img`);
    }

    if (report.is_selected !== false) {
      builder.addText(report.content, date, reportId);
    }

    {
      const lifeLogGap =
        hasVisibleMedia && !hasVisibleText && !hasVisibleComments
          ? LIFE_LOG_GAP_MEDIA_ONLY
          : LIFE_LOG_GAP;
      builder.addLifeLogItem(report.life_log, reportId, date, lifeLogGap);
    }

    if (report.comments && report.comments.length > 0) {
      const commentsData = report.comments.map((comment) => ({
        id: String(comment.id ?? ''),
        text: comment.text,
        authorName: comment.author?.name ?? '',
        createdAt: formatKstDateTimeKo(comment.created_at),
      }));
      builder.addCommentGroup(commentsData, date, reportId, hiddenSet);
    }

    builder.endContentGroup();
  }

  builder.startNewPage();

  for (const album of albums) {
    if (!album.created) continue;
    if (album.is_day_selected === false) continue;
    const date = toKstDateString(album.created);
    const albumId = String(album.id);
    const month = date.substring(0, 7);

    const albumMediaCount =
      (album.videos?.length ?? 0) + (album.images?.length ?? 0);
    const hasVisibleMedia =
      albumMediaCount > 0 &&
      Array.from({ length: albumMediaCount }).some(
        (_, idx) => !hiddenSet.has(`album-${albumId}-img-${date}-${idx}`),
      );

    if (!hasVisibleMedia) {
      continue;
    }

    builder.startNewMonth(month);

    builder.setContentType(
      'album',
      albumId,
      album.title ?? '',
      album.author_name ?? '',
    );

    const albumTitleLines = Math.min(
      TITLE_MAX_LINES,
      calculateTextLines(album.title ?? '', CONTENT_WIDTH, TITLE_FONT_SIZE),
    );
    const albumHeaderHeight =
      ALBUM_HEADER_HEIGHT +
      Math.max(0, albumTitleLines - 1) * TITLE_LINE_HEIGHT;

    builder.applyPendingGroupGap(albumHeaderHeight + GAP_AFTER_DATE_HEADER);
    builder.addItem(
      {
        id: `date-header-album-${albumId}-${date}`,
        type: 'text',
        content: `📷 ${date}`,
        position: { x: 0, y: 0 },
        size: {
          width: KN_BOOK_SIZE.WIDTH,
          height: albumHeaderHeight,
        },
        headerTitle: album.title ?? '',
        headerAuthor: album.author_name ?? '',
      },
      albumHeaderHeight + GAP_AFTER_DATE_HEADER,
    );

    const allMedia: ImageData[] = [];

    if (album.videos && album.videos.length > 0) {
      album.videos.forEach((video) => {
        if (!video.access_key) return;
        allMedia.push({
          access_key: video.access_key,
          is_video: true,
          width: video.width || VIDEO_THUMBNAIL_SIZE,
          height: video.height || VIDEO_THUMBNAIL_SIZE,
        });
      });
    }

    if (album.images && album.images.length > 0) {
      album.images.forEach((img) => {
        if (!img.url && !img.access_key) return;
        allMedia.push({
          url: img.url,
          access_key: img.access_key,
          width: img.width,
          height: img.height,
        });
      });
    }

    if (allMedia.length > 0) {
      builder.addImages(allMedia, date, `album-${albumId}-img`);
    }

    builder.endContentGroup();
  }

  builder.startNewPage();
  return builder.getPages();
}
