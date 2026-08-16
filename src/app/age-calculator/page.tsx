import type { Metadata } from "next";

import AgeCalculator from "@/components/age-calculator";

export const metadata: Metadata = {
  title: "Age Calculator",
  description:
    "Calculate age accurately using both Gregorian and Ethiopian calendar systems.",
};

export const dynamic = "force-dynamic";

const AgeCalculatorPage = () => {
  return <AgeCalculator />;
};

export default AgeCalculatorPage;
