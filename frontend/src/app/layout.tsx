import type { Metadata } from "next";
import "./globals.css";

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