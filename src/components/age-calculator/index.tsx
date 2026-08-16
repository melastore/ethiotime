'use client';

import { useReducer, useEffect, useMemo } from 'react';
import { Calendar, Globe, Sparkles } from 'lucide-react';
import Kenat from 'kenat';
import {
  DAY_OPTIONS,
  ETHIOPIAN_MONTHS,
  GREGORIAN_MONTHS,
  getDescendingEthiopianYears,
  getDescendingGregorianYears,
  getDaysInMonthForMode,
  getTodayInputForMode,
  type CalendarMode,
  type DateInput,
} from '@/lib/calendar-data';

const ethiopianMonths = ETHIOPIAN_MONTHS.map((month) => ({
  value: month.value,
  label: `${month.amharic ?? month.label} / ${month.label}`,
}));

const gregorianMonths = GREGORIAN_MONTHS.map((month) => ({
  value: month.value,
  label: month.label,
}));

const days = DAY_OPTIONS.map((day) => ({ value: day, label: day }));

const gregorianYears = getDescendingGregorianYears(120).map((year) => ({
  value: year,
  label: year,
}));

const ethiopianYears = getDescendingEthiopianYears(120).map((year) => ({
  value: year,
  label: year,
}));

type DateParts = DateInput;

interface Age {
  years: number;
  months: number;
  days: number;
}

interface State {
  dob: DateParts;
  age: Age | null;
  mode: CalendarMode;
  error: string | null;
}

type Action =
  | { type: 'SET_DOB'; payload: Partial<DateParts> }
  | { type: 'SET_AGE'; payload: Age | null }
  | { type: 'SET_MODE'; payload: CalendarMode }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CALCULATE_AGE' };

const getInitialState = (mode: CalendarMode): State => {
  return {
    dob: getTodayInputForMode(mode),
    age: null,
    mode,
    error: null,
  };
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DOB':
      return { ...state, dob: { ...state.dob, ...action.payload }, age: null, error: null };
    case 'SET_AGE':
      return { ...state, age: action.payload, error: null };
    case 'SET_MODE':
      if (state.mode === action.payload) return state;
      return getInitialState(action.payload);
    case 'SET_ERROR':
      return { ...state, error: action.payload, age: null };
    case 'CALCULATE_AGE': {
      const { day, month, year } = state.dob;
      if (!day || !month || !year) {
        return { ...state, error: 'Please select a complete date.', age: null };
      }

      try {
        let age: Age;
        if (state.mode === 'gregorian') {
          const birthDate = new Date(+year, +month - 1, +day);
          if (isNaN(birthDate.getTime()) || 
              birthDate.getFullYear() !== +year || 
              birthDate.getMonth() !== +month - 1 || 
              birthDate.getDate() !== +day) {
            throw new Error('Invalid Date');
          }
          const today = new Date();
          if (birthDate > today) {
            throw new Error('Date of birth cannot be in the future.');
          }

          let years = today.getFullYear() - birthDate.getFullYear();
          let months = today.getMonth() - birthDate.getMonth();
          let days = today.getDate() - birthDate.getDate();

          if (days < 0) {
            months--;
            const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += prevMonth.getDate();
          }

          if (months < 0) {
            years--;
            months += 12;
          }

          age = { years, months, days };
        } else {
          const birthDate = new Kenat({ year: +year, month: +month, day: +day });
          const birthGregorian = birthDate.getGregorian();
          const birthGDate = new Date(birthGregorian.year, birthGregorian.month - 1, birthGregorian.day);
          
          if (isNaN(birthGDate.getTime())) {
            throw new Error('Invalid Ethiopian Date');
          }

          const nowKenat = new Kenat();
          const today = nowKenat.getEthiopian();
          const todayGregorian = nowKenat.getGregorian();
          const todayGDate = new Date(todayGregorian.year, todayGregorian.month - 1, todayGregorian.day);

          if (birthGDate > todayGDate) {
            throw new Error('Date of birth cannot be in the future.');
          }

          let years = today.year - +year;
          let months = today.month - +month;
          let days = today.day - +day;

          if (days < 0) {
            months--;
            const prevMonth = today.month === 1 ? 13 : today.month - 1;
            const prevMonthYear = today.month === 1 ? today.year - 1 : today.year;
            const daysInPrevMonth =
              prevMonth === 13 ? (prevMonthYear % 4 === 3 ? 6 : 5) : 30;
            days += daysInPrevMonth;
          }

          if (months < 0) {
            years--;
            months += 13;
          }

          age = { years, months, days };
        }
        return { ...state, age, error: null };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not calculate age.';
        return { ...state, error: message, age: null };
      }
    }
    default:
      return state;
  }
}

