"use server";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { houseOrigin } from "@/src/shared/config/app/domains";
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
  try {
    const supabase = createSupabaseAdminClient();
    const publicUrl = houseOrigin(params.slug);
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
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
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
