import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Iris — Home energy awareness",
  description: "Understand and reduce energy waste with live sensor insights.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", inter.variable)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
