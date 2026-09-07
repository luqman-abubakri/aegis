import type { Metadata } from "next";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://aegis-psi-three.vercel.app/"),
  title: {
    default: "Nexly | AI Interview Preparation & Technical Interview Practice",
    template: "%s | Nexly",
  },
  description:
    "Prepare for technical interviews with AI-generated questions, realistic text and voice interview simulations, resume analysis, scoring, and personalized feedback.",
  applicationName: "Nexly",
  keywords: [
    "AI interview preparation",
    "technical interview practice",
    "AI mock interview",
    "voice interview simulation",
    "resume analysis",
    "interview feedback",
  ],
  authors: [{ name: "Nexly" }],
  creator: "Nexly",
  publisher: "Nexly",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://aegis-psi-three.vercel.app/",
    siteName: "Nexly",
    title: "Nexly | AI Interview Preparation & Technical Interview Practice",
    description:
      "Practice realistic technical interviews with AI voice and text simulations, resume analysis, scoring, and personalized feedback.",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Nexly AI interview preparation and technical interview practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexly | AI Interview Preparation & Technical Interview Practice",
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
    <html lang="en">
      <body className="min-h-screen bg-[#020817] text-white antialiased">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
