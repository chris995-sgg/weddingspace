"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";


export default function UploadPage() {
  const params = useParams();

  const weddingId = params.id as string;

  const [guestName, setGuestName] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

async function uploadPhoto() {
  if (files.length === 0) {
    alert("Bitte wähle mindestens ein Foto aus.");
    return;
  }

  setLoading(true);
  setUploadedCount(0);

  try {
    const CONCURRENT_UPLOADS = 3;

    let completed = 0;

    for (
      let i = 0;
      i < files.length;
      i += CONCURRENT_UPLOADS
    ) {
      const batch = files.slice(
        i,
        i + CONCURRENT_UPLOADS
      );

      await Promise.all(
        batch.map(async (file) => {
          const formData = new FormData();

          formData.append("file", file);
          formData.append("weddingId", weddingId);
          formData.append("guestName", guestName);

          const response = await fetch(
            "/api/upload-photo",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const data = await response.json();

            throw new Error(
              data.error ||
                "Upload fehlgeschlagen"
            );
          }

          completed++;

          
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

    alert(
      error.message || "Fehler beim Upload."
    );
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
      {loading
        ? "Lade hoch..."
        : "Fotos hochladen"}
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