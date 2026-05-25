"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

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

  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
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
          const weddingList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Wedding[];

          setWeddings(weddingList);
        }
      );

      return () => unsubscribeWeddings();
    });

    return () => unsubscribeAuth();
  }, [router]);

  async function logout() {
    await signOut(auth);
    router.push("/login");
  }

  async function createWedding() {
    if (!user) return;

    setLoading(true);

    try {
      await addDoc(collection(db, "weddings"), {
        title: "Neue Hochzeit",
        ownerId: user.uid,
        ownerEmail: user.email,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error(error);
      alert("Fehler beim Erstellen");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">
              Dashboard
            </h1>

            <p className="text-neutral-400 mt-2">
              Eingeloggt als {user?.email}
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-neutral-800 px-4 py-2 rounded-xl"
          >
            Logout
          </button>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-6">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              Meine Hochzeiten
            </h2>

            <button
              onClick={createWedding}
              disabled={loading}
              className="bg-white text-black px-5 py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loading
                ? "Erstelle..."
                : "Neue Hochzeit erstellen"}
            </button>
          </div>

          {weddings.length === 0 ? (
            <p className="text-neutral-400">
              Du hast noch keine Hochzeit erstellt.
            </p>
          ) : (
            <div className="grid gap-4">

              {weddings.map((wedding) => (
                <div
                  key={wedding.id}
                  className="bg-neutral-800 rounded-xl p-5 flex justify-between items-center"
                >

                  <div>
                    <h3 className="text-xl font-bold">
                      {wedding.title}
                    </h3>

                    <p className="text-sm text-neutral-400 mt-1">
                      ID: {wedding.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
  <div className="bg-white p-2 rounded-xl">
    <QRCodeCanvas
      value={`${window.location.origin}/upload/${wedding.id}`}
      size={96}
    />
  </div>

        <div className="flex gap-2">
            <a
            href={`/dashboard/wedding/${wedding.id}`}
            className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-xl"
            >
            Bearbeiten
            </a>

            <a
            href={`/upload/${wedding.id}`}
            className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-xl"
            >
            Upload
            </a>

            <a
            href={`/gallery/${wedding.id}`}
            className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-xl"
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