export interface KstYmd {
    year: number;
    month: number;
    day: number;
}
export interface KstDateTime extends KstYmd {
    hour: number;
    minute: number;
}
export declare const toKstYmd: (value: string | undefined | null) => KstYmd | null;
export declare const toKstDateString: (value: string | undefined | null) => string;
export declare const toKstDateTime: (value: string | undefined | null) => KstDateTime | null;
export declare const formatKstDateTimeKo: (value: string | undefined | null) => string;
