/**
 * Long-form background for the holidays that get their own page. Kept apart from
 * ETHIOPIAN_PUBLIC_HOLIDAYS, which stays a date table: this is prose, and only a
 * handful of the holidays carry it.
 */

export type HolidayArticleSection = {
  heading: string;
  paragraphs: string[];
};

export type HolidayArticle = {
  /** Matches an id in ETHIOPIAN_PUBLIC_HOLIDAYS. */
  id: string;
  slug: string;
  /** Used in the title tag, so it carries the words people search for. */
  searchName: string;
  alsoKnownAs: string[];
  summary: string;
  lead: string;
  rule: string;
  sections: HolidayArticleSection[];
};

export const HOLIDAY_ARTICLES: HolidayArticle[] = [
  {
    id: "enkutatash",
    slug: "enkutatash",
    searchName: "Enkutatash: Ethiopian New Year",
    alsoKnownAs: ["Ethiopian New Year", "Ri'se Awde Amet", "Kidus Yohannes"],
    summary:
      "Ethiopian New Year, the first day of Meskerem, when the rains end and the highlands turn yellow.",
    lead: "Enkutatash opens the Ethiopian year on Meskerem 1. It lands on 11 September in most years and 12 September in the year following an Ethiopian leap year, which is why the date appears to move by a day and then settle again.",
    rule: "Meskerem 1, the first day of the Ethiopian year.",
    sections: [
      {
        heading: "Why the year starts in September",
        paragraphs: [
          "The Ethiopian year is tied to the rains rather than to the solstice. Kiremt, the long wet season, breaks in early September, the rivers drop, and the highlands come up covered in adey abeba, the yellow meskel daisy. Starting the year there matches how the farming year actually works, and it is the reason the celebration feels like spring even though it falls in September.",
          "The day is also the feast of Saint John the Baptist in the Ethiopian Orthodox calendar, so many families call it Kidus Yohannes. The religious and the seasonal observance sit on the same date and have done for centuries.",
        ],
      },
      {
        heading: "Where the name comes from",
        paragraphs: [
          "Enkutatash translates roughly as gift of jewels. The name is traditionally traced to the Queen of Sheba returning from her visit to King Solomon in Jerusalem, met by her chiefs who welcomed her back with jewels. Whether or not the story is history, it has shaped how the day is understood: a return, a restocking, a fresh start.",
        ],
      },
      {
        heading: "How it is celebrated",
        paragraphs: [
          "Girls dress in white, go house to house singing Abebayehosh, and are given small amounts of money or bread. Boys paint pictures and hand them out. Families slaughter a sheep or a chicken, brew tella, and visit relatives. Bundles of daisies are carried into houses and given as gifts.",
          "In the diaspora the day is often marked on the nearest weekend rather than on the date itself, so a community celebration and the actual New Year can be several days apart.",
        ],
      },
      {
        heading: "Working out the date",
        paragraphs: [
          "Meskerem 1 falls on 11 September in an ordinary year. After an Ethiopian leap year, which is a year that leaves a remainder of 3 when divided by 4, the extra sixth day of Pagume pushes the New Year to 12 September. The Ethiopian year 2019 is a leap year, so 2020 begins on 12 September 2027.",
          "The Ethiopian year number is 7 lower than the Gregorian one from Enkutatash to 31 December, and 8 lower from 1 January to the following Enkutatash.",
        ],
      },
    ],
  },
  {
    id: "meskel",
    slug: "meskel",
    searchName: "Meskel: Finding of the True Cross",
    alsoKnownAs: ["Demera", "Finding of the True Cross"],
    summary:
      "The finding of the True Cross, marked with a great bonfire on the eve and celebrated across Ethiopia since the fourth century.",
    lead: "Meskel falls on Meskerem 17, two weeks and two days after the Ethiopian New Year. The bonfire, the Demera, is lit on the eve, and it is one of the few Ethiopian festivals recognised by UNESCO as intangible cultural heritage.",
    rule: "Meskerem 17, sixteen days after Ethiopian New Year.",
    sections: [
      {
        heading: "What it commemorates",
        paragraphs: [
          "Meskel means cross. The feast marks the finding of the cross on which Christ was crucified, by Empress Helena, mother of Constantine, in the fourth century. In the Ethiopian telling she was told in a dream to build a bonfire and follow the smoke, which bent towards the buried cross. That is the origin of the Demera, and the reason the fire rather than a procession is at the centre of the day.",
          "A fragment of the cross is held by tradition to have reached Ethiopia and to rest at Gishen Mariam in Wollo, which draws pilgrims of its own around the feast.",
        ],
      },
      {
        heading: "The Demera",
        paragraphs: [
          "A conical pile of branches is built in the days beforehand, topped with daisies and bound with a cross. On the eve, priests circle it in procession and it is lit at dusk. Crowds carry thin taper bundles, also called chibo, and light them from the fire.",
          "The direction the burnt cross falls is read as a sign for the coming year. In the morning people mark their foreheads with ash from the embers. Meskel Square in Addis Ababa takes its name from the gathering, though the largest and oldest celebrations are in the south, particularly among the Gurage, where Meskel is the main holiday of the year and relatives travel home for it.",
        ],
      },
      {
        heading: "Working out the date",
        paragraphs: [
          "Meskerem 17 is fixed in the Ethiopian calendar, so it moves very little in Gregorian terms: 27 September in most years, 28 September in the year after an Ethiopian leap year. The Demera is lit on the evening before.",
        ],
      },
    ],
  },
  {
    id: "genna",
    slug: "genna",
    searchName: "Genna: Ethiopian Christmas",
    alsoKnownAs: ["Ledet", "Ethiopian Christmas"],
    summary:
      "Ethiopian Christmas, kept on 7 January after a fast of forty three days, and quite unlike the December holiday.",
    lead: "Genna falls on Tahsas 29 in the Ethiopian calendar, which is 7 January in most Gregorian years. It closes Tsome Nebiyat, the fast of the prophets, and is a church day rather than a gift-giving one.",
    rule: "Tahsas 29, the end of the forty three day fast of the prophets.",
    sections: [
      {
        heading: "Why it is on 7 January and not 25 December",
        paragraphs: [
          "Both dates are the same feast counted on different calendars. The Ethiopian church kept the older reckoning, and Tahsas 29 works out to 7 January on the Gregorian calendar. Nothing was moved. The gap is the same one that puts the whole Ethiopian calendar seven or eight years behind.",
          "In an Ethiopian leap year the date is written Tahsas 28 so that it still lands on 7 January, which is why converters sometimes show two different Ethiopian dates for what Ethiopians treat as one fixed day.",
        ],
      },
      {
        heading: "The fast, then the feast",
        paragraphs: [
          "The forty three days before Genna are a fast: no meat, no dairy, one meal a day for the observant. It ends with an overnight service. People arrive at church around six in the evening, dressed in white netela, and the liturgy runs until around three in the morning. Lalibela draws tens of thousands of pilgrims to its rock-hewn churches for it.",
          "The meal afterwards is doro wat with injera. Gifts are not really part of the day, though that is changing in the cities and in the diaspora.",
        ],
      },
      {
        heading: "The game called genna",
        paragraphs: [
          "Genna is also the name of a field game, something between hockey and shinty, played with a curved stick and a wooden ball. Tradition says the shepherds who heard of the birth played it in celebration. Men and boys still play it in rural areas on the day, and the holiday takes its name from the game as much as the other way round.",
        ],
      },
    ],
  },
  {
    id: "timket",
    slug: "timket",
    searchName: "Timket: Ethiopian Epiphany",
    alsoKnownAs: ["Timkat", "Ethiopian Epiphany", "Ketera"],
    summary:
      "The baptism of Christ, marked with an overnight vigil and a mass blessing of water. The largest festival in the Ethiopian year.",
    lead: "Timket falls on Tir 11, which is 19 January in most Gregorian years and 20 January in the year after an Ethiopian leap year. It runs over three days and is listed by UNESCO as intangible cultural heritage.",
    rule: "Tir 11, eleven days after Genna in the Ethiopian calendar.",
    sections: [
      {
        heading: "What happens on each of the three days",
        paragraphs: [
          "Ketera, the eve, is when the tabot of each church, the consecrated replica of the Ark of the Covenant, is wrapped in cloth, carried out on a priest's head and taken in procession to a body of water. Crowds walk with it, singing, and the tabot spends the night in a tent beside the water while priests keep vigil.",
          "At dawn on Timket itself the water is blessed and the crowd is sprinkled, or in many places simply immersed. Some renew their baptismal vows. The tabot is then carried back to its church in a slower, louder procession, with dancing, drums and umbrellas.",
          "The day after belongs to Saint Michael, and in most places the celebration continues into it.",
        ],
      },
      {
        heading: "Where to see it",
        paragraphs: [
          "Gondar is the best known, where the sixteenth century bath attributed to Fasilides is filled for the occasion and people leap into it when the water is blessed. Addis Ababa's celebration centres on Jan Meda. Axum, Lalibela and Bahir Dar all draw large crowds. Because it is the fullest expression of the tabot tradition, which is particular to Ethiopian Christianity, it is the festival visitors most often plan a trip around.",
        ],
      },
      {
        heading: "Working out the date",
        paragraphs: [
          "Tir 11 is fixed in the Ethiopian calendar. In Gregorian terms it is 19 January in ordinary years and 20 January in the year that follows an Ethiopian leap year, with Ketera on the evening before.",
        ],
      },
    ],
  },
  {
    id: "fasika",
    slug: "fasika",
    searchName: "Fasika: Ethiopian Easter",
    alsoKnownAs: ["Ethiopian Easter", "Tinsae", "Ethiopian Orthodox Easter"],
    summary:
      "Ethiopian Easter, the end of a fifty five day fast and the most demanding observance in the Orthodox year.",
    lead: "Fasika does not sit on a fixed date. It is worked out from the Orthodox computation of Easter, so it moves through April and into May, and it usually falls on the same Sunday as Greek and Russian Orthodox Easter rather than the Western one.",
    rule: "Moveable. Follows the Orthodox Easter computation, usually one to five weeks after Western Easter.",
    sections: [
      {
        heading: "Why the date moves, and why it differs from Western Easter",
        paragraphs: [
          "Easter is set as the first Sunday after the first full moon following the spring equinox. The Orthodox churches, Ethiopia included, run that calculation on the Julian calendar, which now sits thirteen days behind the Gregorian one, and they hold to the rule that Easter must follow the Jewish Passover. Both conditions push the date later.",
          "The result is that Fasika lands on the same day as Western Easter only occasionally. Most years it is one, four or five weeks after it. Because of this there is no shortcut: the date has to be computed rather than looked up on a fixed calendar, which is what the converter and calendar on this site do.",
        ],
      },
      {
        heading: "Abiy Tsom, the great fast",
        paragraphs: [
          "The fifty five days before Fasika are the longest and strictest fast in the Ethiopian year. No animal products at all, and for the observant no food before three in the afternoon. It is why Ethiopian cuisine has such a deep vegan repertoire: shiro, misir wat, gomen and the rest exist because the country spends around two hundred days a year fasting in one form or another.",
          "The last week intensifies. Siklet, Good Friday, is spent in church, with prostrations, and many eat nothing at all that day.",
        ],
      },
      {
        heading: "The night itself",
        paragraphs: [
          "The service on Saturday night runs until around three in the morning, when the fast breaks. Families go home and eat doro wat, and a sheep is usually slaughtered at dawn. The celebration continues through Sunday and Monday with visits between households.",
          "Fasika is the year's main family holiday. More people travel home for it than for Genna, and in the diaspora it is the observance that holds most firmly.",
        ],
      },
    ],
  },
  {
    id: "adwa",
    slug: "adwa-victory-day",
    searchName: "Adwa Victory Day",
    alsoKnownAs: ["Battle of Adwa", "Adwa Day"],
    summary:
      "The 1896 victory over the invading Italian army, and the reason Ethiopia was never colonised.",
    lead: "Adwa Victory Day falls on Yekatit 23, which is 2 March in the Gregorian calendar. It marks the defeat of an Italian invasion force at Adwa in Tigray in 1896, a result that carried far beyond Ethiopia.",
    rule: "Yekatit 23, fixed. 2 March in Gregorian terms.",
    sections: [
      {
        heading: "What happened at Adwa",
        paragraphs: [
          "Italy claimed a protectorate over Ethiopia on the strength of a deliberate mistranslation in the 1889 Treaty of Wuchale: the Amharic text left Ethiopia free to conduct its own foreign relations, the Italian text did not. Menelik II rejected the Italian reading and, when it was pressed, called a national mobilisation.",
          "On 1 March 1896 an Italian force of around 17,000 advanced on Ethiopian positions near Adwa in confused terrain and on bad maps, splitting into columns that lost contact with each other. They met an Ethiopian army several times their size, well supplied and coordinated, led by Menelik with Empress Taytu Betul commanding a section of the force. The Italian army was broken within hours.",
        ],
      },
      {
        heading: "Why it still matters",
        paragraphs: [
          "Adwa was the first decisive defeat of a European colonial army by an African one, and it held. Italy recognised Ethiopian independence in the Treaty of Addis Ababa later that year. Ethiopia entered the twentieth century as a sovereign state while the rest of the continent was partitioned.",
          "The effect abroad was immediate and lasting. Adwa became a reference point for pan-Africanism and for black political movements from the Caribbean to the United States, and it is a large part of why the Ethiopian flag's colours were taken up across newly independent Africa.",
        ],
      },
      {
        heading: "How it is marked",
        paragraphs: [
          "It is a public holiday. There are ceremonies at the Menelik II monument in Addis Ababa and at Adwa itself, with parades, traditional dress and shimmering songs of the campaign. The anniversary is also observed in Ethiopian communities abroad, often more prominently than inside the country.",
        ],
      },
    ],
  },
];

export const getHolidayArticleBySlug = (slug: string) =>
  HOLIDAY_ARTICLES.find((article) => article.slug === slug) ?? null;
