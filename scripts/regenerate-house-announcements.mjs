import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import puppeteer from "puppeteer";
import { getHouseAnnouncementHtml } from "../src/modules/houses/services/getHouseAnnouncementHtml.ts";

const BUCKET = "house-announcements";

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;

  const raw = fs.readFileSync(filepath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
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

function getSupabaseEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env.production.local");
  loadEnvFile(".env");

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl, serviceRoleKey };
}

function getAccentColor(house) {
  if (
    house.district &&
    typeof house.district === "object" &&
    "theme_color" in house.district
  ) {
    return String(house.district.theme_color ?? "");
  }

  return null;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseEnv();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: houses, error: housesError } = await supabase
    .from("houses")
    .select(
      `
        id,
        name,
        address,
        osbb_name,
        slug,
        is_active,
        district:districts(theme_color)
      `
    )
    .order("name", { ascending: true });

  if (housesError) {
    throw new Error(`Failed to load houses: ${housesError.message}`);
  }

  console.log(`Found ${houses?.length ?? 0} houses`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let successCount = 0;
  let failCount = 0;

  try {
    for (const house of houses ?? []) {
      const label = `${house.name} (${house.id})`;

      try {
        const publicUrl = `https://${house.slug}.osbb-platform.com.ua`;
        const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);

        const html = getHouseAnnouncementHtml({
          houseName: house.name ?? "Будинок",
          address: house.address ?? "",
          osbbName: house.osbb_name,
          publicUrl,
          qrCodeDataUrl,
          accentColor: getAccentColor(house),
        });

        const page = await browser.newPage();

        await page.setContent(html, {
          waitUntil: "networkidle0",
        });

        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
        });

        await page.close();

        const filePath = `${house.id}/announcement.pdf`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        successCount += 1;
        console.log(`✅ ${label} -> ${filePath}${house.is_active ? "" : " [archived]"}`);
      } catch (error) {
        failCount += 1;
        console.error(`❌ ${label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`Done. Success: ${successCount}, Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Regeneration failed:", error);
  process.exit(1);
});
