"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";

type Wedding = {
  title: string;
  ownerEmail?: string;
};

export default function WeddingPage() {
  const params = useParams();

  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWedding() {
      try {
        const weddingId = params.id as string;

        const docRef = doc(db, "weddings", weddingId);

        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          setWedding(snapshot.data() as Wedding);
        }
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    }

    loadWedding();
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        Lade Hochzeit...
      </main>
    );
  }

  if (!wedding) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        Hochzeit nicht gefunden
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-neutral-900 rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-4">
            {wedding.title}
          </h1>

          <p className="text-neutral-400">
            Besitzer: {wedding.ownerEmail}
          </p>
        </div>
      </div>
    </main>
  );
}