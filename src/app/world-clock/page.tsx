import type { Metadata } from "next";
import WorldClock from "@/components/world-clock";

export const metadata: Metadata = {
  title: "Dual-Reckoning World Clock | EthioTime",
  description:
    "Compare Ethiopian 12-hour day/night time with global diaspora cities: Washington D.C., London, Frankfurt, Dubai, Toronto, Minneapolis, and Melbourne.",
};

export default function WorldClockPage() {
  return <WorldClock />;
}
