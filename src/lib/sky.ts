/**
 * The colour of the sky at a given point in the Ethiopian day.
 *
 * The day dial and the panel it sits in read from the same place, so the card
 * behind the sun is the sky the sun is in: warm at dawn, open blue at midday,
 * amber at sunset, deep indigo through the night. A fixed brand colour behind a
 * clock that already changes only fights it.
 *
 * `ink` is the same hue pulled down toward near-black. The panel uses that
 * rather than the sky itself, because white type has to stay readable at noon as
 * well as at midnight, and the hue is what carries the meaning — not the
 * lightness.
 */

type Rgb = [number, number, number];

export type Sky = {
  /** Toward the top of the dome. */
  top: string;
  /** Toward the horizon. */
  bottom: string;
  /** The sky darkened far enough to carry white text. */
  ink: string;
  /** A second, slightly lighter stop, for depth in a gradient. */
  inkSoft: string;
};

/** Keyframes from dawn (0) round to dawn again (1). */
const KEYFRAMES: [number, Rgb, Rgb][] = [
  [0, [251, 146, 120], [254, 215, 170]],
  [0.08, [125, 211, 252], [224, 242, 254]],
  [0.25, [56, 189, 248], [186, 230, 253]],
  [0.42, [96, 165, 250], [219, 234, 254]],
  [0.5, [249, 115, 22], [253, 186, 116]],
  [0.58, [30, 41, 105], [67, 56, 168]],
  [0.75, [12, 18, 36], [26, 24, 66]],
  [0.94, [20, 32, 74], [28, 38, 56]],
  [1, [251, 146, 120], [254, 215, 170]],
];

/** How far the panel colour is pulled toward this, to keep white type legible. */
const NEAR_BLACK: Rgb = [11, 18, 32];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const css = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`;

export function skyAt(fraction: number): Sky {
  const wrapped = ((fraction % 1) + 1) % 1;

  let index = 0;
  while (index < KEYFRAMES.length - 2 && wrapped > KEYFRAMES[index + 1][0]) {
    index++;
  }

  const [from, fromTop, fromBottom] = KEYFRAMES[index];
  const [to, toTop, toBottom] = KEYFRAMES[index + 1];
  const span = to - from || 1;
  const t = Math.min(Math.max((wrapped - from) / span, 0), 1);

  const top = mix(fromTop, toTop, t);
  const bottom = mix(fromBottom, toBottom, t);

  return {
    top: css(top),
    bottom: css(bottom),
    ink: css(mix(top, NEAR_BLACK, 0.66)),
    inkSoft: css(mix(bottom, NEAR_BLACK, 0.52)),
  };
}
