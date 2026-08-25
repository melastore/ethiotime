// Markdown note to .docx. Formulas go LaTeX -> MathML -> OMML, Word's own
// equation format, so they land as equations you can click into rather than
// pictures.
//
// Pulls in the document writer and the whole TeX typesetter, so reach it through
// `await import()` at export time, never from the initial bundle.

import katex from "katex";
// Must be registered here too: the export path does not go through the viewer,
// so without it \ce{...} reaches Word as literal text.
import "katex/contrib/mhchem";
import { mml2omml } from "mathml2omml";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImportedXmlComponent,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Root, RootContent, PhrasingContent, ListItem } from "mdast";

import { normalizeNote } from "@/lib/markdown-normalize";

const MONO = "Consolas";
const MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const CODE_SHADING = { type: ShadingType.CLEAR, fill: "F1F5F9" } as const;

const HEADING_BY_DEPTH = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

type Marks = { bold?: boolean; italics?: boolean; strike?: boolean };

// `<mphantom>` is laid out but never drawn. The converter has no equivalent and
// emits the children instead, so mhchem's `\ce{H2O}` (which spaces its subscript
// off a phantom X) came out of Word as "HX2O".
export const cleanMathml = (mathml: string) =>
  mathml
    .replace(/<annotation[\s\S]*?<\/annotation>/g, "")
    .replace(/<mphantom\b[^>]*>[\s\S]*?<\/mphantom>/g, "");

// mathvariant="normal" (every `\mathrm`, and mhchem's upright letters) has no
// entry in the converter's style table, so it writes a literal
// `m:val="undefined"`. Word accepts only p, b, i or bi and rejects the file.
export const repairOmml = (omml: string) =>
  omml.replace(/(<m:sty\b[^>]*m:val=")undefined(")/g, "$1p$2");

