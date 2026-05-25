"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function UploadPage() {
  const params = useParams();
  const weddingId = params.id as string;

  const [guestName, setGuestName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function uploadPhoto() {
    if (!file) {
      alert("Bitte ein Foto auswählen.");
      return;
    }

    setUploading(true);
    setDone(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("weddingId", weddingId);
    formData.append("guestName", guestName);

    const response = await fetch("/api/upload-photo", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!response.ok) {
      alert("Upload fehlgeschlagen.");
      return;
    }

    setDone(true);
    setFile(null);
    setGuestName("");
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-neutral-900 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          Foto hochladen
        </h1>

        <p className="text-neutral-400 text-center mb-6">
          Teile dein schönstes Foto mit dem Brautpaar.
        </p>

        {done && (
          <div className="mb-5 rounded-xl border border-green-700 bg-green-900/40 p-4 text-center">
            Foto erfolgreich hochgeladen ❤️
          </div>
        )}

        <input
          className="w-full mb-4 p-3 rounded-xl bg-neutral-800 border border-neutral-700"
          placeholder="Dein Name optional"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />

        <input
          className="w-full mb-5 p-3 rounded-xl bg-neutral-800 border border-neutral-700"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        {file && (
          <p className="text-sm text-neutral-400 mb-4">
            Ausgewählt: {file.name}
          </p>
        )}

        <button
          onClick={uploadPhoto}
          disabled={uploading}
          className="w-full bg-white text-black p-4 rounded-xl font-bold disabled:opacity-50"
        >
          {uploading ? "Lädt hoch..." : "Foto hochladen"}
        </button>

        <Link
         href={`/gallery/${weddingId}`}
         className="block mt-4 text-center bg-neutral-700 p-4 rounded-xl font-bold"
        >
         Zur WeddingSpace Galerie
        </Link>

      </div>
    </main>
  );
}