import type { Metadata } from "next";
import EthiopianDateConverter from "@/components/ethiopian-date-converter";

export const metadata: Metadata = {
  title: "Date Converter",
  description:
    "Convert between Ethiopian and Gregorian dates with weekday and month context.",
};

const DateConverterPage = () => {
  return <EthiopianDateConverter />;
};

export default DateConverterPage;
