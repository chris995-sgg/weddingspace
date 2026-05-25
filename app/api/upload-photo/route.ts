import { initializeApp } from "firebase/app";
import {
  getFirestore,
  addDoc,
  collection,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEquD6-nod1C9JDPMvyY9WnrULMr5vfS4",
  authDomain: "WeddingSpace.firebaseapp.com",
  projectId: "WeddingSpace",
  storageBucket: "WeddingSpace.firebasestorage.app",
  messagingSenderId: "213128616705",
  appId: "1:213128616705:web:0764952457238c8d695900"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const weddingId = formData.get("weddingId") as string;
    const guestName = formData.get("guestName") as string;

    if (!file) {
      return Response.json(
        { error: "Keine Datei" },
        { status: 400 }
      );
    }

    const token = process.env.DROPBOX_ACCESS_TOKEN;

    if (!token) {
      return Response.json(
        { error: "Dropbox Token fehlt" },
        { status: 500 }
      );
    }

    const fileName = `${Date.now()}-${file.name}`;

    const dropboxPath = `/hochzeiten/${weddingId}/${fileName}`;

    const bytes = await file.arrayBuffer();

    const uploadResponse = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: dropboxPath,
            mode: "add",
            autorename: true,
            mute: false,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();

      console.error("Dropbox Fehler:", errorText);

      return Response.json(
        { error: "Dropbox Upload fehlgeschlagen" },
        { status: 500 }
      );
    }

    const sharedLinkResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: dropboxPath,
        }),
      }
    );

    const sharedLinkData = await sharedLinkResponse.json();

    let imageUrl = sharedLinkData.url;

    imageUrl = imageUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com");
    imageUrl = imageUrl.replace("?dl=0", "");

    await addDoc(
      collection(db, "weddings", weddingId, "photos"),
      {
        guestName: guestName || "Gast",
        fileName,
        imageUrl,
        createdAt: new Date(),
      }
    );

    return Response.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Upload fehlgeschlagen" },
      { status: 500 }
    );
  }
}