"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Wedding = {
  title: string;
  ownerEmail?: string;
};

export default function WeddingPage() {
  const params = useParams();
  const weddingId = params.id as string;
  const router = useRouter();

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

  async function deleteEvent() {
  const confirmed = confirm(
    "Möchtest du dieses Event wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
  );

  if (!confirmed) return;

  try {
    const docRef = doc(db, "weddings", weddingId);

    await deleteDoc(docRef);

    alert("Event wurde gelöscht.");
    router.push("/dashboard");
  } catch (error) {
    console.error(error);
    alert("Event konnte nicht gelöscht werden.");
  }
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
   <main className="min-h-screen flex items-center justify-center p-6 relative text-black">

    <Link
         href="/dashboard"
         className="absolute top-6 left-6 bg-white/50 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
           >
         ← Zurück zum Dashboard
     </Link>


  <div className="w-full max-w-md bg-white/50 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50">

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

      <button
        onClick={deleteEvent}
        className="block mt-4 bg-red-700 text-white px-5 py-3 rounded-2xl font-bold hover:bg-red-800 transition shadow-lg"
      >
        Event löschen
      </button>

    
  </div>
</main>
  );
}