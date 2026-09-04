import assert from "node:assert/strict";
import test from "node:test";

import { getDailySaints, getFastingStatus } from "./ethiopian-saints.ts";

test("getDailySaints returns known monthly saints", () => {
  assert.equal(getDailySaints(12).primaryAmharic, "ቅዱስ ሚካኤል ሊቀ መላእክት");
  assert.equal(getDailySaints(19).primaryAmharic, "ቅዱስ ገብርኤል ሊቀ መላእክት");
  assert.equal(getDailySaints(21).primaryAmharic, "እግዝእትነ ማርያም");
  assert.equal(getDailySaints(23).primaryAmharic, "ቅዱስ ጊዮርጊስ ሰማዕት");
  assert.equal(getDailySaints(27).primaryAmharic, "መድኃኔዓለም");
  assert.equal(getDailySaints(29).primaryAmharic, "ባዕለ ወልድ");
});

test("getFastingStatus flags Wednesday and Friday", () => {
  // Wednesday (weekday = 3)
  const wed = getFastingStatus(1, 5, 3);
  assert.equal(wed.isFasting, true);
  assert.ok(wed.nameEnglish.includes("Wednesday"));

  // Friday (weekday = 5)
  const fri = getFastingStatus(1, 7, 5);
  assert.equal(fri.isFasting, true);
  assert.ok(fri.nameEnglish.includes("Friday"));

  // Non-fasting Tuesday (weekday = 2)
  const tue = getFastingStatus(1, 4, 2);
  assert.equal(tue.isFasting, false);
});

test("getFastingStatus identifies seasonal fasts", () => {
  // Filseta (Month 12 / Nahase 1 to 16)
  const filseta = getFastingStatus(12, 5, 2); // Tuesday during Filseta
  assert.equal(filseta.isFasting, true);
  assert.ok(filseta.nameAmharic.includes("ፍልሰታ"));

  // Advent (Hidar 20)
  const advent = getFastingStatus(3, 20, 2);
  assert.equal(advent.isFasting, true);
  assert.ok(advent.nameAmharic.includes("ነቢያት"));
});
