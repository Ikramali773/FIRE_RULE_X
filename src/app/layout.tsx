import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "FireRuleX — IS 2190:2024 Fire Safety Compliance Checker",
  description:
    "Upload your floor plan and get instant IS 2190:2024 fire extinguisher compliance results. AI-powered analysis for commercial buildings.",
  keywords: [
    "fire safety",
    "IS 2190",
    "NBC compliance",
    "fire extinguisher",
    "floor plan analysis",
    "NOC",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
