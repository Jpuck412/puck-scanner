import './globals.css';
import { Toaster } from 'sonner';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
