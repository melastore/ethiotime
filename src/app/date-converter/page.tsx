import type { Metadata } from "next";
import EthiopianDateConverter from "@/components/ethiopian-date-converter";
import { GuideBlock, GuideTable, ToolGuide } from "@/components/shared/tool-guide";
import { ETHIOPIAN_MONTHS } from "@/lib/calendar-data";

export const metadata: Metadata = {
  title: "Ethiopian Date Converter",
  description:
    "Convert between Ethiopian and Gregorian dates with weekday and month context.",
};

const DateConverterPage = () => {
  return (
    <>
      <EthiopianDateConverter />

      <ToolGuide title="How Ethiopian and Gregorian dates line up">
        <GuideBlock heading="Why the year is 7 or 8 years behind, not just 7">
          <p>
            Ethiopia never adopted the correction that moved the rest of the world
            to the Gregorian calendar, and it dates the Annunciation differently,
            so the two calendars sit about eight years apart. The gap is not fixed
            through the year, which is where most conversions go wrong.
          </p>
          <p>
            From Ethiopian New Year on 11 September until 31 December, the
            Ethiopian year is 7 behind. From 1 January until the next New Year, it
            is 8 behind. A birthday in Tir and a birthday in Meskerem fall in the
            same Ethiopian year but different Gregorian ones.
          </p>
        </GuideBlock>

        <GuideBlock heading="Thirteen months, twelve of them identical">
          <p>
            Twelve months run to exactly 30 days each. That leaves five days over,
            six in a leap year, and those become Pagume, the short thirteenth
            month at the end of summer. It is the reason for the old tourism line
            about thirteen months of sunshine.
          </p>
          <GuideTable
            caption="Ethiopian months and the Gregorian dates they cover"
            head={["Month", "Amharic", "Gregorian span"]}
            rows={ETHIOPIAN_MONTHS.map((month) => [
              month.label,
              month.amharic ?? "",
              month.gregorianSpan ?? "",
            ])}
          />
          <p>
            The spans shift by a day in the year after a leap year, which the
            converter above accounts for.
          </p>
        </GuideBlock>

        <GuideBlock heading="A worked example">
          <p>
            Take 29 August 2026. It falls before Ethiopian New Year, so subtract 8
            to get the Ethiopian year 2018. August sits inside Nehase, which runs
            from 7 August to 5 September, and 29 August is the 23rd day of that
            span. The Ethiopian date is Nehase 23, 2018.
          </p>
          <p>
            Run it backwards and the same logic holds: Meskerem 1, 2019 is 11
            September 2026, the first day of the Ethiopian year 2019.
          </p>
        </GuideBlock>

        <GuideBlock heading="Leap years work differently too">
          <p>
            An Ethiopian year is a leap year when dividing it by 4 leaves a
            remainder of 3. Pagume then has 6 days instead of 5. Because that
            extra day comes right before New Year, the following year starts on 12
            September rather than 11. The year 2019 is a leap year, so 2020 will
            begin on 12 September 2027.
          </p>
          <p>
            There is no skipped leap year every century, which is the rule the
            Gregorian calendar uses and the reason the gap between the two
            calendars slowly widens.
          </p>
        </GuideBlock>

        <GuideBlock heading="Reading the time as well as the date">
          <p>
            Ethiopian clock time is offset by six hours: the day starts at dawn,
            so 1:00 in the morning is 7:00 by international clocks. If you are
            converting an appointment and not just a date, check both.
          </p>
        </GuideBlock>
      </ToolGuide>
    </>
  );
};

export default DateConverterPage;
