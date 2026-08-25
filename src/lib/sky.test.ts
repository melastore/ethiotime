import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { skyAt } from "./sky.ts";

const channels = (value: string) =>
  value.match(/\d+/g)!.map(Number) as [number, number, number];

/** WCAG relative luminance, so contrast can be measured rather than eyeballed. */
const channelLuminance = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channelLuminance(r) +
  0.7152 * channelLuminance(g) +
  0.0722 * channelLuminance(b);

/** Contrast ratio against white, which is what the panel puts on top of it. */
const contrastWithWhite = (value: string) =>
  1.05 / (relativeLuminance(channels(value)) + 0.05);

describe("skyAt", () => {
  it("is warm at dawn and open blue at midday", () => {
    const [dawnR, , dawnB] = channels(skyAt(0).top);
    assert.equal(dawnR > dawnB, true);

    const [noonR, , noonB] = channels(skyAt(0.25).top);
    assert.equal(noonB > noonR, true);
  });

  it("turns warm again at sunset", () => {
    const [r, , b] = channels(skyAt(0.5).top);
    assert.equal(r > b, true);
  });

  it("is dark through the night", () => {
    assert.equal(relativeLuminance(channels(skyAt(0.75).top)) < 0.02, true);
  });

  it("carries white text at every hour of the day", () => {
    for (let step = 0; step < 96; step++) {
      const fraction = step / 96;
      const { ink, inkSoft } = skyAt(fraction);

      // AA for body text on the panel itself.
      assert.equal(
        contrastWithWhite(ink) >= 4.5,
        true,
        `ink fails AA at ${fraction}: ${ink} (${contrastWithWhite(ink).toFixed(2)}:1)`
      );
      // The gradient's lighter end only ever sits under large or bold type.
      assert.equal(
        contrastWithWhite(inkSoft) >= 3,
        true,
        `inkSoft fails at ${fraction}: ${inkSoft} (${contrastWithWhite(inkSoft).toFixed(2)}:1)`
      );
    }
  });

  it("keeps the hue of the hour it came from", () => {
    // Midday ink stays blue-leaning; dawn ink stays warm.
    const [nr, , nb] = channels(skyAt(0.25).ink);
    assert.equal(nb > nr, true);
    const [dr, , db] = channels(skyAt(0).ink);
    assert.equal(dr > db, true);
  });

  it("wraps rather than clamping past the end of the day", () => {
    assert.deepEqual(skyAt(1.25), skyAt(0.25));
    assert.deepEqual(skyAt(-0.75), skyAt(0.25));
  });
});
