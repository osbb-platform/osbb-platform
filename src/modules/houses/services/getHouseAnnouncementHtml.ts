function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAccentColor(value: string | null | undefined) {
  const fallback = "#2563eb";
  if (!value) return fallback;

  const normalized = value.trim();
  if (!normalized) return fallback;

  const hexMatch = normalized.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (hexMatch) return normalized;

  return fallback;
}

export function getHouseAnnouncementHtml(params: {
  houseName: string;
  address: string;
  osbbName?: string | null;
  qrCodeDataUrl: string;
  accentColor?: string | null;
}) {
  const safeHouseName = escapeHtml(params.houseName);
  const safeAddress = escapeHtml(params.address);
  const safeOsbbName = escapeHtml(params.osbbName?.trim() || "ОСББ");
  const safeQrCodeDataUrl = escapeHtml(params.qrCodeDataUrl);
  const accentColor = normalizeAccentColor(params.accentColor);

  return `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <title>Оголошення для мешканців</title>
    <style>
      @page { size: A4; margin: 0; }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 8mm 12mm 9mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        overflow: hidden;
        background: #ffffff;
      }

      .meta {
        margin-bottom: 3mm;
      }

      .meta-label {
        font-size: 11px;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 1.2mm;
      }

      .address {
        font-size: 16px;
        line-height: 1.24;
        font-weight: 600;
        color: #334155;
        max-width: 166mm;
        margin: 0 auto 1.5mm;
      }

      .house-name {
        font-size: 22px;
        line-height: 1.08;
        font-weight: 800;
        color: #0f172a;
        max-width: 170mm;
        margin: 0 auto 1.6mm;
      }

      .site-badge {
        display: inline-block;
        padding: 2.1mm 5mm;
        border-radius: 999px;
        background: #eff6ff;
        color: ${accentColor};
        font-size: 13px;
        line-height: 1.1;
        font-weight: 700;
        margin-bottom: 4.2mm;
      }

      .message {
        max-width: 158mm;
        margin: 0 auto 4mm;
      }

      .message p {
        margin: 0 0 2.4mm;
        font-size: 15px;
        line-height: 1.34;
        color: #1e293b;
      }

      .message p:last-child {
        margin-bottom: 0;
      }

      .message strong {
        font-weight: 800;
      }

      .features {
        list-style: none;
        padding: 0;
        margin: 0 auto 4.2mm;
        width: 100%;
        max-width: 156mm;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2.2mm 3.2mm;
      }

      .features li {
        font-size: 14px;
        line-height: 1.2;
        font-weight: 700;
        color: #0f172a;
        padding: 2.7mm 3mm;
        border-radius: 5mm;
        border: 1.6px solid color-mix(in srgb, ${accentColor} 70%, white);
        background: #ffffff;
      }

      .instruction-box {
        width: 100%;
        max-width: 154mm;
        padding: 3.8mm 4.6mm;
        border-radius: 5mm;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        margin-bottom: 4.2mm;
      }

      .instruction-title {
        font-size: 15px;
        line-height: 1.2;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 1.8mm;
      }

      .instruction-step {
        font-size: 13.5px;
        line-height: 1.28;
        color: #1e293b;
        margin-bottom: 0.9mm;
      }

      .instruction-step:last-child {
        margin-bottom: 0;
      }

      .qr-section {
        margin-top: auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .qr-card {
        width: 100%;
        max-width: 92mm;
        padding: 3.6mm 3.8mm 3.2mm;
        border-radius: 7mm;
        background: #ffffff;
        border: 1.7px solid color-mix(in srgb, ${accentColor} 55%, #d7e3f3);
        margin-bottom: 2.6mm;
      }

      .qr-title {
        font-size: 16px;
        line-height: 1.15;
        font-weight: 800;
        color: ${accentColor};
        margin: 0 0 2.2mm;
      }

      .qr-box {
        width: 54mm;
        height: 54mm;
        padding: 2.4mm;
        border-radius: 5mm;
        background: #ffffff;
        border: 1.4px solid #dbe4ef;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 2mm;
      }

      .qr-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .qr-caption {
        font-size: 14px;
        line-height: 1.22;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
      }

      .password-note {
        max-width: 154mm;
        font-size: 13.5px;
        line-height: 1.3;
        color: #334155;
        margin: 0 auto;
      }

      .password-note strong {
        color: #0f172a;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="meta">
        <div class="meta-label">${safeOsbbName}</div>
        <div class="address">${safeAddress}</div>
        <h1 class="house-name">${safeHouseName}</h1>
        <div class="site-badge">Офіційний сайт вашого будинку</div>
      </section>

      <section class="message">
        <p><strong>Шановні мешканці!</strong></p>
        <p>Для вашої зручності створено сайт будинку, де зібрана важлива інформація для жителів.</p>
      </section>

      <ul class="features">
        <li>Оголошення</li>
        <li>Новини будинку</li>
        <li>Роботи та плани</li>
        <li>Збори мешканців</li>
      </ul>

      <section class="instruction-box">
        <div class="instruction-title">Як користуватись сайтом:</div>
        <div class="instruction-step">1. Відскануйте QR-код</div>
        <div class="instruction-step">2. Перейдіть на сайт будинку</div>
        <div class="instruction-step">3. Введіть пароль</div>
      </section>

      <section class="qr-section">
        <div class="qr-card">
          <div class="qr-title">Скануйте QR-код</div>
          <div class="qr-box">
            <img src="${safeQrCodeDataUrl}" alt="QR-код сайту будинку" />
          </div>
          <div class="qr-caption">та переходьте на сайт будинку</div>
        </div>

        <p class="password-note">
          <strong>Пароль для входу</strong> можна отримати у голови будинку.
        </p>
      </section>
    </main>
  </body>
</html>`;
}
