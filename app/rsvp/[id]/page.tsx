"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useParams } from "next/navigation";

export default function RsvpPage() {
  const params = useParams();
  const weddingId = params.id as string;

  const [eventTitle, setEventTitle] = useState("");
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [status, setStatus] = useState<"yes" | "no">("yes");
  const [guestCount, setGuestCount] = useState("1");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
  async function loadWedding() {
    try {
      const weddingRef = doc(db, "weddings", weddingId);
      const snapshot = await getDoc(weddingRef);

      if (!snapshot.exists()) {
        setEventTitle("Hochzeit");
        setLoadingEvent(false);
        return;
      }

      const data = snapshot.data();

      setEventTitle(data.title || "Hochzeit");
      setLoadingEvent(false);
    } catch (error) {
      console.error(error);
      setEventTitle("Hochzeit");
      setLoadingEvent(false);
    }
  }

  loadWedding();
}, [weddingId]);

  async function submitRsvp() {
    if (!guestName.trim()) {
      alert("Bitte gib deinen Namen ein.");
      return;
    }

  const guestCountNumber = Number(guestCount);

if (
  status === "yes" &&
  (!guestCount || guestCountNumber < 1)
) {
  alert("Bitte gib an, mit wie vielen Personen du kommst.");
  return;
}

    setSending(true);

    try {
      await addDoc(collection(db, "weddings", weddingId, "rsvps"), {
        guestName: guestName.trim(),
        status,
        guestCount: status === "yes" ? guestCountNumber : 0,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      setSent(true);
    } catch (error) {
      console.error(error);
      alert("Die Rückmeldung konnte nicht gespeichert werden.");
    }

    setSending(false);
  }

  if (loadingEvent) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-md bg-white/60 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">
        <div className="mb-6 flex justify-center items-center">
          <div className="w-20 h-px bg-[#c8ad72]"></div>
          <span className="mx-4 text-[#c8ad72] text-xl">♥</span>
          <div className="w-20 h-px bg-[#c8ad72]"></div>
        </div>

        <div className="h-10 w-10 mx-auto rounded-full border-4 border-[#c8ad72] border-t-transparent animate-spin"></div>

        <p className="text-[#6b5c4d] mt-5 font-semibold">
          Rückmeldung wird geladen...
        </p>
      </div>
    </main>
  );
}

  if (sent) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-6 text-black">
        <div className="w-full max-w-md bg-white/60 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50 text-center">
          <div className="mb-6 flex justify-center items-center">
            <div className="w-20 h-px bg-[#c8ad72]"></div>
            <span className="mx-4 text-[#c8ad72] text-xl">
              ♥
            </span>
            <div className="w-20 h-px bg-[#c8ad72]"></div>
          </div>

          <h1 className="font-elegant text-4xl font-medium text-[#3b3128]">
            Vielen Dank!
          </h1>

          <p className="text-[#6b5c4d] mt-4">
            Deine Rückmeldung wurde gespeichert.
          </p>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 text-black">
      <div className="w-full max-w-md bg-white/60 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50">
        <div className="mb-6 flex justify-center items-center">
          <div className="w-20 h-px bg-[#c8ad72]"></div>
          <span className="mx-4 text-[#c8ad72] text-xl">
            ♥
          </span>
          <div className="w-20 h-px bg-[#c8ad72]"></div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-elegant text-4xl font-medium text-[#3b3128] leading-tight">
            {eventTitle}
          </h1>

          <p className="font-elegant text-3xl font-medium text-[#3b3128] mt-3">
            Rückmeldung
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-[#3b3128] mb-2">
              Dein Name
            </label>

            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Max Mustermann"
              className="w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] outline-none focus:ring-2 focus:ring-[#d4b06a]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#3b3128] mb-2">
              Kommst du zur Hochzeit?
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("yes")}
                className={`py-4 rounded-2xl font-bold border transition ${
                  status === "yes"
                    ? "bg-[#c8ad72] text-white border-[#c8ad72]"
                    : "bg-white/60 text-[#3b3128] border-[#d8cfc3]"
                }`}
              >
                Ich komme
              </button>

              <button
                type="button"
                onClick={() => setStatus("no")}
                className={`py-4 rounded-2xl font-bold border transition ${
                  status === "no"
                    ? "bg-[#c8ad72] text-white border-[#c8ad72]"
                    : "bg-white/60 text-[#3b3128] border-[#d8cfc3]"
                }`}
              >
                Ich kann nicht
              </button>
            </div>
          </div>

          {status === "yes" && (
            <div>
              <label className="block text-sm font-bold text-[#3b3128] mb-2">
                Anzahl Personen
              </label>

          <input
                type="number"
                min={1}
                inputMode="numeric"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] outline-none focus:ring-2 focus:ring-[#d4b06a]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-[#3b3128] mb-2">
              Nachricht
            </label>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional: Nachricht an das Brautpaar"
              rows={4}
              className="w-full bg-white/70 border border-[#d8cfc3] rounded-2xl px-4 py-3 text-[#3b3128] outline-none focus:ring-2 focus:ring-[#d4b06a] resize-none"
            />
          </div>

          <button
            onClick={submitRsvp}
            disabled={sending}
            className="w-full bg-[#c8ad72] text-white px-6 py-4 rounded-2xl font-bold hover:opacity-90 transition disabled:opacity-50 shadow-lg"
          >
            {sending ? "Wird gespeichert..." : "Rückmeldung senden"}
          </button>
        </div>
      </div>
    </main>
  );
}