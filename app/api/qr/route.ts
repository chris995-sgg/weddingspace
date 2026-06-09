import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const url = searchParams.get("url");

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "Keine URL übergeben" },
        { status: 400 }
      );
    }

    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 1200,
      margin: 4,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return new Response(pngBuffer as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="weddingspace-qr-code.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("QR PNG Fehler:", error);

    return Response.json(
      { error: "QR-Code konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}