import type { Metadata } from "next";
import BusinessDaysCalculator from "@/components/business-days";

export const metadata: Metadata = {
  title: "Ethiopian Business & Working Days Calculator | EthioTime",
  description:
    "Calculate working days between Ethiopian dates excluding public holidays and weekends. Plan contracts, legal deadlines, and Ethiopian tax deadlines.",
};

export default function BusinessDaysPage() {
  return <BusinessDaysCalculator />;
}
