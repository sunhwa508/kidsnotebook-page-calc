/**
 * Node.js 환경에서는 Canvas가 없으므로 문자 폭 비율 기반으로 측정
 */
export declare function measureTextWidth(text: string, fontSize: number): number;
export declare function calculateTextLines(text: string, maxWidth: number, fontSize: number): number;
export declare function splitTextByLines(text: string, maxLines: number, maxWidth: number, fontSize: number): {
    fit: string;
    rest: string;
};
