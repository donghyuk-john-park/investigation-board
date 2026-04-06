import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gnosis",
  description: "Assumption management for thesis-driven investors",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-gray-200">
        <nav className="border-b border-gray-800 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-6">
            <Link
              href="/"
              className="text-base font-bold text-gray-100 tracking-tight py-2"
            >
              GNOSIS
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-300 py-2 px-1"
            >
              Assumptions
            </Link>
            <Link
              href="/assumptions/new"
              className="text-sm text-gray-500 hover:text-gray-300 py-2 px-1"
            >
              + New
            </Link>
          </div>
        </nav>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
