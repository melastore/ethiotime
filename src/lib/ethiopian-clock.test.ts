import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dateAtDayFraction,
  daysInEthiopianYear,
  ethiopianTimeAt,
  formatEthiopianClock,
  monthArc,
  pagumeLength,
  yearFraction,
} from "./ethiopian-clock.ts";

/** A local time on a fixed day, so the clock never depends on when tests run. */
const at = (hour: number, minute = 0, second = 0) =>
  new Date(2025, 8, 24, hour, minute, second);

describe("ethiopianTimeAt", () => {
  it("calls six in the morning twelve o'clock", () => {
    const time = ethiopianTimeAt(at(6));
    assert.equal(time.hour, 12);
    assert.equal(time.period.amharic, "ከጠዋቱ");
    assert.equal(time.dayFraction, 0);
  });

  it("counts the hours after dawn", () => {
    assert.equal(ethiopianTimeAt(at(7)).hour, 1);
    assert.equal(ethiopianTimeAt(at(9)).hour, 3);
    assert.equal(ethiopianTimeAt(at(11)).hour, 5);
  });

  it("moves to ከቀኑ at midday", () => {
    const noon = ethiopianTimeAt(at(12));
    assert.equal(noon.hour, 6);
    assert.equal(noon.period.id, "afternoon");
    assert.equal(noon.dayFraction, 0.25);
  });

  it("calls sunset twelve o'clock again, in the evening", () => {
    const dusk = ethiopianTimeAt(at(18));
    assert.equal(dusk.hour, 12);
    assert.equal(dusk.period.id, "evening");
    assert.equal(dusk.dayFraction, 0.5);
    assert.equal(dusk.isDaylight, false);
  });

  it("puts midnight in ከሌሊቱ, not at the start of the day", () => {
    const midnight = ethiopianTimeAt(at(0));
    assert.equal(midnight.hour, 6);
    assert.equal(midnight.period.id, "night");
    assert.equal(midnight.dayFraction, 0.75);
  });

  it("keeps the small hours at the end of the cycle rather than below zero", () => {
    const beforeDawn = ethiopianTimeAt(at(5, 59));
    assert.equal(beforeDawn.period.id, "night");
    assert.equal(beforeDawn.dayFraction > 0.99, true);
  });

  it("carries minutes and seconds through unchanged", () => {
    const time = ethiopianTimeAt(at(9, 5, 30));
    assert.equal(formatEthiopianClock(time), "3:05");
    assert.equal(formatEthiopianClock(time, true), "3:05:30");
  });

  it("treats the twelve hours after dawn as daylight", () => {
    assert.equal(ethiopianTimeAt(at(6)).isDaylight, true);
    assert.equal(ethiopianTimeAt(at(17, 59)).isDaylight, true);
    assert.equal(ethiopianTimeAt(at(18, 1)).isDaylight, false);
  });
});

describe("dateAtDayFraction", () => {
  it("maps the start of the arc back to dawn", () => {
    assert.equal(dateAtDayFraction(0, at(15)).getHours(), 6);
  });

  it("round-trips a point on the arc", () => {
    const original = at(14, 30);
    const fraction = ethiopianTimeAt(original).dayFraction;
    const restored = dateAtDayFraction(fraction, original);
    assert.equal(restored.getHours(), 14);
    assert.equal(restored.getMinutes(), 30);
  });

  it("stays inside the day at the far end", () => {
    assert.equal(dateAtDayFraction(1, at(12)).getDate(), 25);
    assert.equal(dateAtDayFraction(1, at(12)).getHours(), 5);
  });
});

describe("the year", () => {
  it("gives Pagume six days only before a leap year", () => {
    assert.equal(pagumeLength(2015), 6);
    assert.equal(pagumeLength(2016), 5);
    assert.equal(daysInEthiopianYear(2015), 366);
    assert.equal(daysInEthiopianYear(2016), 365);
  });

  it("puts the first of Meskerem at the start of the ring", () => {
    assert.equal(yearFraction(1, 1, 2018), 0);
  });

  it("gives Pagume a slice a fifth the size of a full month", () => {
    const meskerem = monthArc(1, 2018);
    const pagume = monthArc(13, 2018);
    const full = meskerem.end - meskerem.start;
    const short = pagume.end - pagume.start;
    assert.equal(Math.round((full / short) * 10) / 10, 6);
    // The thirteen slices close the circle exactly.
    assert.equal(Math.abs(pagume.end - 1) < 1e-9, true);
  });

  it("orders the months around the ring without gaps", () => {
    for (let month = 1; month < 13; month++) {
      assert.equal(monthArc(month, 2018).end, monthArc(month + 1, 2018).start);
    }
  });
});
