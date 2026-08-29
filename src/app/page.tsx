import type { Metadata } from "next";

import HomeLanding from "@/components/home";
import { GuideBlock, ToolGuide } from "@/components/shared/tool-guide";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ethiotime.com";

export const metadata: Metadata = {
  // The root layout's "%s | EthioTime" template does not apply to this segment,
  // so the full title has to be spelled out here.
  title: { absolute: "EthioTime: Ethiopian Calendar, Date Converter and Amharic Tools" },
  description:
    "Explore Ethiopian date conversion, calendar, typing, age calculation, and note tools in one place.",
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EthioTime",
    url: siteUrl,
    inLanguage: ["en", "am"],
    hasPart: [
      {
        "@type": "WebApplication",
        name: "Date Converter",
        url: `${siteUrl}/date-converter`,
        applicationCategory: "UtilitiesApplication",
      },
      {
        "@type": "WebApplication",
        name: "Event Planner",
        url: `${siteUrl}/event-planner`,
        applicationCategory: "ProductivityApplication",
      },
      {
        "@type": "WebApplication",
        name: "Ethiopian Holidays",
        url: `${siteUrl}/holidays`,
        applicationCategory: "ReferenceApplication",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeLanding />

      <ToolGuide title="Ethiopian calendar questions people ask most">
        <GuideBlock heading="What year is it in Ethiopia right now?">
          <p>
            The Ethiopian year 2018 runs until 10 September 2026, and 2019 begins
            the next day. Ethiopia is 7 years behind the Gregorian calendar
            between Ethiopian New Year and 31 December, and 8 years behind from 1
            January until the next New Year. The panel above shows today&rsquo;s date in
            both, worked out on your device rather than fixed when the page was
            built.
          </p>
        </GuideBlock>

        <GuideBlock heading="Why is the Ethiopian calendar 7 years behind?">
          <p>
            The Ethiopian church kept an earlier calculation of the date of the
            Annunciation, about seven or eight years later than the one Europe
            settled on, and Ethiopia never took up the Gregorian reform of 1582.
            Nothing was lost or skipped. The two calendars simply count from
            different starting points.
          </p>
        </GuideBlock>

        <GuideBlock heading="When is Ethiopian New Year?">
          <p>
            Enkutatash falls on 11 September, or 12 September in the year after an
            Ethiopian leap year. The year 2019 begins on 11 September 2026, and
            2020 on 12 September 2027. It marks the end of the rainy season, when
            the highlands turn yellow with meskel daisies.
          </p>
        </GuideBlock>

        <GuideBlock heading="Does the Ethiopian calendar really have 13 months?">
          <p>
            Yes. Twelve months of exactly 30 days, then Pagume, which has 5 days,
            or 6 in a leap year. Thirteen months of sunshine was a tourism slogan,
            but the thirteenth month is real and ordinary.
          </p>
        </GuideBlock>

        <GuideBlock heading="What time is it in Ethiopia?">
          <p>
            Ethiopia is UTC+3 all year with no daylight saving, but the bigger
            catch is the clock itself. Ethiopian time counts from dawn, so it runs
            six hours apart from the international clock: 1:00 in Ethiopian
            reckoning is 7:00 in the morning, and 6:00 is noon. Ask what time a
            meeting is and it is worth checking which clock the answer is in.
          </p>
        </GuideBlock>
      </ToolGuide>
    </>
  );
}
