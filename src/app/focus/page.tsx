import type { Metadata } from "next";

import FocusTimer from "@/components/focus-timer";

export const metadata: Metadata = {
  title: "Focus Timer",
  description:
    "Study a note in timed rounds and keep the hours, with streaks on the Ethiopian calendar.",
};

const FocusPage = () => {
  return <FocusTimer />;
};

export default FocusPage;
