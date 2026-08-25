import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { AppFooter } from "@/components/layout/footer";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPaletteProvider } from "@/components/providers/command-palette-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BASE_PATH, asset } from "@/lib/base-path";
import { themeBootstrapScript } from "@/lib/theme";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ethiotime.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EthioTime",
    template: "%s | EthioTime",
  },
  description:
    "A modern Ethiopian productivity suite with date conversion, calendar tools, Amharic typing, and notes.",
  applicationName: "EthioTime",
  keywords: [
    "Ethiopian calendar",
    "Date converter",
    "Ethiopian date",
    "Gregorian to Ethiopian",
    "Amharic keyboard",
    "Ethiopian productivity tools",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "am-ET": "/",
    },
  },
  manifest: asset("/manifest.webmanifest"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: "productivity",
  creator: "EthioTime",
  publisher: "EthioTime",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: asset("/ethiotime-mark.svg"),
    shortcut: asset("/ethiotime-mark.svg"),
    apple: asset("/ethiotime-mark.svg"),
  },
  openGraph: {
    title: "EthioTime",
    description:
      "A modern Ethiopian productivity suite with date conversion, calendar tools, Amharic typing, and notes.",
    url: "/",
    siteName: "EthioTime",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/ethiotime-logo.svg",
        width: 1200,
        height: 630,
        alt: "EthioTime",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EthioTime",
    description:
      "A modern Ethiopian productivity suite with date conversion, calendar tools, Amharic typing, and notes.",
    images: ["/ethiotime-logo.svg"],
  },
  appleWebApp: {
    capable: true,
    title: "EthioTime",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before the first paint so a stored dark choice is already on the
            document: any later and the page flashes light on the way in. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <CommandPaletteProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal-600 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
              >
                Skip to main content
              </a>
              <div className="relative min-h-screen overflow-x-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-teal-50/70 via-white to-orange-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none fixed inset-0 -z-10"
                  style={{ backgroundImage: "var(--page-wash)" }}
                />
                <Sidebar />
                <main
                  id="main-content"
                  className="relative z-10 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 lg:ml-[17.5rem] lg:px-8 lg:pb-10 lg:pt-8"
                  tabIndex={-1}
                >
                  <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-0">
                    {children}
                    <AppFooter />
                  </div>
                </main>
              </div>
            </CommandPaletteProvider>
          </LanguageProvider>
        </ThemeProvider>
        {/*
         * The worker is a production-only concern. Its cache-first rule treats
         * everything under /_next/static as immutable, which holds for a build's
         * content-hashed output but not for `next dev`, where the route chunks are
         * served from stable paths — /_next/static/chunks/app/page.js and friends
         * carry no version query. A worker installed during development therefore
         * pins one compile's chunks indefinitely, and the next compile's module ids
         * no longer match what the browser is running.
         *
         * In development the script does the opposite of registering: it removes any
         * worker and cache left over from an earlier visit, so a browser already in
         * that state repairs itself instead of needing site data cleared by hand.
         */}
        <Script id="ethiotime-sw-register" strategy="afterInteractive">
          {process.env.NODE_ENV === "production"
            ? `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker
              .register('${BASE_PATH}/sw.js', { scope: '${BASE_PATH}/' })
              .catch(function () {});
          }
        `
            : `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
              if (registrations.length === 0) return;
              return Promise.all(
                registrations.map(function (registration) {
                  return registration.unregister();
                })
              )
                .then(function () {
                  return window.caches
                    ? caches.keys().then(function (keys) {
                        return Promise.all(keys.map(function (key) {
                          return caches.delete(key);
                        }));
                      })
                    : null;
                })
                .then(function () {
                  // Whatever the worker already served this load may be stale, so
                  // reload once to pick up what the dev server actually has. The
                  // session flag keeps that from becoming a loop.
                  if (!sessionStorage.getItem('ethiotime-sw-cleared')) {
                    sessionStorage.setItem('ethiotime-sw-cleared', '1');
                    location.reload();
                  }
                });
            }).catch(function () {});
          }
        `}
        </Script>
      </body>
    </html>
  );
}