// The converter copies `<` and `&` into `<m:t>` as they came, so `|r| < 1` left a
// bare `<` in the XML. The parse then failed and the formula fell back to plain
// text.
export const escapeMathText = (omml: string) =>
  omml.replace(
    /(<m:t\b[^>]*>)([\s\S]*?)(<\/m:t>)/g,
    (_, open: string, text: string, close: string) =>
      open +
      text
        .replace(/&(?!(?:[A-Za-z][A-Za-z0-9]*|#\d+|#x[0-9A-Fa-f]+);)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;") +
      close
  );

// The top-level elements of an XML fragment, in order.
function splitChildren(inner: string): string[] {
  const chunks: string[] = [];
  const tag = /<(\/?)([A-Za-z_][\w:.-]*)[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;

  for (let match = tag.exec(inner); match; match = tag.exec(inner)) {
    if (depth === 0) start = match.index;

    if (match[3]) {
      if (depth === 0) chunks.push(match[0]);
    } else if (match[1]) {
      depth -= 1;
      if (depth === 0) chunks.push(inner.slice(start, tag.lastIndex));
    } else {
      depth += 1;
    }
  }

  return chunks;
}

const EMPTY_NARY = /^<m:nary>[\s\S]*<m:e\/><\/m:nary>$/;
// Dropping mhchem's phantom leaves the subscript with no base, which Word draws
// as an empty box. In `\ce{H2O}` the base is the run before it.
const EMPTY_BASE = /^<m:(?:sSub|sSup|sSubSup)>(?:<m:s\w+Pr(?:\/>|>[\s\S]*?<\/m:s\w+Pr>))?<m:e\/>/;
const RUN_TEXT = /^(<m:r>[\s\S]*?)(<m:t\b[^>]*>)([\s\S]*?)(<\/m:t><\/m:r>)$/;
// Where a summand ends: the next relation, or the `+`/`-` starting the next term.
// Anything tighter (products, fractions, powers) stays under the sign.
const OPERAND_END = /&lt;|&gt;|[=≠≤≥≈≡→⇒↔+,−±∓-]/;

// How much of the next sibling belongs under the operator: -1 for all of it, 0 for
// none, otherwise the offset in its text to cut at.
function operandCut(chunk: string, first: boolean): number {
  const parts = RUN_TEXT.exec(chunk);
  if (!parts) return -1;

  // A leading sign belongs to the operand, not to the next term.
  const from = first && /^[+−±∓-]/.test(parts[3]) ? 1 : 0;
  const at = parts[3].slice(from).search(OPERAND_END);

  return at < 0 ? -1 : from + at;
}

function splitRun(chunk: string, at: number): [string, string] {
  const [, head, open, text, close] = RUN_TEXT.exec(chunk)!;
  return [head + open + text.slice(0, at) + close, head + open + text.slice(at) + close];
}

// Presentation MathML has nowhere to put a sum's operand, so KaTeX leaves `r^n` as
// the sigma's neighbour and the converter emits `<m:nary>` with an empty `<m:e/>`.
// Word then draws a full-size sigma with an empty box and the operand outside it.
export function fillNaryBodies(inner: string): string {
  const chunks = splitChildren(inner);
  // Anything the split missed is text, not markup, so leave the fragment alone.
  if (chunks.join("") !== inner) return inner;

  const out: string[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    if (!EMPTY_NARY.test(chunks[index])) {
      const base =
        EMPTY_BASE.test(chunks[index]) && out.at(-1)?.startsWith("<m:r>")
          ? out.pop()
          : null;

      out.push(
        descend(
          base
            ? chunks[index].replace("<m:e/>", `<m:e>${base}</m:e>`)
            : chunks[index]
        )
      );
      continue;
    }

    const nary = chunks[index];
    const body: string[] = [];

    while (index + 1 < chunks.length) {
      const cut = operandCut(chunks[index + 1], body.length === 0);
      if (cut === 0) break;

      if (cut > 0) {
        const [head, tail] = splitRun(chunks[index + 1], cut);
        body.push(head);
        chunks[index + 1] = tail;
        break;
      }

      body.push(chunks[index + 1]);
      index += 1;
    }

    out.push(
      descend(
        nary.replace(
          /<m:e\/><\/m:nary>$/,
          `<m:e>${body.join("")}</m:e></m:nary>`
        )
      )
    );
  }

  return out.join("");
}

// Runs the same pass over an element's own children.
function descend(element: string): string {
  const open = /^<([A-Za-z_][\w:.-]*)[^>]*?>/.exec(element);
  if (!open || element.endsWith("/>") || open[1] === "m:t") return element;

  const inner = element.slice(open[0].length, -(open[1].length + 3));
  return `${open[0]}${fillNaryBodies(inner)}</${open[1]}>`;
}

// `fromXmlString` hands back the XML document node, not the element inside it.
// Its rootKey is undefined, which writes a literal `<undefined>` around the
// equation, and Word drops it as unreadable. The element wanted is its only child.
export function importXml(xml: string): ImportedXmlComponent | null {
  const document = ImportedXmlComponent.fromXmlString(xml) as unknown as {
    root?: unknown[];
  };

  return (
    document.root?.find(
      (child): child is ImportedXmlComponent =>
        child instanceof ImportedXmlComponent
    ) ?? null
  );
}

// KaTeX wraps its MathML in a `<span>` and carries the original TeX in an
// `<annotation>` the converter cannot use. Display formulas get a further
// `m:oMathPara` wrap, which is what puts the equation on its own line in Word.
function texToOmml(tex: string, displayMode: boolean) {
  const rendered = katex.renderToString(tex, {
    output: "mathml",
    displayMode,
    throwOnError: false,
    strict: false,
  });

  const mathml = rendered.match(/<math[\s\S]*?<\/math>/)?.[0];
  if (!mathml) return null;

  try {
    const omml = fillNaryBodies(
      repairOmml(escapeMathText(mml2omml(cleanMathml(mathml))))
    );

    return importXml(
      displayMode
        ? `<m:oMathPara xmlns:m="${MATH_NS}"><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${omml}</m:oMathPara>`
        : omml
    );
  } catch {
    return null;
  }
}

// Formulas Word cannot represent still have to reach the page as something.
const texFallback = (tex: string) =>
  new TextRun({ text: tex, font: MONO, italics: true });

function phrasingToRuns(
  nodes: PhrasingContent[],
  marks: Marks = {}
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        runs.push(new TextRun({ text: node.value, ...marks }));
        break;
      case "strong":
        runs.push(...phrasingToRuns(node.children, { ...marks, bold: true }));
        break;
      case "emphasis":
        runs.push(...phrasingToRuns(node.children, { ...marks, italics: true }));
        break;
      case "delete":
        runs.push(...phrasingToRuns(node.children, { ...marks, strike: true }));
        break;
      case "inlineCode":
        runs.push(
          new TextRun({
            text: node.value,
            font: MONO,
            shading: CODE_SHADING,
            ...marks,
          })
        );
        break;
      case "inlineMath":
        runs.push(texToOmml(node.value, false) ?? texFallback(node.value));
        break;
      case "link":
        runs.push(
          new ExternalHyperlink({
            link: node.url,
            children: phrasingToRuns(node.children, { ...marks }).filter(
              (child): child is TextRun => child instanceof TextRun
            ),
          })
        );
        break;
      case "break":
        runs.push(new TextRun({ text: "", break: 1 }));
        break;
      case "image":
        runs.push(new TextRun({ text: node.alt ?? node.url, italics: true }));
        break;
      default:
        if ("children" in node) {
          runs.push(...phrasingToRuns(node.children as PhrasingContent[], marks));
        } else if ("value" in node) {
          runs.push(new TextRun({ text: String(node.value), ...marks }));
        }
    }
  }

  return runs;
}

function listToParagraphs(
  items: ListItem[],
  ordered: boolean,
  depth: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  items.forEach((item) => {
    let first = true;

    for (const child of item.children) {
      if (child.type === "list") {
        paragraphs.push(
          ...listToParagraphs(child.children, Boolean(child.ordered), depth + 1)
        );
        continue;
      }

      const options: IParagraphOptions = {
        children:
          child.type === "paragraph" ? phrasingToRuns(child.children) : [],
        spacing: { after: 60 },
      };

      // Only the first block of an item carries the bullet; a second paragraph
      // inside the same item lines up under it instead of restarting the list.
      if (first) {
        paragraphs.push(
          new Paragraph(
            ordered
              ? { ...options, numbering: { reference: "note-ordered", level: depth } }
              : { ...options, bullet: { level: depth } }
          )
        );
        first = false;
      } else if (child.type === "paragraph") {
        paragraphs.push(
          new Paragraph({ ...options, indent: { left: 720 * (depth + 1) } })
        );
      } else {
        paragraphs.push(...blockToParagraphs(child, depth + 1));
      }
    }
  });

  return paragraphs;
}

function blockToParagraphs(node: RootContent, depth = 0): Paragraph[] {
  switch (node.type) {
    case "heading":
      return [
        new Paragraph({
          heading: HEADING_BY_DEPTH[node.depth - 1],
          children: phrasingToRuns(node.children),
          spacing: { before: 240, after: 120 },
        }),
      ];

    case "paragraph":
      return [
        new Paragraph({
          children: phrasingToRuns(node.children),
          spacing: { after: 120 },
        }),
      ];

    case "math":
      return [
        new Paragraph({
          children: [texToOmml(node.value, true) ?? texFallback(node.value)],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
        }),
      ];

    case "code":
      // One paragraph per line: a single run with newlines in it collapses, and
      // Word needs the line breaks to keep the listing readable.
      return node.value.split("\n").map(
        (line, index, lines) =>
          new Paragraph({
            children: [new TextRun({ text: line || " ", font: MONO, size: 19 })],
            shading: CODE_SHADING,
            spacing: {
              before: index === 0 ? 120 : 0,
              after: index === lines.length - 1 ? 120 : 0,
            },
            indent: { left: 240 },
          })
      );

    case "blockquote":
      return node.children.flatMap((child) =>
        blockToParagraphs(child, depth).map(
          (paragraph) => paragraph as Paragraph
        )
      );

    case "list":
      return listToParagraphs(node.children, Boolean(node.ordered), depth);

    case "thematicBreak":
      return [
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
          },
          spacing: { before: 120, after: 120 },
        }),
      ];

    default:
      return [];
  }
}

