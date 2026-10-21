import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Urbanist } from "next/font/google";
import { Providers } from "@/components/Providers";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: "Lastro",
  description: "Controle simples de gastos e receitas.",
  applicationName: "Lastro",
  appleWebApp: { capable: true, title: "Lastro", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="minimal" suppressHydrationWarning className={`${urbanist.variable} ${geist.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
