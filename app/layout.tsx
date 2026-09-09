import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthProvider";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aegis-psi-three.vercel.app/"),
  title: {
    default: "Intervyou.ai | Technical Interview Practice",
    template: "%s | Intervyou.ai",
  },
  description:
    "Prepare for technical interviews with AI-generated questions, realistic text and voice interview simulations, resume analysis, scoring, and personalized feedback.",
  applicationName: "Intervyou.ai",
  keywords: [
    "AI interview preparation",
    "technical interview practice",
    "AI mock interview",
    "voice interview simulation",
    "resume analysis",
    "interview feedback",
  ],
  authors: [{ name: "Intervyou.ai" }],
  creator: "Intervyou.ai",
  publisher: "Intervyou.ai",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://aegis-psi-three.vercel.app/",
    siteName: "Intervyou.ai",
    title: "Intervyou.ai | Technical Interview Practice",
    description:
      "Practice realistic technical interviews with AI voice and text simulations, resume analysis, scoring, and personalized feedback.",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Intervyou.ai technical interview practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intervyou.ai | Technical Interview Practice",
    description:
      "Practice realistic technical interviews with AI voice and text simulations, resume analysis, scoring, and personalized feedback.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icon", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="min-h-screen bg-[#FAF9F6] text-[#111111] antialiased [font-family:var(--font-sora)]">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
