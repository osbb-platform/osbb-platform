import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSBB Platform",
  description: "Платформа управляющей компании для сети домов",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
