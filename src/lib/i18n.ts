export type Language = "en" | "am";

export const languageLabels: Record<Language, string> = {
  en: "English",
  am: "አማርኛ",
};

export const translations = {
  en: {
    "nav.home": "Home",
    "nav.overview": "Overview",
    "nav.dateConverter": "Date Converter",
    "nav.ageCalculator": "Age Calculator",
    "nav.ethiopianCalendar": "Ethiopian Calendar",
    "nav.amharicKeyboard": "Amharic Keyboard",
    "nav.noteTaking": "Note Taking",
    "nav.focusTimer": "Focus Timer",
    "nav.eventPlanner": "Event Planner",
    "nav.holidays": "Beal",
    "nav.gregorianToEthiopian": "Gregorian <-> Ethiopian",
    "nav.liveAgeTimeline": "Live age timeline",
    "nav.holidaysAndMonthView": "Holidays and month view",
    "nav.typeInFidel": "Type in fidel",
    "nav.fastPersonalNotes": "Fast personal notes",
    "nav.timedStudyRounds": "Timed study rounds",
    "nav.planAndReminders": "Plan and reminders",
    "nav.historyAndDates": "Feast days and stories",
    "home.toolsTitle": "All tools",
    "home.toolsSubtitle": "Every tool runs in your browser and keeps its data on this device.",
    "language.label": "Language",
    "language.en": "EN",
    "language.am": "አማ",
  },
  am: {
    "nav.home": "መነሻ",
    "nav.overview": "አጠቃላይ",
    "nav.dateConverter": "ቀን መቀየሪያ",
    "nav.ageCalculator": "ዕድሜ ማስሊያ",
    "nav.ethiopianCalendar": "ኢትዮጵያ የቀን መቁጠሪያ",
    "nav.amharicKeyboard": "አማርኛ ኪቦርድ",
    "nav.noteTaking": "ማስታወሻ",
    "nav.focusTimer": "የትኩረት ሰዓት",
    "nav.eventPlanner": "ክስተት እቅድ",
    "nav.holidays": "በዓል",
    "nav.gregorianToEthiopian": "ግሪጎሪያን <-> ኢትዮጵያ",
    "nav.liveAgeTimeline": "የእድሜ ዝርዝር",
    "nav.holidaysAndMonthView": "በዓላት እና ወር እይታ",
    "nav.typeInFidel": "በፊደል ይፃፉ",
    "nav.fastPersonalNotes": "ፈጣን የግል ማስታወሻ",
    "nav.timedStudyRounds": "በሰዓት የተከፈለ ጥናት",
    "nav.planAndReminders": "እቅድ እና ማስታወሻ",
    "nav.historyAndDates": "በዓላት፣ ቀናትና ታሪክ",
    "home.toolsTitle": "ሁሉም መሳሪያዎች",
    "home.toolsSubtitle": "ሁሉም መሳሪያ በአሳሽዎ ውስጥ ይሰራል፤ መረጃዎም በዚሁ መሣሪያ ላይ ይቀመጣል።",
    "language.label": "ቋንቋ",
    "language.en": "EN",
    "language.am": "አማ",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export const translate = (
  language: Language,
  key: TranslationKey,
  fallback?: string
): string => {
  const bucket = translations[language] ?? translations.en;
  return bucket[key] ?? fallback ?? key;
};
