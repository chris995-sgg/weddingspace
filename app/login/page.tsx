"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();

 async function register() {
  setError("");
  setSuccess("");

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const allowedRef = doc(db, "allowedUsers", normalizedEmail);
    const allowedSnap = await getDoc(allowedRef);

    if (!allowedSnap.exists() || allowedSnap.data().allowed !== true) {
      setError("Diese E-Mail-Adresse ist nicht zur Registrierung freigegeben.");
      return;
    }

    await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );

    setSuccess("Account erfolgreich erstellt!");
    router.push("/dashboard");
  } catch (error: any) {
    console.error(error);

    if (error.code === "auth/weak-password") {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
    } else if (error.code === "auth/email-already-in-use") {
      setError("Diese E-Mail-Adresse wird bereits verwendet.");
    } else if (error.code === "auth/invalid-email") {
      setError("Ungültige E-Mail-Adresse.");
    } else {
      setError("Account konnte nicht erstellt werden.");
    }
  }
}

  async function login() {
    setError("");
    setSuccess("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/invalid-credential") {
        setError(
          "E-Mail oder Passwort ist falsch."
        );
      } else {
        setError("Login fehlgeschlagen.");
      }
    }
  }

  async function resetPassword() {
    setError("");
    setSuccess("");

    if (!email) {
      setError(
        "Bitte gib zuerst deine E-Mail-Adresse ein."
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);

      setSuccess(
        "E-Mail zum Zurücksetzen wurde versendet."
      );
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/user-not-found") {
        setError(
          "Kein Benutzer mit dieser E-Mail gefunden."
        );
      } else if (error.code === "auth/invalid-email") {
        setError("Ungültige E-Mail-Adresse.");
      } else {
        setError(
          "Passwort konnte nicht zurückgesetzt werden."
        );
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative text-[#3b3128]">

  <div className="w-full max-w-md bg-white/50 backdrop-blur rounded-[2rem] p-8 shadow-2xl border border-white/50">

    <h1 className="text-4xl font-bold mb-2 text-center text-[#3b3128]">
      WeddingSpace
    </h1>

    <p className="text-center text-[#6b5c4d] mb-8">
      Deine digitale Hochzeitsplattform
    </p>

    {error && (
      <div className="mb-4 bg-red-100/80 border border-red-300 text-red-700 p-4 rounded-2xl shadow">
        {error}
      </div>
    )}

    {success && (
      <div className="mb-4 bg-green-100/80 border border-green-300 text-green-700 p-4 rounded-2xl shadow">
        {success}
      </div>
    )}

    <input
      className="w-full mb-4 p-4 rounded-2xl bg-white/70 border border-[#d8cfc3] text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#c8ad72]"
      placeholder="E-Mail"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />

    <input
      className="w-full mb-6 p-4 rounded-2xl bg-white/70 border border-[#d8cfc3] text-[#3b3128] placeholder:text-[#8b7a68] outline-none focus:ring-2 focus:ring-[#c8ad72]"
      placeholder="Passwort"
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />

    <button
      onClick={login}
      className="w-full mb-3 bg-[#3b3128] text-white p-4 rounded-2xl font-bold hover:bg-[#2d241d] transition shadow-lg"
    >
      Einloggen
    </button>

    <button
      onClick={register}
      className="w-full mb-4 bg-[#c8ad72] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition shadow-lg"
    >
      Account erstellen
    </button>

    <button
      onClick={resetPassword}
      className="w-full p-3 rounded-2xl text-[#6b5c4d] underline hover:text-[#3b3128] transition"
    >
      Passwort vergessen?
    </button>

  </div>
</main>
  );
}