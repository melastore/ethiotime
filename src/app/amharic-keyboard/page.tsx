import type { Metadata } from "next";

import AmharicKeyboard from "@/components/amharic-keyboard";

export const metadata: Metadata = {
  title: "Amharic Keyboard",
  description:
    "Type Amharic quickly with transliteration support and instant conversion from Latin characters.",
};

const AmharicKeyboardPage = () => {
  return <AmharicKeyboard />;
};

export default AmharicKeyboardPage;
