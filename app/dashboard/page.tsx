"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";


import { onAuthStateChanged, signOut, User } from "firebase/auth";

import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

type Wedding = {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail?: string;
  galleryEnabled?: boolean;
  rsvpEnabled?: boolean;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  const [weddings, setWeddings] = useState<Wedding[]>([]);

  const [loading, setLoading] = useState(false);

  const [newWeddingTitle, setNewWeddingTitle] =
    useState("");

    const [openedQrCode, setOpenedQrCode] = useState<{
      title: string;
      url: string;
    } | null>(null);

  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);

        const weddingsQuery = query(
          collection(db, "weddings"),
          where("ownerId", "==", currentUser.uid)
        );

        const unsubscribeWeddings = onSnapshot(
          weddingsQuery,
          (snapshot) => {
            const weddingList = snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            ) as Wedding[];

            setWeddings(weddingList);
          }
        );

        return () => unsubscribeWeddings();
      }
    );

    return () => unsubscribeAuth();
  }, [router]);

  async function logout() {
    await signOut(auth);

    router.push("/login");
  }

  async function createWedding() {
    if (!user) return;

    if (weddings.length >= 3) {
      alert("Du kannst maximal 3 Events erstellen.");
    return;
}

    if (!newWeddingTitle.trim()) {
      alert("Bitte gib einen Namen ein.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "weddings"), {
        title: newWeddingTitle,
        ownerId: user.uid,
        ownerEmail: user.email,
        createdAt: new Date(),

        galleryEnabled: true,
        rsvpEnabled: true,

      });

      setNewWeddingTitle("");
    } catch (error) {
      console.error(error);

      alert("Fehler beim Erstellen");
    }

    setLoading(false);
  }

    async function shareGalleryLink(weddingId: string) {
      const galleryUrl = `${window.location.origin}/gallery/${weddingId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "WeddingSpace Galerie",
            text: "Hier kannst du die Hochzeitsfotos ansehen und hochladen:",
            url: galleryUrl,
          });
        } catch (error) {
          console.error(error);
        }
      } else {
        await navigator.clipboard.writeText(galleryUrl);
        alert("Link wurde kopiert.");
      }
    }

async function shareRsvpLink(weddingId: string) {
  const rsvpUrl = `${window.location.origin}/rsvp/${weddingId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "WeddingSpace Rückmeldung",
        text: "Hier kannst du zur Hochzeit zu- oder absagen:",
        url: rsvpUrl,
      });
    } catch (error) {
      console.error(error);
    }
  } else {
    await navigator.clipboard.writeText(rsvpUrl);
    alert("Link wurde kopiert.");
  }
}

