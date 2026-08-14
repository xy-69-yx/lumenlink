import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LumenLink",
  description: "Request payments on Stellar with a polished, contract-backed interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
