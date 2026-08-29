import type { Metadata } from "next";

import AmharicKeyboard from "@/components/amharic-keyboard";
import { GuideBlock, GuideTable, ToolGuide } from "@/components/shared/tool-guide";

export const metadata: Metadata = {
  title: "Amharic Keyboard Online",
  description:
    "Type Amharic quickly with transliteration support and instant conversion from Latin characters.",
};

const AmharicKeyboardPage = () => {
  return (
    <>
      <AmharicKeyboard />

      <ToolGuide title="Typing Amharic without an Amharic keyboard">
        <GuideBlock heading="How transliteration typing works">
          <p>
            Amharic is written in Fidel, a syllabary: each character carries a
            consonant and its vowel together, so there are over 250 of them. No
            physical keyboard holds that many keys, which is why almost everyone
            types Amharic by spelling the sound in Latin letters and letting
            software pick the character.
          </p>
          <p>
            Type <strong>selam</strong> and you get ሰላም. The consonant chooses the
            row, the vowel that follows chooses which of the seven forms in that
            row appears.
          </p>
        </GuideBlock>

        <GuideBlock heading="The seven vowel forms">
          <p>
            Every consonant has seven shapes. Learning the pattern for one of them
            is enough to guess the rest, because the modification is consistent.
          </p>
          <GuideTable
            caption="The seven forms of the consonant h"
            head={["Type", "Get", "Sounds like"]}
            rows={[
              ["ha", "ሀ", "ha"],
              ["hu", "ሁ", "hoo"],
              ["hi", "ሂ", "hee"],
              ["ha", "ሃ", "haa"],
              ["hie", "ሄ", "hay"],
              ["h", "ህ", "h, no vowel"],
              ["ho", "ሆ", "ho"],
            ]}
          />
        </GuideBlock>

        <GuideBlock heading="Sounds Latin letters do not cover">
          <p>
            A few Amharic consonants have no English equivalent. The explosive
            ones are usually typed by doubling or by a nearby letter:{" "}
            <strong>tse</strong> for ጸ, <strong>qe</strong> for ቀ,{" "}
            <strong>che</strong> for ቸ, <strong>she</strong> for ሸ,{" "}
            <strong>gne</strong> for ኘ. If a word comes out wrong, it is nearly
            always one of these.
          </p>
        </GuideBlock>

        <GuideBlock heading="Where this is useful">
          <p>
            Typing on a borrowed computer, filling an Amharic form from abroad,
            writing a name correctly in a document, or adding Amharic to a design
            when you do not want to install a keyboard layout. Type it here, copy
            it, paste it wherever you needed it.
          </p>
          <p>
            Nothing you type is uploaded. The conversion runs in your browser, so
            it also works with no connection.
          </p>
        </GuideBlock>
      </ToolGuide>
    </>
  );
};

export default AmharicKeyboardPage;