function tableToDocx(node: Extract<RootContent, { type: "table" }>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: node.children.map(
      (row, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          children: row.children.map(
            (cell) =>
              new TableCell({
                shading: rowIndex === 0 ? CODE_SHADING : undefined,
                children: [
                  new Paragraph({
                    children: phrasingToRuns(cell.children, {
                      bold: rowIndex === 0,
                    }),
                  }),
                ],
              })
          ),
        })
    ),
  });
}

// Builds the .docx and hands back a blob ready to be saved.
export async function noteToDocxBlob(
  title: string,
  markdown: string
): Promise<Blob> {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .parse(normalizeNote(markdown)) as Root;

  const body: (Paragraph | Table)[] = [];

  if (title.trim()) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: title.trim() })],
        spacing: { after: 240 },
      })
    );
  }

  for (const node of tree.children) {
    if (node.type === "table") {
      body.push(tableToDocx(node));
      // Word runs consecutive tables together without a paragraph between them.
      body.push(new Paragraph({ text: "", spacing: { after: 120 } }));
    } else {
      body.push(...blockToParagraphs(node));
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "note-ordered",
          levels: Array.from({ length: 5 }, (_, level) => ({
            level,
            format: "decimal" as const,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1) } } },
          })),
        },
      ],
    },
    sections: [{ children: body.length > 0 ? body : [new Paragraph("")] }],
  });

  return Packer.toBlob(doc);
}
