import type { Metadata } from "next";

import AgeCalculator from "@/components/age-calculator";

export const metadata: Metadata = {
  title: "Ethiopian Age Calculator",
  description:
    "Calculate age accurately using both Gregorian and Ethiopian calendar systems.",
};

const AgeCalculatorPage = () => {
  return <AgeCalculator />;
};

export default AgeCalculatorPage;
