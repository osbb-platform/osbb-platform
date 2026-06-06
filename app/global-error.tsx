"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Global app error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="uk">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#0f172a",
            color: "#f8fafc",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: "640px",
              border: "1px solid rgba(148, 163, 184, 0.28)",
              borderRadius: "28px",
              padding: "32px",
              textAlign: "center",
              background: "rgba(15, 23, 42, 0.92)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "18px",
                border: "1px solid rgba(148, 163, 184, 0.32)",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              !
            </div>

            <h1 style={{ margin: 0, fontSize: "28px", lineHeight: 1.2 }}>
              Щось пішло не так
            </h1>

            <p
              style={{
                margin: "14px auto 0",
                maxWidth: "520px",
                color: "#cbd5e1",
                lineHeight: 1.6,
              }}
            >
              Спробуйте оновити сторінку. Якщо проблема повториться, передайте
              підтримці код помилки{error.digest ? `: ${error.digest}` : "."}
            </p>

            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "28px",
                border: "1px solid rgba(248, 250, 252, 0.28)",
                borderRadius: "18px",
                background: "#f8fafc",
                color: "#0f172a",
                padding: "12px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Спробувати ще раз
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
