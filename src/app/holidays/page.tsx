import type { Metadata } from "next";

import Beal from "@/components/holiday-guide";

export const metadata: Metadata = {
  title: "Beal — Ethiopian Holidays",
  description:
    "Every Ethiopian feast day of the year: Ethiopian calendar dates with the Gregorian date alongside, and the history behind each holiday.",
};

export default function BealPage() {
  return <Beal />;
}
