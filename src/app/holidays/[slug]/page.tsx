import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getHolidayById,
  resolveHolidayOccurrences,
  type HolidayOccurrence,
} from "@/lib/ethiopian-holidays";
import { HOLIDAY_ARTICLES, getHolidayArticleBySlug } from "@/lib/holiday-articles";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ethiotime.com";

// Enough years that the table stays useful between deploys without listing dates
// nobody is looking for yet.
const FIRST_YEAR = 2026;
const LAST_YEAR = 2032;

export const dynamic = "force-static";

export function generateStaticParams() {
  return HOLIDAY_ARTICLES.map((article) => ({ slug: article.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getHolidayArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.searchName,
    description: article.summary,
    alternates: { canonical: `/holidays/${article.slug}/` },
    openGraph: {
      title: `${article.searchName} | EthioTime`,
      description: article.summary,
      url: `${siteUrl}/holidays/${article.slug}/`,
      type: "article",
    },
  };
}

const gregorian = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Resolved at build time: an occurrence computed in the browser would differ
// between visitors and defeats the point of a page about dates.
const occurrencesFor = (id: string): HolidayOccurrence[] => {
  const holiday = getHolidayById(id);
  if (!holiday) return [];

  const rows: HolidayOccurrence[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    rows.push(...resolveHolidayOccurrences(holiday, year));
  }

  return rows.sort((a, b) => a.gregorianDate.getTime() - b.gregorianDate.getTime());
};

const HolidayArticlePage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const article = getHolidayArticleBySlug(slug);
  if (!article) notFound();

  const holiday = getHolidayById(article.id);
  if (!holiday) notFound();

  const occurrences = occurrencesFor(article.id);

  return (
    <article className="mx-auto w-full max-w-3xl pb-12 pt-2">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <Link href="/holidays" className="hover:text-teal-600 dark:hover:text-teal-400">
          Ethiopian Holidays
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <span className="text-slate-700 dark:text-slate-300">{holiday.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {holiday.name}
          </h1>
          <span className="text-2xl font-semibold text-teal-600 dark:text-teal-400">
            {holiday.amharic}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Also called {article.alsoKnownAs.join(", ")}
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg dark:text-slate-300">
          {article.lead}
        </p>
      </header>

      <section
        aria-labelledby="dates-heading"
        className="rounded-[1.6rem] border border-slate-200/70 bg-white/70 p-5 backdrop-blur-xl sm:p-6 dark:border-slate-700/60 dark:bg-slate-900/60"
      >
        <h2
          id="dates-heading"
          className="section-title text-xl font-black text-slate-900 sm:text-2xl dark:text-white"
        >
          When is {holiday.name}?
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{article.rule}</p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/70">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              {holiday.name} dates from {FIRST_YEAR} to {LAST_YEAR}
            </caption>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                <th scope="col" className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Year
                </th>
                <th scope="col" className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Gregorian date
                </th>
                <th scope="col" className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                  Ethiopian date
                </th>
              </tr>
            </thead>
            <tbody>
              {occurrences.map((entry) => (
                <tr
                  key={entry.gregorianDate.toISOString()}
                  className="border-t border-slate-200/80 dark:border-slate-700/70"
                >
                  <td className="px-3 py-2 font-semibold tabular-nums text-slate-900 dark:text-white">
                    {entry.gregorianDate.getUTCFullYear()}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {gregorian.format(entry.gregorianDate)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">
                    {entry.ethiopian.monthLabel} {entry.ethiopian.day}, {entry.ethiopian.year}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 space-y-8">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="section-title text-xl font-black text-slate-900 sm:text-2xl dark:text-white">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-4 text-[15px] leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 flex flex-wrap gap-3 border-t border-slate-200/80 pt-6 text-sm dark:border-slate-700/70">
        <Link
          href="/holidays"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-teal-300"
        >
          All Ethiopian holidays
        </Link>
        <Link
          href="/date-converter"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-teal-300"
        >
          Convert a date
        </Link>
      </footer>
    </article>
  );
};

export default HolidayArticlePage;
