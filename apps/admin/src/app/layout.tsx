import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const font = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Wondera Admin Control Suite",
  description:
    "Operational console for controlling roles, prompts, assets, and backend data with auditability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${font.className} font-sans bg-ink text-slate-100`}>{children}</body>
    </html>
  );
}
