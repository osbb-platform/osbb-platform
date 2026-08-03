import { Inter, Lora } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif-lora",
  weight: ["500", "600", "700"],
  display: "swap",
});


export const metadata: Metadata = {
  title: "OSBB Platform",
  description: "Платформа управляющей компании для сети домов",
  icons: {
    icon: "/icon.svg",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const themeInitScript = `
(function () {
  try {
    var theme = window.localStorage.getItem("osbb-admin-theme");

    if (theme === "dark") {
      document.documentElement.removeAttribute("data-admin-theme");
      document.documentElement.style.colorScheme = "dark";
      return;
    }

    document.documentElement.setAttribute("data-admin-theme", "light");
    document.documentElement.style.colorScheme = "light";
  } catch (e) {
    document.documentElement.setAttribute("data-admin-theme", "light");
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk" data-admin-theme="light" suppressHydrationWarning className={`${inter.variable} ${lora.variable}`}>
      <head>
        <script
          id="admin-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}
