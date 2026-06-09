"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";

type Rsvp = {
  id: string;
  guestName: string;
  status: "yes" | "no";
  guestCount: number;
  message?: string;
  createdAt?: {
    toDate: () => Date;
  };
};

export default function RsvpAdminPage() {
  const params = useParams();
  const router = useRouter();

  const weddingId = params.id as string;

  const [eventTitle, setEventTitle] = useState("");
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const weddingRef = doc(db, "weddings", weddingId);
      const weddingSnap = await getDoc(weddingRef);

      if (!weddingSnap.exists()) {
        router.push("/dashboard");
        return;
      }

      const data = weddingSnap.data();

      if (data.ownerId && data.ownerId !== user.uid) {
        router.push("/dashboard");
        return;
      }

      setEventTitle(data.title || "Hochzeit");
      setAllowed(true);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router, weddingId]);

  useEffect(() => {
    if (!allowed) return;

    const q = query(
      collection(db, "weddings", weddingId, "rsvps"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Rsvp[];

      setRsvps(list);
    });

    return () => unsubscribe();
  }, [allowed, weddingId]);

  const stats = useMemo(() => {
    const yes = rsvps.filter((rsvp) => rsvp.status === "yes");
    const no = rsvps.filter((rsvp) => rsvp.status === "no");

    const guestTotal = yes.reduce(
      (sum, rsvp) => sum + Number(rsvp.guestCount || 0),
      0
    );

    return {
      yesCount: yes.length,
      noCount: no.length,
      guestTotal,
    };
  }, [rsvps]);

  if (loading) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-6 text-black">
        <div className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow-xl">
          Lädt...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] p-6 pt-24 text-black">
      <Link
        href="/dashboard"
        className="absolute top-6 left-6 bg-white/50 backdrop-blur text-[#4a4036] px-4 py-2 rounded-2xl font-semibold shadow-xl border border-white/40 hover:bg-white/80 transition"
      >
        ← Zurück zum Dashboard
      </Link>

      <div className="max-w-5xl mx-auto">
        <div className="bg-white/60 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">
          <h1 className="font-elegant text-4xl font-medium text-[#3b3128]">
            {eventTitle}
          </h1>

          <p className="font-elegant text-3xl font-medium text-[#3b3128] mt-3">
            Rückmeldungen
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/70 rounded-2xl p-5 shadow border border-white/50">
              <p className="text-sm text-[#6b5c4d] font-bold">
                Zusagen
              </p>
              <p className="text-4xl font-bold text-[#3b3128] mt-2">
                {stats.yesCount}
              </p>
            </div>

            <div className="bg-white/70 rounded-2xl p-5 shadow border border-white/50">
              <p className="text-sm text-[#6b5c4d] font-bold">
                Absagen
              </p>
              <p className="text-4xl font-bold text-[#3b3128] mt-2">
                {stats.noCount}
              </p>
            </div>

            <div className="bg-white/70 rounded-2xl p-5 shadow border border-white/50">
              <p className="text-sm text-[#6b5c4d] font-bold">
                Gäste gesamt
              </p>
              <p className="text-4xl font-bold text-[#3b3128] mt-2">
                {stats.guestTotal}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {rsvps.length === 0 ? (
            <div className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow-xl border border-white/50 text-center">
              Noch keine Rückmeldungen vorhanden.
            </div>
          ) : (
            rsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow-xl border border-white/50"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-[#3b3128]">
                      {rsvp.guestName}
                    </p>

                    <p
                      className={`font-bold mt-1 ${
                        rsvp.status === "yes"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {rsvp.status === "yes"
                        ? `Zusage · ${rsvp.guestCount || 1} Person${
                            Number(rsvp.guestCount || 1) === 1
                              ? ""
                              : "en"
                          }`
                        : "Absage"}
                    </p>

                    {rsvp.message && (
                      <p className="text-[#6b5c4d] mt-4 whitespace-pre-line">
                        {rsvp.message}
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-[#6b5c4d]">
                    {rsvp.createdAt?.toDate
                      ? rsvp.createdAt.toDate().toLocaleString("de-DE")
                      : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}