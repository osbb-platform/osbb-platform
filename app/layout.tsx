import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSBB Platform",
  description: "Платформа управляющей компании для сети домов",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const themeInitScript = `
(function () {
  try {
    var theme = window.localStorage.getItem("osbb-admin-theme");

    if (theme === "light") {
      document.documentElement.setAttribute("data-admin-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-admin-theme");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript,
          }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}
