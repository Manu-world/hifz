import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { OfflineSyncManager } from "@/components/pwa/offline-sync-manager";
import { AppNav } from "@/components/nav/app-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Arabic web font. Used via the `font-arabic` utility (see globals.css) on any
// element rendering Arabic text, alongside `dir="rtl"`. English UI stays LTR.
const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Hifz — Arabic Vocabulary Memorization",
  description: "A personal spaced-repetition drill app for Arabic vocabulary (حفظ).",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/pwa-icon.svg",
    apple: "/pwa-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Hifz",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#fefdf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <RegisterServiceWorker />
        <OfflineSyncManager />
        <AppNav />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
