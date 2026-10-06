// Live download of the 50-State HR Quick Reference.
// _redirects sends the guide's URL here, so every download is built from the
// currently published law cards. If anything goes wrong it falls back to the
// static backup copy so the download never breaks.
import { buildWorkbook } from "./quick-reference-builder.mjs";

const FALLBACK = "/downloads/HRCC-50-State-Quick-Reference-backup.xlsx";

export default async () => {
  try {
    const { buffer, year } = await buildWorkbook();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="HRCC-50-State-Quick-Reference-${year}.xlsx"`,
        "Cache-Control": "public, max-age=0, must-revalidate",
        // Netlify's CDN keeps a copy for up to an hour, so card changes show up within the hour.
        "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("quick-reference build failed:", err);
    return new Response(null, { status: 302, headers: { Location: FALLBACK, "Cache-Control": "no-store" } });
  }
};