return (
  <main className="min-h-screen px-6 pt-16 pb-6 relative text-[#3b3128]">
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-3xl font-bold text-[#3b3128]">
            WeddingSpace
          </h1>

          <p className="text-[#6b5c4d] mt-2">
            Eingeloggt als {user?.email}
          </p>
        </div>

        <button
          onClick={logout}
          className="bg-white/60 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
        >
          Logout
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#3b3128] mb-4">
          Meine Events
        </h2>

        <div className="bg-white/50 backdrop-blur rounded-[1.5rem] p-8 shadow-2xl border border-white/40 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={newWeddingTitle}
              onChange={(e) =>
                setNewWeddingTitle(e.target.value)
              }
              placeholder="Name des Events"
              className="flex-1 bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#c8ad72]"
            />

            <button
              onClick={createWedding}
              disabled={loading}
              className="bg-[#3b3128] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#2d241d] transition disabled:opacity-50 shadow-lg"
            >
              {loading
                ? "Erstelle..."
                : "Neues Event erstellen"}
            </button>
          </div>
        </div>

        {weddings.length === 0 ? (
          <p className="text-[#6b5c4d]">
            Du hast noch kein Event erstellt.
          </p>
        ) : (
          <div className="grid gap-4">

{weddings.map((wedding) => (
  <div
    key={wedding.id}
    className="bg-white/50 backdrop-blur rounded-[2rem] p-6 shadow-xl border border-white/50"
  >
    {/* Kopfbereich: Eventname links, Zahnrad rechts */}
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-2xl font-bold text-[#3b3128]">
          {wedding.title}
        </h3>

        <p className="text-sm text-[#6b5c4d] mt-1">
          ID: {wedding.id}
        </p>
      </div>

<Link
  href={`/dashboard/wedding/${wedding.id}`}
  className="p-1 text-[#4a4036] hover:text-[#c8ad72] hover:scale-110 transition"
  title="Event bearbeiten"
  aria-label="Event bearbeiten"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-7 h-7"
  >
    <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.05a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.05a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.05a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 9c.36.6.98.98 1.55 1H21a2 2 0 0 1 0 4h-.05A1.7 1.7 0 0 0 19.4 15Z" />
  </svg>
</Link>


    </div>

    {/* Upload / Galerie Bereich */}
    {wedding.galleryEnabled !== false ? (
      <div className="flex flex-col items-center">

 <div className="relative mb-5">
  <button
    type="button"
    onClick={() => shareGalleryLink(wedding.id)}
    className="cursor-pointer hover:scale-105 transition bg-white p-3 rounded-2xl shadow-lg flex items-center justify-center"
    title="Upload-Link teilen"
  >
    <QRCodeCanvas
      value={`${window.location.origin}/upload/${wedding.id}`}
      size={96}
    />
  </button>

<button
  type="button"
  onClick={() => {
    const qrPngUrl = `/api/qr?url=${encodeURIComponent(
      `${window.location.origin}/upload/${wedding.id}`
    )}`;

    window.open(qrPngUrl, "_blank");
  }}
  className="absolute -right-3 -top-3 h-9 w-9 rounded-full bg-white shadow-lg border border-white/60 flex items-center justify-center text-[#3b3128] hover:scale-105 transition"
  title="QR-Code als Bild öffnen"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
</button>
</div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Link
            href={`/upload/${wedding.id}`}
            className="bg-[#c8ad72] text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:opacity-90 transition"
          >
            Upload
          </Link>

          <Link
            href={`/gallery/${wedding.id}`}
            className="bg-[#3b3128] text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:bg-[#2d241d] transition"
          >
            Galerie
          </Link>
        </div>
      </div>
    ) : (
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-[#6b5c4d]">
          Galerie deaktiviert
        </p>
      </div>
    )}

    {/* Rückmeldung Bereich */}
    {wedding.rsvpEnabled !== false ? (
      <div className="flex flex-col items-center">

<div className="relative mb-5">
  <button
    type="button"
    onClick={() => shareRsvpLink(wedding.id)}
    className="cursor-pointer hover:scale-105 transition bg-white p-3 rounded-2xl shadow-lg flex items-center justify-center"
    title="Rückmeldungs-Link teilen"
  >
    <QRCodeCanvas
      value={`${window.location.origin}/rsvp/${wedding.id}`}
      size={96}
    />
  </button>

<button
  type="button"
  onClick={() => {
    const qrPngUrl = `/api/qr?url=${encodeURIComponent(
      `${window.location.origin}/rsvp/${wedding.id}`
    )}`;

    window.open(qrPngUrl, "_blank");
  }}
  className="absolute -right-3 -top-3 h-9 w-9 rounded-full bg-white shadow-lg border border-white/60 flex items-center justify-center text-[#3b3128] hover:scale-105 transition"
  title="QR-Code als Bild öffnen"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
</button>

    </div>

        <Link
          href={`/dashboard/${wedding.id}/rsvp`}
          className="bg-[#c8ad72] text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:opacity-90 transition"
        >
          Rückmeldungen ansehen
        </Link>
      </div>
    ) : (
      <div className="text-center">
        <p className="text-sm font-semibold text-[#6b5c4d]">
          Rückmeldung deaktiviert
        </p>
      </div>
    )}
  </div>
))}


          </div>
        )}
      </div>
    </div>
{openedQrCode && (
  <div className="fixed inset-0 bg-black/85 z-50 overflow-hidden flex items-center justify-center px-4">
    <div className="w-full max-w-md flex flex-col items-center justify-center">
      <div className="w-full flex justify-between items-center mb-4">
        <p className="text-white text-sm font-semibold">
          {openedQrCode.title}
        </p>

        <button
          onClick={() => setOpenedQrCode(null)}
          className="bg-white/90 text-[#3b3128] px-4 py-2 rounded-2xl font-bold shadow-lg"
        >
          Schließen
        </button>
      </div>

        <div className="bg-white p-6 rounded-[1.5rem] shadow-2xl">
        <QRCodeSVG
          value={openedQrCode.url}
          size={260}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
        />
      </div>
      
      <div className="mt-4 text-center">
        <p className="bg-[#c8ad72] text-white p-4 rounded-2xl font-bold shadow-lg">
          Bild gedrückt halten zum Speichern
        </p>
      </div>
    </div>
  </div>
)}

  </main>
);
}