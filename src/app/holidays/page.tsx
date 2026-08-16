import type { Metadata } from "next";

import HolidayGuide from "@/components/holiday-guide";

export const metadata: Metadata = {
  title: "Holiday Guide",
  description:
    "Ethiopian public holiday details, dual-calendar dates, and history/context.",
};

export const dynamic = "force-dynamic";

export default function HolidayGuidePage() {
  return <HolidayGuide />;
}
