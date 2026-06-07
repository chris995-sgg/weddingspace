import JSZip from "jszip";

type PhotoForDownload = {
  id: string;
  imageUrl: string;
  guestName?: string;
};

const DOWNLOAD_CONCURRENT_LOADS = 6;
const DOWNLOAD_TIMEOUT_MS = 20000;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const { photos } = await req.json();

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return Response.json(
        { error: "Keine Fotos ausgewählt" },
        { status: 400 }
      );
    }

    const selectedPhotos = photos as PhotoForDownload[];

    const zip = new JSZip();

    let nextIndex = 0;
    let activeCount = 0;
    let completedCount = 0;

    await new Promise<void>((resolve) => {
      function startNext() {
        while (
          activeCount < DOWNLOAD_CONCURRENT_LOADS &&
          nextIndex < selectedPhotos.length
        ) {
          const photo = selectedPhotos[nextIndex];

          nextIndex++;
          activeCount++;

          fetchWithTimeout(photo.imageUrl)
            .then(async (response) => {
              if (!response.ok) {
                console.error(
                  "Bild konnte nicht geladen werden:",
                  photo.imageUrl
                );
                return;
              }

              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              const guestName = safeFileName(
                String(photo.guestName || "gast")
              );

              const photoId = safeFileName(String(photo.id));

              zip.file(`${guestName}-${photoId}.jpg`, buffer);
            })
            .catch((error) => {
              console.error(
                "Fehler beim Laden des Bildes:",
                photo.imageUrl,
                error
              );
            })
            .finally(() => {
              completedCount++;
              activeCount--;

              if (completedCount >= selectedPhotos.length) {
                resolve();
                return;
              }

              startNext();
            });
        }
      }

      startNext();
    });

    const zipBuffer = await zip.generateAsync({
      type: "uint8array",
    });

    return new Response(zipBuffer as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="weddingspace-fotos.zip"',
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