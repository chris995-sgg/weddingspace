"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import imageCompression from "browser-image-compression";

export default function UploadPage() {
  const params = useParams();
  const weddingId = params.id as string;

  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

 
  async function createThumbnail(file: File) {
  return await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 500,
    useWebWorker: true,
  });
}
 
 async function uploadSingleFile(file: File) {
  let uploadFile = file;

  if (file.size > 5 * 1024 * 1024) {
    uploadFile = await imageCompression(file, {
      maxSizeMB: 5,
      useWebWorker: true,
    });
  }

  const thumbnailFile = await createThumbnail(file);

  const [uploadLinkResponse, thumbnailUploadLinkResponse] =
    await Promise.all([
      fetch("/api/create-upload-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weddingId,
          fileName: uploadFile.name,
          sizeBytes: uploadFile.size,
        }),
      }),

      fetch("/api/create-upload-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weddingId,
          fileName: "thumb-" + uploadFile.name,
          sizeBytes: thumbnailFile.size,
        }),
      }),
    ]);

  const uploadLinkData = await uploadLinkResponse.json();
  const thumbnailUploadLinkData =
    await thumbnailUploadLinkResponse.json();

  if (!uploadLinkResponse.ok) {
    throw new Error(
      uploadLinkData.error || "Upload-Link Fehler"
    );
  }

  if (!thumbnailUploadLinkResponse.ok) {
    throw new Error(
      thumbnailUploadLinkData.error ||
        "Thumbnail Upload-Link Fehler"
    );
  }

 const originalResponse = await fetch(uploadLinkData.uploadLink, {
  method: "POST",
  headers: {
    "Content-Type": "application/octet-stream",
  },
  body: uploadFile,
});

if (!originalResponse.ok) {
  throw new Error("Dropbox Upload fehlgeschlagen");
}

const thumbnailResponse = await fetch(thumbnailUploadLinkData.uploadLink, {
  method: "POST",
  headers: {
    "Content-Type": "application/octet-stream",
  },
  body: thumbnailFile,
});

if (!thumbnailResponse.ok) {
  throw new Error("Thumbnail Upload fehlgeschlagen");
}

  const completeResponse = await fetch("/api/complete-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      weddingId,
      guestName,
      fileName: uploadLinkData.fileName,
      dropboxPath: uploadLinkData.dropboxPath,
      thumbnailDropboxPath:
        thumbnailUploadLinkData.dropboxPath,
      sizeBytes: uploadFile.size,
    }),
  });

  const completeData = await completeResponse.json();

  if (!completeResponse.ok) {
    throw new Error(
      completeData.error || "Upload Abschluss fehlgeschlagen"
    );
  }
}

  async function uploadPhoto() {
    if (files.length === 0) {
      alert("Bitte wähle mindestens ein Foto aus.");
      return;
    }

    setLoading(true);
    setUploadedCount(0);

    try {
      const CONCURRENT_UPLOADS = 3;

      for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
        const batch = files.slice(i, i + CONCURRENT_UPLOADS);

        await Promise.all(
         batch.map(async (file) => {
           await uploadSingleFile(file);
            setUploadedCount((prev) => prev + 1);
            await new Promise((resolve) => setTimeout(resolve, 50));
          })
        );
      }

      alert("Fotos erfolgreich hochgeladen!");
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