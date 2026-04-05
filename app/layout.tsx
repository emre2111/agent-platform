import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/stores/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Platform',
  description: 'Multi-user AI agent conversation platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
