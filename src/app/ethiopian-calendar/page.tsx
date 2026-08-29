import type { Metadata } from "next";

import EthiopianCalendar from "@/components/ethiopian-calendar";
import { GuideBlock, ToolGuide } from "@/components/shared/tool-guide";

export const metadata: Metadata = {
  title: "Ethiopian Calendar",
  description:
    "Browse Ethiopian months, weekdays, and holiday details in an interactive calendar.",
};

const EthiopianCalendarPage = () => {
  return (
    <>
      <EthiopianCalendar />

      <ToolGuide title="Reading the Ethiopian calendar">
        <GuideBlock heading="Where the year begins">
          <p>
            The year opens on Meskerem 1, which lands on 11 September, or 12
            September when the year just gone was a leap year. The date is called
            Enkutatash, and it marks the end of the long rains rather than the
            middle of winter, which is why the Ethiopian year starts when it does.
          </p>
        </GuideBlock>

        <GuideBlock heading="Pagume, the thirteenth month">
          <p>
            Twelve months of 30 days come to 360, and the remaining five days form
            Pagume. In a leap year it gets a sixth. Nothing about it is unusual
            inside Ethiopia, though it surprises people converting a date and
            finding a month number 13 they were not expecting.
          </p>
          <p>
            Ethiopian leap years fall when the year divided by 4 leaves 3, so 2019
            is one and 2023 will be the next.
          </p>
        </GuideBlock>

        <GuideBlock heading="Weekdays and fasting days">
          <p>
            The week runs Sunday to Saturday as elsewhere, but Wednesday and
            Friday carry weight for Orthodox households as fasting days, and each
            day of the month is associated with a saint. That association is why
            monthly commemorations like Tsion Maryam on the 21st sit on the same
            day number every month rather than moving.
          </p>
        </GuideBlock>

        <GuideBlock heading="Fixed and moveable holidays">
          <p>
            Most Ethiopian holidays are fixed to an Ethiopian date, so their
            Gregorian date barely moves: Meskel is Meskerem 17 every year.
            Fasika and the fasts leading to it follow the Orthodox Easter
            computation and move by several weeks, and the Islamic holidays follow
            the lunar Hijri calendar, so they shift about eleven days earlier each
            Gregorian year.
          </p>
        </GuideBlock>
      </ToolGuide>
    </>
  );
};

export default EthiopianCalendarPage;
