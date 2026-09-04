/**
 * Daily Ethiopian Orthodox Tewahedo saints (የዕለት ቅዱሳን)
 * and fasting status calculations (አጽዋማት).
 */

export type DailySaint = {
  day: number;
  primaryAmharic: string;
  primaryEnglish: string;
  allSaintsAmharic: string[];
  allSaintsEnglish: string[];
  descriptionAmharic: string;
  descriptionEnglish: string;
};

export const MONTHLY_SAINTS: Record<number, DailySaint> = {
  1: {
    day: 1,
    primaryAmharic: "ልደታ ለማርያም",
    primaryEnglish: "Nativity of Mary",
    allSaintsAmharic: ["ልደታ ለማርያም", "ነቢዩ ኤልያስ", "በርተሎሜዎስ"],
    allSaintsEnglish: ["Nativity of Mary", "Prophet Elijah", "Bartholomew the Apostle"],
    descriptionAmharic: "የእመቤታችን የድንግል ማርያም የልደት በዓል እና የነቢዩ ኤልያስ መታሰቢያ።",
    descriptionEnglish: "Commemoration of the Nativity of the Blessed Virgin Mary and the Prophet Elijah.",
  },
  2: {
    day: 2,
    primaryAmharic: "ታዴዎስ ሐዋርያ",
    primaryEnglish: "Thaddaeus the Apostle",
    allSaintsAmharic: ["ታዴዎስ ሐዋርያ", "ኢዮብ ጻድቅ", "አባ አቤል"],
    allSaintsEnglish: ["Thaddaeus the Apostle", "Righteous Job", "Abba Abel"],
    descriptionAmharic: "የሐዋርያው ቅዱስ ታዴዎስ እና የታማኙ ጻድቁ ኢዮብ መታሰቢያ።",
    descriptionEnglish: "Commemoration of Saint Thaddaeus the Apostle and Righteous Job.",
  },
  3: {
    day: 3,
    primaryAmharic: "በዓታ ለማርያም",
    primaryEnglish: "Entrance of Mary (Ba'ata)",
    allSaintsAmharic: ["በዓታ ለማርያም", "ዜና ማርቆስ", "አባ ሊባኖስ"],
    allSaintsEnglish: ["Entrance of Mary into Temple", "Zena Markos", "Abba Libanos"],
    descriptionAmharic: "እመቤታችን በሦስት ዓመቷ ወደ ቤተ መቅደስ የገባችበት መታሰቢያ።",
    descriptionEnglish: "Commemoration of the Entrance of the Virgin Mary into the Temple at age 3.",
  },
  4: {
    day: 4,
    primaryAmharic: "ዮሐንስ ወልደ ነጐድጓድ",
    primaryEnglish: "John the Apostle",
    allSaintsAmharic: ["ዮሐንስ ወንጌላዊ", "አንድራኒቆስ"],
    allSaintsEnglish: ["John the Evangelist", "Andronicus"],
    descriptionAmharic: "ፍቁረ እግዚእ ቅዱስ ዮሐንስ ወንጌላዊ ወልደ ነጐድጓድ መታሰቢያ።",
    descriptionEnglish: "Commemoration of Saint John the Evangelist and Theologian, Son of Thunder.",
  },
  5: {
    day: 5,
    primaryAmharic: "አቡነ ገብረ መንፈስ ቅዱስ",
    primaryEnglish: "Abune Gebre Menfes Kidus",
    allSaintsAmharic: ["አቡነ ገብረ መንፈስ ቅዱስ", "ጴጥሮስ ወጳውሎስ"],
    allSaintsEnglish: ["Abune Gebre Menfes Kidus", "Peter and Paul"],
    descriptionAmharic: "ጻድቁ አቡነ ገብረ መንፈስ ቅዱስ (አቦ) እና የቅዱሳን ሐዋርያት ጴጥሮስና ጳውሎስ መታሰቢያ።",
    descriptionEnglish: "Commemoration of Saint Abune Gebre Menfes Kidus (Abo) and Apostles Peter and Paul.",
  },
  6: {
    day: 6,
    primaryAmharic: "ኢየሱስ / ቁስቋም",
    primaryEnglish: "Eyesus / Qusqwam",
    allSaintsAmharic: ["ደብረ ቁስቋም", "ቅድስት አርሴማ"],
    allSaintsEnglish: ["Mount Qusqwam", "Saint Arsema"],
    descriptionAmharic: "የጌታችን ስደት መታሰቢያ ደብረ ቁስቋም እና ቅድስት አርሴማ ሰማዕት።",
    descriptionEnglish: "Commemoration of Mount Qusqwam (Flight of Holy Family) and Saint Arsema.",
  },
  7: {
    day: 7,
    primaryAmharic: "ቅድስት ሥላሴ",
    primaryEnglish: "Holy Trinity (Selassie)",
    allSaintsAmharic: ["ሥላሴ", "አባ ጊዮርጊስ ዘጋስጫ"],
    allSaintsEnglish: ["Holy Trinity", "Abba Giorgis of Gasicha"],
    descriptionAmharic: "የአብ የወልድ የመንፈስ ቅዱስ የአንድነትና የሦስትነት ምስጢር መታሰቢያ በዓል።",
    descriptionEnglish: "Monthly Feast of the Holy Trinity (Selassie): Father, Son, and Holy Spirit.",
  },
  8: {
    day: 8,
    primaryAmharic: "አባ ኪሮስ / ኪዳነ ምሕረት",
    primaryEnglish: "Abba Kiros",
    allSaintsAmharic: ["አባ ኪሮስ", "ኢየሱስ"],
    allSaintsEnglish: ["Abba Kiros", "Eyesus"],
    descriptionAmharic: "የባሕታዊው አባ ኪሮስ እና የአባ ዮሐንስ መታሰቢያ።",
    descriptionEnglish: "Commemoration of the Hermit Saint Abba Kiros.",
  },
  9: {
    day: 9,
    primaryAmharic: "ቶማስ ሐዋርያ / ሠለስቱ ምዕት",
    primaryEnglish: "Thomas the Apostle",
    allSaintsAmharic: ["ቶማስ ሐዋርያ", "ሠለስቱ ምዕት (318 ርቱዓነ ሃይማኖት)"],
    allSaintsEnglish: ["Thomas the Apostle", "318 Holy Fathers of Nicaea"],
    descriptionAmharic: "የሐዋርያው ቅዱስ ቶማስ እና የ318ቱ የኒቂያ ጉባኤ አባቶች መታሰቢያ።",
    descriptionEnglish: "Commemoration of Saint Thomas the Apostle and the 318 Fathers of the Council of Nicaea.",
  },
  10: {
    day: 10,
    primaryAmharic: "ቅዱስ መስቀል",
    primaryEnglish: "The Holy Cross (Meskel)",
    allSaintsAmharic: ["መስቀለ ክርስቶስ", "አባ ጽጌ ድንግል"],
    allSaintsEnglish: ["Holy Cross of Christ", "Abba Tsige Dingil"],
    descriptionAmharic: "የክርስቶስ የክብር መስቀል እና ማኅሌተ ጽጌ ደራሲው አባ ጽጌ ድንግል መታሰቢያ።",
    descriptionEnglish: "Commemoration of the Holy Cross of Christ and Abba Tsige Dingil.",
  },
  11: {
    day: 11,
    primaryAmharic: "ሐና ወኢያቄም",
    primaryEnglish: "Hannah & Joachim",
    allSaintsAmharic: ["ሐና ወኢያቄም", "ቅዱስ ፋሲለደስ ሰማዕት"],
    allSaintsEnglish: ["Hannah & Joachim", "Saint Fasilides the Martyr"],
    descriptionAmharic: "የእመቤታችን ወላጆች ቅድስት ሐናና ጻድቁ ኢያቄም እንዲሁም ቅዱስ ፋሲለደስ።",
    descriptionEnglish: "Commemoration of Hannah and Joachim, parents of Mary, and Saint Fasilides.",
  },
  12: {
    day: 12,
    primaryAmharic: "ቅዱስ ሚካኤል ሊቀ መላእክት",
    primaryEnglish: "Archangel Michael",
    allSaintsAmharic: ["ቅዱስ ሚካኤል", "አባ ሳሙኤል ዘዋልድባ"],
    allSaintsEnglish: ["Archangel Michael", "Abba Samuel of Waldebba"],
    descriptionAmharic: "የሊቃነ መላእክት አለቃ የቅዱስ ሚካኤል ወርሃዊ መታሰቢያ በዓል።",
    descriptionEnglish: "Monthly Feast of Archangel Michael, Chief of the Heavenly Host.",
  },
  13: {
    day: 13,
    primaryAmharic: "ቅዱስ ሩፋኤል / እግዚአብሔር አብ",
    primaryEnglish: "Archangel Raphael",
    allSaintsAmharic: ["ቅዱስ ሩፋኤል", "እግዚአብሔር አብ", "አስቀድሮስ"],
    allSaintsEnglish: ["Archangel Raphael", "God the Father"],
    descriptionAmharic: "ፈዋሹ መልአክ ቅዱስ ሩፋኤል ሊቀ መላእክት እና እግዚአብሔር አብ።",
    descriptionEnglish: "Commemoration of Archangel Raphael the Healer.",
  },
  14: {
    day: 14,
    primaryAmharic: "አባ አረጋዊ / ገብረ ክርስቶስ",
    primaryEnglish: "Abba Aregawi",
    allSaintsAmharic: ["አባ አረጋዊ ዘደብረ ዳሞ", "ገብረ ክርስቶስ መርዓዊ"],
    allSaintsEnglish: ["Abba Aregawi of Debre Damo", "Gebre Kristos the Bridegroom"],
    descriptionAmharic: "የደብረ ዳሞው መሥራች አባ አረጋዊ (ዘሚካኤል) እና ጻድቁ ገብረ ክርስቶስ።",
    descriptionEnglish: "Commemoration of Abba Aregawi, founder of Debre Damo monastery, and Gebre Kristos.",
  },
  15: {
    day: 15,
    primaryAmharic: "ቅዱስ ቂርቆስና ኢየሉጣ",
    primaryEnglish: "Qirqos & Julitta",
    allSaintsAmharic: ["ቅዱስ ቂርቆስ", "ቅድስት ኢየሉጣ"],
    allSaintsEnglish: ["Saint Qirqos (Cyricus)", "Saint Julitta"],
    descriptionAmharic: "ሕፃኑ ሰማዕት ቅዱስ ቂርቆስና እናቱ ቅድስት ኢየሉጣ መታሰቢያ።",
    descriptionEnglish: "Commemoration of the child martyr Saint Cyricus (Qirqos) and his mother Julitta.",
  },
  16: {
    day: 16,
    primaryAmharic: "ኪዳነ ምሕረት",
    primaryEnglish: "Kidane Mehret (Covenant of Mercy)",
    allSaintsAmharic: ["ኪዳነ ምሕረት", "ኪዳነ ሰማዕታት"],
    allSaintsEnglish: ["Kidane Mehret", "Covenant of Martyrs"],
    descriptionAmharic: "እመቤታችን የምሕረት ቃል ኪዳን የተቀበለችበት ታላቅ ወርሃዊ በዓል።",
    descriptionEnglish: "Feast of Our Lady Covenant of Mercy (Kidane Mehret).",
  },
  17: {
    day: 17,
    primaryAmharic: "ቅዱስ እስጢፋኖስ",
    primaryEnglish: "Saint Stephen",
    allSaintsAmharic: ["እስጢፋኖስ ቀዳሜ ሰማዕት", "አባ ገሪማ"],
    allSaintsEnglish: ["Stephen the Protomartyr", "Abba Gerima"],
    descriptionAmharic: "የዲያቆናት አለቃና የመጀመሪያው ሰማዕት ቅዱስ እስጢፋኖስ።",
    descriptionEnglish: "Commemoration of Saint Stephen the Archdeacon and Protomartyr, and Abba Gerima.",
  },
  18: {
    day: 18,
    primaryAmharic: "አቡነ ተክለ ሃይማኖት / ፊልጶስ",
    primaryEnglish: "Abune Tekle Haymanot / Philip",
    allSaintsAmharic: ["አቡነ ተክለ ሃይማኖት", "ፊልጶስ ሐዋርያ"],
    allSaintsEnglish: ["Abune Tekle Haymanot", "Philip the Apostle"],
    descriptionAmharic: "ኢትዮጵያዊው ጻድቅ አቡነ ተክለ ሃይማኖት እና ቅዱስ ፊልጶስ ሐዋርያ።",
    descriptionEnglish: "Commemoration of Ethiopian father Saint Abune Tekle Haymanot and Saint Philip.",
  },
  19: {
    day: 19,
    primaryAmharic: "ቅዱስ ገብርኤል ሊቀ መላእክት",
    primaryEnglish: "Archangel Gabriel",
    allSaintsAmharic: ["ቅዱስ ገብርኤል", "ሠለስቱ ደቂቅ"],
    allSaintsEnglish: ["Archangel Gabriel", "Three Holy Youths"],
    descriptionAmharic: "የአብሣሪውና ሠለስቱ ደቂቅን ከእቶን እሳት ያዳነው የቅዱስ ገብርኤል ወርሃዊ በዓል።",
    descriptionEnglish: "Monthly Feast of Archangel Gabriel the Annunciator and Deliverer of the Holy Children.",
  },
  20: {
    day: 20,
    primaryAmharic: "ሕንፀተ ቤተክርስቲያን",
    primaryEnglish: "Hinsete Betekristian",
    allSaintsAmharic: ["ሕንፀተ ቤተክርስቲያን", "ኤልሳዕ ነቢይ"],
    allSaintsEnglish: ["Consecration of First Church of Mary", "Prophet Elisha"],
    descriptionAmharic: "በእመቤታችን ስም ለመጀመሪያ ጊዜ ቤተክርስቲያን የታነጸችበት (ፊልጵስዩስ) እና ነቢዩ ኤልሳዕ።",
    descriptionEnglish: "Commemoration of the consecration of the first church dedicated to the Virgin Mary, and Prophet Elisha.",
  },
  21: {
    day: 21,
    primaryAmharic: "እግዝእትነ ማርያም",
    primaryEnglish: "Saint Mary (Lidet / Tsion)",
    allSaintsAmharic: ["እመቤታችን ቅድስት ድንግል ማርያም"],
    allSaintsEnglish: ["Our Lady Virgin Mary"],
    descriptionAmharic: "የድንግል ማርያም ወርሃዊ ታላቅ የበዓል ቀን (ጽዮን ማርያም)።",
    descriptionEnglish: "Great Monthly Feast of Our Lady Virgin Mary (Zion Mary).",
  },
  22: {
    day: 22,
    primaryAmharic: "ቅዱስ ዑራኤል / ደብረ ዘይት",
    primaryEnglish: "Archangel Uriel",
    allSaintsAmharic: ["ቅዱስ ዑራኤል", "ደብረ ዘይት"],
    allSaintsEnglish: ["Archangel Uriel", "Mount of Olives"],
    descriptionAmharic: "ምስጢራትን ገላጩ ቅዱስ ዑራኤል ሊቀ መላእክት መታሰቢያ።",
    descriptionEnglish: "Commemoration of Archangel Uriel, revealer of divine wisdom.",
  },
  23: {
    day: 23,
    primaryAmharic: "ቅዱስ ጊዮርጊስ ሰማዕት",
    primaryEnglish: "Saint George the Martyr",
    allSaintsAmharic: ["ቅዱስ ጊዮርጊስ ዘልዳ"],
    allSaintsEnglish: ["Saint George of Lydda"],
    descriptionAmharic: "የሰማዕታት አለቃና ኮከብ የቅዱስ ጊዮርጊስ ወርሃዊ በዓል።",
    descriptionEnglish: "Monthly Feast of Saint George the Great Martyr of Lydda.",
  },
  24: {
    day: 24,
    primaryAmharic: "አቡነ ተክለ ሃይማኖት",
    primaryEnglish: "Abune Tekle Haymanot",
    allSaintsAmharic: ["ተክለ ሃይማኖት (ልደታቸው)", "አጋቢጦስ"],
    allSaintsEnglish: ["Abune Tekle Haymanot (Birth)", "Agapitus"],
    descriptionAmharic: "የአቡነ ተክለ ሃይማኖት ጽንሰትና ልደት መታሰቢያ።",
    descriptionEnglish: "Commemoration of the Conception and Nativity of Abune Tekle Haymanot.",
  },
  25: {
    day: 25,
    primaryAmharic: "ቅዱስ መርቆሬዎስ ሰማዕት",
    primaryEnglish: "Saint Mercurius",
    allSaintsAmharic: ["መርቆሬዎስ (ባለ ሁለት ሰይፍ)", "ቅድስት ሐና"],
    allSaintsEnglish: ["Saint Mercurius (Abu Seifein)", "Saint Hannah"],
    descriptionAmharic: "ባለ ሁለት ሰይፉ ሰማዕት ቅዱስ መርቆሬዎስ መታሰቢያ።",
    descriptionEnglish: "Commemoration of Saint Mercurius (Pilate / Abu Seifein).",
  },
  26: {
    day: 26,
    primaryAmharic: "ቶማስ ዘህንደኬ",
    primaryEnglish: "Thomas of India",
    allSaintsAmharic: ["ቶማስ ዘህንደኬ", "አባ ሰላማ ከሣቴ ብርሃን"],
    allSaintsEnglish: ["Thomas of India", "Abba Selama Kesate Birhan"],
    descriptionAmharic: "ቅዱስ ቶማስ በህንድ እና የኢትዮጵያ የመጀመሪያው ጳጳስ አባ ሰላማ ከሣቴ ብርሃን።",
    descriptionEnglish: "Commemoration of Thomas in India and Abba Selama (Frumentius), Apostle of Ethiopia.",
  },
  27: {
    day: 27,
    primaryAmharic: "መድኃኔዓለም",
    primaryEnglish: "Medhane Alem (Savior of the World)",
    allSaintsAmharic: ["መድኃኔዓለም", "አባ ዮሐንስ አፈወርቅ"],
    allSaintsEnglish: ["Medhane Alem", "John Chrysostom"],
    descriptionAmharic: "የዓለም መድኃኒት የኢየሱስ ክርስቶስ እና የቅዱስ ዮሐንስ አፈወርቅ ወርሃዊ በዓል።",
    descriptionEnglish: "Monthly Feast of Medhane Alem (Christ Savior of the World) and Saint John Chrysostom.",
  },
  28: {
    day: 28,
    primaryAmharic: "አማኑኤል",
    primaryEnglish: "Emmanuel",
    allSaintsAmharic: ["አማኑኤል", "አብርሃም ይስሐቅ ያዕቆብ"],
    allSaintsEnglish: ["Emmanuel", "Patriarchs Abraham, Isaac, and Jacob"],
    descriptionAmharic: "እግዚአብሔር ከእኛ ጋር ነው (አማኑኤል) እና የቅዱሳን አበው አብርሃም ይስሐቅና ያዕቆብ።",
    descriptionEnglish: "Monthly Feast of Emmanuel (God with Us) and Patriarchs Abraham, Isaac, and Jacob.",
  },
  29: {
    day: 29,
    primaryAmharic: "ባዕለ ወልድ",
    primaryEnglish: "Bale Wold (Birth of the Son)",
    allSaintsAmharic: ["በዓለ ወልድ", "አቡነ እውስጣቴዎስ"],
    allSaintsEnglish: ["Bale Wold", "Abune Ewostatewos"],
    descriptionAmharic: "የእግዚአብሔር ልጅ የጌታችን የልደቱ ወርሃዊ መታሰቢያ በዓል።",
    descriptionEnglish: "Monthly Feast of the Nativity of Christ (Bale Wold) and Abune Ewostatewos.",
  },
  30: {
    day: 30,
    primaryAmharic: "ማርቆስ ወንጌላዊ",
    primaryEnglish: "Mark the Evangelist",
    allSaintsAmharic: ["ማርቆስ ወንጌላዊ", "መጥምቀ መለኮት ዮሐንስ"],
    allSaintsEnglish: ["Mark the Evangelist", "John the Baptist"],
    descriptionAmharic: "የአፍሪካው ሐዋርያ ቅዱስ ማርቆስ ወንጌላዊ እና መጥምቁ ዮሐንስ መታሰቢያ።",
    descriptionEnglish: "Commemoration of Saint Mark the Evangelist and Saint John the Baptist.",
  },
};

