import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanMathml,
  escapeMathText,
  fillNaryBodies,
  importXml,
  repairOmml,
} from "./note-docx.ts";

describe("cleanMathml", () => {
  it("drops the TeX annotation KaTeX carries along", () => {
    const mathml =
      '<math><mrow><mi>x</mi></mrow><annotation encoding="tex">x</annotation></math>';
    assert.equal(cleanMathml(mathml), "<math><mrow><mi>x</mi></mrow></math>");
  });

  it("drops a phantom whole, not just its tag", () => {
    // mhchem spaces subscripts off an invisible X. Keeping the children put a
    // literal X in the exported equation.
    const mathml =
      '<math><mi>H</mi><msub><mpadded width="0px"><mphantom><mi>X</mi></mphantom>' +
      "</mpadded><mn>2</mn></msub><mi>O</mi></math>";

    assert.equal(cleanMathml(mathml).includes("X"), false);
    assert.equal(cleanMathml(mathml).includes("<mn>2</mn>"), true);
  });
});

describe("repairOmml", () => {
  it("turns the converter's undefined style into upright", () => {
    assert.equal(
      repairOmml('<m:rPr><m:nor/><m:sty m:val="undefined"/></m:rPr>'),
      '<m:rPr><m:nor/><m:sty m:val="p"/></m:rPr>'
    );
  });

  it("leaves a style the converter got right alone", () => {
    const omml = '<m:sty m:val="bi"/>';
    assert.equal(repairOmml(omml), omml);
  });
});

describe("importXml", () => {
  it("returns the element, not the document node around it", () => {
    // The document node has no name; writing it out put a literal <undefined>
    // around every equation and Word threw the file out as unreadable.
    const imported = importXml(
      '<m:oMath xmlns:m="urn:m"><m:r><m:t>x</m:t></m:r></m:oMath>'
    ) as unknown as { rootKey?: string };

    assert.equal(imported?.rootKey, "m:oMath");
  });
});

describe("escapeMathText", () => {
  it("escapes the < the converter leaves bare", () => {
    // A bare < made the XML unparseable and the formula fell back to plain text.
    assert.equal(
      escapeMathText('<m:t xml:space="preserve"><1</m:t>'),
      '<m:t xml:space="preserve">&lt;1</m:t>'
    );
  });

  it("leaves an entity the converter already wrote alone", () => {
    const omml = "<m:t>x&gt;y</m:t>";
    assert.equal(escapeMathText(omml), omml);
  });

  it("escapes a bare ampersand", () => {
    assert.equal(escapeMathText("<m:t>p & q</m:t>"), "<m:t>p &amp; q</m:t>");
  });

  it("does not touch markup outside the text", () => {
    const omml = '<m:nary><m:chr m:val="∑"/><m:e/></m:nary>';
    assert.equal(escapeMathText(omml), omml);
  });
});

const nary = (chr: string) =>
  `<m:nary><m:naryPr><m:chr m:val="${chr}"/></m:naryPr>` +
  "<m:sub><m:r><m:t>n=0</m:t></m:r></m:sub><m:e/></m:nary>";
const run = (text: string) => `<m:r><m:t>${text}</m:t></m:r>`;

describe("fillNaryBodies", () => {
  it("moves the operand under the sign", () => {
    assert.equal(
      fillNaryBodies(nary("∑") + run("x")),
      nary("∑").replace("<m:e/>", `<m:e>${run("x")}</m:e>`)
    );
  });

  it("stops the operand at a relation", () => {
    // Everything after the = belongs to the equation, not under the sigma.
    const filled = fillNaryBodies(nary("∑") + run("x") + run("=") + run("y"));
    assert.equal(filled.includes(`<m:e>${run("x")}</m:e>`), true);
    assert.equal(filled.endsWith(run("=") + run("y")), true);
  });

  it("splits a run that carries the relation along with the operand", () => {
    const filled = fillNaryBodies(nary("∑") + run("x=y"));
    assert.equal(filled.includes("<m:e><m:r><m:t>x</m:t></m:r></m:e>"), true);
    assert.equal(filled.endsWith("<m:r><m:t>=y</m:t></m:r>"), true);
  });

  it("ends one sum's operand where the next term begins", () => {
    const filled = fillNaryBodies(nary("∑") + run("a+b"));
    assert.equal(filled.includes("<m:e><m:r><m:t>a</m:t></m:r></m:e>"), true);
  });

  it("gives a script left baseless its preceding run", () => {
    const script = "<m:sSub><m:sSubPr/><m:e/><m:sub><m:r><m:t>2</m:t></m:r></m:sub></m:sSub>";
    assert.equal(
      fillNaryBodies(run("H") + script),
      script.replace("<m:e/>", `<m:e>${run("H")}</m:e>`)
    );
  });

  it("reaches a sign nested inside another equation part", () => {
    const inner = `<m:num>${nary("∏")}${run("k")}</m:num>`;
    assert.equal(
      fillNaryBodies(`<m:f>${inner}</m:f>`).includes(`<m:e>${run("k")}</m:e>`),
      true
    );
  });

  it("leaves markup it cannot account for untouched", () => {
    assert.equal(fillNaryBodies("stray text"), "stray text");
  });
});
