import type { Metadata } from "next";

import EthiopianWorldTime from "@/components/ethiopian-world-time";

export const metadata: Metadata = {
  title: "Ethiopian Now",
  description:
    "View Ethiopian date and clock time for cities across different time zones.",
};

export const dynamic = "force-dynamic";

export default function EthiopianNowPage() {
  return <EthiopianWorldTime />;
}
