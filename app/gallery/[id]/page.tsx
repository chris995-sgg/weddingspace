"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  return (
    <main className="min-h-screen bg-black text-white p-6">

      <div className="max-w-7xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-block mb-6 text-neutral-400 hover:text-white"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">

          <h1 className="text-4xl font-bold text-center">
            WeddingSpace Galerie
          </h1>

          <Link
            href={`/upload/${weddingId}`}
            className="bg-white text-black px-5 py-3 rounded-xl font-bold"
          >
            Foto hochladen
          </Link>

        </div>

        {photos.length === 0 ? (
          <p className="text-center text-neutral-400">
            Noch keine Fotos hochgeladen.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="bg-neutral-900 rounded-2xl overflow-hidden text-left"
              >

                <img
                  src={photo.imageUrl}
                  alt=""
                  className="w-full h-64 object-cover"
                />

                <div className="p-3">
                  <p className="text-sm text-neutral-300">
                    {photo.guestName}
                  </p>
                </div>

              </button>
            ))}

          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">

          <div className="max-w-6xl w-full relative">

            <button
              onClick={showPreviousPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white text-black w-14 h-14 rounded-full text-3xl font-bold z-50"
            >
              ←
            </button>

            <button
              onClick={showNextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black w-14 h-14 rounded-full text-3xl font-bold z-50"
            >
              →
            </button>

            <div className="flex justify-between items-center mb-4">

              <p className="text-neutral-300">
                Hochgeladen von {selectedPhoto.guestName}
              </p>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="bg-white text-black px-4 py-2 rounded-xl font-bold"
              >
                Schließen
              </button>

            </div>

            <img
              src={selectedPhoto.imageUrl}
              alt=""
              className="w-full max-h-[75vh] object-contain rounded-2xl bg-neutral-900"
            />

            <a
              href={selectedPhoto.imageUrl}
              download
              target="_blank"
              className="block mt-4 text-center bg-white text-black p-4 rounded-xl font-bold"
            >
              Foto herunterladen
            </a>

          </div>
        </div>
      )}
    </main>
  );
}