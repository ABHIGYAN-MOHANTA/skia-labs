import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { AuthProvider } from "@/contexts/AuthContext";
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
  title: "Skia Labs",
  description: "Write, test, and explore SKSL shaders in real-time. A powerful web-based playground for creative coding with Skia's shader language.",
  metadataBase: new URL("https://skialabs.hostagedown.com"),
  openGraph: {
    title: "Skia Labs | SKSL Shader Playground",
    description: "Write, test, and explore SKSL shaders in real-time.",
    url: "https://skialabs.hostagedown.com",
    siteName: "Skia Labs",
    images: [
      {
        url: "/api/thumbnail/default",
        width: 1200,
        height: 630,
        alt: "Skia Labs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skia Labs | SKSL Shader Playground",
    description: "Write, test, and explore SKSL shaders in real-time.",
    images: ["/api/thumbnail/default"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-TK598JJNS8"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-TK598JJNS8');`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NavbarWrapper />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
