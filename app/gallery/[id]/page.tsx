"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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

type ImageLoadReport = {
  photoId: string;
  guestName: string;
  success: boolean;
  attempts: number;
};

const CONCURRENT_LOADS = 20;

const PRELOAD_ATTEMPTS = 20;
const PRELOAD_TIMEOUT_MS = 1200;
const PRELOAD_RETRY_DELAY_MS = 50;

const FINAL_RETRY_CONCURRENT_LOADS = 4;
const FINAL_RETRY_ATTEMPTS = 20;
const FINAL_RETRY_TIMEOUT_MS = 1500;
const FINAL_RETRY_DELAY_MS = 200;

const VISIBLE_IMG_RETRIES = 5;
const VISIBLE_IMG_RETRY_DELAY_MS = 50;

export default function GalleryPage() {
  const params = useParams();

  const weddingId = params.id as string;

  const [displayedPhotoIds, setDisplayedPhotoIds] =
    useState<string[]>([]);

  const [completedImageCount, setCompletedImageCount] =
    useState(0);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const [eventTitle, setEventTitle] = useState("");
  const [galleryEnabled, setGalleryEnabled] = useState(true);

  const [selectedPhoto, setSelectedPhoto] =
    useState<Photo | null>(null);

  const [selectedPhotoIds, setSelectedPhotoIds] =
    useState<string[]>([]);

  const [downloading, setDownloading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showInitialLoader, setShowInitialLoader] =
    useState(true);

  const [sortGalleryByUploadDate, setSortGalleryByUploadDate] =
    useState(false);

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

  const shouldBlurPhotos =
    galleryVisibilityMode === "date" &&
    galleryRevealAt !== null &&
    now < galleryRevealAt;

  const galleryRevealDateText = galleryRevealAt
    ? galleryRevealAt.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const loadingFinished = imageLoadReports.length > 0;

  const loadedPhotosInLoadOrder = displayedPhotoIds
    .map((photoId) =>
      photos.find((photo) => photo.id === photoId)
    )
    .filter(Boolean) as Photo[];

  const loadedPhotosByUploadDate = photos.filter((photo) =>
    displayedPhotoIds.includes(photo.id)
  );

  const visiblePhotos = sortGalleryByUploadDate
    ? loadedPhotosByUploadDate
    : loadedPhotosInLoadOrder;

  const selectedIndex = visiblePhotos.findIndex(
    (photo) => photo.id === selectedPhoto?.id
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);

    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const weddingRef = doc(db, "weddings", weddingId);
      const weddingSnap = await getDoc(weddingRef);

      if (!weddingSnap.exists()) {
        setIsAdmin(false);
        return;
      }

      const weddingData = weddingSnap.data();

      setIsAdmin(weddingData.ownerId === user.uid);
    } catch (error) {
      console.error(error);
      setIsAdmin(false);
    }
  });

  return () => unsubscribe();
}, [weddingId]);

  useEffect(() => {
    const weddingRef = doc(db, "weddings", weddingId);

    const unsubscribe = onSnapshot(weddingRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      setGalleryEnabled(data.galleryEnabled ?? true);

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
    }, 300000);

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
    let cancelled = false;

    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    async function preloadImage(
      photo: Photo,
      maxAttempts = PRELOAD_ATTEMPTS,
      timeoutMs = PRELOAD_TIMEOUT_MS,
      retryDelayMs = PRELOAD_RETRY_DELAY_MS
    ): Promise<ImageLoadReport> {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await new Promise<{
          success: boolean;
        }>((resolve) => {
          const img = new Image();

          img.decoding = "async";

          const timeout = setTimeout(() => {
            resolve({
              success: false,
            });
          }, timeoutMs);

          img.onload = () => {
            clearTimeout(timeout);
            resolve({
              success: true,
            });
          };

          img.onerror = () => {
            clearTimeout(timeout);
            resolve({
              success: false,
            });
          };

        img.src = photo.imageUrl;
        });

        if (result.success) {
          return {
            photoId: photo.id,
            guestName: photo.guestName || "Gast",
            success: true,
            attempts: attempt,
          };
        }

        if (attempt < maxAttempts) {
          await wait(retryDelayMs * attempt);
        }
      }

      return {
        photoId: photo.id,
        guestName: photo.guestName || "Gast",
        success: false,
        attempts: maxAttempts,
      };
    }

    async function loadImagesWithLimit() {
      setDisplayedPhotoIds([]);
      setCompletedImageCount(0);
      setImageLoadReports([]);
      setShowLoadReport(false);
      setTotalImageLoadDurationMs(0);
      setSortGalleryByUploadDate(false);

      if (photos.length === 0) {
        setShowInitialLoader(false);
        return;
      }

      setShowInitialLoader(true);

      const totalStartTime = performance.now();
      const reports: ImageLoadReport[] = [];
      const failedPhotos: Photo[] = [];

      let nextIndex = 0;
      let activeCount = 0;
      let completedCount = 0;

      await new Promise<void>((resolve) => {
        function startNext() {
          if (cancelled) {
            resolve();
            return;
          }

          while (
            activeCount < CONCURRENT_LOADS &&
            nextIndex < photos.length
          ) {
            const photo = photos[nextIndex];

            nextIndex++;
            activeCount++;

            preloadImage(photo).then((report) => {
              if (cancelled) {
                resolve();
                return;
              }

              reports.push(report);

              completedCount++;
              activeCount--;

              setCompletedImageCount(completedCount);

              if (report.success) {
                setDisplayedPhotoIds((prev) => {
                  if (prev.includes(report.photoId)) {
                    return prev;
                  }

                  const next = [...prev, report.photoId];

                  if (next.length >= Math.min(10, photos.length)) {
                    setShowInitialLoader(false);
                  }

                  return next;
                });
              } else {
                failedPhotos.push(photo);
              }

              if (completedCount >= photos.length) {
                resolve();
                return;
              }

              startNext();
            });
          }
        }

        startNext();
      });

      if (cancelled) return;

      if (failedPhotos.length > 0) {
        let retryNextIndex = 0;
        let retryActiveCount = 0;
        let retryCompletedCount = 0;

        await new Promise<void>((resolve) => {
          function startNextRetry() {
            if (cancelled) {
              resolve();
              return;
            }

            while (
              retryActiveCount < FINAL_RETRY_CONCURRENT_LOADS &&
              retryNextIndex < failedPhotos.length
            ) {
              const photo = failedPhotos[retryNextIndex];

              retryNextIndex++;
              retryActiveCount++;

              preloadImage(
                photo,
                FINAL_RETRY_ATTEMPTS,
                FINAL_RETRY_TIMEOUT_MS,
                FINAL_RETRY_DELAY_MS
              ).then((report) => {
                if (cancelled) {
                  resolve();
                  return;
                }

                reports.push(report);

                retryCompletedCount++;
                retryActiveCount--;

                if (report.success) {
                  setDisplayedPhotoIds((prev) => {
                    if (prev.includes(report.photoId)) {
                      return prev;
                    }

                    return [...prev, report.photoId];
                  });
                }

                if (
                  retryCompletedCount >= failedPhotos.length &&
                  retryActiveCount === 0
                ) {
                  resolve();
                  return;
                }

                startNextRetry();
              });
            }
          }

          startNextRetry();
        });
      }

      if (cancelled) return;

      setImageLoadReports(reports);
      setTotalImageLoadDurationMs(
        Math.round(performance.now() - totalStartTime)
      );
      setShowLoadReport(false);
      setShowInitialLoader(false);
    }

    loadImagesWithLimit();

    return () => {
      cancelled = true;
    };
  }, [photos]);

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

  function retryVisibleImage(
    img: HTMLImageElement,
    url: string
  ) {
    const currentRetry = Number(img.dataset.retry || "0");

    if (currentRetry >= VISIBLE_IMG_RETRIES) {
      return;
    }

    img.dataset.retry = String(currentRetry + 1);

    setTimeout(() => {
      img.src = `${url}${url.includes("?") ? "&" : "?"}retry=${Date.now()}-${
        currentRetry + 1
      }`;
    }, VISIBLE_IMG_RETRY_DELAY_MS);
  }

  function showNextPhoto() {
    if (selectedIndex === -1 || visiblePhotos.length === 0) return;

    const nextIndex = (selectedIndex + 1) % visiblePhotos.length;

    setSelectedPhoto(visiblePhotos[nextIndex]);
  }

  function showPreviousPhoto() {
    if (selectedIndex === -1 || visiblePhotos.length === 0) return;

    const previousIndex =
      (selectedIndex - 1 + visiblePhotos.length) %
      visiblePhotos.length;

    setSelectedPhoto(visiblePhotos[previousIndex]);
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

async function shareSinglePhoto(photo: Photo) {
  try {
    const response = await fetch(photo.imageUrl);

    if (!response.ok) {
      throw new Error("Bild konnte nicht geladen werden.");
    }

    const blob = await response.blob();

    const safeName = String(photo.guestName || "gast").replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

    const file = new File(
      [blob],
      `${safeName}-${photo.id}.jpg`,
      {
        type: blob.type || "image/jpeg",
      }
    );

    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: "WeddingSpace Foto",
      });

      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: "WeddingSpace Foto",
        url: photo.imageUrl,
      });

      return;
    }

    const link = document.createElement("a");
    link.href = photo.imageUrl;
    link.download = `${safeName}-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error(error);
    alert("Foto konnte nicht geteilt werden.");
  }
}

if (!galleryEnabled) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-md bg-white/60 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">
        <div className="mb-6 flex justify-center items-center">
          <div className="w-20 h-px bg-[#c8ad72]"></div>
          <span className="mx-4 text-[#c8ad72] text-xl">♥</span>
          <div className="w-20 h-px bg-[#c8ad72]"></div>
        </div>

        <h1 className="font-elegant text-4xl font-medium text-[#3b3128]">
          Galerie deaktiviert
        </h1>

        <p className="text-[#6b5c4d] mt-4">
          Die Fotogalerie ist für dieses Event aktuell nicht verfügbar.
        </p>

        <Link
          href={`/upload/${weddingId}`}
          className="block mt-8 bg-[#c8ad72] text-white px-6 py-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
        >
          Zurück
        </Link>
      </div>
    </main>
  );
}

async function deletePhoto(photoId: string) {
  if (!isAdmin) return;

  const confirmed = confirm(
    "Möchtest du dieses Bild wirklich aus der Galerie löschen?"
  );

  if (!confirmed) return;

  setDeletingPhotoId(photoId);

  try {
    await deleteDoc(
      doc(db, "weddings", weddingId, "photos", photoId)
    );
  } catch (error) {
    console.error(error);
    alert("Das Bild konnte nicht gelöscht werden.");
  }

  setDeletingPhotoId(null);
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
            {loadingFinished && displayedPhotoIds.length > 1 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() =>
                    setSortGalleryByUploadDate((prev) => !prev)
                  }
                  className="bg-white/60 text-[#3b3128] border border-[#d8cfc3] px-5 py-3 rounded-2xl font-bold hover:bg-white/80 transition shadow-lg"
                >
                  {sortGalleryByUploadDate
                    ? "Nach Lade-Reihenfolge anzeigen"
                    : "Nach Uploaddatum sortieren"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              {visiblePhotos.map((photo) => {
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
                        onError={(e) =>
                          retryVisibleImage(
                            e.currentTarget,
                            photo.imageUrl
                          )
                        }
                        className={`w-full h-64 object-cover rounded-2xl transition ${
                          shouldBlurPhotos ? "blur-sm" : ""
                        }`}
                      />

                      {shouldBlurPhotos && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl pointer-events-none">
                          <div className="bg-white/85 text-[#3b3128] px-3 py-2 rounded-xl text-xs font-bold shadow text-center">
                            <p>Sichtbar ab</p>
                            <p>
                              {galleryRevealDateText} Uhr
                            </p>
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

            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(photo.id);
                }}
                disabled={deletingPhotoId === photo.id}
                className="absolute top-3 left-3 z-20 bg-red-700 text-white h-8 w-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-800 transition disabled:opacity-50"
                title="Bild löschen"
                aria-label="Bild löschen"
              >
                {deletingPhotoId === photo.id ? "…" : "×"}
              </button>
            )}

            <p className="mt-2 text-center text-sm text-[#6b5c4d]">
              {photo.guestName || "Gast"}
            </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <p className="text-[#3b3128]/70 font-semibold">
                {displayedPhotoIds.length} von {photos.length} Bildern geladen
              </p>

              {completedImageCount < photos.length && (
                <p className="text-[#3b3128]/50 text-sm mt-1">
                  Weitere Bilder werden geprüft...
                </p>
              )}

              {completedImageCount >= photos.length &&
                displayedPhotoIds.length < photos.length && (
                  <p className="text-[#8a5a44] text-sm mt-1 font-semibold">
                    {photos.length - displayedPhotoIds.length} Bild
                    {photos.length - displayedPhotoIds.length === 1
                      ? ""
                      : "er"}{" "}
                    konnte
                    {photos.length - displayedPhotoIds.length === 1
                      ? ""
                      : "n"}{" "}
                    nicht geladen werden.
                  </p>
                )}
            </div>
          </>
        )}
      </div>

      {isLoggedIn && imageLoadReports.length > 0 && !showLoadReport && (
        <button
          onClick={() => setShowLoadReport(true)}
          className="fixed bottom-6 right-6 z-[9997] bg-[#3b3128] text-white px-4 py-3 rounded-2xl font-bold shadow-2xl border border-white/40 hover:bg-[#4a4036] transition"
        >
          Ladebericht
        </button>
      )}

      {showLoadReport && (
        <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-[2rem] p-6 shadow-2xl text-[#3b3128]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold">
                  Bilder-Ladebericht
                </h2>

                <p className="text-sm text-[#6b5c4d] mt-1">
                  Gesamtdauer: {totalImageLoadDurationMs} ms
                </p>
              </div>

              <button
                onClick={() => setShowLoadReport(false)}
                className="bg-[#c8ad72] text-white px-4 py-2 rounded-2xl font-bold"
              >
                Schließen
              </button>
            </div>

            <div className="space-y-3">
              {imageLoadReports.map((report, index) => (
                <div
                  key={`${report.photoId}-${index}`}
                  className="bg-[#f7f1e8] border border-[#e0d4c3] rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold">
                      {report.guestName}
                    </p>

                    <p
                      className={`text-sm font-semibold ${
                        report.success
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {report.success
                        ? "geladen"
                        : "nicht geladen"}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-[#3b3128]">
                    {report.attempts} Versuch
                    {report.attempts === 1 ? "" : "e"}
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

              <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={async () => {
                await deletePhoto(selectedPhoto.id);
                setSelectedPhoto(null);
              }}
              disabled={deletingPhotoId === selectedPhoto.id}
              className="bg-red-700 text-white px-4 py-2 rounded-2xl font-bold shadow-lg disabled:opacity-50"
            >
              {deletingPhotoId === selectedPhoto.id
                ? "Löscht..."
                : "Löschen"}
                
            </button>
          )}

          <button
            onClick={() => setSelectedPhoto(null)}
            className="bg-white/90 text-[#3b3128] px-4 py-2 rounded-2xl font-bold shadow-lg"
          >
            Schließen
          </button>
        </div>
            </div>

            <img
              src={selectedPhoto.imageUrl}
              alt=""
              onError={(e) =>
                retryVisibleImage(
                  e.currentTarget,
                  selectedPhoto.imageUrl
                )
              }
              className={`max-w-full max-h-[62vh] md:max-h-[78vh] object-contain rounded-[1.5rem] shadow-2xl transition ${
                shouldBlurPhotos ? "blur-sm" : ""
              }`}
            />

{!shouldBlurPhotos && (
  <div className="mt-4 text-center">
    <p className="bg-[#c8ad72] text-white p-4 rounded-2xl font-bold shadow-lg">
      Bild gedrückt halten zum Speichern
    </p>
  </div>
)}

          </div>
        </div>
      )}
    </main>
  );
}
