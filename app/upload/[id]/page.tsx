"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import imageCompression from "browser-image-compression";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UploadPage() {
  const params = useParams();
  const weddingId = params.id as string;
  const [galleryEnabled, setGalleryEnabled] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  useEffect(() => {
  async function loadWeddingSettings() {
    try {
      const weddingRef = doc(db, "weddings", weddingId);
      const snapshot = await getDoc(weddingRef);

      if (!snapshot.exists()) {
        setGalleryEnabled(false);
        return;
      }

      const data = snapshot.data();

      setGalleryEnabled(data.galleryEnabled ?? true);
    } catch (error) {
      console.error(error);
      setGalleryEnabled(false);
    }
  }

  loadWeddingSettings();
}, [weddingId]);

  async function uploadToDropboxWithRetries(
    uploadLink: string,
    file: File
  ) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await fetch(uploadLink, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: file,
      });

      if (response.ok) {
        return true;
      }

      if (attempt < 5) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100)
        );
      }
    }

    return false;
  }

  async function uploadPhoto() {
    if (!guestName.trim()) {
      alert("Bitte gib deinen Namen ein.");
      return;
    }

  if (files.length === 0) {
    alert("Bitte wähle mindestens ein Foto aus.");
    return;
  }
    setLoading(true);
    setUploadedCount(0);

    const failedUploads: string[] = [];

    try {
      const CONCURRENT_UPLOADS = 10;

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

            if (file.size > 6 * 1024 * 1024) {
              uploadFile = await imageCompression(file, {
                maxSizeMB: 4,
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
              const uploadData =
                uploadLinksData.uploads[index];

              const uploadSuccess =
                await uploadToDropboxWithRetries(
                  uploadData.uploadLink,
                  file
                );

              if (!uploadSuccess) {
                throw new Error(
                  "Dropbox Upload fehlgeschlagen"
                );
              }

              const completeResponse = await fetch(
                "/api/complete-upload",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    weddingId,
                    guestName,
                    fileName: uploadData.fileName,
                    dropboxPath:
                      uploadData.dropboxPath,
                    sizeBytes: file.size,
                  }),
                }
              );

              const completeData =
                await completeResponse.json();

              if (!completeResponse.ok) {
                throw new Error(
                  completeData.error ||
                    "Upload Abschluss fehlgeschlagen"
                );
              }

              setUploadedCount((prev) => prev + 1);
            } catch (error) {
              console.error(error);
              failedUploads.push(file.name);
            }
          })
        );
      }

      if (failedUploads.length > 0) {
        alert(
          `${failedUploads.length} Foto(s) konnten nicht hochgeladen werden:\n\n${failedUploads.join(
            "\n"
          )}`
        );
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

  if (!galleryEnabled) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-md bg-white/60 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">
        <div className="mb-6 flex justify-center items-center">
          <div className="w-20 h-px bg-[#c8ad72]"></div>
          <span className="mx-4 text-[#c8ad72] text-xl">♥</span>
          <div className="w-20 h-px bg-[#c8ad72]"></div>
        </div>

        <h1 className="font-elegant text-4xl font-medium text-[#3b3128]">
          Foto-Upload deaktiviert
        </h1>

        <p className="text-[#6b5c4d] mt-4">
          Der Foto-Upload ist für dieses Event aktuell nicht verfügbar.
        </p>
      </div>
    </main>
  );
}

  return (
<main className="min-h-screen flex justify-center items-start pt-28 p-6 relative text-black">
      <Link
        href="/dashboard"
        className="absolute top-6 left-6 bg-white/60 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="w-full max-w-md bg-white/50 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50">
        <h1 className="text-4xl font-bold mb-2 text-center text-[#3b3128]">
          Foto hochladen
        </h1>

        <p className="text-center text-[#6b5c4d] mb-8">
          Teile deinen schönsten Moment ✨
        </p>

        <div className="mb-4">
        <label className="block mb-2 text-sm text-[#6b5c4d]">
          Dein Name
        </label>

        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="z. B. Anna"
          className="w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#c8ad72]"
        />
      </div>

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
            onChange={(e) =>
              setFiles(Array.from(e.target.files || []))
            }
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
          className="block mt-4 text-center bg-[#c8ad72] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
        >
          Zur Bildergalerie
        </Link>
      </div>
    </main>
  );
}