"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import imageCompression from "browser-image-compression";
type UploadReportItem = {
  fileName: string;
  tokenSource: string;
  durationMs: number;
  success: boolean;
  attempts: number;
  error?: string;
};

export default function UploadPage() {
  const params = useParams();
  const weddingId = params.id as string;

  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadReport, setUploadReport] = useState<UploadReportItem[]>([]);

  const [totalUploadDurationMs, setTotalUploadDurationMs] =
  useState<number | null>(null);


async function uploadToDropboxWithRetries(
  uploadLink: string,
  file: File
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(uploadLink, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });

    if (response.ok) {
      return {
        success: true,
        attempts: attempt,
      };
    }

    if (attempt < 3) {
      await new Promise((resolve) =>
        setTimeout(resolve, 200)
      );
    }
  }

  return {
    success: false,
    attempts: 3,
  };
}


 async function uploadPhoto() {
  if (files.length === 0) {
    alert("Bitte wähle mindestens ein Foto aus.");
    return;
  }

  setLoading(true);
  setUploadedCount(0);
  setUploadReport([]);
  setTotalUploadDurationMs(null);

const totalStart = performance.now();
const report: UploadReportItem[] = [];

  try {
    const CONCURRENT_UPLOADS = 15;

    for (
      let i = 0;
      i < files.length;
      i += CONCURRENT_UPLOADS
    ) {
      const batch = files.slice(
        i,
        i + CONCURRENT_UPLOADS
      );

      const preparedBatch = await Promise.all(
        batch.map(async (file) => {
          let uploadFile = file;

          if (file.size > 5 * 1024 * 1024) {
            uploadFile = await imageCompression(file, {
              maxSizeMB: 5,
              useWebWorker: true,
            });
          }

          return uploadFile;
        })
      );

      const uploadLinksResponse = await fetch(
        "/api/create-upload-links",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weddingId,
            files: preparedBatch.map((file) => ({
              fileName: file.name,
              sizeBytes: file.size,
            })),
          }),
        }
      );

      const uploadLinksData =
        await uploadLinksResponse.json();

      if (!uploadLinksResponse.ok) {
        throw new Error(
          uploadLinksData.error ||
            "Upload-Links Fehler"
        );
      }

      await Promise.all(
        preparedBatch.map(async (file, index) => {
          
        try {
  const uploadData = uploadLinksData.uploads[index];
  const fileStart = performance.now();

const uploadResult =
  await uploadToDropboxWithRetries(
    uploadData.uploadLink,
    file
  );

if (!uploadResult.success) {
  throw new Error(
    `Dropbox Upload nach ${uploadResult.attempts} Versuchen fehlgeschlagen`
  );
}

  const completeResponse = await fetch("/api/complete-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      weddingId,
      guestName,
      fileName: uploadData.fileName,
      dropboxPath: uploadData.dropboxPath,
      sizeBytes: file.size,
    }),
  });

  const completeData = await completeResponse.json();

  if (!completeResponse.ok) {
    throw new Error(
      completeData.error || "Upload Abschluss fehlgeschlagen"
    );
  }

report.push({
  fileName: uploadData.fileName,
  tokenSource: uploadData.tokenSource || "unbekannt",
  durationMs: Math.round(performance.now() - fileStart),
  success: true,
  attempts: uploadResult.attempts,
});

  setUploadedCount((prev) => prev + 1);
} catch (error: any) {

report.push({
  fileName: file.name,
  tokenSource: "unbekannt",
  durationMs: 0,
  success: false,
  attempts: 3,
  error: error.message || "Unbekannter Fehler",
});
}

        })
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 50)
      );
    }

    const totalEnd = performance.now();

setTotalUploadDurationMs(
  Math.round(totalEnd - totalStart)
);

setUploadReport(report);

   const failedCount = report.filter((item) => !item.success).length;

if (failedCount > 0) {
  alert(`${failedCount} Foto(s) konnten nicht hochgeladen werden.`);
} else {
  alert("Fotos erfolgreich hochgeladen!");
}

    setFiles([]);
    setGuestName("");
  } catch (error: any) {
    console.error(error);
    alert(error.message || "Fehler beim Upload.");
  }

  setLoading(false);
}

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative text-black">


{uploadReport.length > 0 && (
  <div className="fixed bottom-6 right-6 z-50 max-w-md max-h-96 overflow-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4 text-sm text-[#3b3128]">
    <h2 className="font-bold text-lg mb-3">
      Upload-Auswertung
    </h2>

    {totalUploadDurationMs !== null && (
      <p className="mb-3">
        Gesamtzeit:{" "}
        <strong>
          {(totalUploadDurationMs / 1000).toFixed(2)} s
        </strong>
      </p>
    )}

    <div className="space-y-3">
      {uploadReport.map((item, index) => (
        <div
          key={`${item.fileName}-${index}`}
          className="border-b border-[#ddd] pb-2"
        >
          <p className="font-semibold">
            {item.fileName}
          </p>

          <p>
            Status:{" "}
            <strong>
              {item.success ? "Erfolgreich" : "Fehlgeschlagen"}
            </strong>
          </p>

          {item.error && (
            <p className="text-red-600">
              Fehler: {item.error}
            </p>
          )}

          <p>
            Token:{" "}
            <strong>
              {item.tokenSource === "cache"
                ? "aus Cache"
                : item.tokenSource === "new"
                ? "neu generiert"
                : item.tokenSource === "refreshed"
                ? "erneuert nach 401"
                : "unbekannt"}
            </strong>
          </p>

          <p>
  Versuche:{" "}
  <strong>
    {item.attempts}
  </strong>
</p>

          <p>
            Upload-Zeit:{" "}
            <strong>
              {(item.durationMs / 1000).toFixed(2)} s
            </strong>
          </p>
        </div>
      ))}
    </div>
  </div>
)}


      <Link
        href="/dashboard"
        className="absolute top-6 left-6 bg-white/60 backdrop-blur-xl text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="w-full max-w-md bg-white/55 backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl border border-white/50">
        <h1 className="text-4xl font-bold mb-2 text-center text-[#3b3128]">
          Foto hochladen
        </h1>

        <p className="text-center text-[#6b5c4d] mb-8">
          Teile deinen schönsten Moment ✨
        </p>

        {loading && (
          <p className="mb-4 text-center text-[#6b5c4d] font-semibold">
            {uploadedCount} von {files.length} Fotos hochgeladen
          </p>
        )}

        {files.length > 0 && (
          <p className="mb-4 text-center text-[#6b5c4d] font-semibold">
            {files.length} Foto(s) ausgewählt
          </p>
        )}

        <label className="block w-full mb-4 cursor-pointer bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-4 text-center text-[#3b3128] font-semibold shadow hover:bg-white/90 transition">
          Fotos auswählen

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="hidden"
          />
        </label>

        <button
          onClick={uploadPhoto}
          disabled={loading}
          className="w-full bg-[#3b3128] text-white p-4 rounded-2xl font-bold hover:bg-[#2d241d] transition disabled:opacity-50 shadow-lg"
        >
          {loading ? "Lade hoch..." : "Fotos hochladen"}
        </button>

        <Link
          href={`/gallery/${weddingId}`}
          className="block mt-4 text-center bg-[#d4b06a] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
        >
          Zur Bildergalerie
        </Link>
      </div>
    </main>
  );
}