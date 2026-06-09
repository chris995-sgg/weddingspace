"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Wedding = {
  title: string;
  ownerEmail?: string;
  galleryEnabled?: boolean;
  rsvpEnabled?: boolean;
  galleryVisibilityMode?: "instant" | "date";
  galleryRevealAt?: {
    toDate: () => Date;
  } | null;
};

export default function WeddingPage() {
  const params = useParams();
  const weddingId = params.id as string;
  const router = useRouter();

const [wedding, setWedding] = useState<Wedding | null>(null);
const [title, setTitle] = useState("");
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [galleryEnabled, setGalleryEnabled] = useState(true);
const [rsvpEnabled, setRsvpEnabled] = useState(true);


const [galleryVisibilityMode, setGalleryVisibilityMode] =
  useState<"instant" | "date">("instant");

const [galleryRevealAt, setGalleryRevealAt] = useState("");

  useEffect(() => {
    async function loadWedding() {
      try {
        const docRef = doc(db, "weddings", weddingId);
        const snapshot = await getDoc(docRef);

       if (snapshot.exists()) {
  const data = snapshot.data() as Wedding;

  setGalleryEnabled(data.galleryEnabled ?? true);
  setRsvpEnabled(data.rsvpEnabled ?? true);


  setWedding(data);
  setTitle(data.title);

  setGalleryVisibilityMode(
    data.galleryVisibilityMode || "instant"
  );

  if (data.galleryRevealAt?.toDate) {
    const date = data.galleryRevealAt.toDate();

    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setGalleryRevealAt(localDate);
  }
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

  if (galleryVisibilityMode === "date" && !galleryRevealAt) {
    alert("Bitte wähle ein Datum aus.");
    return;
  }

  setSaving(true);

  try {
    const docRef = doc(db, "weddings", weddingId);

    await updateDoc(docRef, {
      title: title.trim(),
      galleryVisibilityMode,
      galleryRevealAt:
        galleryVisibilityMode === "date"
          ? Timestamp.fromDate(new Date(galleryRevealAt))
          : null,

    galleryEnabled,
    rsvpEnabled,

    });

setWedding((prev) =>
  prev
    ? {
        ...prev,
        title: title.trim(),
        galleryVisibilityMode,
        galleryEnabled,
        rsvpEnabled,
        galleryRevealAt:
          galleryVisibilityMode === "date"
            ? Timestamp.fromDate(new Date(galleryRevealAt))
            : null,
      }
    : prev
);

    alert("Einstellungen gespeichert!");
  } catch (error) {
    console.error(error);
    alert("Einstellungen konnten nicht gespeichert werden.");
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
   <main className="min-h-screen flex justify-center p-6 pt-28 md:pt-6 relative text-black">

    <Link
      href="/dashboard"
      className="absolute top-6 left-6 z-50 bg-white/50 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
    >
      ← Zurück zum Dashboard
</Link>


<div className="w-full max-w-md bg-white/50 backdrop-blur rounded-[2rem] p-5 md:p-8 shadow-lg border border-white/50">

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
          className="w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#c8ad72]"
          placeholder="z. B. Lisa & Tom"
        />

      </div>

<div className="mb-6 bg-white/50 rounded-[1.5rem] p-4 md:p-5 border border-white/50 shadow-lg overflow-hidden">
  <h2 className="text-xl font-bold mb-2 text-[#3b3128]">
    Galerie-Sichtbarkeit
  </h2>

  <p className="text-[#6b5c4d] mb-5 text-sm">
    Lege fest, ob Gäste die hochgeladenen Bilder sofort sehen können
    oder erst ab einem bestimmten Datum.
  </p>


<div className="space-y-4">
  <button
    type="button"
    onClick={() => setGalleryVisibilityMode("instant")}
    className="w-full flex items-center justify-between gap-4 bg-white/70 p-4 rounded-2xl border border-white/50 cursor-pointer text-left"
  >
    <span className="font-semibold text-[#3b3128]">
      Bilder sofort sichtbar
    </span>

    <span
      className={`h-8 w-8 min-w-8 min-h-8 shrink-0 aspect-square rounded-full border-4 shadow-md transition ${
        galleryVisibilityMode === "instant"
          ? "bg-[#c8ad72] border-[#c8ad72]"
          : "bg-white border-[#c8ad72]"
      }`}
    />
  </button>

  <button
    type="button"
    onClick={() => setGalleryVisibilityMode("date")}
    className="w-full flex items-center justify-between gap-4 bg-white/70 p-4 rounded-2xl border border-white/50 cursor-pointer text-left"
  >
    <span className="font-semibold text-[#3b3128]">
      Bilder erst ab Datum sichtbar
    </span>

    <span
      className={`h-8 w-8 min-w-8 min-h-8 shrink-0 aspect-square rounded-full border-4 shadow-md transition ${
        galleryVisibilityMode === "date"
          ? "bg-[#c8ad72] border-[#c8ad72]"
          : "bg-white border-[#c8ad72]"
      }`}
    />
  </button>
</div>

  {galleryVisibilityMode === "date" && (
    <div className="mt-5">
      <label className="block mb-2 text-sm text-[#6b5c4d]">
        Bilder sichtbar ab
      </label>

  <div className="w-full flex justify-start">
  <input
    type="datetime-local"
    value={galleryRevealAt}
    onChange={(e) => setGalleryRevealAt(e.target.value)}
    className="w-[250px] md:w-full max-w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-3 py-3 text-[#3b3128] text-base outline-none focus:ring-2 focus:ring-[#c8ad72]"
  />
</div>



    </div>
  )}
</div>

<div className="mb-6 bg-white/50 rounded-[1.5rem] p-4 md:p-5 border border-white/50 shadow-lg overflow-hidden">
  <h2 className="text-xl font-bold text-[#3b3128] mb-5">
    Funktionen
  </h2>

  <div className="space-y-4">
  <button
    type="button"
    onClick={() => setGalleryEnabled((prev) => !prev)}
    className="w-full flex items-center justify-between gap-4 bg-white/70 p-4 rounded-2xl border border-white/50 cursor-pointer text-left"
  >
    <div>
      <p className="font-bold text-[#3b3128]">
        Galerie & Foto-Upload
      </p>

      <p className="text-sm text-[#6b5c4d] mt-1">
        Gäste können Fotos hochladen und die Galerie ansehen.
      </p>
    </div>

    <span
      className={`h-8 w-8 min-w-8 min-h-8 shrink-0 aspect-square rounded-full border-4 shadow-md transition ${
        galleryEnabled
          ? "bg-[#c8ad72] border-[#c8ad72]"
          : "bg-white border-[#c8ad72]"
      }`}
    />
  </button>

  <button
    type="button"
    onClick={() => setRsvpEnabled((prev) => !prev)}
    className="w-full flex items-center justify-between gap-4 bg-white/70 p-4 rounded-2xl border border-white/50 cursor-pointer text-left"
  >
    <div>
      <p className="font-bold text-[#3b3128]">
        Rückmeldung
      </p>

      <p className="text-sm text-[#6b5c4d] mt-1">
        Gäste können zu- oder absagen und eine Nachricht hinterlassen.
      </p>
    </div>

    <span
      className={`h-8 w-8 min-w-8 min-h-8 shrink-0 aspect-square rounded-full border-4 shadow-md transition ${
        rsvpEnabled
          ? "bg-[#c8ad72] border-[#c8ad72]"
          : "bg-white border-[#c8ad72]"
      }`}
    />
  </button>
</div>

  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="rounded-2xl bg-white/50 border border-white/50 p-4">
      <p className="text-sm font-semibold text-[#6b5c4d]">
        Galerie:
        <span
          className={`ml-2 ${
            galleryEnabled ? "text-green-700" : "text-red-700"
          }`}
        >
          {galleryEnabled ? "Aktiv" : "Deaktiviert"}
        </span>
      </p>
    </div>

    <div className="rounded-2xl bg-white/50 border border-white/50 p-4">
      <p className="text-sm font-semibold text-[#6b5c4d]">
        Rückmeldung:
        <span
          className={`ml-2 ${
            rsvpEnabled ? "text-green-700" : "text-red-700"
          }`}
        >
          {rsvpEnabled ? "Aktiv" : "Deaktiviert"}
        </span>
      </p>
    </div>
  </div>
</div>

<div className="mt-6">
      <button
        onClick={saveTitle}
        disabled={saving}
        className="bg-[#3b3128] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#2d241d] transition disabled:opacity-50 shadow-lg"
      >
      {saving ? "Speichert..." : "Einstellungen speichern"}
      </button>

      <button
        onClick={deleteEvent}
        className="block mt-4 bg-red-700 text-white px-5 py-3 rounded-2xl font-bold hover:bg-red-800 transition shadow-lg"
      >
        Event löschen
      </button>
      </div>

    
  </div>
</main>
  );
}