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
  guestName: string;
};

export default function GalleryPage() {
  const params = useParams();

  const weddingId = params.id as string;

  const [photos, setPhotos] = useState<Photo[]>([]);

  const [selectedPhoto, setSelectedPhoto] =
    useState<Photo | null>(null);

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  const selectedIndex = photos.findIndex(
    (photo) => photo.id === selectedPhoto?.id
  );

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
    const zip = new JSZip();

    const selectedPhotos = photos.filter((photo) =>
      selectedPhotoIds.includes(photo.id)
    );

    for (const photo of selectedPhotos) {
      const response = await fetch(photo.imageUrl);
      const blob = await response.blob();

      zip.file(`${photo.guestName}-${photo.id}.jpg`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });

    const url = URL.createObjectURL(zipBlob);

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
  window.open(url, "_blank");
} else {
  const link = document.createElement("a");
  link.href = url;
  link.download = "weddingspace-fotos.zip";
  link.click();
}

setTimeout(() => {
  URL.revokeObjectURL(url);
}, 5000);

  } catch (error) {
    console.error(error);
    alert("Download fehlgeschlagen.");
  }

  setDownloading(false);
}

return (
  <main className="min-h-screen pt-24 p-6 relative text-[#3b3128]">

    <div className="max-w-7xl mx-auto">

        <Link
         href="/dashboard"
         className="absolute top-6 left-6 bg-white/60 backdrop-blur-xl text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
           >
         ← Zurück zum Dashboard
         </Link>

      <div className="bg-white/55 backdrop-blur-2xl rounded-[2rem] p-6 shadow-2xl border border-white/50 mb-8">

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

{photos.map((photo) => {
  const isSelected = selectedPhotoIds.includes(photo.id);

  return (
    <div key={photo.id} className="relative">
      <button
        onClick={() => setSelectedPhoto(photo)}
        className="w-full overflow-hidden rounded-[1.5rem] shadow-xl hover:scale-[1.02] transition bg-transparent"
      >
        <img
          src={photo.imageUrl}
          loading="lazy"
          alt=""
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
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">

        <div className="max-w-6xl w-full relative">

          <button
            onClick={showPreviousPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-[#3b3128] w-14 h-14 rounded-full text-3xl font-bold z-50 shadow-xl border border-white/50 hover:bg-white transition"
          >
            ←
          </button>

          <button
            onClick={showNextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur text-[#3b3128] w-14 h-14 rounded-full text-3xl font-bold z-50 shadow-xl border border-white/50 hover:bg-white transition"
          >
            →
          </button>

          <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/20">

            <div className="flex justify-between items-center mb-4">

              <p className="text-white">
                Hochgeladen von {selectedPhoto.guestName}
              </p>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="bg-white/80 backdrop-blur text-[#3b3128] px-4 py-2 rounded-2xl font-bold shadow-lg border border-white/40 hover:bg-white transition"
              >
                Schließen
              </button>

            </div>

            <img
              src={selectedPhoto.imageUrl}
              alt=""
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-3xl shadow-2xl"
            />

            <a
              href={selectedPhoto.imageUrl}
              download
              target="_blank"
              className="block mt-4 text-center bg-[#d4b06a] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
            >
              Foto herunterladen
            </a>

          </div>

        </div>
      </div>
    )}
  </main>
);
}