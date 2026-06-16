import "./globals.css";

export const metadata = {
  title: "PROOF OF STRUCTURE™ ELITE",
  description: "Evidence Before Entry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
