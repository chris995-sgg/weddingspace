"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";

import {
  collection,
  doc,
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

  const [visibleCount, setVisibleCount] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] =
    useState<Photo | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] =
    useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  const [galleryVisibilityMode, setGalleryVisibilityMode] =
  useState<"instant" | "date">("instant");

const [galleryRevealAt, setGalleryRevealAt] =
  useState<Date | null>(null);

const [now, setNow] = useState(new Date());

  const selectedIndex = photos.findIndex(
    (photo) => photo.id === selectedPhoto?.id
  );

  const shouldBlurPhotos =
  galleryVisibilityMode === "date" &&
  galleryRevealAt !== null &&
  now < galleryRevealAt;

  useEffect(() => {
    if (photos.length === 0) {
      setVisibleCount(0);
      return;
    }

    let cancelled = false;

    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    async function preloadImage(url: string) {
      for (let attempt = 1; attempt <= 10; attempt++) {
        const success = await new Promise<boolean>((resolve) => {
          const img = new Image();

          img.decoding = "async";

          const timeout = setTimeout(() => {
            resolve(false);
          }, 1000);

          img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
          };

          img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };

          img.src = url;
        });

        if (success) return;

        if (attempt < 10) {
          await wait(5);
        }
      }
    }

    async function loadImages() {
      setVisibleCount(0);

      for (let i = 0; i < photos.length; i += 8) {
        if (cancelled) return;

        const batch = photos.slice(i, i + 8);

        await Promise.all(
          batch.map((photo) =>
            preloadImage(photo.imageUrl)
          )
        );

        if (cancelled) return;

        setVisibleCount((prev) =>
          Math.min(prev + batch.length, photos.length)
        );

        await wait(10);
      }
    }

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [photos]);

useEffect(() => {
  const weddingRef = doc(db, "weddings", weddingId);

  const unsubscribe = onSnapshot(weddingRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    setGalleryVisibilityMode(
      data.galleryVisibilityMode || "instant"
    );

    setGalleryRevealAt(
      data.galleryRevealAt?.toDate
        ? data.galleryRevealAt.toDate()
        : null
    );
  });

  return () => unsubscribe();
}, [weddingId]);

useEffect(() => {
  const interval = setInterval(() => {
    setNow(new Date());
  }, 30000);

  return () => clearInterval(interval);
}, []);

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
          className="absolute top-6 left-6 bg-white/50 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="bg-white/50 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50">
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

        <div className="mb-8"></div>

        {photos.length === 0 ? (
          <div className="mb-8">
            <div className="bg-white/50 backdrop-blur rounded-[1.5rem] p-6 shadow-2xl border border-white/50 text-center">
              <p className="text-[#6b5c4d]">
                Noch keine Fotos hochgeladen.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
            {photos.slice(0, visibleCount).map((photo) => {
              const isSelected =
                selectedPhotoIds.includes(photo.id);

              return (
                <div key={photo.id} className="relative">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="w-full max-h-[65vh] md:max-h-[75vh] object-contain rounded-[1.5rem] bg-black/30"
                  >
                  <img
                    src={photo.imageUrl}
                    loading="eager"
                    decoding="async"
                    alt=""
                    className={`w-full h-64 object-cover rounded-2xl transition ${
                      shouldBlurPhotos ? "blur-sm" : ""
                    }`}

                    />
                    {shouldBlurPhotos && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl pointer-events-none">
                        <p className="bg-white/85 text-[#3b3128] px-3 py-2 rounded-xl text-xs font-bold shadow">
                          Bald sichtbar
                        </p>
                      </div>
                    )}

                  </button>

                  <button
                    onClick={() =>
                      togglePhotoSelection(photo.id)
                    }
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
                className={`max-w-full max-h-[62vh] md:max-h-[78vh] object-contain rounded-[1.5rem] shadow-2xl transition ${
                  shouldBlurPhotos ? "blur-sm" : ""
                }`}
              />

              {!shouldBlurPhotos && (
                <a
                  href={selectedPhoto.imageUrl}
                  download
                  target="_blank"
                  className="mt-4 w-full max-w-md text-center bg-[#d4b06a] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
                >
                  Foto herunterladen
                </a>
              )}
          </div>
        </div>
      )}
    </main>
  );
}