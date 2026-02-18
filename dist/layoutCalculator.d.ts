/**
 * 이미지 레이아웃 계산 유틸리티
 * GoogleLayout_v1 알고리즘 (kidsnote-web-store와 동일)
 */
interface ImageDimension {
    url: string;
    width: number;
    height: number;
}
interface CalculatedPosition {
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare function calculateJustifiedGridLayout(images: ImageDimension[], options?: {
    preserveOrder?: boolean;
}): CalculatedPosition[];
export {};
