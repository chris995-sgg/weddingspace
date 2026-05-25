"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function register() {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account erstellt!");
  }

  async function login() {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Eingeloggt!");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
      <div className="w-full max-w-sm bg-neutral-900 rounded-2xl p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Hochzeitsspiel
        </h1>

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
          className="w-full p-3 rounded-xl bg-neutral-700 font-bold"
        >
          Account erstellen
        </button>
      </div>
    </main>
  );
}
