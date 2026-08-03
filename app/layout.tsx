import type { Metadata } from "next";
import "./globals.css";

import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/contexts/AuthProvider";

export const metadata: Metadata = {
  title: "Aegis",
  description: "AI-powered technical interview assistant",
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
        </AuthProvider>
      </body>
    </html>
  );
}