/**
 * Returns the commemorating saints for a given day of the Ethiopian month (1 to 30).
 * For Pagume (days 1 to 6), returns special archangels and holy commemorations.
 */
export function getDailySaints(day: number, isPagume = false): DailySaint {
  if (isPagume) {
    const pagumeCommemorations: Record<number, { am: string; en: string }> = {
      1: { am: "ቅዱስ ዑራኤል ሊቀ መላእክት", en: "Archangel Uriel" },
      2: { am: "ቅዱስ ሩፋኤል ሊቀ መላእክት", en: "Archangel Raphael" },
      3: { am: "ቅዱስ ሩፋኤል / መልአከ ሰላም", en: "Archangel Raphael / Angel of Peace" },
      4: { am: "ዮሐንስ ወልደ ነጐድጓድ", en: "John the Evangelist" },
      5: { am: "ቅዱስ ጴጥሮስ ሊቀ ሐዋርያት", en: "Peter the Apostle" },
      6: { am: "ዳግም ምጽዓት / የዘመን መለወጫ ዋዜማ", en: "Eve of New Year (Enkutatash)" },
    };
    const info = pagumeCommemorations[day] ?? pagumeCommemorations[1];
    return {
      day,
      primaryAmharic: info.am,
      primaryEnglish: info.en,
      allSaintsAmharic: [info.am],
      allSaintsEnglish: [info.en],
      descriptionAmharic: `የጳጉሜን ${day} ቀን መታሰቢያ።`,
      descriptionEnglish: `Pagume day ${day} commemoration.`,
    };
  }

  const clamped = Math.min(Math.max(day, 1), 30);
  return MONTHLY_SAINTS[clamped];
}

