import assert from "node:assert/strict";
import test from "node:test";

import {
  arabicToGeez,
  geezToArabic,
  formatEthiopianDateGeez,
} from "./geez-numbers.ts";

test("arabicToGeez converts single digits", () => {
  assert.equal(arabicToGeez(1), "፩");
  assert.equal(arabicToGeez(2), "፪");
  assert.equal(arabicToGeez(5), "፭");
  assert.equal(arabicToGeez(9), "፱");
});

test("arabicToGeez converts tens and combinations", () => {
  assert.equal(arabicToGeez(10), "፲");
  assert.equal(arabicToGeez(11), "፲፩");
  assert.equal(arabicToGeez(17), "፲፯");
  assert.equal(arabicToGeez(20), "፳");
  assert.equal(arabicToGeez(25), "፳፭");
  assert.equal(arabicToGeez(99), "፺፱");
});

test("arabicToGeez converts hundreds and thousands", () => {
  assert.equal(arabicToGeez(100), "፻");
  assert.equal(arabicToGeez(101), "፻፩");
  assert.equal(arabicToGeez(110), "፻፲");
  assert.equal(arabicToGeez(200), "፪፻");
  assert.equal(arabicToGeez(1000), "፲፻");
  assert.equal(arabicToGeez(2017), "፳፻፲፯");
  assert.equal(arabicToGeez(10000), "፼");
});

test("geezToArabic parses Ge'ez numerals back to numbers", () => {
  assert.equal(geezToArabic("፩"), 1);
  assert.equal(geezToArabic("፱"), 9);
  assert.equal(geezToArabic("፲"), 10);
  assert.equal(geezToArabic("፲፯"), 17);
  assert.equal(geezToArabic("፳"), 20);
  assert.equal(geezToArabic("፻"), 100);
  assert.equal(geezToArabic("፳፻፲፯"), 2017);
  assert.equal(geezToArabic("፼"), 10000);
});

test("formatEthiopianDateGeez writes full date in Ge'ez numerals", () => {
  assert.equal(
    formatEthiopianDateGeez("መስከረም", 1, 2017),
    "መስከረም ፩ ቀን ፳፻፲፯ ዓ.ም"
  );
});
