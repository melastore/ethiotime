import type { Metadata } from "next";

import HomeLanding from "@/components/home";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ethiotime.com";

export const metadata: Metadata = {
  title: "Home",
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
    </>
  );
}
