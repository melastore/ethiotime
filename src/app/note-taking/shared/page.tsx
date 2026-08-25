import type { Metadata } from "next";

import SharedNote from "@/components/shared-note";

export const metadata: Metadata = {
  title: "Shared Note",
  description: "Read a note someone shared with you.",
  // The note lives behind a random id and is not meant to turn up in search.
  robots: { index: false, follow: false },
};

const SharedNotePage = () => {
  return <SharedNote />;
};

export default SharedNotePage;
