import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "3Vidya Learning",
  description: "3Vidya Learning Platform",
};

import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { Toaster } from "sonner";

import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative bg-slate-50`}
        suppressHydrationWarning
      >
        <div className="fixed inset-0 flex items-center justify-center -z-10 opacity-[0.08] pointer-events-none select-none">
          <div className="relative w-[600px] h-[600px]">
            <Image
              src="/assets/logo.png"
              alt="Watermark"
              fill
              className="object-contain grayscale contrast-125"
              priority
            />
          </div>
        </div>
        <AuthProvider>
          <ToastProvider>
            {children}
            <Toaster position="top-right" richColors theme="light" />
          </ToastProvider>
        </AuthProvider>
        <footer className="py-6 text-center text-sm text-slate-400 bg-slate-50 border-t border-slate-100">
          &copy; Silotech 2025
        </footer>
      </body>
    </html>
  );
}
