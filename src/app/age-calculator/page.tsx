import type { Metadata } from "next";

import AgeCalculator from "@/components/age-calculator";
import { GuideBlock, ToolGuide } from "@/components/shared/tool-guide";

export const metadata: Metadata = {
  title: "Ethiopian Age Calculator",
  description:
    "Calculate age accurately using both Gregorian and Ethiopian calendar systems.",
};

const AgeCalculatorPage = () => {
  return (
    <>
      <AgeCalculator />

      <ToolGuide title="Working out an age across two calendars">
        <GuideBlock heading="Why the two answers can differ by a year">
          <p>
            Someone born in Tir 2000 and someone born in Meskerem 2000 share an
            Ethiopian birth year but not a Gregorian one, because the Ethiopian
            year turns over in September. Subtracting years from a Gregorian
            birthdate and calling the result an Ethiopian age gets it wrong for
            anyone born between January and mid September.
          </p>
          <p>
            The calculator converts first and counts afterwards, in whichever
            calendar you asked for, so the answer agrees with the one on a
            document issued in that calendar.
          </p>
        </GuideBlock>

        <GuideBlock heading="Reading an Ethiopian birth certificate">
          <p>
            Dates on Ethiopian documents are written day first, then month, then
            year, and the year has no marker beyond the context. A date like
            12/04/1995 means Tahsas 12, 1995, which is 21 December 2002. If a form
            abroad rejects it, that is usually why: the year looks impossibly
            early to a system expecting a Gregorian date.
          </p>
        </GuideBlock>

        <GuideBlock heading="Birthdays that only exist sometimes">
          <p>
            A birthday in Pagume is the interesting case. The month has five days
            most years and six in a leap year, so someone born on Pagume 6 has a
            real birthday every four years. Ethiopian families usually mark it on
            Pagume 5 in between, the same way a 29 February birthday moves to the
            28th.
          </p>
        </GuideBlock>

        <GuideBlock heading="School and retirement ages">
          <p>
            Ethiopian school entry and public service retirement are counted in
            Ethiopian years, so if you are checking an age against a rule set in
            Ethiopia, use the Ethiopian figure. For a visa form, a foreign
            university or an insurer, use the Gregorian one. The tool shows both
            at once so you are not converting twice.
          </p>
        </GuideBlock>
      </ToolGuide>
    </>
  );
};

export default AgeCalculatorPage;
