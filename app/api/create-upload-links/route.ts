import { db } from "@/lib/firebase";

import {
  doc,
  getDoc,
} from "firebase/firestore";

let cachedDropboxToken: string | null = null;
let lastTokenSource: "cache" | "new" | "refreshed" = "new";

function clearDropboxTokenCache() {
  cachedDropboxToken = null;
}


async function getDropboxAccessToken() {

 if (cachedDropboxToken) {
  lastTokenSource = "cache";
  return cachedDropboxToken;
}
  
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

cachedDropboxToken = data.access_token;
lastTokenSource = "new";

return cachedDropboxToken;
}

async function fetchDropbox(
  url: string,
  options: RequestInit
) {
  let token =
    await getDropboxAccessToken();

  let response = await fetch(url, {
    ...options,
   headers: {
  ...options.headers,
  Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearDropboxTokenCache();
    lastTokenSource = "refreshed";

    token =
      await getDropboxAccessToken();

    response = await fetch(url, {
      ...options,
  headers: {
  ...options.headers,
  Authorization: `Bearer ${token}`,
      },
    });
  }

  return response;
}

export async function POST(req: Request) {
  try {
    
const {
  weddingId,
  files,
} = await req.json();
   

    // ==========================================
    // DATEN PRÜFEN
    // ==========================================
 if (
  !weddingId ||
  !Array.isArray(files) ||
  files.length === 0
) {
      return Response.json(
        { error: "Daten fehlen" },
        { status: 400 }
      );
    }

 const totalFileSize = files.reduce(
  (sum, file) => sum + Number(file.sizeBytes || 0),
  0
);
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
     currentBytes + totalFileSize >
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


const uploads = await Promise.all(
  files.map(async (file) => {
    const safeFileName =
      String(file.fileName).replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

    const dropboxPath =
      `/event/${safeWeddingId}/${Date.now()}-${safeFileName}`;

    const response = await fetchDropbox(
      "https://api.dropboxapi.com/2/files/get_temporary_upload_link",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      console.error("Dropbox Upload-Link Fehler:", data);
      throw new Error("Upload-Link konnte nicht erstellt werden");
    }

   return {
  uploadLink: data.link,
  dropboxPath,
  fileName: safeFileName,
  tokenSource: lastTokenSource,
};
   
  })
);

return Response.json({
  uploads,
});
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Upload-Link Fehler" },
      { status: 500 }
    );
  }
}