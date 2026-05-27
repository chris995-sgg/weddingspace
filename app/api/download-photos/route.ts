import JSZip from "jszip";

export async function POST(req: Request) {
  try {
    const { photos } = await req.json();

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return Response.json(
        { error: "Keine Fotos ausgewählt" },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    for (const photo of photos) {
      const response = await fetch(photo.imageUrl);

      if (!response.ok) {
        console.error("Bild konnte nicht geladen werden:", photo.imageUrl);
        continue;
      }

    const arrayBuffer = await response.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const safeName = String(photo.guestName || "gast").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
    );

    zip.file(`${safeName}-${photo.id}.jpg`, buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: "uint8array",
    });

  return new Response(zipBuffer as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="weddingspace-fotos.zip"',
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "ZIP konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}