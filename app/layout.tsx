import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthProvider";

const siteUrl = "https://aegis-psi-three.vercel.app/";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Intervyou.ai | AI Technical Interview Preparation",
    template: "%s | Intervyou.ai",
  },
  description:
    "Prepare for technical interviews with AI mock interviews, resume analysis, performance scoring, and personalized interview feedback.",
  applicationName: "Intervyou.ai",
  keywords: [
    "AI interview preparation",
    "technical interview practice",
    "AI mock interview",
    "technical interview questions",
    "coding interview practice",
    "resume analysis",
    "interview feedback",
    "voice interview simulation",
  ],
  authors: [{ name: "Intervyou.ai" }],
  creator: "Intervyou.ai",
  publisher: "Intervyou.ai",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Intervyou.ai",
    title: "Intervyou.ai | AI Technical Interview Preparation",
    description:
      "Practice technical interviews with AI mock interviews, resume analysis, performance scoring, and personalized feedback.",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Intervyou.ai AI technical interview preparation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intervyou.ai | AI Technical Interview Preparation",
    description:
      "Practice technical interviews with AI mock interviews, resume analysis, performance scoring, and personalized feedback.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png", type: "image/png" }],
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Intervyou.ai",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Intervyou.ai",
        url: siteUrl,
        description: metadata.description,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebApplication",
        name: "Intervyou.ai",
        url: siteUrl,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        description: metadata.description,
      },
    ],
  };

  return (
    <html lang="en" className={sora.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
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
