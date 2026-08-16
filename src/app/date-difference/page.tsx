import type { Metadata } from "next";

import DateDifference from "@/components/date-difference";

export const metadata: Metadata = {
  title: "Date Difference",
  description:
    "Calculate day and week differences between Ethiopian and Gregorian dates.",
};

export const dynamic = "force-dynamic";

export default function DateDifferencePage() {
  return <DateDifference />;
}
