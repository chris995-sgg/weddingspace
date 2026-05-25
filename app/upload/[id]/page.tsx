"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function UploadPage() {
  const params = useParams();

  const weddingId = params.id as string;

  const [guestName, setGuestName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  async function uploadPhoto() {
    if (!file) {
      alert("Bitte wähle ein Foto aus.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("weddingId", weddingId);
      formData.append("guestName", guestName);

      const response = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload fehlgeschlagen");
      }

      alert("Foto erfolgreich hochgeladen!");

      setFile(null);
      setGuestName("");
    } catch (error) {
      console.error(error);

      alert("Fehler beim Upload.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">

      <Link
        href="/dashboard"
        className="absolute top-6 left-6 bg-white/70 backdrop-blur text-black px-4 py-2 rounded-xl font-semibold shadow-lg hover:bg-white"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/40">

        <h1 className="text-3xl font-bold mb-2 text-center text-black">
          Foto hochladen
        </h1>

        <p className="text-center text-neutral-700 mb-6">
          Teile deinen schönsten Moment ✨
        </p>

        <input
          type="text"
          placeholder="Dein Name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full mb-4 p-3 rounded-xl bg-white/80 border border-neutral-300 text-black"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
          className="w-full mb-5 text-black"
        />

        <button
          onClick={uploadPhoto}
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded-xl font-bold hover:bg-neutral-800 transition disabled:opacity-50"
        >
          {loading
            ? "Lade hoch..."
            : "Foto hochladen"}
        </button>

        <Link
          href={`/gallery/${weddingId}`}
          className="block mt-4 text-center bg-[#d4b06a] text-white p-4 rounded-xl font-bold hover:opacity-90 transition"
        >
          Zur Bildergalerie
        </Link>

      </div>
    </main>
  );
}