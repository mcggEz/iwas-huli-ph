import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iwas Huli - Traffic Violation Alert App | Manila Road Safety",
  description: "Navigate Manila's roads safely with Iwas Huli. Get real-time alerts about traffic violation hotspots, avoid fines, and stay informed about road safety. Download the app today!",
  keywords: [
    "traffic violation alerts",
    "Manila road safety", 
    "traffic fines prevention",
    "road violation hotspots",
    "Philippines traffic app",
    "driving safety",
    "traffic rules",
    "road navigation",
    "violation zone alerts",
    "Manila driving guide"
  ],
  authors: [{ name: "Iwas Huli Team" }],
  creator: "Iwas Huli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
