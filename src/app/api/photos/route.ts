import { auth } from "@/auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";

const FOLDER_NAME = "Family_hub_calendar";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not signed in with Google" },
      { status: 401 }
    );
  }
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  try {
    const folderRes = await drive.files.list({
      q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      pageSize: 1,
    });
    const folder = folderRes.data.files?.[0];
    if (!folder?.id) {
      return NextResponse.json(
        { error: `Couldn't find a Google Drive folder named "${FOLDER_NAME}"` },
        { status: 404 }
      );
    }
    const filesRes = await drive.files.list({
      q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, mimeType)",
      pageSize: 50,
    });
    const files = filesRes.data.files ?? [];
    const photos = await Promise.all(
      files.map(async (file) => {
        const contentRes = await drive.files.get(
          { fileId: file.id!, alt: "media" },
          { responseType: "arraybuffer" }
        );
        const base64 = Buffer.from(contentRes.data as ArrayBuffer).toString(
          "base64"
        );
        return {
          id: file.id,
          name: file.name,
          dataUrl: `data:${file.mimeType};base64,${base64}`,
        };
      })
    );
    return NextResponse.json({ photos });
  } catch (err) {
    console.error("Failed to fetch photos from Drive", err);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