function DateSelector({ mode, value, onChange }: { mode: CalendarMode; value: DateParts; onChange: (v: Partial<DateParts>) => void }) {
  const isGregorian = mode === 'gregorian';
  const months = isGregorian ? gregorianMonths : ethiopianMonths;
  const years = isGregorian ? gregorianYears : ethiopianYears;

  const validDays = useMemo(() => {
    const { year, month } = value;
    if (!year || !month) return days;
    try {
      const daysInMonth = getDaysInMonthForMode(mode, month, year);
      return days.slice(0, daysInMonth);
    } catch {
      return days;
    }
  }, [value, mode]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Day</label>
        <select
          value={value.day}
          onChange={(e) => onChange({ day: e.target.value })}
          className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/85 px-4 text-base font-medium shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700/80 dark:bg-slate-900/70"
        >
          <option value="">Day</option>
          {validDays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Month</label>
        <select
          value={value.month}
          onChange={(e) => onChange({ month: e.target.value })}
          className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/85 px-4 text-base font-medium shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700/80 dark:bg-slate-900/70"
        >
          <option value="">Month</option>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Year</label>
        <select
          value={value.year}
          onChange={(e) => onChange({ year: e.target.value })}
          className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/85 px-4 text-base font-medium shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700/80 dark:bg-slate-900/70"
        >
          <option value="">Year</option>
          {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function ResultDisplay({ age }: { age: Age | null }) {
  if (!age) return null;

  return (
    <div className="animate-in slide-in-from-bottom-5 text-center transition-all duration-500 ease-out fade-in-50">
      <p className="mb-4 text-base font-semibold uppercase tracking-[0.14em] text-slate-500">You are</p>
      <div className="flex justify-center items-end gap-4 sm:gap-8">
        <div className="rounded-2xl border border-teal-100/70 bg-white/70 px-3 py-4 text-center dark:border-teal-900/50 dark:bg-slate-900/50">
          <p className="text-5xl sm:text-7xl font-bold bg-gradient-to-br from-teal-600 to-cyan-600 bg-clip-text text-transparent tabular-nums">
            {age.years}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Years</p>
        </div>
        <div className="rounded-2xl border border-teal-100/70 bg-white/70 px-3 py-4 text-center dark:border-teal-900/50 dark:bg-slate-900/50">
          <p className="text-5xl sm:text-7xl font-bold bg-gradient-to-br from-teal-600 to-cyan-600 bg-clip-text text-transparent tabular-nums">
            {age.months}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Months</p>
        </div>
        <div className="rounded-2xl border border-teal-100/70 bg-white/70 px-3 py-4 text-center dark:border-teal-900/50 dark:bg-slate-900/50">
          <p className="text-5xl sm:text-7xl font-bold bg-gradient-to-br from-teal-600 to-cyan-600 bg-clip-text text-transparent tabular-nums">
            {age.days}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Days</p>
        </div>
      </div>
    </div>
  );
}

export default function AgeCalculator() {
  const [state, dispatch] = useReducer(reducer, getInitialState('gregorian'));
  const { dob, age, mode, error } = state;

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: 'CALCULATE_AGE' });
    }, 200);
    return () => clearTimeout(timer);
  }, [dob, mode]);

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-b from-cyan-100/70 via-white to-teal-100/70 px-4 py-8 sm:px-6 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(2,6,23,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(2,6,23,0.04)_1px,transparent_1px)] bg-[size:42px_42px]"
      />
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-teal-300/25 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700 shadow-sm dark:bg-slate-900/75 dark:text-teal-200">
            <Sparkles className="h-3.5 w-3.5" />
            Life Timeline
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Age Calculator
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Calendar-aware age math in Gregorian and Ethiopian mode, with instant updates.
          </p>
        </div>

        <div className="glass-surface overflow-hidden rounded-[1.75rem] border border-white/70 p-4 sm:p-7 dark:border-slate-700/70">
          <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 dark:border-slate-700/70 dark:bg-slate-900/60">
            <div className="mx-auto flex max-w-sm gap-2 rounded-xl bg-slate-100/90 p-1.5 dark:bg-slate-800/70">
              <button
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'gregorian' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'gregorian'
                    ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-200'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                Gregorian
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'ethiopian' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'ethiopian'
                    ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-200'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Ethiopian
              </button>
            </div>
          </div>

          <div className="space-y-8 p-4 sm:p-8">
            <div className="space-y-3">
              <p className="text-center text-lg font-semibold text-slate-900 dark:text-white">
                Enter your date of birth
              </p>
              <DateSelector
                mode={mode}
                value={dob}
                onChange={(value) => dispatch({ type: 'SET_DOB', payload: value })}
              />
            </div>

            {(age || error) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="rounded-full bg-white/80 px-3 py-1 font-semibold tracking-[0.1em] text-slate-500 dark:bg-slate-900/80 dark:text-slate-300">
                    Result
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="animate-in text-center font-medium text-destructive fade-in">
                {error}
              </p>
            )}

            <ResultDisplay age={age} />
          </div>
        </div>
      </div>
    </div>
  );
}
