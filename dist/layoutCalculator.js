"use strict";
/**
 * 이미지 레이아웃 계산 유틸리티
 * GoogleLayout_v1 알고리즘 (kidsnote-web-store와 동일)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateJustifiedGridLayout = calculateJustifiedGridLayout;
const layoutConstants_1 = require("./layoutConstants");
class LayoutRow {
    constructor(maxWidth, minHeight, maxHeight, hGap) {
        this.maxWidth = maxWidth;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
        this.hGap = hGap;
        this.images = [];
        this.sumRatio = 0;
        this.horizontalCount = 0;
        this.verticalCount = 0;
    }
    addImage(img, index) {
        if (this.images.includes(img))
            return;
        if (index !== undefined) {
            this.images.splice(index, 0, img);
        }
        else {
            this.images.push(img);
        }
        if (img.height > 0 && img.width > 0) {
            const ratio = img.width / img.height;
            if (ratio >= 1.0) {
                this.horizontalCount++;
            }
            else {
                this.verticalCount++;
            }
            this.sumRatio += ratio;
        }
    }
    removeImage(img) {
        const index = this.images.indexOf(img);
        if (index === -1)
            return;
        this.images.splice(index, 1);
        if (img.height > 0 && img.width > 0) {
            const ratio = img.width / img.height;
            if (ratio >= 1.0) {
                this.horizontalCount--;
            }
            else {
                this.verticalCount--;
            }
            this.sumRatio -= ratio;
        }
    }
    getFirstImage() {
        return this.images[0] ?? null;
    }
    getLastImage() {
        return this.images[this.images.length - 1] ?? null;
    }
    hasImages() {
        return this.images.length > 0;
    }
    getScore() {
        return this.horizontalCount * 2 + this.verticalCount * 1;
    }
}
const GAP = 8;
const MAX_ROW_HEIGHT = layoutConstants_1.IMAGE_MAX_HEIGHT;
const MIN_ROW_HEIGHT = layoutConstants_1.IMAGE_MIN_HEIGHT;
const EXTREME_IMAGE_RATIO = 3.8;
const isExtremeRatio = (ratio) => ratio >= EXTREME_IMAGE_RATIO || ratio <= 1 / EXTREME_IMAGE_RATIO;
const MAX_SUM_RATIO = 3.5;
const MAX_SCORE = 4;
const MERGE_ROW_MIN_HEIGHT = Math.max(MIN_ROW_HEIGHT * 1.15, MIN_ROW_HEIGHT + 24);
const OFFSET_GAP = 2;
const DEAD_SPACE_THRESHOLD = layoutConstants_1.MIN_OFFSET_WIDTH + OFFSET_GAP;
function buildGoogleLayoutRows(images, maxWidth, minHeight, maxHeight, hGap, preserveOrder) {
    const rows = [];
    const maxR = maxWidth / minHeight;
    for (const img of images) {
        if (img.height < 1 || img.width < 1)
            continue;
        const ratio = img.width / img.height;
        const isExtreme = isExtremeRatio(ratio);
        if (isExtreme) {
            const row = new LayoutRow(maxWidth, minHeight, maxHeight, hGap);
            row.addImage(img);
            rows.push(row);
            continue;
        }
        if (ratio >= maxR) {
            const row = new LayoutRow(maxWidth, minHeight, maxHeight, hGap);
            row.addImage(img);
            if (preserveOrder) {
                rows.push(row);
            }
            else {
                const insertIdx = Math.max(0, rows.length - 2);
                rows.splice(insertIdx, 0, row);
            }
            continue;
        }
        let needNewRow = false;
        if (rows.length === 0) {
            needNewRow = true;
        }
        else {
            const lastRow = rows[rows.length - 1];
            const lastRowHasExtreme = lastRow.images.some((item) => {
                if (item.height < 1 || item.width < 1)
                    return false;
                return isExtremeRatio(item.width / item.height);
            });
            if (lastRowHasExtreme) {
                needNewRow = true;
            }
            if (lastRow.sumRatio + ratio > MAX_SUM_RATIO) {
                needNewRow = true;
            }
            else if (lastRow.getScore() >= MAX_SCORE) {
                needNewRow = true;
            }
            else if (ratio >= 1.5 &&
                (1 + lastRow.horizontalCount) * 2 + lastRow.verticalCount > MAX_SCORE) {
                needNewRow = true;
            }
            else {
                const newCount = lastRow.images.length + 1;
                const availableWidth = maxWidth - hGap * (newCount - 1);
                const newSumRatio = lastRow.sumRatio + ratio;
                const nextRowHeight = newSumRatio > 0 ? availableWidth / newSumRatio : 0;
                const nextHorizontalCount = lastRow.horizontalCount + (ratio >= 1.0 ? 1 : 0);
                const nextVerticalCount = lastRow.verticalCount + (ratio < 1.0 ? 1 : 0);
                const willBeMixedOrientation = nextHorizontalCount > 0 && nextVerticalCount > 0;
                const rowHasExtreme = lastRow.images.some((item) => {
                    if (item.height < 1 || item.width < 1)
                        return false;
                    return isExtremeRatio(item.width / item.height);
                });
                if (!rowHasExtreme &&
                    !isExtreme &&
                    nextRowHeight < minHeight &&
                    !willBeMixedOrientation) {
                    needNewRow = true;
                }
            }
        }
        if (needNewRow) {
            rows.push(new LayoutRow(maxWidth, minHeight, maxHeight, hGap));
        }
        rows[rows.length - 1].addImage(img);
    }
    return rows.filter((row) => row.hasImages());
}
function getImageRatio(img) {
    if (img.height <= 0)
        return 0;
    return img.width / img.height;
}
function mergeConsecutiveSingleImageRows(rows) {
    let changed = true;
    while (changed) {
        changed = false;
        for (let idx = 0; idx < rows.length - 1; idx++) {
            const currentRow = rows[idx];
            const nextRow = rows[idx + 1];
            if (currentRow.images.length === 1 && nextRow.images.length === 1) {
                const currentRatio = getImageRatio(currentRow.images[0]);
                const nextRatio = getImageRatio(nextRow.images[0]);
                if (isExtremeRatio(currentRatio) || isExtremeRatio(nextRatio)) {
                    continue;
                }
                const imgToMove = nextRow.getFirstImage();
                if (imgToMove) {
                    nextRow.removeImage(imgToMove);
                    currentRow.addImage(imgToMove);
                    rows.splice(idx + 1, 1);
                    changed = true;
                    break;
                }
            }
        }
    }
    return rows.filter((row) => row.hasImages());
}
function pickImageIndexByPriority(row, preferHorizontal) {
    const candidates = row.images.map((img, index) => ({
        img,
        index,
        ratio: getImageRatio(img),
    }));
    if (candidates.length === 0)
        return null;
    const preferred = candidates.filter((c) => preferHorizontal ? c.ratio >= 1 : c.ratio < 1);
    const fallback = candidates.filter((c) => preferHorizontal ? c.ratio < 1 : c.ratio >= 1);
    const list = preferred.length > 0 ? preferred : fallback;
    list.sort((a, b) => b.ratio - a.ratio);
    return list[0]?.index ?? null;
}
function calculateRowHeight(images, maxWidth, hGap, maxHeight) {
    if (images.length === 0)
        return maxHeight;
    const sumRatio = images.reduce((sum, img) => {
        if (img.height < 1 || img.width < 1)
            return sum;
        return sum + img.width / img.height;
    }, 0);
    if (sumRatio <= 0)
        return maxHeight;
    const availableWidth = maxWidth - hGap * (images.length - 1);
    const justifiedHeight = availableWidth / sumRatio;
    const hasMixedOrientation = images.some((img) => getImageRatio(img) >= 1) &&
        images.some((img) => getImageRatio(img) < 1);
    if (hasMixedOrientation)
        return justifiedHeight;
    return Math.min(justifiedHeight, maxHeight);
}
function rebalanceLastRowSingleImage(rows, maxWidth) {
    if (rows.length < 2)
        return rows;
    const lastRow = rows[rows.length - 1];
    const prevRow = rows[rows.length - 2];
    if (lastRow.images.length !== 1)
        return rows;
    if (!prevRow || prevRow.images.length === 0)
        return rows;
    const lastRatio = getImageRatio(lastRow.images[0]);
    if (isExtremeRatio(lastRatio))
        return rows;
    if (prevRow.images.some((img) => isExtremeRatio(getImageRatio(img)))) {
        return rows;
    }
    if (prevRow.images.length >= 3) {
        const moveIndex = pickImageIndexByPriority(prevRow, true);
        const moved = moveIndex !== null ? prevRow.images[moveIndex] : prevRow.getLastImage();
        if (!moved)
            return rows;
        prevRow.removeImage(moved);
        lastRow.addImage(moved, 0);
        return rows;
    }
    if (prevRow.images.length === 2) {
        const lastImage = lastRow.getFirstImage();
        if (!lastImage)
            return rows;
        const combined = [...prevRow.images, lastRow.images[0]];
        const combinedHeight = calculateRowHeight(combined, maxWidth, GAP, MAX_ROW_HEIGHT);
        if (combinedHeight >= MERGE_ROW_MIN_HEIGHT) {
            prevRow.addImage(lastImage);
            rows.pop();
            return rows;
        }
        const prevPrevRow = rows[rows.length - 3];
        if (prevPrevRow && prevPrevRow.images.length >= 3) {
            const backfillIndex = pickImageIndexByPriority(prevPrevRow, true);
            const backfillImage = backfillIndex !== null
                ? prevPrevRow.images[backfillIndex]
                : prevPrevRow.getLastImage();
            if (backfillImage) {
                prevPrevRow.removeImage(backfillImage);
                prevRow.addImage(backfillImage);
                const moveIndex = pickImageIndexByPriority(prevRow, true);
                const moved = moveIndex !== null
                    ? prevRow.images[moveIndex]
                    : prevRow.getLastImage();
                if (moved) {
                    prevRow.removeImage(moved);
                    lastRow.addImage(moved, 0);
                }
            }
        }
    }
    return rows;
}
function rebalanceLastRowSingleImagePreserveOrder(rows, maxWidth) {
    if (rows.length < 2)
        return rows;
    const lastRow = rows[rows.length - 1];
    const prevRow = rows[rows.length - 2];
    if (lastRow.images.length !== 1)
        return rows;
    if (!prevRow || prevRow.images.length === 0)
        return rows;
    const lastRatio = getImageRatio(lastRow.images[0]);
    if (isExtremeRatio(lastRatio))
        return rows;
    if (prevRow.images.some((img) => isExtremeRatio(getImageRatio(img)))) {
        return rows;
    }
    if (prevRow.images.length >= 3) {
        const moved = prevRow.getLastImage();
        if (!moved)
            return rows;
        prevRow.removeImage(moved);
        lastRow.addImage(moved, 0);
        return rows;
    }
    if (prevRow.images.length === 2) {
        const lastImage = lastRow.getFirstImage();
        if (!lastImage)
            return rows;
        const combined = [...prevRow.images, lastRow.images[0]];
        const combinedHeight = calculateRowHeight(combined, maxWidth, GAP, MAX_ROW_HEIGHT);
        if (combinedHeight >= MERGE_ROW_MIN_HEIGHT) {
            prevRow.addImage(lastImage);
            rows.pop();
            return rows;
        }
    }
    return rows;
}
function layoutRowImages(images, rowHeight, startY, hGap) {
    const positions = [];
    let currentX = 0;
    for (const img of images) {
        if (img.height < 1 || img.width < 1)
            continue;
        const ratio = img.width / img.height;
        const width = rowHeight * ratio;
        positions.push({
            url: img.url,
            x: currentX,
            y: startY,
            width,
            height: rowHeight,
        });
        currentX += width + hGap;
    }
    return positions;
}
function adjustRowHeightForDeadSpace(images, rowHeight, containerWidth) {
    if (images.length === 0)
        return rowHeight;
    const sumRatio = images.reduce((sum, img) => {
        if (img.height < 1 || img.width < 1)
            return sum;
        return sum + img.width / img.height;
    }, 0);
    if (sumRatio <= 0)
        return rowHeight;
    const totalImageWidth = rowHeight * sumRatio;
    const gapWidth = GAP * (images.length - 1);
    const rowWidth = totalImageWidth + gapWidth;
    const deadSpace = containerWidth - rowWidth;
    if (deadSpace > 0) {
        // 데드스페이스 있음 → 확대해서 채우기 시도
        const targetTotalWidth = containerWidth - gapWidth;
        const expandedHeight = targetTotalWidth / sumRatio;
        if (expandedHeight <= MAX_ROW_HEIGHT) {
            // 확대해도 높이 허용 범위 → 데드스페이스 제거
            return expandedHeight;
        }
        // 확대하면 너무 높아짐 → 축소해서 offset 공간 확보
        if (deadSpace >= DEAD_SPACE_THRESHOLD) {
            return rowHeight; // 이미 offset 들어갈 공간 충분
        }
        const additionalSpaceNeeded = DEAD_SPACE_THRESHOLD - deadSpace;
        const shrinkRatio = (totalImageWidth - additionalSpaceNeeded) / totalImageWidth;
        if (shrinkRatio <= 0)
            return rowHeight;
        return Math.max(MIN_ROW_HEIGHT, rowHeight * shrinkRatio);
    }
    // 데드스페이스 없음 (행이 꽉 차거나 넘침) → 오버플로우만 보정
    if (deadSpace < 0) {
        const targetTotalWidth = containerWidth - gapWidth;
        return targetTotalWidth / sumRatio;
    }
    return rowHeight;
}
function calculateJustifiedGridLayout(images, options) {
    if (images.length === 0)
        return [];
    const preserveOrder = options?.preserveOrder ?? false;
    const containerWidth = layoutConstants_1.CONTENT_BOX_WIDTH - layoutConstants_1.IMAGE_GRID_PADDING * 2;
    let rows = buildGoogleLayoutRows(images, containerWidth, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT, GAP, preserveOrder);
    rows = mergeConsecutiveSingleImageRows(rows);
    if (!preserveOrder) {
        rows = rebalanceLastRowSingleImage(rows, containerWidth);
    }
    else {
        rows = rebalanceLastRowSingleImagePreserveOrder(rows, containerWidth);
    }
    const positions = [];
    let currentY = 0;
    for (const row of rows) {
        const baseRowHeight = calculateRowHeight(row.images, containerWidth, GAP, MAX_ROW_HEIGHT);
        const rowHeight = adjustRowHeightForDeadSpace(row.images, baseRowHeight, containerWidth);
        const rowPositions = layoutRowImages(row.images, rowHeight, currentY, GAP);
        positions.push(...rowPositions);
        currentY += rowHeight + GAP;
    }
    return positions;
}
