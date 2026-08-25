import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ZODIAC_SIGNS,
  cuspNeighbour,
  evangelistOf,
  isOnCusp,
  zodiacFor,
  zodiacForDate,
  zodiacSpan,
} from "./zodiac.ts";

describe("zodiacFor", () => {
  it("covers every day of the year with exactly one sign", () => {
    // A leap year, so 29 February is included.
    for (let month = 1; month <= 12; month += 1) {
      const length = new Date(2024, month, 0).getDate();
      for (let day = 1; day <= length; day += 1) {
        const matches = ZODIAC_SIGNS.filter(({ from, to }) => {
          const point = month * 100 + day;
          const start = from[0] * 100 + from[1];
          const end = to[0] * 100 + to[1];
          return start <= end
            ? point >= start && point <= end
            : point >= start || point <= end;
        });
        assert.equal(matches.length, 1, `${month}-${day} matched ${matches.length}`);
      }
    }
  });

  it("puts the boundary days in the sign that opens on them", () => {
    assert.equal(zodiacFor(3, 21).id, "aries");
    assert.equal(zodiacFor(3, 20).id, "pisces");
    assert.equal(zodiacFor(10, 23).id, "scorpio");
    assert.equal(zodiacFor(10, 22).id, "libra");
  });

  it("wraps Capricorn across the new year", () => {
    assert.equal(zodiacFor(12, 25).id, "capricorn");
    assert.equal(zodiacFor(1, 5).id, "capricorn");
    assert.equal(zodiacFor(1, 20).id, "aquarius");
  });

  it("reads a Date in local time", () => {
    assert.equal(zodiacForDate(new Date(1994, 7, 14, 12)).id, "leo");
  });

  it("carries the Ge'ez name", () => {
    assert.equal(zodiacFor(11, 5).geez, "ዓቅራብ");
    assert.equal(zodiacFor(9, 1).geez, "ሱንቡላ");
  });
});

describe("cusps", () => {
  it("flags the day either side of a boundary", () => {
    assert.ok(isOnCusp(3, 21));
    assert.ok(isOnCusp(4, 19));
    assert.ok(!isOnCusp(4, 5));
  });

  it("names the sign on the other side", () => {
    assert.equal(cuspNeighbour(3, 21)?.id, "pisces");
    assert.equal(cuspNeighbour(4, 19)?.id, "taurus");
    assert.equal(cuspNeighbour(4, 5), null);
  });

  it("wraps at both ends of the list", () => {
    assert.equal(cuspNeighbour(12, 22)?.id, "sagittarius");
    assert.equal(cuspNeighbour(3, 20)?.id, "aries");
  });
});

describe("zodiacSpan", () => {
  it("writes the stretch of the year out in words", () => {
    assert.equal(zodiacSpan(zodiacFor(11, 5)), "23 October – 21 November");
  });
});

describe("evangelistOf", () => {
  it("gives John the leap year", () => {
    // 2011 E.C. has a sixth day in Pagume, and is John's year.
    assert.equal(2011 % 4, 3);
    assert.equal(evangelistOf(2011).name, "John");
  });

  it("runs Matthew, Mark, Luke, John in order", () => {
    assert.deepEqual(
      [2012, 2013, 2014, 2015].map((year) => evangelistOf(year).name),
      ["Matthew", "Mark", "Luke", "John"]
    );
  });
});
