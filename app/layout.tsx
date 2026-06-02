import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/context/AppContext";
import AnnouncementMarquee from "@/components/AnnouncementMarquee";
import HeaderStatus from "@/components/HeaderStatus";
import InstallPrompt from "@/components/InstallPrompt";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jojotennis.com"),
  title: "揪揪網球 JoJo Tennis｜找球友・找球場・台灣網球社群",
  description:
    "全台最大網球社群平台。搜尋全台 40+ 網球場地、智慧媒合球友、加入在地社團，讓每一次打球都更容易。",
  keywords:
    "網球, 找球友, 網球場, 台灣網球, NTRP, 約球, 網球社團, 網球教練, tennis Taiwan",
  alternates: {
    canonical: "/",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "JoJo Tennis",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "揪揪網球｜找球友・找球場・台灣網球社群",
    description: "搜尋全台 40+ 網球場地，媒合球友，找教練，加入社團。",
    url: "https://jojotennis.com",
    siteName: "揪揪網球 JoJo Tennis",
    locale: "zh_TW",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3D2F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-ivory text-ink antialiased`}
      >
        <AppProvider>
          <AnnouncementMarquee />
          <HeaderStatus />
          <main className="min-h-screen">{children}</main>
          <SiteFooter />
          <Navbar />
          <InstallPrompt />
        </AppProvider>
      </body>
    </html>
  );
}
