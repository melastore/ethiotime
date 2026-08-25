import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnswers,
  buildDateAnswers,
  buildFidelAnswer,
  buildHolidayAnswers,
  parseDateQuery,
  transliterateLatin,
} from "./command-answers.ts";

/** A fixed "now" so relative words and missing years resolve the same every run. */
const NOW = new Date(2025, 8, 24); // 24 September 2025 — Meskerem 2018.

describe("parseDateQuery", () => {
  it("reads a relative word as today's Gregorian date", () => {
    assert.deepEqual(parseDateQuery("today", NOW), {
      calendar: "gregorian",
      day: 24,
      month: 9,
      year: 2025,
    });
  });

  it("reads Amharic relative words", () => {
    const parsed = parseDateQuery("ነገ", NOW);
    assert.equal(parsed?.day, 25);
  });

  it("leaves bare digits open to either calendar", () => {
    assert.deepEqual(parseDateQuery("1/1/2017", NOW), {
      calendar: "either",
      day: 1,
      month: 1,
      year: 2017,
    });
  });

  it("takes a four-digit leading number as the year", () => {
    assert.deepEqual(parseDateQuery("2017-05-09", NOW), {
      calendar: "either",
      day: 9,
      month: 5,
      year: 2017,
    });
  });

  it("swaps a month above twelve back into the day slot", () => {
    // "9/24/2025" can only be month-first, since there is no 24th month.
    assert.deepEqual(parseDateQuery("9/24/2025", NOW), {
      calendar: "either",
      day: 24,
      month: 9,
      year: 2025,
    });
  });

  it("lets an Ethiopian month name settle the calendar", () => {
    assert.deepEqual(parseDateQuery("meskerem 1 2017", NOW), {
      calendar: "ethiopian",
      day: 1,
      month: 1,
      year: 2017,
    });
  });

  it("accepts an Amharic month name", () => {
    const parsed = parseDateQuery("ጥር 9 2016", NOW);
    assert.equal(parsed?.calendar, "ethiopian");
    assert.equal(parsed?.month, 5);
  });

  it("accepts a Gregorian month name in either position", () => {
    assert.deepEqual(parseDateQuery("11 sep 2025", NOW), {
      calendar: "gregorian",
      day: 11,
      month: 9,
      year: 2025,
    });
  });

  it("fills in the current year of the matched calendar", () => {
    assert.equal(parseDateQuery("meskerem 1", NOW)?.year, 2018);
    assert.equal(parseDateQuery("september 1", NOW)?.year, 2025);
  });

  it("returns null for text that is not a date", () => {
    assert.equal(parseDateQuery("selam", NOW), null);
    assert.equal(parseDateQuery("", NOW), null);
  });
});

