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

import { QRCodeCanvas } from "qrcode.react";

type Wedding = {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail?: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  const [weddings, setWeddings] = useState<Wedding[]>([]);

  const [loading, setLoading] = useState(false);

  const [newWeddingTitle, setNewWeddingTitle] =
    useState("");

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

  return (
    <main className="min-h-screen px-6 pt-10 pb-6 relative text-[#3b3128]">
    <div className="max-w-5xl mx-auto">

    <div className="flex justify-between items-center mb-10">

      <div>
        <h1 className="text-3xl font-bold text-[#3b3128]">
          WeddingSpace
        </h1>

        <p className="text-[#6b5c4d] mt-2">
          Eingeloggt als {user?.email}
        </p>
      </div>

      <button
        onClick={logout}
        className="bg-white/50 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
      >
        Logout
      </button>

    </div>

  

 <div className="mb-8">

  <h2 className="text-2xl font-bold text-[#3b3128] mb-4">
    Meine Events
  </h2>

  <div className="bg-white/50 backdrop-blur rounded-[1.5rem] p-8 shadow-2xl border border-white/40">

    <div className="flex flex-col md:flex-row gap-4">

      <input
        value={newWeddingTitle}
        onChange={(e) =>
          setNewWeddingTitle(e.target.value)
        }
        placeholder="Name des Events"
        className="flex-1 bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#d4b06a]"
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
    
 <div className="mb-8"></div>

      {weddings.length === 0 ? (
        <p className="text-[#6b5c4d]">
          Du hast noch kein Event erstellt.
        </p>
      ) : (
        <div className="grid gap-4">

          {weddings.map((wedding) => (
            <div
              key={wedding.id}
              className="bg-white/50 backdrop-blur rounded-[1.5rem] p-5 shadow-xl border border-white/50 flex flex-col md:flex-row md:justify-between md:items-center gap-5"
            >

              <div>
                <h3 className="text-xl font-bold text-[#3b3128]">
                  {wedding.title}
                </h3>

                <p className="text-sm text-[#6b5c4d] mt-1">
                  ID: {wedding.id}
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">

                <div className="bg-white/80 p-2 rounded-2xl shadow-lg border border-white/60">

              <button
                type="button"
                onClick={() => shareGalleryLink(wedding.id)}
                className="cursor-pointer hover:scale-105 transition"
                title="Link teilen"
              >
                <QRCodeCanvas
                  value={`${window.location.origin}/upload/${wedding.id}`}
                  size={96}
                />
              </button>

                </div>

                <div className="flex flex-wrap gap-2 justify-center">

                  <a
                    href={`/dashboard/wedding/${wedding.id}`}
                    className="bg-white/70 backdrop-blur-xl text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-lg border border-white/40 hover:bg-white/80 transition"
                  >
                    Bearbeiten
                  </a>

                  <a
                    href={`/upload/${wedding.id}`}
                    className="bg-[#d4b06a] text-white px-4 py-2 rounded-2xl font-semibold shadow-lg hover:opacity-90 transition"
                  >
                    Upload
                  </a>

                  <a
                    href={`/gallery/${wedding.id}`}
                    className="bg-[#3b3128] text-white px-4 py-2 rounded-2xl font-semibold shadow-lg hover:bg-[#2d241d] transition"
                  >
                    Galerie
                  </a>

                </div>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  </div>
</main>
  );
}