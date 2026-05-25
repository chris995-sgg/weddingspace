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
        Lade Hochzeit...
      </main>
    );
  }

  if (!wedding) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        Hochzeit nicht gefunden
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-4xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-block mb-6 text-neutral-400 hover:text-white"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="bg-neutral-900 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">
            Hochzeit bearbeiten
          </h1>

          <p className="text-neutral-400 mb-8">
            Besitzer: {wedding.ownerEmail}
          </p>

          <div className="mb-6">
            <label className="block mb-2 text-sm text-neutral-400">
              Name der Hochzeit
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
              placeholder="z. B. Lisa & Tom"
            />
          </div>

          <button
            onClick={saveTitle}
            disabled={saving}
            className="bg-white text-black px-5 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Namen speichern"}
          </button>
        </div>
      </div>
    </main>
  );
}