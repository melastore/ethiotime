import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MONTH_GRID_CELLS,
  dateKey,
  monthGridDates,
  stepMonth,
  toGregorianDate,
} from "./month-grid.ts";

describe("stepMonth", () => {
  it("moves within a year", () => {
    assert.deepEqual(stepMonth(2017, 5, 1), { year: 2017, month: 6 });
    assert.deepEqual(stepMonth(2017, 5, -1), { year: 2017, month: 4 });
  });

  it("wraps forward through Pagume", () => {
    assert.deepEqual(stepMonth(2017, 13, 1), { year: 2018, month: 1 });
  });

  it("wraps backward into Pagume", () => {
    assert.deepEqual(stepMonth(2017, 1, -1), { year: 2016, month: 13 });
  });

  it("takes a step of any size in one go", () => {
    assert.deepEqual(stepMonth(2017, 1, 13), { year: 2018, month: 1 });
    assert.deepEqual(stepMonth(2017, 1, -13), { year: 2016, month: 1 });
    assert.deepEqual(stepMonth(2017, 7, 30), { year: 2019, month: 11 });
  });
});

describe("monthGridDates", () => {
  it("always fills six weeks", () => {
    for (let month = 1; month <= 13; month += 1) {
      assert.equal(monthGridDates(2017, month).length, MONTH_GRID_CELLS);
    }
  });

  it("starts every grid on a Monday", () => {
    for (let month = 1; month <= 13; month += 1) {
      const [first] = monthGridDates(2017, month);
      assert.equal(toGregorianDate(first.gregorian).getDay(), 1);
    }
  });

  it("runs one day at a time with no gaps or repeats", () => {
    const cells = monthGridDates(2016, 4);
    for (let index = 1; index < cells.length; index += 1) {
      const previous = toGregorianDate(cells[index - 1].gregorian);
      const current = toGregorianDate(cells[index].gregorian);
      const gap = Math.round(
        (current.getTime() - previous.getTime()) / 86_400_000
      );
      assert.equal(gap, 1, `gap of ${gap} days at cell ${index}`);
    }
  });

  it("marks exactly the days of the month itself", () => {
    const cells = monthGridDates(2017, 6);
    const inMonth = cells.filter((cell) => cell.inMonth);
    assert.equal(inMonth.length, 30);
    assert.equal(inMonth[0].ethiopian.day, 1);
    assert.equal(inMonth[29].ethiopian.day, 30);
    assert.ok(inMonth.every((cell) => cell.ethiopian.month === 6));
  });

  it("gives Pagume five days, or six in John's year", () => {
    assert.equal(
      monthGridDates(2016, 13).filter((cell) => cell.inMonth).length,
      5
    );
    // 2015 E.C. is John's year.
    assert.equal(
      monthGridDates(2015, 13).filter((cell) => cell.inMonth).length,
      6
    );
  });

  it("borrows from the months either side, across the year boundary", () => {
    const meskerem = monthGridDates(2017, 1);
    const before = meskerem.filter((cell) => !cell.inMonth && cell.ethiopian.month === 13);
    assert.ok(before.length > 0);
    assert.ok(before.every((cell) => cell.ethiopian.year === 2016));

    const pagume = monthGridDates(2016, 13);
    const after = pagume.filter((cell) => !cell.inMonth && cell.ethiopian.month === 1);
    assert.ok(after.every((cell) => cell.ethiopian.year === 2017));
  });

  it("never repeats a cell key", () => {
    const cells = monthGridDates(2017, 2);
    const keys = new Set(cells.map((cell) => dateKey(cell.ethiopian)));
    assert.equal(keys.size, MONTH_GRID_CELLS);
  });
});
