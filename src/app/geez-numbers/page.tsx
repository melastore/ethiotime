import type { Metadata } from "next";
import GeezNumbers from "@/components/geez-numbers";

export const metadata: Metadata = {
  title: "Ge'ez Numerals Converter | EthioTime",
  description:
    "Convert numbers and Ethiopian dates to traditional Ge'ez numerals (የግዕዝ ቁጥሮች). Complete numeral chart with pronunciations and manuscript date formatting.",
};

export default function GeezNumbersPage() {
  return <GeezNumbers />;
}
