import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
    variable: "--font-sans",
    weight: ["400", "500", "600", "700"],
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    weight: ["400", "500", "700"],
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "FireRuleX — NBC Part 4 Compliance Rule Engine",
    description:
        "Building fire &amp; life safety compliance for NBC 2016 Part 4. Mixed occupancy, separate wet-riser / down-comer, server-side PDF report.",
    keywords: [
        "NBC 2016 Part 4",
        "Fire NOC",
        "wet riser",
        "down comer",
        "sprinkler system",
        "mixed occupancy",
        "BIS",
        "IS 2190",
        "IS 3844",
    ],
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className={`${plexSans.variable} ${jetbrainsMono.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
