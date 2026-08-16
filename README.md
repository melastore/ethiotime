# EthioTime

A set of Ethiopian calendar and productivity tools that run in the browser. Everything works
against both the Ethiopian and Gregorian calendars, and the parts that hold your data — notes,
planned events — keep it in the browser rather than on a server.

## Tools

| Tool | What it does |
| --- | --- |
| Date Converter | Convert dates between the Ethiopian and Gregorian calendars |
| Age Calculator | Work out an exact age in either calendar |
| Ethiopian Calendar | Month view with weekdays and holidays marked |
| Amharic Keyboard | Type fidel by transliteration (`selam` gives ሰላም) |
| Note Taking | Plain notes, stored locally |
| Event Planner | Plan events in either calendar, with reminders and recurring rules |
| Holiday Guide | Ethiopian public holidays, their dates and background |

The interface is available in English and Amharic, and the app is installable as a PWA with an
offline fallback.

## Running it

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

That serves the app on http://localhost:3000.

For a production build:

```bash
npm run build
npm run start
```

The transliteration rules have unit tests, run with the Node test runner:

```bash
npm test
```

## Configuration

Both are optional and read at build time:

- `NEXT_PUBLIC_SITE_URL` — the public URL of the deployment. Used for canonical links,
  `sitemap.xml` and `robots.txt`. Defaults to `https://ethiotime.com`, so set this if you host
  it somewhere else.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` — Google Search Console verification token.

## Layout

```text
src/
  app/          routes, root layout, global styles
  components/   one directory per tool, plus layout/ and ui/ primitives
  lib/          date conversion, holiday data, translations, helpers
```

Date conversion is built on [kenat](https://www.npmjs.com/package/kenat). Calendar constants and
holiday data live in `src/lib` — the tool components read from there rather than keeping their own
copies, so a fix to a date rule applies everywhere at once.

## Built with

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, and Radix UI primitives.

## Contributing

Bug reports and pull requests are welcome. Please run `npm run lint`, `npm test` and
`npm run build` before opening a PR.

## License

MIT — see [LICENSE](LICENSE).
