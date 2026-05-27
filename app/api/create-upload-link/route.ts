import { db } from "@/lib/firebase";

import {
  doc,
  getDoc,
} from "firebase/firestore";

async function getDropboxAccessToken() {
  const refreshToken =
    process.env.DROPBOX_REFRESH_TOKEN;

  const appKey =
    process.env.DROPBOX_APP_KEY;

  const appSecret =
    process.env.DROPBOX_APP_SECRET;

  if (
    !refreshToken ||
    !appKey ||
    !appSecret
  ) {
    throw new Error(
      "Dropbox Environment Variables fehlen"
    );
  }

  const response = await fetch(
    "https://api.dropboxapi.com/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Dropbox Token Fehler:",
      data
    );

    throw new Error(
      "Dropbox Token Fehler"
    );
  }

  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const {
      weddingId,
      fileName,
      sizeBytes,
    } = await req.json();

    // ==========================================
    // DATEN PRÜFEN
    // ==========================================
    if (
      !weddingId ||
      !fileName ||
      !sizeBytes
    ) {
      return Response.json(
        { error: "Daten fehlen" },
        { status: 400 }
      );
    }

    const fileSize =
      Number(sizeBytes);

    // ==========================================
    // WEDDING ID SICHER MACHEN
    // ==========================================
    const safeWeddingId =
      String(weddingId).replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    // ==========================================
    // EVENT LADEN
    // ==========================================
    const weddingRef = doc(
      db,
      "weddings",
      safeWeddingId
    );

    const weddingSnap =
      await getDoc(weddingRef);

    if (!weddingSnap.exists()) {
      return Response.json(
        { error: "Event nicht gefunden" },
        { status: 404 }
      );
    }

    // ==========================================
    // 5 GB LIMIT PRÜFEN
    // ==========================================
    const currentBytes =
      weddingSnap.data()
        .uploadedBytes || 0;

    const MAX_EVENT_BYTES =
      5 * 1024 * 1024 * 1024;

    if (
      currentBytes + fileSize >
      MAX_EVENT_BYTES
    ) {
      return Response.json(
        {
          error:
            "Das Upload-Limit von 5 GB wurde erreicht.",
        },
        { status: 413 }
      );
    }

    // ==========================================
    // DROPBOX TOKEN HOLEN
    // ==========================================
    const token =
      await getDropboxAccessToken();

    // ==========================================
    // DATEINAME SICHER MACHEN
    // ==========================================
    const safeFileName =
      String(fileName).replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    // ==========================================
    // DROPBOX PFAD
    // ==========================================
    const dropboxPath =
      `/event/${safeWeddingId}/${Date.now()}-${safeFileName}`;

    // ==========================================
    // TEMPORARY UPLOAD LINK ERSTELLEN
    // ==========================================
    const response = await fetch(
      "https://api.dropboxapi.com/2/files/get_temporary_upload_link",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          commit_info: {
            path: dropboxPath,
            mode: "add",
            autorename: true,
            mute: false,
          },
          duration: 14400,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Dropbox Upload-Link Fehler:",
        data
      );

      return Response.json(
        {
          error:
            "Upload-Link konnte nicht erstellt werden",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // LINK ZURÜCKGEBEN
    // ==========================================
    return Response.json({
      uploadLink: data.link,
      dropboxPath,
      fileName: safeFileName,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Upload-Link Fehler" },
      { status: 500 }
    );
  }
}