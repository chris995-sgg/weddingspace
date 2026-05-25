"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import Link from "next/link";

type Wedding = {
  title: string;
  ownerEmail?: string;
};

export default function WeddingPage() {
  const params = useParams();
  const weddingId = params.id as string;

  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadWedding() {
      try {
        const docRef = doc(db, "weddings", weddingId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as Wedding;
          setWedding(data);
          setTitle(data.title);
        }
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    }

    loadWedding();
  }, [weddingId]);

  async function saveTitle() {
    if (!title.trim()) {
      alert("Bitte gib einen Namen ein.");
      return;
    }

    setSaving(true);

    try {
      const docRef = doc(db, "weddings", weddingId);

      await updateDoc(docRef, {
        title: title.trim(),
      });

      setWedding((prev) =>
        prev ? { ...prev, title: title.trim() } : prev
      );

      alert("Name gespeichert!");
    } catch (error) {
      console.error(error);
      alert("Name konnte nicht gespeichert werden.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        Lade Event...
      </main>
    );
  }

  if (!wedding) {
    return (
      <main className="min-h-screen p-6 relative text-[#3b3128]">
        Event nicht gefunden
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 relative text-[#3b3128]">
  <div className="max-w-4xl mx-auto">

    <Link
      href="/dashboard"
      className="inline-block mb-6 bg-white/60 backdrop-blur-xl text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
    >
      ← Zurück zum Dashboard
    </Link>

    <div className="bg-white/55 backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl border border-white/50">

      <h1 className="text-4xl font-bold mb-2 text-[#3b3128]">
        Event bearbeiten
      </h1>

      <p className="text-[#6b5c4d] mb-8">
        Besitzer: {wedding.ownerEmail}
      </p>

      <div className="mb-6">

        <label className="block mb-2 text-sm text-[#6b5c4d]">
          Name des Events
        </label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#d4b06a]"
          placeholder="z. B. Lisa & Tom"
        />

      </div>

      <button
        onClick={saveTitle}
        disabled={saving}
        className="bg-[#3b3128] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#2d241d] transition disabled:opacity-50 shadow-lg"
      >
        {saving ? "Speichert..." : "Namen speichern"}
      </button>

    </div>
  </div>
</main>
  );
}