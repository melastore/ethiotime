/**
 * Markdown note -> .docx.
 *
 * Formulas are converted LaTeX -> MathML -> OMML, which is Word's own equation
 * format, so they arrive as equations the reader can click into and edit rather
 * than as pictures of equations.
 *
 * This module pulls in the document writer and the whole TeX typesetter, so it
 * is meant to be reached through `await import()` at the moment of export and
 * never from the initial bundle.
 */

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

import { normalizeDisplayMath } from "@/lib/markdown-normalize";

const MONO = "Consolas";
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

/**
 * KaTeX emits MathML wrapped in a `<span>`, with the original TeX carried along
 * in an `<annotation>` that the OMML converter has no equivalent for.
 */
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
    const omml = mml2omml(
      mathml.replace(/<annotation[\s\S]*?<\/annotation>/g, "")
    );
    return ImportedXmlComponent.fromXmlString(omml);
  } catch {
    return null;
  }
}

/** Formulas Word cannot represent still have to reach the page as something. */
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

/** Builds the .docx and hands back a blob ready to be saved. */
export async function noteToDocxBlob(
  title: string,
  markdown: string
): Promise<Blob> {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .parse(normalizeDisplayMath(markdown)) as Root;

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
