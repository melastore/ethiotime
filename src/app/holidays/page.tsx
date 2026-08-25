import type { Metadata } from "next";

import HolidayGuide from "@/components/holiday-guide";

export const metadata: Metadata = {
  title: "Ethiopian Holidays",
  description:
    "Every Ethiopian feast day of the year: Ethiopian calendar dates with the Gregorian date alongside, and the history behind each holiday.",
};

export default function HolidaysPage() {
  return <HolidayGuide />;
}
