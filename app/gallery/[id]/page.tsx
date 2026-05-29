"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { db } from "@/lib/firebase";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { useParams } from "next/navigation";

type Photo = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  guestName: string;
};


export default function GalleryPage() {
  const params = useParams();

  const weddingId = params.id as string;
  const [visibleCount, setVisibleCount] = useState(0);
  const [preloadedOriginals, setPreloadedOriginals] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] =
    useState<Photo | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const selectedIndex = photos.findIndex(
    (photo) => photo.id === selectedPhoto?.id
  );

  
const [loadReport, setLoadReport] = useState<
  {
    index: number;
    url: string;
    ok: boolean;
    attempts: {
      attempt: number;
      startedAt: string;
      endedAt: string;
      reason: string;
    }[];
  }[]

  
>([]);


useEffect(() => {
  if (photos.length === 0) return;

  let cancelled = false;

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  async function preloadWithRetries(url: string) {
    const attempts: {
      attempt: number;
      startedAt: string;
      endedAt: string;
      reason: string;
    }[] = [];

    for (let attempt = 1; attempt <= 5; attempt++) {
      const startedAt = new Date().toLocaleTimeString();

      const result = await new Promise<{
        ok: boolean;
        reason: string;
      }>((resolve) => {
        const img = new Image();

        img.decoding = "async";

        const timeout = setTimeout(() => {
          resolve({
            ok: false,
            reason: "Timeout nach 200ms",
          });
        }, 200);

        img.onload = () => {
          clearTimeout(timeout);
          resolve({
            ok: true,
            reason: "Erfolgreich geladen",
          });
        };

        img.onerror = () => {
          clearTimeout(timeout);
          resolve({
            ok: false,
            reason: "Fehler beim Laden",
          });
        };

        img.src = url;
      });

      const endedAt = new Date().toLocaleTimeString();

      attempts.push({
        attempt,
        startedAt,
        endedAt,
        reason: result.reason,
      });

      if (result.ok) {
        return {
          ok: true,
          attempts,
        };
      }

      if (attempt < 5) {
        await wait(50);
      }
    }

    return {
      ok: false,
      attempts,
    };
  }

  async function loadImagesLazyStyle() {
    setVisibleCount(0);
    setPreloadedOriginals(false);
    setLoadReport([]);

    const report: {
      index: number;
      url: string;
      ok: boolean;
      attempts: {
        attempt: number;
        startedAt: string;
        endedAt: string;
        reason: string;
      }[];
    }[] = [];

    for (let i = 0; i < photos.length; i++) {
      if (cancelled) return;

      const photo = photos[i];
      const url = photo.thumbnailUrl || photo.imageUrl;

      const result = await preloadWithRetries(url);

      report.push({
        index: i + 1,
        url,
        ok: result.ok,
        attempts: result.attempts,
      });

      if (cancelled) return;

      setVisibleCount((prev) =>
        Math.min(prev + 1, photos.length)
      );

      await wait(10);
    }

    if (!cancelled) {
      setLoadReport(report);
    }
  }

  loadImagesLazyStyle();

  return () => {
    cancelled = true;
  };
}, [photos]);

  useEffect(() => {
  const q = query(
    collection(db, "weddings", weddingId, "photos"),
    orderBy("createdAt", "desc")
  );

  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const photoList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Photo[];

    setPhotos(photoList);
  });

  return () => unsubscribe();
  }, [weddingId]);

  useEffect(() => {
  if (selectedPhoto) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }

  return () => {
    document.body.style.overflow = "auto";
  };
  }, [selectedPhoto]);

  function showNextPhoto() {
    if (selectedIndex === -1) return;

    const nextIndex =
      (selectedIndex + 1) % photos.length;

    setSelectedPhoto(photos[nextIndex]);
  }

  function showPreviousPhoto() {
    if (selectedIndex === -1) return;

    const previousIndex =
      (selectedIndex - 1 + photos.length) %
      photos.length;

    setSelectedPhoto(photos[previousIndex]);
  }

  function togglePhotoSelection(photoId: string) {
  setSelectedPhotoIds((prev) =>
    prev.includes(photoId)
      ? prev.filter((id) => id !== photoId)
      : [...prev, photoId]
  );
}

async function downloadSelectedPhotos() {
  if (selectedPhotoIds.length === 0) {
    alert("Bitte wähle mindestens ein Foto aus.");
    return;
  }

  setDownloading(true);

  try {
    const selectedPhotos = photos.filter((photo) =>
      selectedPhotoIds.includes(photo.id)
    );

    const response = await fetch("/api/download-photos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        photos: selectedPhotos,
      }),
    });

    if (!response.ok) {
      throw new Error("Download fehlgeschlagen.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "weddingspace-fotos.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 4000);
  } catch (error) {
    console.error(error);
    alert("Download fehlgeschlagen.");
  }

  setDownloading(false);
}

