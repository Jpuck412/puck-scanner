export const metadata = {
  title: "PUCK Scanner",
  description: "Premarket and intraday momentum scanner"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
