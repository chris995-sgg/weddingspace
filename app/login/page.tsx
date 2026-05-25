"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";

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
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      setSuccess("Account erfolgreich erstellt!");

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/weak-password") {
        setError(
          "Das Passwort muss mindestens 6 Zeichen lang sein."
        );
      } else if (
        error.code === "auth/email-already-in-use"
      ) {
        setError(
          "Diese E-Mail-Adresse wird bereits verwendet."
        );
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
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-6 shadow-xl">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Hochzeitsspiel
        </h1>

        {error && (
          <div className="mb-4 bg-red-900/40 border border-red-700 text-red-200 p-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-900/40 border border-green-700 text-green-200 p-3 rounded-xl">
            {success}
          </div>
        )}

        <input
          className="w-full mb-3 p-3 rounded-xl bg-neutral-800 border border-neutral-700"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-5 p-3 rounded-xl bg-neutral-800 border border-neutral-700"
          placeholder="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full mb-3 p-3 rounded-xl bg-white text-black font-bold"
        >
          Einloggen
        </button>

        <button
          onClick={register}
          className="w-full mb-3 p-3 rounded-xl bg-neutral-700 font-bold"
        >
          Account erstellen
        </button>

        <button
          onClick={resetPassword}
          className="w-full p-3 rounded-xl text-neutral-300 underline"
        >
          Passwort vergessen?
        </button>

      </div>
    </main>
  );
}