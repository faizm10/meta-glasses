import type { Metadata } from "next";
import { Fraunces, Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * The three voices (DESIGN.md §5):
 *  - display serif = cinema (film titles, title cards)
 *  - grotesque sans = interface chrome
 *  - mono = camera metadata (timecodes, counts, coordinates)
 * Fraunces/Geist/IBM Plex Mono are the licensed stand-ins for the spec faces.
 */
const displaySerif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const appSans = Geist({
  variable: "--font-app",
  subsets: ["latin"],
});

const cameraMono = IBM_Plex_Mono({
  variable: "--font-camera",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Auteur",
  description: "Your personal AI cinematographer. Directed by you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${appSans.variable} ${cameraMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
