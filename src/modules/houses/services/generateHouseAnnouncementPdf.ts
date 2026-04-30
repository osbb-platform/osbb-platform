"use server";

import QRCode from "qrcode";
import puppeteer from "puppeteer";
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
    console.log("PDF START", params.houseId);

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

    console.log("Launching puppeteer...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    const filePath = `${params.houseId}/announcement.pdf`;

    console.log("Uploading PDF...");
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

    console.log("PDF generated:", filePath);
  } catch (error) {
    console.error("generateHouseAnnouncementPdf error:", error);
  }
}
