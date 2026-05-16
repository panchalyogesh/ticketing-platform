import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Ticketing Platform",
  description: "Dynamic event pricing and concurrency-safe booking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold text-white">
              Ticketing Platform
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-200">
              <Link href="/events" className="hover:text-white">
                Events
              </Link>
              <Link href="/my-bookings" className="hover:text-white">
                My Bookings
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
