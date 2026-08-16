import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { AppFooter } from "@/components/layout/footer";
import { Sidebar } from "@/components/layout/sidebar";
import { LanguageProvider } from "@/components/providers/language-provider";

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
  manifest: "/manifest.webmanifest",
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
    icon: "/ethiotime-mark.svg",
    shortcut: "/ethiotime-mark.svg",
    apple: "/ethiotime-mark.svg",
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
      <body className="antialiased">
        <LanguageProvider>
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
              className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.15),transparent_46%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.12),transparent_44%)]"
            />
            <Sidebar />
            <main
              id="main-content"
              className="relative z-10 flex-1 pb-10 pt-3 lg:ml-[18.5rem] lg:px-8 lg:pt-8"
              tabIndex={-1}
            >
              <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-0">
                {children}
                <AppFooter />
              </div>
            </main>
          </div>
        </LanguageProvider>
        <Script id="ethiotime-sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
              navigator.serviceWorker.register('/sw.js').catch(function () {});
            });
          }
        `}</Script>
      </body>
    </html>
  );
}
