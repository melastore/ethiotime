import type { Metadata } from "next";

import EthiopianCalendar from "@/components/ethiopian-calendar";

export const metadata: Metadata = {
  title: "Ethiopian Calendar",
  description:
    "Browse Ethiopian months, weekdays, and holiday details in an interactive calendar.",
};

const EthiopianCalendarPage = () => {
  return <EthiopianCalendar />;
};

export default EthiopianCalendarPage;
