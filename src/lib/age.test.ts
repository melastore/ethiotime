import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  daysBetween,
  ethiopianAge,
  ethiopianMonthLength,
  gregorianAge,
  gregorianMonthLength,
  nextBirthday,
  totalsFor,
} from "./age.ts";

/** Midday, so a clock change never moves one of these onto the neighbouring day. */
const on = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12);

describe("gregorianAge", () => {
  it("counts whole years on the birthday", () => {
    assert.deepEqual(gregorianAge(on(1990, 6, 15), on(2025, 6, 15)), {
      years: 35,
      months: 0,
      days: 0,
    });
  });

  it("stays a year short the day before", () => {
    assert.deepEqual(gregorianAge(on(1990, 6, 15), on(2025, 6, 14)), {
      years: 34,
      months: 11,
      days: 30,
    });
  });

  it("borrows from the month before the later date", () => {
    // February 2025 has 28 days, so 31 January to 2 March is one month and two days.
    assert.deepEqual(gregorianAge(on(2025, 1, 31), on(2025, 3, 2)), {
      years: 0,
      months: 1,
      days: 2,
    });
  });

  it("borrows across a year boundary", () => {
    assert.deepEqual(gregorianAge(on(2023, 12, 20), on(2024, 1, 5)), {
      years: 0,
      months: 0,
      days: 16,
    });
  });
});

describe("ethiopianMonthLength", () => {
  it("gives every month but Pagume thirty days", () => {
    assert.equal(ethiopianMonthLength(2017, 1), 30);
    assert.equal(ethiopianMonthLength(2017, 12), 30);
  });

  it("gives Pagume six days only in John's year", () => {
    assert.equal(ethiopianMonthLength(2011, 13), 6);
    assert.equal(ethiopianMonthLength(2012, 13), 5);
  });
});

describe("ethiopianAge", () => {
  it("counts in thirteen months", () => {
    assert.deepEqual(
      ethiopianAge({ year: 1990, month: 12, day: 10 }, { year: 2017, month: 3, day: 10 }),
      { years: 26, months: 4, days: 0 }
    );
  });

  it("counts across a six-day Pagume", () => {
    // 2015 E.C. is John's year, so Pagume runs to six: Pagume 4 to Meskerem 2 is
    // four days, not three.
    assert.deepEqual(
      ethiopianAge({ year: 2000, month: 13, day: 4 }, { year: 2016, month: 1, day: 2 }),
      { years: 15, months: 0, days: 4 }
    );
  });
});

describe("daysBetween", () => {
  it("ignores the clock", () => {
    const from = new Date(2025, 0, 1, 23, 59);
    const to = new Date(2025, 0, 2, 0, 1);
    assert.equal(daysBetween(from, to), 1);
  });

  it("counts across a leap day", () => {
    assert.equal(daysBetween(on(2024, 2, 28), on(2024, 3, 1)), 2);
    assert.equal(daysBetween(on(2023, 2, 28), on(2023, 3, 1)), 1);
  });
});

describe("totalsFor", () => {
  it("agrees with the year-and-month breakdown", () => {
    const totals = totalsFor(on(2000, 1, 1), on(2025, 7, 15));
    assert.equal(totals.months, 25 * 12 + 6);
    assert.equal(totals.weeks, Math.floor(totals.days / 7));
    assert.equal(totals.hours, totals.days * 24);
  });
});

describe("nextBirthday", () => {
  it("returns today when today is the day", () => {
    const birthday = nextBirthday(on(1990, 5, 4), on(2025, 5, 4));
    assert.equal(birthday.daysAway, 0);
    assert.equal(birthday.turning, 35);
  });

  it("rolls into next year once the day has passed", () => {
    const birthday = nextBirthday(on(1990, 5, 4), on(2025, 5, 5));
    assert.equal(birthday.date.getFullYear(), 2026);
    assert.equal(birthday.turning, 36);
    assert.equal(birthday.daysAway, 364);
  });

  it("keeps a 29 February birthday on 1 March in a common year", () => {
    const birthday = nextBirthday(on(2000, 2, 29), on(2025, 1, 1));
    assert.equal(birthday.date.getMonth(), 2);
    assert.equal(birthday.date.getDate(), 1);
  });

  it("uses the real day in a leap year", () => {
    const birthday = nextBirthday(on(2000, 2, 29), on(2024, 1, 1));
    assert.equal(birthday.date.getMonth(), 1);
    assert.equal(birthday.date.getDate(), 29);
  });
});

describe("gregorianMonthLength", () => {
  it("knows February", () => {
    assert.equal(gregorianMonthLength(2024, 2), 29);
    assert.equal(gregorianMonthLength(2025, 2), 28);
  });
});
