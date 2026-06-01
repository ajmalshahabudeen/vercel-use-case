import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@workspace/ui/globals.css";
import { AppHeader, AppFooter, ThemeProvider } from '@vercel-env-updater/components';
import { Toaster } from "@workspace/ui/components/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vercel Env Updater",
  description: "Sync and manage your Vercel environment variables with ease. Powered by Prisma + Postgres.",
  icons: {
    icon: "/vercel.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="system">
          <Toaster />
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
