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
  title: "Civil Works Management System",
  description: "Plataforma de gestión, seguimiento y predicción de obras civiles",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}