import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SwRegister } from "./sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FieldStack — Field Stack Solutions",
  description:
    "Field service management: work orders, sites, equipment, and reporting for multi-site operators.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/fss-badge-navy.png",
    apple: "/brand/fss-badge-navy.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FieldStack",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1f38",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
