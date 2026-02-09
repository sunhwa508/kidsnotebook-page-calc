"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatKstDateTimeKo = exports.toKstDateTime = exports.toKstDateString = exports.toKstYmd = void 0;
const MICROSECOND_SUFFIX_REGEX = /\.(\d{3})\d+(?=(Z|[+-]\d{2}:?\d{2})$)/;
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;
const normalizeIsoString = (value) => {
    if (MICROSECOND_SUFFIX_REGEX.test(value)) {
        return value.replace(MICROSECOND_SUFFIX_REGEX, '.$1');
    }
    return value;
};
const toKstYmd = (value) => {
    if (!value)
        return null;
    const dateOnlyMatch = value.match(DATE_ONLY_REGEX);
    if (dateOnlyMatch) {
        return {
            year: Number(dateOnlyMatch[1]),
            month: Number(dateOnlyMatch[2]),
            day: Number(dateOnlyMatch[3]),
        };
    }
    const parsed = new Date(normalizeIsoString(value));
    if (!Number.isNaN(parsed.getTime())) {
        const kst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
        return {
            year: kst.getUTCFullYear(),
            month: kst.getUTCMonth() + 1,
            day: kst.getUTCDate(),
        };
    }
    const datePrefix = value.match(DATE_PREFIX_REGEX);
    if (!datePrefix)
        return null;
    return {
        year: Number(datePrefix[1]),
        month: Number(datePrefix[2]),
        day: Number(datePrefix[3]),
    };
};
exports.toKstYmd = toKstYmd;
const toKstDateString = (value) => {
    const ymd = (0, exports.toKstYmd)(value);
    if (!ymd)
        return '';
    const month = String(ymd.month).padStart(2, '0');
    const day = String(ymd.day).padStart(2, '0');
    return `${ymd.year}-${month}-${day}`;
};
exports.toKstDateString = toKstDateString;
const toKstDateTime = (value) => {
    if (!value)
        return null;
    const parsed = new Date(normalizeIsoString(value));
    if (!Number.isNaN(parsed.getTime())) {
        const kst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
        return {
            year: kst.getUTCFullYear(),
            month: kst.getUTCMonth() + 1,
            day: kst.getUTCDate(),
            hour: kst.getUTCHours(),
            minute: kst.getUTCMinutes(),
        };
    }
    const ymd = (0, exports.toKstYmd)(value);
    if (!ymd)
        return null;
    return { ...ymd, hour: 0, minute: 0 };
};
exports.toKstDateTime = toKstDateTime;
const formatKstDateTimeKo = (value) => {
    const dt = (0, exports.toKstDateTime)(value);
    if (!dt)
        return '';
    const ampm = dt.hour < 12 ? '오전' : '오후';
    const hour12 = dt.hour % 12 || 12;
    const month = String(dt.month).padStart(2, '0');
    const day = String(dt.day).padStart(2, '0');
    const hour = String(hour12);
    const minute = String(dt.minute).padStart(2, '0');
    return `${dt.year}년 ${month}월 ${day}일 ${ampm} ${hour}:${minute}`;
};
exports.formatKstDateTimeKo = formatKstDateTimeKo;