describe("buildDateAnswers", () => {
  it("converts Meskerem 1, 2018 to 11 September 2025", () => {
    const [answer] = buildDateAnswers("meskerem 1 2018", NOW);
    assert.equal(answer.from, "ethiopian");
    assert.equal(answer.target.year, 2025);
    assert.equal(answer.target.month, 9);
    assert.equal(answer.target.day, 11);
    assert.equal(answer.weekday.full, "Thursday");
  });

  it("converts 11 September 2025 back to Meskerem 1, 2018", () => {
    const [answer] = buildDateAnswers("11 september 2025", NOW);
    assert.equal(answer.from, "gregorian");
    assert.equal(answer.target.year, 2018);
    assert.equal(answer.target.monthLabel, "Meskerem");
    assert.equal(answer.target.day, 1);
  });

  it("offers both readings of an ambiguous numeric date", () => {
    const answers = buildDateAnswers("1/1/2017", NOW);
    assert.equal(answers.length, 2);
    assert.deepEqual(
      answers.map((answer) => answer.from),
      ["ethiopian", "gregorian"]
    );
    // Only the second is marked as the alternate reading.
    assert.deepEqual(
      answers.map((answer) => answer.alternate),
      [false, true]
    );
  });

  it("puts the reading whose year is nearer the present first", () => {
    const answers = buildDateAnswers("1/1/2025", NOW);
    assert.equal(answers[0].from, "gregorian");
  });

  it("reads month thirteen as Ethiopian only", () => {
    const answers = buildDateAnswers("1/13/2016", NOW);
    assert.equal(answers.length, 1);
    assert.equal(answers[0].from, "ethiopian");
    assert.equal(answers[0].source.monthLabel, "Pagume");
  });

  it("rejects a day that neither calendar has", () => {
    assert.deepEqual(buildDateAnswers("31/2/2020", NOW), []);
    // Pagume runs to five days, or six in a leap year; 2016 is not one.
    assert.deepEqual(buildDateAnswers("pagume 6 2016", NOW), []);
    assert.equal(buildDateAnswers("pagume 6 2015", NOW).length, 1);
  });

  it("rejects a Gregorian date that rolled over", () => {
    // 31 April is not a date, and must not silently become 1 May.
    const answers = buildDateAnswers("31/4/2025", NOW);
    assert.equal(answers.every((answer) => answer.from !== "gregorian"), true);
  });

  it("links to the converter with the typed date already filled in", () => {
    const [answer] = buildDateAnswers("meskerem 1 2018", NOW);
    assert.equal(
      answer.href,
      "/date-converter?from=ethiopian&day=1&month=1&year=2018"
    );
  });
});

describe("transliterateLatin", () => {
  it("writes a Latin word in fidel", () => {
    assert.equal(transliterateLatin("selam"), "ሰላም");
    assert.equal(transliterateLatin("amarigna"), "አማሪኛ");
  });
});

describe("buildFidelAnswer", () => {
  it("answers for a Latin word", () => {
    assert.equal(buildFidelAnswer("selam")?.fidel, "ሰላም");
  });

  it("holds off until there is a word to work with", () => {
    assert.equal(buildFidelAnswer("se"), null);
  });

  it("ignores text that is already fidel, or is not a word", () => {
    assert.equal(buildFidelAnswer("ሰላም"), null);
    assert.equal(buildFidelAnswer("12/3/2017"), null);
  });
});

describe("buildHolidayAnswers", () => {
  it("finds a feast by its English name and dates it", () => {
    const [answer] = buildHolidayAnswers("enkutatash", NOW);
    assert.equal(answer.occurrence.holiday.id, "enkutatash");
    assert.equal(answer.href, "/holidays?holiday=enkutatash");
    assert.equal(answer.occurrence.gregorianDate.getTime() >= NOW.getTime(), true);
  });

  it("finds a feast by its Amharic name", () => {
    const answers = buildHolidayAnswers("ገና", NOW);
    assert.equal(answers.length > 0, true);
  });

  it("returns each feast once, at its next occurrence", () => {
    const answers = buildHolidayAnswers("f", NOW);
    const ids = answers.map((answer) => answer.occurrence.holiday.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("stays quiet until there is something to match on", () => {
    assert.deepEqual(buildHolidayAnswers("e", NOW), []);
  });
});

describe("buildAnswers", () => {
  it("holds the fidel answer back when asked to", () => {
    // "note" names a tool, so its fidel spelling must not outrank it.
    const kinds = buildAnswers("note", NOW, { includeFidel: false }).map(
      (answer) => answer.kind
    );
    assert.equal(kinds.includes("fidel"), false);
  });

  it("still answers in fidel for a word that names nothing", () => {
    const kinds = buildAnswers("selam", NOW).map((answer) => answer.kind);
    assert.deepEqual(kinds, ["fidel"]);
  });

  it("puts dates before feasts before fidel", () => {
    const kinds = buildAnswers("meskerem 1 2018", NOW).map((answer) => answer.kind);
    assert.equal(kinds[0], "date");
  });
});
