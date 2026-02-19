import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cypresso — Cypress Test Generator',
  description:
    'Generate, validate, and export Cypress E2E tests from user stories',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className='min-h-screen antialiased'>{children}</body>
    </html>
  );
}
