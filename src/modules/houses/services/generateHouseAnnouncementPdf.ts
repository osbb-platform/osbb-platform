"use server";

import QRCode from "qrcode";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { getHouseAnnouncementHtml } from "./getHouseAnnouncementHtml";

const BUCKET = "house-announcements";

export async function generateHouseAnnouncementPdf(params: {
  houseId: string;
  houseName: string;
  address: string;
  osbbName?: string | null;
  slug: string;
  accentColor?: string | null;
}) {
  // Puppeteer не работает на Vercel serverless. Генерацию PDF запускаем только локально/CLI.
  if (process.env.VERCEL === "1" || process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.ALLOW_LOCAL_PDF_GENERATION) {
      console.warn(
        "generateHouseAnnouncementPdf skipped: Puppeteer не работает в serverless. " +
          "Запустите локально через scripts/regenerate-house-announcements.mjs"
      );
      return;
    }
  }

  const { default: puppeteer } = await import("puppeteer");

  try {
    const supabase = createSupabaseAdminClient();
    const publicUrl = `https://${params.slug}.osbb-platform.com.ua`;
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);

    const html = getHouseAnnouncementHtml({
      houseName: params.houseName,
      address: params.address,
      osbbName: params.osbbName,
      publicUrl,
      qrCodeDataUrl,
      accentColor: params.accentColor,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    const filePath = `${params.houseId}/announcement.pdf`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error("PDF upload error:", error.message);
      return;
    }

  } catch (error) {
    console.error("generateHouseAnnouncementPdf error:", error);
  }
}
