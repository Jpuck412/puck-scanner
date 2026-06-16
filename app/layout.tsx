import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROOF OF STRUCTURE™ ELITE",
  description: "Evidence Before Entry. Institutional Market Intelligence Terminal.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
