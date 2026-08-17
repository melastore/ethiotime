import type { Metadata } from "next";

import HolidayGuide from "@/components/holiday-guide";

export const metadata: Metadata = {
  title: "Holiday Guide",
  description:
    "Ethiopian public holiday details, dual-calendar dates, and history/context.",
};

export default function HolidayGuidePage() {
  return <HolidayGuide />;
}