export type FastingStatus = {
  isFasting: boolean;
  nameAmharic: string;
  nameEnglish: string;
  seasonDescriptionAmharic?: string;
  seasonDescriptionEnglish?: string;
};

/**
 * Calculates whether a given date is a fasting day in the Ethiopian Orthodox Tewahedo tradition.
 *
 * Fasting rules:
 * - Advent (ጾመ ነቢያት): Hidar 15 to Tahsas 28
 * - Dormition Fast (ጾመ ፍልሰታ): Nahase 1 to Nahase 16
 * - Regular Wednesdays and Fridays (except during the 50 days between Easter and Pentecost)
 */
export function getFastingStatus(
  ethMonth: number,
  ethDay: number,
  weekday: number // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday, 5 = Friday
): FastingStatus {
  // 1. Prophets Fast / Advent (ጾመ ነቢያት)
  if ((ethMonth === 3 && ethDay >= 15) || (ethMonth === 4 && ethDay <= 28)) {
    return {
      isFasting: true,
      nameAmharic: "ጾመ ነቢያት (የገና ጾም)",
      nameEnglish: "Prophets' Fast (Advent)",
      seasonDescriptionAmharic: "ከህዳር 15 እስከ ታኅሣሥ 28 የሚጾም የነቢያት ጾም።",
      seasonDescriptionEnglish: "Canonical 43-day fast leading up to Ethiopian Christmas (Genna).",
    };
  }

  // 2. Dormition of Mary Fast (ጾመ ፍልሰታ)
  if (ethMonth === 12 && ethDay >= 1 && ethDay <= 16) {
    return {
      isFasting: true,
      nameAmharic: "ጾመ ፍልሰታ ለማርያም",
      nameEnglish: "Filseta (Dormition Fast)",
      seasonDescriptionAmharic: "ከነሐሴ 1 እስከ 16 የእመቤታችን ዕርገት መታሰቢያ ጾም።",
      seasonDescriptionEnglish: "16-day fast commemorating the Assumption of the Virgin Mary.",
    };
  }

  // 3. Eve of Christmas (ጋድ) & Eve of Timket (ገሃድ)
  if (ethMonth === 4 && ethDay === 28) {
    return {
      isFasting: true,
      nameAmharic: "ጾመ ጋድ (የገና ዋዜማ)",
      nameEnglish: "Paramon of Christmas (Ghad)",
    };
  }
  if (ethMonth === 5 && ethDay === 10) {
    return {
      isFasting: true,
      nameAmharic: "ጾመ ገሃድ (የጥምቀት ዋዜማ)",
      nameEnglish: "Paramon of Epiphany (Ghad)",
    };
  }

  // 4. Regular Wednesday (3) & Friday (5) Fasting (ጾመ ድኅነት)
  if (weekday === 3) {
    return {
      isFasting: true,
      nameAmharic: "የረቡዕ ጾም (ጾመ ድኅነት)",
      nameEnglish: "Wednesday Fast",
      seasonDescriptionAmharic: "ጌታችን የተያዘበት እና የተሸጠበት የረቡዕ መታሰቢያ ጾም።",
      seasonDescriptionEnglish: "Weekly Wednesday fast commemorating the betrayal of Christ.",
    };
  }
  if (weekday === 5) {
    return {
      isFasting: true,
      nameAmharic: "የዓርብ ጾም (ጾመ ድኅነት)",
      nameEnglish: "Friday Fast",
      seasonDescriptionAmharic: "ጌታችን የተሰቀለበት የዓርብ መታሰቢያ ጾም።",
      seasonDescriptionEnglish: "Weekly Friday fast commemorating the Crucifixion of Christ.",
    };
  }

  return {
    isFasting: false,
    nameAmharic: "ፍስክ (የማይጾም ቀን)",
    nameEnglish: "Non-fasting day",
  };
}
