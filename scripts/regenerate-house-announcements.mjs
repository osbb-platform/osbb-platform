import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import puppeteer from "puppeteer";

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const raw = fs.readFileSync(filepath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAccentColor(value) {
  const fallback = "#2563eb";
  if (!value) return fallback;

  const normalized = String(value).trim();
  if (!normalized) return fallback;

  const hexMatch = normalized.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (hexMatch) return normalized;

  return fallback;
}

function getHouseAnnouncementHtml(params) {
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
      @page {
        size: A4;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        color: #111111;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 0;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }

      .hero {
        background: ${accentColor};
        color: #ffffff;
        padding: 18mm 16mm 14mm;
        text-align: center;
      }

      .hero-label {
        font-size: 12px;
        line-height: 1.3;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.92;
        margin-bottom: 3mm;
      }

      .hero-address {
        font-size: 18px;
        line-height: 1.4;
        font-weight: 700;
        margin: 0 auto 3mm;
        max-width: 170mm;
      }

      .hero-title {
        font-size: 30px;
        line-height: 1.15;
        font-weight: 800;
        margin: 0 auto 3mm;
        max-width: 170mm;
      }

      .hero-subtitle {
        display: inline-block;
        margin-top: 2mm;
        padding: 2.5mm 5mm;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        font-size: 14px;
        line-height: 1.2;
        font-weight: 700;
      }

      .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 12mm 16mm 14mm;
        text-align: center;
      }

      .lead {
        margin: 0 auto 6mm;
        max-width: 165mm;
      }

      .lead-title {
        font-size: 24px;
        line-height: 1.2;
        font-weight: 800;
        color: #111111;
        margin: 0 0 3mm;
      }

      .lead-text {
        margin: 0;
        font-size: 17px;
        line-height: 1.55;
        color: #222222;
      }

      .features {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 3mm;
        width: 100%;
        max-width: 170mm;
        margin: 0 auto 8mm;
      }

      .feature {
        border: 1.5px solid ${accentColor};
        border-radius: 5mm;
        padding: 4mm 3mm;
        font-size: 16px;
        line-height: 1.35;
        font-weight: 700;
        color: #111111;
        background: #ffffff;
      }

      .qr-card {
        width: 100%;
        max-width: 118mm;
        margin: 0 auto 7mm;
        border-radius: 8mm;
        border: 2px solid ${accentColor};
        background: #ffffff;
        padding: 7mm 7mm 6mm;
        box-shadow: 0 6mm 14mm rgba(0, 0, 0, 0.08);
      }

      .qr-title {
        font-size: 24px;
        line-height: 1.2;
        font-weight: 800;
        color: ${accentColor};
        margin: 0 0 5mm;
      }

      .qr-box {
        width: 76mm;
        height: 76mm;
        margin: 0 auto 4mm;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qr-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .qr-caption {
        font-size: 17px;
        line-height: 1.4;
        font-weight: 700;
        color: #111111;
        margin: 0;
      }

      .instruction-box {
        width: 100%;
        max-width: 170mm;
        margin: 0 auto 7mm;
        border-radius: 6mm;
        background: #f8fafc;
        border: 1px solid #dbe3ea;
        padding: 5mm 6mm;
      }

      .instruction-title {
        font-size: 17px;
        line-height: 1.35;
        font-weight: 800;
        color: #111111;
        margin-bottom: 2.5mm;
      }

      .instruction-step {
        font-size: 16px;
        line-height: 1.5;
        color: #222222;
        margin-bottom: 1.5mm;
      }

      .instruction-step:last-child {
        margin-bottom: 0;
      }

      .password-note {
        width: 100%;
        max-width: 170mm;
        margin: auto auto 0;
        border-radius: 6mm;
        background: #fff7d6;
        border: 1px solid #f2d675;
        padding: 5mm 6mm;
        font-size: 17px;
        line-height: 1.5;
        color: #111111;
        font-weight: 700;
      }

      .password-note strong {
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-label">${safeOsbbName}</div>
        <div class="hero-address">${safeAddress}</div>
        <h1 class="hero-title">${safeHouseName}</h1>
        <div class="hero-subtitle">Офіційний сайт вашого будинку</div>
      </section>

      <section class="content">
        <div class="lead">
          <h2 class="lead-title">Шановні мешканці!</h2>
          <p class="lead-text">
            Для вашої зручності створено сайт будинку, де зібрана важлива інформація для жителів.
          </p>
        </div>

        <div class="features">
          <div class="feature">Оголошення</div>
          <div class="feature">Новини будинку</div>
          <div class="feature">Роботи та плани</div>
          <div class="feature">Збори мешканців</div>
        </div>

        <div class="qr-card">
          <div class="qr-title">Скануйте QR-код</div>
          <div class="qr-box">
            <img src="${safeQrCodeDataUrl}" alt="QR-код сайту будинку" />
          </div>
          <p class="qr-caption">та переходьте на сайт будинку</p>
        </div>

        <section class="instruction-box">
          <div class="instruction-title">Як користуватись сайтом:</div>
          <div class="instruction-step">1. Відскануйте QR-код</div>
          <div class="instruction-step">2. Перейдіть на сайт будинку</div>
          <div class="instruction-step">3. Введіть пароль</div>
        </section>

        <div class="password-note">
          <strong>Пароль для входу</strong> можна отримати у голови будинку.
        </div>
      </section>
    </main>
  </body>
</html>`;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: houses, error: housesError } = await supabase
    .from("houses")
    .select(`
      id,
      name,
      address,
      osbb_name,
      slug,
      archived_at,
      district:districts(theme_color)
    `)
    .order("created_at", { ascending: true });

  if (housesError) {
    throw new Error(`Failed to load houses: ${housesError.message}`);
  }

  console.log(`Found ${houses?.length ?? 0} houses`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    let successCount = 0;
    let failCount = 0;

    for (const house of houses ?? []) {
      const label = `${house.name} (${house.id})`;
      try {
        const publicUrl = `https://${house.slug}.osbb-platform.com.ua`;
        const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);

        const html = getHouseAnnouncementHtml({
          houseName: house.name ?? "Будинок",
          address: house.address ?? "",
          osbbName: house.osbb_name,
          qrCodeDataUrl,
          accentColor:
            house.district &&
            typeof house.district === "object" &&
            "theme_color" in house.district
              ? String(house.district.theme_color ?? "")
              : null,
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
        });

        await page.close();

        const filePath = `${house.id}/announcement.pdf`;

        const { error: uploadError } = await supabase.storage
          .from("house-announcements")
          .upload(filePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        successCount += 1;
        console.log(`✅ ${label} -> ${filePath}${house.archived_at ? " [archived]" : ""}`);
      } catch (error) {
        failCount += 1;
        console.error(`❌ ${label}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`Done. Success: ${successCount}, Failed: ${failCount}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Regeneration failed:", error);
  process.exit(1);
});
