import JSZip from "jszip";
import { Buffer } from "buffer";

export const runtime = "nodejs";

type PhotoForDownload = {
  id: string;
  imageUrl: string;
  guestName?: string;
};

type DownloadResult = {
  photo: PhotoForDownload;
  success: boolean;
  buffer?: Buffer;
};

const DOWNLOAD_CONCURRENT_LOADS = 20;

const DOWNLOAD_ATTEMPTS = 20;
const DOWNLOAD_TIMEOUT_MS = 500;
const DOWNLOAD_RETRY_DELAY_MS = 50;

const FINAL_DOWNLOAD_CONCURRENT_LOADS = 4;
const FINAL_DOWNLOAD_ATTEMPTS =  20;
const FINAL_DOWNLOAD_TIMEOUT_MS = 2000;
const FINAL_DOWNLOAD_RETRY_DELAY_MS = 200;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function fetchImageWithAttempts(
  photo: PhotoForDownload,
  maxAttempts = DOWNLOAD_ATTEMPTS,
  timeoutMs = DOWNLOAD_TIMEOUT_MS,
  retryDelayMs = DOWNLOAD_RETRY_DELAY_MS
): Promise<DownloadResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const url =
        attempt === 1
          ? photo.imageUrl
          : `${photo.imageUrl}${
              photo.imageUrl.includes("?") ? "&" : "?"
            }downloadRetry=${Date.now()}-${attempt}`;

      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength > 0) {
          return {
            photo,
            success: true,
            buffer: Buffer.from(arrayBuffer),
          };
        }
      }
    } catch (error) {
      clearTimeout(timeout);

      console.error(
        `Download-Versuch ${attempt} fehlgeschlagen:`,
        photo.imageUrl,
        error
      );
    }

    if (attempt < maxAttempts) {
      await wait(retryDelayMs * attempt);
    }
  }

  return {
    photo,
    success: false,
  };
}

async function runDownloadQueue(
  photos: PhotoForDownload[],
  concurrentLoads: number,
  maxAttempts: number,
  timeoutMs: number,
  retryDelayMs: number
) {
  const successfulResults: DownloadResult[] = [];
  const failedPhotos: PhotoForDownload[] = [];

  let nextIndex = 0;
  let activeCount = 0;
  let completedCount = 0;

  await new Promise<void>((resolve) => {
    function startNext() {
      while (
        activeCount < concurrentLoads &&
        nextIndex < photos.length
      ) {
        const photo = photos[nextIndex];

        nextIndex++;
        activeCount++;

        fetchImageWithAttempts(
          photo,
          maxAttempts,
          timeoutMs,
          retryDelayMs
        )
          .then((result) => {
            if (result.success && result.buffer) {
              successfulResults.push(result);
            } else {
              failedPhotos.push(photo);
            }
          })
          .catch((error) => {
            console.error(
              "Unerwarteter Fehler beim Bild-Download:",
              photo.imageUrl,
              error
            );

            failedPhotos.push(photo);
          })
          .finally(() => {
            completedCount++;
            activeCount--;

            if (completedCount >= photos.length) {
              resolve();
              return;
            }

            startNext();
          });
      }
    }

    startNext();
  });

  return {
    successfulResults,
    failedPhotos,
  };
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

    const firstRun = await runDownloadQueue(
      selectedPhotos,
      DOWNLOAD_CONCURRENT_LOADS,
      DOWNLOAD_ATTEMPTS,
      DOWNLOAD_TIMEOUT_MS,
      DOWNLOAD_RETRY_DELAY_MS
    );

    const finalRun =
      firstRun.failedPhotos.length > 0
        ? await runDownloadQueue(
            firstRun.failedPhotos,
            FINAL_DOWNLOAD_CONCURRENT_LOADS,
            FINAL_DOWNLOAD_ATTEMPTS,
            FINAL_DOWNLOAD_TIMEOUT_MS,
            FINAL_DOWNLOAD_RETRY_DELAY_MS
          )
        : {
            successfulResults: [],
            failedPhotos: [],
          };

    const allSuccessfulResults = [
      ...firstRun.successfulResults,
      ...finalRun.successfulResults,
    ];

    if (allSuccessfulResults.length === 0) {
      return Response.json(
        {
          error:
            "Kein ausgewähltes Bild konnte für die ZIP geladen werden.",
        },
        { status: 500 }
      );
    }

    allSuccessfulResults.forEach((result) => {
      if (!result.buffer) return;

      const guestName = safeFileName(
        String(result.photo.guestName || "gast")
      );

      const photoId = safeFileName(String(result.photo.id));

      zip.file(`${guestName}-${photoId}.jpg`, result.buffer);
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
    console.error("ZIP konnte nicht erstellt werden:", error);

    return Response.json(
      { error: "ZIP konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}