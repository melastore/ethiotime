import type { Metadata } from "next";

import NoteTaking from "@/components/note-taking";

export const metadata: Metadata = {
  title: "Note Taking",
  description:
    "Create, organize, and favorite local-first notes with color coding and quick search.",
};

export const dynamic = "force-dynamic";

const NoteTakingPage = () => {
  return <NoteTaking />;
};

export default NoteTakingPage;
