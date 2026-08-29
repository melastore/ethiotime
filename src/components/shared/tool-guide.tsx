import type { ReactNode } from "react";

// Server-rendered on purpose: this is the part of each tool page that has to sit
// in the exported HTML for a crawler, so it must not depend on state that only
// exists after mount.

type ToolGuideProps = {
  title: string;
  children: ReactNode;
};

export const ToolGuide = ({ title, children }: ToolGuideProps) => (
  <section
    aria-labelledby="guide-title"
    className="mx-auto mt-10 w-full max-w-4xl rounded-[1.8rem] border border-slate-200/70 bg-white/70 p-6 backdrop-blur-xl sm:p-8 dark:border-slate-700/60 dark:bg-slate-900/60"
  >
    <h2
      id="guide-title"
      className="section-title text-xl font-black text-slate-900 sm:text-2xl dark:text-white"
    >
      {title}
    </h2>
    <div className="mt-5 space-y-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
      {children}
    </div>
  </section>
);

export const GuideHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-base font-bold text-slate-900 dark:text-white">{children}</h3>
);

export const GuideBlock = ({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <GuideHeading>{heading}</GuideHeading>
    {children}
  </div>
);

// Facts a reader scans rather than reads. Scrolls on its own so a narrow screen
// never widens the page.
export const GuideTable = ({
  caption,
  head,
  rows,
}: {
  caption?: string;
  head: string[];
  rows: string[][];
}) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/70">
    <table className="w-full border-collapse text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800/60">
          {head.map((cell) => (
            <th
              key={cell}
              scope="col"
              className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400"
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row[0]}
            className="border-t border-slate-200/80 dark:border-slate-700/70"
          >
            {row.map((cell, i) => (
              <td
                key={cell + i}
                className={
                  i === 0
                    ? "px-3 py-2 font-semibold text-slate-900 dark:text-white"
                    : "px-3 py-2 tabular-nums"
                }
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
