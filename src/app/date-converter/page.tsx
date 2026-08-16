import type { Metadata } from "next";
import EthiopianDateConverter from "@/components/ethiopian-date-converter";

export const metadata: Metadata = {
  title: "Date Converter",
  description:
    "Convert between Ethiopian and Gregorian dates with weekday and month context.",
};

export const dynamic = "force-dynamic";

const DateConverterPage = () => {
  return <EthiopianDateConverter />;
};

export default DateConverterPage;
