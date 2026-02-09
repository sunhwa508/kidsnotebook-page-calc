export declare function measureTextWidth(text: string, fontSize: number): number;
export declare function calculateTextLines(text: string, maxWidth: number, fontSize: number): number;
export declare function splitTextByLines(text: string, maxLines: number, maxWidth: number, fontSize: number): {
    fit: string;
    rest: string;
};
