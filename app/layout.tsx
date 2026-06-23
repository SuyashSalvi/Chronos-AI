import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronos AI | Historical Exploration Platform",
  description:
    "Explore history through interactive timelines, maps, entity profiles, relationship graphs, and AI-assisted reasoning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
