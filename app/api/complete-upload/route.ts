import { db } from "@/lib/firebase";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
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
      guestName,
      fileName,
      dropboxPath,
      thumbnailDropboxPath,
      sizeBytes,
    } = await req.json();

    // ==========================================
    // DATEN PRÜFEN
    // ==========================================
    if (
      !weddingId ||
      !fileName ||
      !dropboxPath ||
      !thumbnailDropboxPath
    ) {
      return Response.json(
        { error: "Daten fehlen" },
        { status: 400 }
      );
    }

    const fileSize =
      Number(sizeBytes || 0);

    if (!fileSize || fileSize <= 0) {
      return Response.json(
        {
          error:
            "Dateigröße ungültig",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // WEDDING ID SICHER MACHEN
    // ==========================================
    const safeWeddingId =
      String(weddingId).replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    // ==========================================
    // EVENT EXISTIERT?
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
        {
          error:
            "Event nicht gefunden",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // DROPBOX TOKEN HOLEN
    // ==========================================
    const token =
      await getDropboxAccessToken();

    // ==========================================
    // SHARED LINK ERSTELLEN
    // ==========================================
    const linkResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          path: dropboxPath,
        }),
      }
    );

    const linkData =
      await linkResponse.json();

    if (!linkResponse.ok) {
      console.error(
        "Dropbox Link Fehler:",
        linkData
      );

      return Response.json(
        {
          error:
            "Dropbox Link Fehler",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // DIREKTES BILD ERZEUGEN
    // ==========================================
    let imageUrl = linkData.url;

    imageUrl = imageUrl.replace(
      "www.dropbox.com",
      "dl.dropboxusercontent.com"
    );

    imageUrl = imageUrl.replace(
      "?dl=0",
      "?raw=1"
    );

    imageUrl = imageUrl.replace(
      "&dl=0",
      "&raw=1"
    );

    // ==========================================
// THUMBNAIL LINK ERZEUGEN
// ==========================================
const thumbnailLinkResponse = await fetch(
  "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type":
        "application/json",
    },
    body: JSON.stringify({
      path: thumbnailDropboxPath,
    }),
  }
);

const thumbnailLinkData =
  await thumbnailLinkResponse.json();

if (!thumbnailLinkResponse.ok) {
  console.error(
    "Dropbox Thumbnail Link Fehler:",
    thumbnailLinkData
  );

  return Response.json(
    {
      error:
        "Dropbox Thumbnail Link Fehler",
    },
    { status: 500 }
  );
}

let thumbnailUrl =
  thumbnailLinkData.url;

thumbnailUrl =
  thumbnailUrl.replace(
    "www.dropbox.com",
    "dl.dropboxusercontent.com"
  );

thumbnailUrl =
  thumbnailUrl.replace(
    "?dl=0",
    "?raw=1"
  );

thumbnailUrl =
  thumbnailUrl.replace(
    "&dl=0",
    "&raw=1"
  );

    // ==========================================
    // FOTO IN FIRESTORE SPEICHERN
    // ==========================================
await addDoc(
  collection(
    db,
    "weddings",
    safeWeddingId,
    "photos"
  ),
  {
    guestName: guestName || "Gast",
    fileName,

    imageUrl,
    thumbnailUrl,

    dropboxPath,
    thumbnailDropboxPath,

    sizeBytes: fileSize,
    createdAt: new Date(),
  }
);

    // ==========================================
    // UPLOADEDBYTES ERHÖHEN
    // ==========================================
    const currentBytes =
      weddingSnap.data()
        .uploadedBytes || 0;

    await updateDoc(
      weddingRef,
      {
        uploadedBytes:
          currentBytes +
          fileSize,
      }
    );

    return Response.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          "Upload konnte nicht abgeschlossen werden",
      },
      { status: 500 }
    );
  }
}