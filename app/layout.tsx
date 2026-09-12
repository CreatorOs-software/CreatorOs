import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { TooltipProvider } from "@talentos/ui";
import { AuthProvider } from "@/components/context/auth-provider";
import { QueryProvider } from "@/components/context/query-provider";
import "./globals.css";
import "@talentos/ui/styles.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Proxima Nova — self-hosted. The @talentos/ui-tokens fonts.css @font-face
// rules don't survive Turbopack's external-dir asset pipeline, so the sidebar
// (and everything on --font-sans) was falling back to system-ui.
const proximaNova = localFont({
  src: [
    { path: "./fonts/proxima-nova/ProximaNovaRegular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/proxima-nova/ProximaNovaBold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/proxima-nova/ProximaNovaBlack.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-proxima",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TalentOS - Influencer Management Dashboard",
  description: "Modern Management Dashboard",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="">
      <body
        className={`${geistMono.variable} ${proximaNova.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster position="bottom-right" richColors />
        {/*process.env.NODE_ENV === "production" && <Analytics />*/}
      </body>
    </html>
  );
}
