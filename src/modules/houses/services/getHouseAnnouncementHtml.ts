function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAccentColor(value: string | null | undefined) {
  const fallback = "#e05a1a";
  if (!value) return fallback;

  const normalized = value.trim();
  if (!normalized) return fallback;

  const hexMatch = normalized.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (hexMatch) return normalized;

  return fallback;
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const parsed = Number.parseInt(full, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgba(value: string, alpha: number) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getHouseAnnouncementHtml(params: {
  houseName: string;
  address: string;
  osbbName?: string | null;
  publicUrl: string;
  qrCodeDataUrl: string;
  accentColor?: string | null;
}) {
  const safeHouseName = escapeHtml(params.houseName);
  const safeAddress = escapeHtml(params.address);
  const safeOsbbName = escapeHtml(params.osbbName?.trim() || params.houseName);
  const safePublicUrl = escapeHtml(params.publicUrl.replace(/^https?:\/\//, ""));
  const safeQrCodeDataUrl = escapeHtml(params.qrCodeDataUrl);

  const accentColor = normalizeAccentColor(params.accentColor);
  const accentSoft = rgba(accentColor, 0.1);
  const accentSoftStrong = rgba(accentColor, 0.16);
  const accentBorder = rgba(accentColor, 0.32);
  const accentDark = "#0f172a";

  return `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <title>Оголошення для мешканців</title>
    <style>
      @page { size: A4; margin: 0; }

      * { box-sizing: border-box; }

      html,
      body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        color: ${accentDark};
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 210mm;
        height: 297mm;
        overflow: hidden;
        background: #ffffff;
        position: relative;
      }

      .hero {
        position: relative;
        height: 102mm;
        padding: 15mm 16mm 0;
        background: ${accentColor};
        color: #ffffff;
        overflow: hidden;
      }

      .hero::before {
        content: "";
        position: absolute;
        top: -34mm;
        right: -30mm;
        width: 92mm;
        height: 92mm;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
      }

      .hero::after {
        content: "";
        position: absolute;
        bottom: 12mm;
        left: -24mm;
        width: 70mm;
        height: 70mm;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }

      .hero-content {
        position: relative;
        z-index: 2;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        padding: 2.6mm 5mm;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.28);
        font-size: 11px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.92);
      }

      h1 {
        margin: 7mm 0 0;
        max-width: 158mm;
        font-size: 34px;
        line-height: 1.08;
        font-weight: 900;
        letter-spacing: -0.035em;
        color: #ffffff;
      }

      .meta {
        margin-top: 7mm;
        max-width: 160mm;
        font-size: 14px;
        line-height: 1.45;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.88);
      }

      .wave {
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        z-index: 1;
        width: 210mm;
        height: 18mm;
        display: block;
      }

      .body {
        height: 195mm;
        padding: 10mm 16mm 12mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 5mm;
      }

      .intro {
        margin: 0;
        font-size: 19px;
        line-height: 1.42;
        font-weight: 600;
        color: #1f2937;
      }

      .intro strong {
        font-weight: 900;
        color: ${accentDark};
      }

      .features {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 3mm;
      }

      .feature {
        min-height: 24mm;
        border-radius: 5mm;
        border: 1.4px solid ${accentBorder};
        background: ${accentSoft};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3mm;
        text-align: center;
        font-size: 13px;
        line-height: 1.18;
        font-weight: 900;
        color: ${accentDark};
      }

      .divider {
        height: 1px;
        width: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          ${accentBorder},
          transparent
        );
      }

      .steps-label {
        margin-bottom: 4mm;
        text-align: center;
        font-size: 15px;
        line-height: 1.2;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: ${accentDark};
      }

      .steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4mm;
      }

      .step {
        min-height: 38mm;
        border-radius: 5mm;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        padding: 4mm 3mm;
        text-align: center;
      }

      .step-num {
        width: 12mm;
        height: 12mm;
        margin: 0 auto 3mm;
        border-radius: 999px;
        background: ${accentColor};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        line-height: 1;
        font-weight: 900;
      }

      .step-text {
        font-size: 13px;
        line-height: 1.24;
        font-weight: 800;
        color: #334155;
      }

      .qr-card {
        display: grid;
        grid-template-columns: 58mm 1fr;
        align-items: center;
        gap: 7mm;
        border-radius: 7mm;
        border: 1.6px solid ${accentBorder};
        background: ${accentSoftStrong};
        padding: 5mm;
      }

      .qr-frame {
        width: 54mm;
        height: 54mm;
        border-radius: 5mm;
        background: #ffffff;
        border: 1.4px solid ${accentBorder};
        padding: 3mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qr-frame img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .qr-copy {
        text-align: left;
      }

      .qr-title {
        margin: 0 0 2.4mm;
        font-size: 21px;
        line-height: 1.12;
        font-weight: 900;
        letter-spacing: -0.02em;
        color: ${accentDark};
      }

      .qr-description {
        margin: 0 0 3.2mm;
        font-size: 14px;
        line-height: 1.4;
        color: #334155;
        font-weight: 700;
      }

      .site-url {
        display: inline-flex;
        max-width: 100%;
        padding: 2.6mm 4mm;
        border-radius: 999px;
        background: #ffffff;
        border: 1px solid ${accentBorder};
        color: ${accentColor};
        font-size: 13px;
        line-height: 1.1;
        font-weight: 900;
      }

      .footer {
        height: 12mm;
        background: #0f172a;
        color: rgba(255, 255, 255, 0.78);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    </style>
  </head>

  <body>
    <main class="page">
      <header class="hero">
        <div class="hero-content">
          <div class="eyebrow">Офіційний сайт вашого будинку</div>
          <h1>Сайт будинку вже доступний для мешканців</h1>
          <div class="meta">${safeOsbbName} · ${safeAddress}</div>
        </div>

        <svg class="wave" viewBox="0 0 794 68" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,68 L0,38 C142,62 252,4 397,28 C542,52 652,16 794,34 L794,68 Z" fill="#ffffff"></path>
        </svg>
      </header>

      <div class="body">
        <p class="intro">
          <strong>Шановні мешканці!</strong> Для вашого будинку створено офіційний сайт —
          зручний спосіб завжди бути в курсі оголошень, новин та важливих рішень.
        </p>

        <div class="features">
          <div class="feature">Оголошення</div>
          <div class="feature">Новини<br />будинку</div>
          <div class="feature">Роботи<br />та плани</div>
          <div class="feature">Збори<br />мешканців</div>
        </div>

        <div class="divider"></div>

        <div>
          <div class="steps-label">Як отримати доступ</div>
          <div class="steps">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-text">Відскануйте<br />QR-код</div>
            </div>

            <div class="step">
              <div class="step-num">2</div>
              <div class="step-text">Перейдіть<br />на сайт будинку</div>
            </div>

            <div class="step">
              <div class="step-num">3</div>
              <div class="step-text">Введіть пароль<br />від голови будинку</div>
            </div>
          </div>
        </div>

        <div class="qr-card">
          <div class="qr-frame">
            <img src="${safeQrCodeDataUrl}" alt="QR-код сайту будинку" />
          </div>

          <div class="qr-copy">
            <h2 class="qr-title">Скануйте QR-код та переходьте на сайт</h2>
            <p class="qr-description">
              Пароль для входу можна отримати у голови будинку або відповідальної особи.
            </p>
            <div class="site-url">${safePublicUrl}</div>
          </div>
        </div>
      </div>

      <footer class="footer">${safeHouseName}</footer>
    </main>
  </body>
</html>`;
}
