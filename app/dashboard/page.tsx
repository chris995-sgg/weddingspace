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

  return (
    <main className="min-h-screen bg-white/20 text-white p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex justify-between items-center mb-10">

          <div>
            <h1 className="text-3xl font-bold">
              WeddingSpace
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

          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">

            <h2 className="text-2xl font-bold">
              Meine Events
            </h2>

            <div className="flex gap-2">

              <input
                value={newWeddingTitle}
                onChange={(e) =>
                  setNewWeddingTitle(e.target.value)
                }
                placeholder="Name des Events"
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white"
              />

              <button
                onClick={createWedding}
                disabled={loading}
                className="bg-white text-black px-5 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {loading
                  ? "Erstelle..."
                  : "Neues Event erstellen"}
              </button>

            </div>
          </div>

          {weddings.length === 0 ? (
            <p className="text-neutral-400">
              Du hast noch kein Event erstellt.
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