return (


  <main className="min-h-screen pt-24 p-6 relative text-[#3b3128] overflow-x-hidden">

    <div className="max-w-7xl mx-auto">

        <Link
         href="/dashboard"
         className="absolute top-6 left-6 bg-white/60 backdrop-blur-xl text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
           >
         ← Zurück zum Dashboard
         </Link>

      <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-4 md:p-6 border border-white/20 mt-16 md:mt-0">

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          <h1 className="text-3xl font-bold text-center text-[#3b3128]">
            WeddingSpace Galerie
          </h1>

<div className="flex flex-col md:flex-row gap-3">

  <button
    onClick={downloadSelectedPhotos}
    disabled={
      downloading ||
      selectedPhotoIds.length === 0
    }
    className="bg-[#3b3128] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#2d241d] transition disabled:opacity-50 shadow-lg"
  >
    {downloading
      ? "Erstelle ZIP..."
      : `${selectedPhotoIds.length} herunterladen`}
  </button>

  <Link
    href={`/upload/${weddingId}`}
    className="bg-[#d4b06a] text-white px-5 py-3 rounded-2xl font-bold hover:opacity-90 transition shadow-lg text-center"
  >
    Foto hochladen
  </Link>

</div>

        </div>

      </div>

      {photos.length === 0 ? (

        <div className="bg-white/55 backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">

          <p className="text-[#6b5c4d]">
            Noch keine Fotos hochgeladen.
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">

{photos.slice(0, visibleCount).map((photo) => {
  const isSelected = selectedPhotoIds.includes(photo.id);

  return (
    <div key={photo.id} className="relative">
      <button
        onClick={() => setSelectedPhoto(photo)}
        className="w-full max-h-[65vh] md:max-h-[75vh] object-contain rounded-[1.5rem] bg-black/30"
      >
<img
  src={photo.thumbnailUrl || photo.imageUrl}
  loading="lazy"
  decoding="async"
  alt=""
  onError={(e) => {
    const img = e.currentTarget;

    if (
      photo.thumbnailUrl &&
      img.src === photo.thumbnailUrl
    ) {
      img.src = photo.imageUrl;
    }
  }}
  className="w-full h-64 object-cover"



    />
      </button>

      <button
        onClick={() => togglePhotoSelection(photo.id)}
        className={`absolute top-3 right-3 w-7 h-7 rounded-full shadow-lg border-2 ${
          isSelected
            ? "bg-[#d4b06a] border-white"
            : "bg-white/80 border-white"
        }`}
      >
        {isSelected ? "✓" : ""}
      </button>

      <p className="mt-2 text-center text-sm text-[#6b5c4d]">
        {photo.guestName}
      </p>
    </div>
  );
})}

        </div>
      )}
    </div>

    {selectedPhoto && (
  <div className="fixed inset-0 bg-black/85 z-50 overflow-hidden flex items-center justify-center px-4 pt-24 pb-28 md:py-8">
    <button
      onClick={showPreviousPhoto}
      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-[#3b3128] w-14 h-14 rounded-full text-3xl font-bold z-50 shadow-xl border border-white/50 hover:bg-white transition"
    >
      ←
    </button>

    <button
      onClick={showNextPhoto}
      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-[#3b3128] w-14 h-14 rounded-full text-3xl font-bold z-50 shadow-xl border border-white/50 hover:bg-white transition"
    >
      →
    </button>

    <div className="w-full max-w-5xl flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-4">
        <p className="text-white text-sm">
          Hochgeladen von {selectedPhoto.guestName}
        </p>

        <button
          onClick={() => setSelectedPhoto(null)}
          className="bg-white/90 text-[#3b3128] px-4 py-2 rounded-2xl font-bold shadow-lg"
        >
          Schließen
        </button>
      </div>

      <img
        src={selectedPhoto.imageUrl}
        alt=""
        className="max-w-full max-h-[62vh] md:max-h-[78vh] object-contain rounded-[1.5rem] shadow-2xl"
      />

      <a
        href={selectedPhoto.imageUrl}
        download
        target="_blank"
        className="mt-4 w-full max-w-md text-center bg-[#d4b06a] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
      >
        Foto herunterladen
      </a>
    </div>
  </div>
)}
   

{loadReport.length > 0 && (
  <div className="fixed bottom-6 right-6 z-50 max-w-xl max-h-96 overflow-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-4 text-sm text-[#3b3128]">
    <h2 className="font-bold text-lg mb-3">
      Ladebericht
    </h2>

    <div className="space-y-4">
      {loadReport.map((item) => (
        <div
          key={`${item.index}-${item.url}`}
          className="border-b border-[#ddd] pb-3"
        >
          <p className="font-semibold">
            Bild {item.index} — {item.ok ? "OK" : "Fehlgeschlagen"}
          </p>

          <p className="text-xs break-all opacity-70 mb-2">
            {item.url}
          </p>

          {item.attempts.map((attempt) => (
            <div
              key={attempt.attempt}
              className="ml-2 mb-2 rounded-xl bg-black/5 p-2"
            >
              <p>Versuch {attempt.attempt}</p>
              <p>Start: {attempt.startedAt}</p>
              <p>Ende: {attempt.endedAt}</p>
              <p>Ursache: {attempt.reason}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)}

  </main>
);
}