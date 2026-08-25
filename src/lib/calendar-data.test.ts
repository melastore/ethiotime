import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Kenat from "kenat";

import { gregorianDateOf } from "./calendar-data.ts";

describe("gregorianDateOf", () => {
  it("puts Ethiopian New Year on 11 September", () => {
    const date = gregorianDateOf(2018, 1, 1);
    assert.equal(date.getFullYear(), 2025);
    assert.equal(date.getMonth(), 8);
    assert.equal(date.getDate(), 11);
  });

  it("round-trips through the converter it wraps", () => {
    for (const month of [1, 4, 9, 13]) {
      const back = new Kenat(gregorianDateOf(2018, month, 1)).getEthiopian();
      assert.equal(back.year, 2018);
      assert.equal(back.month, month);
      assert.equal(back.day, 1);
    }
  });

  it("sits at midday, so a clock change cannot move the day", () => {
    // Midnight would be one hour from landing on the day either side.
    assert.equal(gregorianDateOf(2018, 1, 1).getHours(), 12);
  });
});
