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
  <main className="min-h-screen p-6 relative text-[#3b3128]">

    <div className="max-w-7xl mx-auto">

      <Link
        href="/dashboard"
        className="inline-block mb-6 bg-white/60 backdrop-blur-xl text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="bg-white/55 backdrop-blur-2xl rounded-[2rem] p-6 shadow-2xl border border-white/50 mb-8">

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          <h1 className="text-4xl font-bold text-center text-[#3b3128]">
            WeddingSpace Galerie
          </h1>

          <Link
            href={`/upload/${weddingId}`}
            className="bg-[#d4b06a] text-white px-5 py-3 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
          >
            Foto hochladen
          </Link>

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

          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="bg-white/60 backdrop-blur-xl rounded-[1.5rem] overflow-hidden text-left shadow-xl border border-white/50 hover:scale-[1.02] transition"
            >

              <img
                src={photo.imageUrl}
                alt=""
                className="w-full h-64 object-cover"
              />

              <div className="p-4">

                <p className="text-sm text-[#6b5c4d]">
                  {photo.guestName}
                </p>

              </div>

            </button>
          ))}

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
              className="w-full max-h-[75vh] object-contain rounded-[1.5rem] bg-black/30"
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