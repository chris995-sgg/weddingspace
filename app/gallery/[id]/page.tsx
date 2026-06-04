"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

type Photo = {
  id: string;
  imageUrl: string;
  guestName: string;
};

type ImageLoadReport = {
  photoId: string;
  guestName: string;
  url: string;
  success: boolean;
  attempts: number;
  durationMs: number;
  firstFailureReason: string;
};

export default function GalleryPage() {
  const params = useParams();

  const weddingId = params.id as string;

  const [visibleCount, setVisibleCount] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [selectedPhoto, setSelectedPhoto] =
    useState<Photo | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] =
    useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showInitialLoader, setShowInitialLoader] =
    useState(true);

  const [imageLoadReports, setImageLoadReports] =
    useState<ImageLoadReport[]>([]);
  const [showLoadReport, setShowLoadReport] =
    useState(false);
  const [
    totalImageLoadDurationMs,
    setTotalImageLoadDurationMs,
  ] = useState(0);

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  const galleryRevealDateText = galleryRevealAt
    ? galleryRevealAt.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    async function preloadImage(
      photo: Photo
    ): Promise<ImageLoadReport> {
      const startTime = performance.now();
      let firstFailureReason = "";

      for (let attempt = 1; attempt <= 5; attempt++) {
        const result = await new Promise<{
          success: boolean;
          reason: string;
        }>((resolve) => {
          const img = new Image();

          img.decoding = "async";

          const timeout = setTimeout(() => {
            resolve({
              success: false,
              reason: `Versuch ${attempt}: Timeout nach 1500 ms`,
            });
          }, 1500);

          img.onload = () => {
            clearTimeout(timeout);
            resolve({
              success: true,
              reason: "",
            });
          };

          img.onerror = () => {
            clearTimeout(timeout);
            resolve({
              success: false,
              reason: `Versuch ${attempt}: Browser konnte Bild nicht laden`,
            });
          };

          img.src = photo.imageUrl;
        });

        if (result.success) {
          return {
            photoId: photo.id,
            guestName: photo.guestName || "Gast",
            url: photo.imageUrl,
            success: true,
            attempts: attempt,
            durationMs: Math.round(
              performance.now() - startTime
            ),
            firstFailureReason:
              firstFailureReason || "Kein Fehlversuch",
          };
        }

        if (!firstFailureReason) {
          firstFailureReason = result.reason;
        }

        if (attempt < 5) {
          await wait(50);
        }
      }

      return {
        photoId: photo.id,
        guestName: photo.guestName || "Gast",
        url: photo.imageUrl,
        success: false,
        attempts: 10,
        durationMs: Math.round(performance.now() - startTime),
        firstFailureReason:
          firstFailureReason || "Unbekannter Fehler",
      };
    }

    async function loadImages() {
      setVisibleCount(0);
      setShowInitialLoader(true);
      setShowLoadReport(false);
      setImageLoadReports([]);
      setTotalImageLoadDurationMs(0);

      if (photos.length === 0) {
        setShowInitialLoader(false);
        return;
      }

      const totalStartTime = performance.now();
      const reports: ImageLoadReport[] = [];

      for (let i = 0; i < photos.length; i += 6) {
        if (cancelled) return;

        const batch = photos.slice(i, i + 6);

        const batchReports = await Promise.all(
          batch.map((photo) => preloadImage(photo))
        );

        reports.push(...batchReports);

        if (cancelled) return;

        setVisibleCount((prev) => {
          const next = Math.min(
            prev + batch.length,
            photos.length
          );

          if (next >= Math.min(6, photos.length)) {
            setShowInitialLoader(false);
          }

          return next;
        });

        await wait(50);
      }

      if (cancelled) return;

      setImageLoadReports(reports);
      setTotalImageLoadDurationMs(
        Math.round(performance.now() - totalStartTime)
      );
      setShowLoadReport(true);
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

      setEventTitle(data.title || "Galerie");

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
    if (selectedPhoto || showLoadReport) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedPhoto, showLoadReport]);

  function showNextPhoto() {
    if (selectedIndex === -1) return;

    const nextIndex = (selectedIndex + 1) % photos.length;

    setSelectedPhoto(photos[nextIndex]);
  }

  function showPreviousPhoto() {
    if (selectedIndex === -1) return;

    const previousIndex =
      (selectedIndex - 1 + photos.length) % photos.length;

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
    <main className="min-h-[100dvh] flex items-start md:items-center justify-center pt-28 md:pt-28 p-6 relative text-black">
      {showInitialLoader && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/70 backdrop-blur-md text-[#3b3128]">
          <div className="h-14 w-14 rounded-full border-4 border-[#c8ad72] border-t-transparent animate-spin mb-5"></div>

          <p className="text-lg font-bold">
            Galerie wird geladen...
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {isLoggedIn && (
          <Link
            href="/dashboard"
            className="absolute top-6 left-6 bg-white/50 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
          >
            ← Zurück zum Dashboard
          </Link>
        )}

        <div className="w-full max-w-md md:mx-auto bg-white/50 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">
          <div className="mb-6 flex justify-center items-center">
            <div className="w-20 h-px bg-[#c8ad72]"></div>
            <span className="mx-4 text-[#c8ad72] text-xl">
              ♥
            </span>
            <div className="w-20 h-px bg-[#c8ad72]"></div>
          </div>

          <h1 className="font-elegant text-4xl font-medium text-[#3b3128] leading-tight tracking-wide">
            {eventTitle}
          </h1>

          <p className="font-elegant text-4xl font-medium text-[#3b3128] mt-3 mb-8 tracking-wide">
            Galerie
          </p>

          <div className="flex flex-col items-center gap-5">
            <button
              onClick={downloadSelectedPhotos}
              disabled={
                downloading || selectedPhotoIds.length === 0
              }
              className="w-full bg-white/60 text-[#3b3128] border border-[#d8cfc3] px-6 py-4 rounded-2xl font-bold hover:bg-white/80 transition disabled:opacity-50 shadow-lg flex items-center justify-center gap-4"
            >
              {downloading
                ? "Erstelle ZIP..."
                : `${selectedPhotoIds.length} herunterladen`}
            </button>

            <Link
              href={`/upload/${weddingId}`}
              className="w-full bg-[#c8ad72] text-white px-6 py-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-4"
            >
              Foto hochladen
            </Link>
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
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              {photos.slice(0, visibleCount).map((photo) => {
                const isSelected =
                  selectedPhotoIds.includes(photo.id);

                return (
                  <div key={photo.id} className="relative">
                    <button
                      onClick={() => setSelectedPhoto(photo)}
                      className="w-full rounded-[1.5rem] bg-black/30 overflow-hidden"
                    >
                  <img
                    src={photo.imageUrl}
                    loading="eager"
                    decoding="async"
                    alt=""
                    onError={(e) => {
                      const img = e.currentTarget;
                      const currentRetry = Number(img.dataset.retry || "0");

                      if (currentRetry >= 5) return;

                      img.dataset.retry = String(currentRetry + 1);

                      setTimeout(() => {
                        img.src = `${photo.imageUrl}${
                          photo.imageUrl.includes("?") ? "&" : "?"
                        }retry=${Date.now()}`;
                      }, 200);
                    }}
                    className={`w-full h-64 object-cover rounded-2xl transition ${
                      shouldBlurPhotos ? "blur-sm" : ""
                    }`}
                  />
                      {shouldBlurPhotos && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl pointer-events-none">
                          <div className="bg-white/85 text-[#3b3128] px-3 py-2 rounded-xl text-xs font-bold shadow text-center">
                            <p>Sichtbar ab</p>
                            <p>{galleryRevealDateText} Uhr</p>
                          </div>
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        togglePhotoSelection(photo.id)
                      }
                      className={`absolute top-3 right-3 w-7 h-7 rounded-full shadow-lg border-2 ${
                        isSelected
                          ? "bg-[#c8ad72] border-white"
                          : "bg-white/80 border-white"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </button>

                    <p className="mt-2 text-center text-sm text-[#6b5c4d]">
                      {photo.guestName || "Gast"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              {visibleCount < photos.length ? (
                <p className="text-[#3b3128]/70 font-semibold">
                  Weitere Bilder werden geladen...
                </p>
              ) : (
                <p className="text-[#3b3128]/70 font-semibold">
                  Alle Bilder geladen
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {showLoadReport && (
        <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white rounded-[2rem] p-6 shadow-2xl text-[#3b3128]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold">
                  Bilder-Ladebericht
                </h2>

                <p className="text-sm text-[#6b5c4d] mt-1">
                  Gesamtzeit: {totalImageLoadDurationMs} ms
                </p>

                <p className="text-sm text-[#6b5c4d]">
                  Bilder: {imageLoadReports.length}
                </p>
              </div>

              <button
                onClick={() => setShowLoadReport(false)}
                className="bg-[#c8ad72] text-white px-4 py-2 rounded-2xl font-bold"
              >
                Schließen
              </button>
            </div>

            <div className="space-y-4">
              {imageLoadReports.map((report, index) => (
                <div
                  key={report.photoId}
                  className="bg-[#f7f1e8] border border-[#e0d4c3] rounded-2xl p-4"
                >
                  <p className="font-bold">
                    Bild {index + 1} — {report.guestName}
                  </p>

                  <p className="text-sm mt-1">
                    Status:{" "}
                    <span
                      className={
                        report.success
                          ? "text-green-700"
                          : "text-red-700"
                      }
                    >
                      {report.success
                        ? "geladen"
                        : "fehlgeschlagen"}
                    </span>
                  </p>

                  <p className="text-sm">
                    Ladezeit: {report.durationMs} ms
                  </p>

                  <p className="text-sm">
                    Versuche: {report.attempts}
                  </p>

                  <p className="text-sm">
                    Erster Fehlversuch:{" "}
                    {report.firstFailureReason}
                  </p>

                  <p className="text-xs mt-2 break-all text-[#6b5c4d]">
                    {report.url}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                className="block mt-4 text-center bg-[#c8ad72] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
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