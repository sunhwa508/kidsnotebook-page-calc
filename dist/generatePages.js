"use strict";
/**
 * 페이지 생성 로직 (Node.js용 - React useMemo 제거)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePages = generatePages;
const types_1 = require("./types");
const kstDate_1 = require("./kstDate");
const layoutCalculator_1 = require("./layoutCalculator");
const layoutConstants_1 = require("./layoutConstants");
const lifeLog_1 = require("./lifeLog");
const textLayout_1 = require("./textLayout");
const PAGE_BOTTOM_MARGIN = 24;
const PAGE_MAX_HEIGHT = types_1.KN_BOOK_SIZE.HEIGHT -
    types_1.KN_BOOK_SIZE.HEADER_HEIGHT -
    types_1.KN_BOOK_SIZE.FOOTER_HEIGHT -
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
const MONTH_FIRST_CONTENT_START = types_1.KN_BOOK_SIZE.MONTH_FIRST_CONTENT_START;
const LIFE_LOG_HEIGHT = 38;
const LIFE_LOG_GAP = 8;
const getTextLines = (text) => (0, textLayout_1.calculateTextLines)(text, layoutConstants_1.TEXT_CONTENT_WIDTH, layoutConstants_1.TEXT_FONT_SIZE);
const getCommentLines = (text, maxWidth) => (0, textLayout_1.calculateTextLines)(text, Math.floor(maxWidth * COMMENT_MAX_WIDTH_RATIO), layoutConstants_1.COMMENT_FONT_SIZE);
function calculateCommentHeight(text, maxWidth, isContinuation = false) {
    const textLines = getCommentLines(text, maxWidth);
    const headerHeight = isContinuation ? 0 : layoutConstants_1.COMMENT_HEADER_HEIGHT;
    return (headerHeight +
        textLines * layoutConstants_1.COMMENT_LINE_HEIGHT +
        layoutConstants_1.COMMENT_PADDING +
        COMMENT_EXTRA_HEIGHT);
}
class PageBuilder {
    constructor(hiddenIds = []) {
        this.pages = [];
        this.currentPageItems = [];
        this.currentY = 0;
        this.pageNumber = 1;
        this.currentMonth = '';
        this.isMonthFirstPage = false;
        this.contentType = 'report';
        this.currentContentId = '';
        this.currentTitle = '';
        this.currentAuthor = '';
        this.currentWeather = '';
        this.currentLifeLog = null;
        this.currentGroupHasImages = false;
        this.currentGroupHasLifeLog = false;
        this.currentGroupHasText = false;
        this.currentGroupTextLineCount = 0;
        this.currentGroupExtraCommentGapApplied = false;
        this.currentGroupCommentGapApplied = false;
        this.pendingHeaderId = null;
        this.pendingHeaderContentKey = null;
        this.pendingHeaderHasContent = false;
        this.lastItemGap = 0;
        this.pendingGroupGap = 0;
        this.lastGroupItemType = null;
        this.hiddenIds = new Set(hiddenIds);
    }
    setContentType(type, contentId, title, author, weather, lifeLog) {
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
    isHidden(itemId) {
        return this.hiddenIds.has(itemId);
    }
    addLifeLogItem(lifeLog, reportId, date) {
        if (!lifeLog)
            return;
        const hasContent = lifeLog_1.LIFE_LOG_KEYS.some((key) => {
            const value = lifeLog[key];
            return value && value !== '';
        });
        if (!hasContent)
            return;
        const requiredHeight = LIFE_LOG_HEIGHT + LIFE_LOG_GAP;
        const maxHeight = this.getPageMaxHeight();
        if (this.currentY + requiredHeight > maxHeight &&
            this.currentPageItems.length > 0) {
            this.startNewPageWithHeaderCarry();
        }
        const itemY = this.currentY + LIFE_LOG_GAP;
        this.currentPageItems.push({
            id: `life-log-${reportId}-${date}`,
            type: 'life-log',
            content: '',
            position: { x: 0, y: itemY },
            size: { width: layoutConstants_1.CONTENT_WIDTH, height: LIFE_LOG_HEIGHT },
            lifeLog,
        });
        this.markContentAdded(`life-log-${reportId}-${date}`);
        this.currentGroupHasLifeLog = true;
        this.currentY = itemY + LIFE_LOG_HEIGHT;
        this.lastItemGap = 0;
        this.lastGroupItemType = 'life-log';
    }
    startNewPage() {
        if (this.currentPageItems.length > 0) {
            const metadata = this.contentType === 'report'
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
    startNewPageWithHeaderCarry() {
        if (!this.pendingHeaderId || this.pendingHeaderHasContent) {
            this.startNewPage();
            return;
        }
        const headerIndex = this.currentPageItems.findIndex((item) => item.id === this.pendingHeaderId);
        if (headerIndex === -1) {
            this.startNewPage();
            return;
        }
        if (headerIndex !== this.currentPageItems.length - 1) {
            this.startNewPage();
            return;
        }
        const headerItem = this.currentPageItems[headerIndex];
        const headerHeight = headerItem.size?.height ?? layoutConstants_1.REPORT_HEADER_HEIGHT;
        this.currentPageItems.splice(headerIndex, 1);
        this.currentY = Math.max(0, this.currentY - (headerHeight + GAP_AFTER_DATE_HEADER));
        this.startNewPage();
        this.currentPageItems.push({
            ...headerItem,
            position: { ...headerItem.position, y: this.currentY },
        });
        this.currentY += headerHeight + GAP_AFTER_DATE_HEADER;
    }
    extractContentKeyFromId(itemId) {
        const headerMatch = itemId.match(/^date-header-(report|album)-(\d+)-(\d{4}-\d{2}-\d{2})$/);
        if (headerMatch) {
            const [, type, id, date] = headerMatch;
            return `${type}-${id}-${date}`;
        }
        const reportImageMatch = itemId.match(/^report-(\d+)-img-(\d{4}-\d{2}-\d{2})/);
        if (reportImageMatch) {
            return `report-${reportImageMatch[1]}-${reportImageMatch[2]}`;
        }
        const albumImageMatch = itemId.match(/^album-(\d+)-img-(\d{4}-\d{2}-\d{2})/);
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
    setPendingHeader(itemId) {
        this.pendingHeaderId = itemId;
        this.pendingHeaderContentKey = this.extractContentKeyFromId(itemId);
        this.pendingHeaderHasContent = false;
    }
    markContentAdded(itemId) {
        if (!this.pendingHeaderContentKey)
            return;
        const contentKey = this.extractContentKeyFromId(itemId);
        if (contentKey && contentKey === this.pendingHeaderContentKey) {
            this.pendingHeaderHasContent = true;
        }
    }
    startNewMonth(month) {
        if (this.currentMonth !== month) {
            this.startNewPage();
            this.currentMonth = month;
            this.isMonthFirstPage = true;
            this.currentY = MONTH_FIRST_CONTENT_START;
        }
    }
    getPageMaxHeight() {
        const monthHeaderExtra = this.isMonthFirstPage
            ? types_1.KN_BOOK_SIZE.MONTH_HEADER_HEIGHT - types_1.KN_BOOK_SIZE.HEADER_HEIGHT
            : 0;
        return PAGE_MAX_HEIGHT - monthHeaderExtra;
    }
    endContentGroup() {
        const groupGap = this.contentType === 'report' ? layoutConstants_1.REPORT_ITEM_GAP : layoutConstants_1.ALBUM_ITEM_GAP;
        this.currentY = this.currentY - this.lastItemGap;
        this.lastItemGap = 0;
        this.pendingGroupGap =
            groupGap +
                (this.lastGroupItemType === 'life-log' ? LIFE_LOG_EXTRA_GROUP_GAP : 0);
        this.lastGroupItemType = null;
    }
    applyPendingGroupGap(nextItemHeight) {
        if (this.pendingGroupGap <= 0)
            return;
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
    needsExtraGapBeforeComments() {
        return (this.contentType === 'report' &&
            this.currentWeather !== '' &&
            this.currentGroupHasText &&
            this.currentGroupTextLineCount === 1 &&
            !this.currentGroupHasImages &&
            !this.currentGroupHasLifeLog);
    }
    applyExtraGapBeforeComments() {
        if (this.currentGroupExtraCommentGapApplied)
            return;
        if (!this.needsExtraGapBeforeComments())
            return;
        const maxHeight = this.getPageMaxHeight();
        if (this.currentY + EXTRA_GAP_BEFORE_COMMENTS_WHEN_WEATHER_TEXT_ONLY >
            maxHeight &&
            this.currentPageItems.length > 0) {
            this.startNewPageWithHeaderCarry();
        }
        this.currentY += EXTRA_GAP_BEFORE_COMMENTS_WHEN_WEATHER_TEXT_ONLY;
        this.currentGroupExtraCommentGapApplied = true;
    }
    applyGapBeforeComments() {
        if (this.currentGroupCommentGapApplied)
            return;
        const hasContent = this.currentGroupHasImages ||
            this.currentGroupHasText ||
            this.currentGroupHasLifeLog;
        const requiredGap = hasContent ? GAP_BEFORE_COMMENTS : 0;
        if (requiredGap <= 0)
            return;
        const maxHeight = this.getPageMaxHeight();
        if (this.currentY + requiredGap > maxHeight &&
            this.currentPageItems.length > 0) {
            this.startNewPageWithHeaderCarry();
        }
        this.currentY += requiredGap;
        this.currentGroupCommentGapApplied = true;
    }
    addItem(item, itemHeight) {
        const maxHeight = this.getPageMaxHeight();
        if (this.currentY + itemHeight > maxHeight &&
            this.currentPageItems.length > 0) {
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
    addImages(images, date, idPrefix) {
        if (images.length === 0)
            return;
        const visibleImages = [];
        images.forEach((img, idx) => {
            const itemId = `${idPrefix}-${date}-${idx}`;
            if (!this.isHidden(itemId)) {
                visibleImages.push({ ...img, originalIdx: idx });
            }
        });
        if (visibleImages.length === 0)
            return;
        this.currentGroupHasImages = true;
        this.lastGroupItemType = 'image';
        const validVisibleImages = visibleImages.filter((img) => img.width > 0 && img.height > 0);
        if (validVisibleImages.length === 0)
            return;
        const layoutImages = validVisibleImages.map((img) => ({
            url: String(img.originalIdx),
            width: img.width,
            height: img.height,
        }));
        let remainingImages = [...layoutImages];
        let remainingVisibleImages = [...validVisibleImages];
        while (remainingImages.length > 0) {
            const imagePositions = (0, layoutCalculator_1.calculateJustifiedGridLayout)(remainingImages, {
                preserveOrder: true,
            });
            const startY = this.currentY;
            const maxHeight = this.getPageMaxHeight();
            const fittingItems = [];
            const placedIds = new Set();
            let maxBottom = startY;
            const visibleImageMap = new Map(remainingVisibleImages.map((img) => [String(img.originalIdx), img]));
            for (let i = 0; i < imagePositions.length; i++) {
                const imgPos = imagePositions[i];
                const imgBottom = startY + imgPos.y + imgPos.height + layoutConstants_1.IMAGE_GRID_PADDING * 2;
                if (imgBottom + GAP_AFTER_IMAGE > maxHeight)
                    break;
                const originalImg = visibleImageMap.get(imgPos.url);
                if (!originalImg)
                    continue;
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
                remainingImages = remainingImages.filter((img) => !placedIds.has(img.url));
                remainingVisibleImages = remainingVisibleImages.filter((img) => !placedIds.has(String(img.originalIdx)));
            }
            else if (this.currentPageItems.length > 0) {
                this.startNewPageWithHeaderCarry();
            }
            else {
                const imgPos = imagePositions[0];
                const originalImg = visibleImageMap.get(imgPos.url);
                if (!originalImg)
                    break;
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
                        layoutConstants_1.IMAGE_GRID_PADDING * 2 +
                        GAP_AFTER_IMAGE;
                remainingImages = remainingImages.filter((img) => img.url !== imgPos.url);
                remainingVisibleImages = remainingVisibleImages.filter((img) => String(img.originalIdx) !== imgPos.url);
            }
            if (remainingImages.length > 0 && fittingCount > 0) {
                this.startNewPageWithHeaderCarry();
            }
        }
        if (this.currentPageItems.length > 0) {
            this.lastItemGap = GAP_AFTER_IMAGE;
        }
    }
    addText(content, date, reportId) {
        if (!content)
            return;
        const normalizedContent = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\s+$/g, '');
        if (!normalizedContent)
            return;
        const textHiddenKey = `text-${reportId}-${date}`;
        if (this.isHidden(textHiddenKey))
            return;
        this.currentGroupHasText = true;
        this.currentGroupTextLineCount = getTextLines(normalizedContent);
        this.lastGroupItemType = 'text';
        let remainingText = normalizedContent;
        let textPartIndex = 0;
        while (remainingText.length > 0) {
            const maxHeight = this.getPageMaxHeight();
            const availableHeight = maxHeight - this.currentY;
            const availableTextHeight = availableHeight - layoutConstants_1.TEXT_BLOCK_PADDING;
            if (availableTextHeight < layoutConstants_1.TEXT_LINE_HEIGHT * MIN_TEXT_LINES) {
                this.startNewPageWithHeaderCarry();
                continue;
            }
            const maxLinesOnPage = Math.floor(availableTextHeight / layoutConstants_1.TEXT_LINE_HEIGHT);
            const { fit: textForThisPage, rest: textForNextPage } = (0, textLayout_1.splitTextByLines)(remainingText, maxLinesOnPage, layoutConstants_1.TEXT_CONTENT_WIDTH, layoutConstants_1.TEXT_FONT_SIZE);
            if (!textForThisPage) {
                remainingText = textForNextPage;
                continue;
            }
            const totalLines = getTextLines(textForThisPage);
            const textHeightForThisPage = totalLines * layoutConstants_1.TEXT_LINE_HEIGHT + layoutConstants_1.TEXT_BLOCK_PADDING;
            const hasNextPart = textForNextPage.length > 0;
            this.currentPageItems.push({
                id: `text-${reportId}-${date}-part${textPartIndex}`,
                type: 'text',
                content: textForThisPage,
                position: { x: 0, y: this.currentY },
                size: { width: layoutConstants_1.CONTENT_WIDTH, height: textHeightForThisPage },
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
    addCommentGroup(comments, date, reportId, hiddenSet) {
        if (!comments || comments.length === 0)
            return;
        const visibleComments = comments
            .map((comment, idx) => ({
            ...comment,
            originalIdx: idx,
            commentId: `comment-${reportId}-${date}-${idx}`,
        }))
            .filter((c) => !hiddenSet.has(c.commentId));
        if (visibleComments.length === 0)
            return;
        this.lastGroupItemType = 'comment';
        this.applyGapBeforeComments();
        this.applyExtraGapBeforeComments();
        const commentWidth = layoutConstants_1.CONTENT_WIDTH;
        const bubbleWidth = commentWidth - layoutConstants_1.COMMENT_TITLE_WIDTH - layoutConstants_1.COMMENT_TITLE_GAP;
        const textMaxWidth = bubbleWidth - layoutConstants_1.COMMENT_BUBBLE_HORIZONTAL_PADDING;
        const adjustedTextMaxWidth = Math.floor(textMaxWidth * COMMENT_MAX_WIDTH_RATIO);
        const maxHeight = this.getPageMaxHeight();
        const MIN_CONTINUATION_HEIGHT = layoutConstants_1.COMMENT_LINE_HEIGHT + layoutConstants_1.COMMENT_PADDING + COMMENT_EXTRA_HEIGHT;
        const MIN_COMMENT_HEIGHT = layoutConstants_1.COMMENT_HEADER_HEIGHT +
            layoutConstants_1.COMMENT_LINE_HEIGHT +
            layoutConstants_1.COMMENT_PADDING +
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
                const fullHeight = calculateCommentHeight(remainingText, adjustedTextMaxWidth, isContinuation);
                if (fullHeight <= availableHeight) {
                    this.currentPageItems.push({
                        id: partIndex === 0
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
                    this.markContentAdded(partIndex === 0
                        ? comment.commentId
                        : `${comment.commentId}-part${partIndex}`);
                    this.currentY += fullHeight + GAP_BETWEEN_COMMENTS;
                    remainingText = '';
                }
                else {
                    const headerHeight = isContinuation ? 0 : layoutConstants_1.COMMENT_HEADER_HEIGHT;
                    const availableTextHeight = availableHeight - headerHeight - layoutConstants_1.COMMENT_PADDING;
                    const maxLines = Math.max(1, Math.floor(availableTextHeight / layoutConstants_1.COMMENT_LINE_HEIGHT));
                    const { fit, rest } = (0, textLayout_1.splitTextByLines)(remainingText, maxLines, adjustedTextMaxWidth, layoutConstants_1.COMMENT_FONT_SIZE);
                    if (fit.length === 0) {
                        if (this.currentPageItems.length > 0) {
                            this.startNewPageWithHeaderCarry();
                            continue;
                        }
                    }
                    const partHeight = calculateCommentHeight(fit, adjustedTextMaxWidth, isContinuation);
                    this.currentPageItems.push({
                        id: partIndex === 0
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
                    this.markContentAdded(partIndex === 0
                        ? comment.commentId
                        : `${comment.commentId}-part${partIndex}`);
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
    getPages() {
        return this.pages;
    }
}
function generatePages(reports, albums, hiddenIds = []) {
    const builder = new PageBuilder(hiddenIds);
    const hiddenSet = new Set(hiddenIds);
    for (const report of reports) {
        if (!report.created)
            continue;
        const date = (0, kstDate_1.toKstDateString)(report.created);
        const reportId = String(report.id);
        const month = date.substring(0, 7);
        const textHiddenKey = `text-${reportId}-${date}`;
        const hasVisibleText = report.content && !hiddenSet.has(textHiddenKey);
        const reportMediaCount = (report.videos?.length ?? 0) + (report.images?.length ?? 0);
        const hasVisibleMedia = reportMediaCount > 0 &&
            Array.from({ length: reportMediaCount }).some((_, idx) => !hiddenSet.has(`report-${reportId}-img-${date}-${idx}`));
        const hasVisibleComments = report.comments &&
            report.comments.some((_, idx) => !hiddenSet.has(`comment-${reportId}-${date}-${idx}`));
        const hasVisibleLifeLog = lifeLog_1.LIFE_LOG_KEYS.some((key) => {
            const value = report.life_log?.[key];
            return value && value !== '';
        });
        if (!hasVisibleText &&
            !hasVisibleMedia &&
            !hasVisibleComments &&
            !hasVisibleLifeLog) {
            continue;
        }
        builder.startNewMonth(month);
        const reportTitle = report.is_sent_from_center === false
            ? '가정에서 원으로'
            : '원에서 가정으로';
        builder.setContentType('report', reportId, reportTitle, report.author?.name ?? '', report.weather ?? '', report.life_log);
        builder.applyPendingGroupGap(layoutConstants_1.REPORT_HEADER_HEIGHT + GAP_AFTER_DATE_HEADER);
        builder.addItem({
            id: `date-header-report-${reportId}-${date}`,
            type: 'text',
            content: `📅 ${date}`,
            position: { x: 0, y: 0 },
            size: {
                width: types_1.KN_BOOK_SIZE.WIDTH,
                height: layoutConstants_1.REPORT_HEADER_HEIGHT,
            },
            headerTitle: reportTitle,
            headerAuthor: report.author?.name ?? '',
            headerWeather: report.weather ?? '',
        }, layoutConstants_1.REPORT_HEADER_HEIGHT + GAP_AFTER_DATE_HEADER);
        const reportMedia = [];
        if (report.videos && report.videos.length > 0) {
            report.videos.forEach((video) => {
                if (!video.access_key)
                    return;
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
                if (!img.url && !img.access_key)
                    return;
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
        builder.addText(report.content, date, reportId);
        builder.addLifeLogItem(report.life_log, reportId, date);
        if (report.comments && report.comments.length > 0) {
            const commentsData = report.comments.map((comment) => ({
                id: String(comment.id ?? ''),
                text: comment.text,
                authorName: comment.author?.name ?? '',
                createdAt: (0, kstDate_1.formatKstDateTimeKo)(comment.created_at),
            }));
            builder.addCommentGroup(commentsData, date, reportId, hiddenSet);
        }
        builder.endContentGroup();
    }
    builder.startNewPage();
    for (const album of albums) {
        if (!album.created)
            continue;
        const date = (0, kstDate_1.toKstDateString)(album.created);
        const albumId = String(album.id);
        const month = date.substring(0, 7);
        const albumMediaCount = (album.videos?.length ?? 0) + (album.images?.length ?? 0);
        const hasVisibleMedia = albumMediaCount > 0 &&
            Array.from({ length: albumMediaCount }).some((_, idx) => !hiddenSet.has(`album-${albumId}-img-${date}-${idx}`));
        if (!hasVisibleMedia) {
            continue;
        }
        builder.startNewMonth(month);
        builder.setContentType('album', albumId, album.title ?? '', album.author_name ?? '');
        const albumTitleLines = Math.min(TITLE_MAX_LINES, (0, textLayout_1.calculateTextLines)(album.title ?? '', layoutConstants_1.CONTENT_WIDTH, TITLE_FONT_SIZE));
        const albumHeaderHeight = layoutConstants_1.ALBUM_HEADER_HEIGHT +
            Math.max(0, albumTitleLines - 1) * TITLE_LINE_HEIGHT;
        builder.applyPendingGroupGap(albumHeaderHeight + GAP_AFTER_DATE_HEADER);
        builder.addItem({
            id: `date-header-album-${albumId}-${date}`,
            type: 'text',
            content: `📷 ${date}`,
            position: { x: 0, y: 0 },
            size: {
                width: types_1.KN_BOOK_SIZE.WIDTH,
                height: albumHeaderHeight,
            },
            headerTitle: album.title ?? '',
            headerAuthor: album.author_name ?? '',
        }, albumHeaderHeight + GAP_AFTER_DATE_HEADER);
        const allMedia = [];
        if (album.videos && album.videos.length > 0) {
            album.videos.forEach((video) => {
                if (!video.access_key)
                    return;
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
                if (!img.url && !img.access_key)
                    return;
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
