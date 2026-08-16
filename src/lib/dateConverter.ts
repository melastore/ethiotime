import {
  fourYears,
  maxEurDate,
  minEurDate,
  oneDay,
  oneYear,
} from './dateConstants';
import { DayOfWeek, MonthEth } from '../components/ethiopian-date-converter/types';
import { EthDateTime } from './EthDateTime';

function eurDateIsConvertible(eurDate: Date): boolean {
  return eurDate >= minEurDate && eurDate <= maxEurDate;
}

export function toEthiopianDateTime(eurDate: Date): EthDateTime {
  if (!eurDateIsConvertible(eurDate)) {
    throw `Out of range input year: ${eurDate.getFullYear()}`;
  }
  const difference =
    eurDate.getTime() - new Date(Date.UTC(1971, 8, 12)).getTime();
  const fourYearsPassed = Math.floor(difference / fourYears);
  let remainingYears = Math.floor(
    (difference - fourYearsPassed * fourYears) / oneYear
  );
  if (remainingYears === 4) {
    remainingYears = 3;
  }
  const year = 1964 + fourYearsPassed * 4 + remainingYears;
  const remainingMonths = Math.floor(
    (difference - fourYearsPassed * fourYears - remainingYears * oneYear) /
      (30 * oneDay)
  );
  const month = (remainingMonths + 1) as MonthEth;
  const date = Math.floor(
    (difference -
      fourYearsPassed * fourYears -
      remainingYears * oneYear -
      remainingMonths * 30 * oneDay) /
      oneDay
  ) + 1;

  return new EthDateTime(
    year,
    month,
    date,
    eurDate.getHours(),
    eurDate.getMinutes(),
    eurDate.getSeconds(),
    eurDate.getDay() as DayOfWeek
  );
}



export function toEuropeanDate(ethDate: EthDateTime): Date {
  // Validate the Ethiopian date
  const daysInMonth = ethDate.getDaysInMonth();
  if (ethDate.date < 1 || ethDate.date > daysInMonth) {
    throw new Error(`Invalid date: ${ethDate.date} for month ${ethDate.month}`);
  }

  // The Ethiopian epoch is 1964-01-01, which corresponds to 1971-09-12 Gregorian (UTC).
  const epoch = new Date(Date.UTC(1971, 8, 12)).getTime();

  const yearsPassed = ethDate.year - 1964;
  const fourYearsPassed = Math.floor(yearsPassed / 4);
  const remainingYears = yearsPassed % 4;

  const monthsPassed = ethDate.month - 1;
  const daysPassed = ethDate.date - 1;

  const difference =
    fourYearsPassed * fourYears +
    remainingYears * oneYear +
    monthsPassed * 30 * oneDay +
    daysPassed * oneDay;

  const eurDate = new Date(epoch + difference);

  if (eurDateIsConvertible(eurDate)) {
    return eurDate;
  }
  throw new Error(`Date not converted: ${ethDate.year}, ${ethDate.month}, ${ethDate.date}`);
}

export const limits = {
  ethiopianCalendarYear: {
    min: () => toEthiopianDateTime(minEurDate).year,
    max: () => toEthiopianDateTime(maxEurDate).year,
  },
  europeanCalendarDate: {
    min: minEurDate,
    max: maxEurDate,
  },
};
