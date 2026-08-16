export const oneDay = 86400000; // 24 * 60 * 60 * 1000
export const oneYear = 365 * oneDay;
export const fourYears = 1461 * oneDay; // 365 * 4 + 1

// The time difference between the Gregorian and Ethiopian calendars in milliseconds.
// This is approximately 7 years, 8 months, and 11 days.
export const globalTimeDifference = -244080000000;

// The convertible date range.
export const minEurDate = new Date(Date.UTC(1900, 0, 1));
export const maxEurDate = new Date(Date.UTC(2100, 11, 31));