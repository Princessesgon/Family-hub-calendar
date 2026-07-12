import { auth } from "@/auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";

// The family's local timezone — used so "today" means today in Miami,
// not today according to the server's UTC clock.
const TIMEZONE = "America/New_York";

function ymdInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const todayStr = ymdInTimezone(now, TIMEZONE);

  // Fetch a window wider than "today" (24h before to 48h after) so we never
  // miss events due to timezone offset, then filter precisely below.
  const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (res.data.items ?? [])
      .map((event) => ({
        id: event.id,
        title: event.summary ?? "(No title)",
        start: event.start?.dateTime ?? event.start?.date ?? null,
        allDay: !event.start?.dateTime,
      }))
      .filter((event) => {
        if (!event.start) return false;
        const eventDay = event.allDay
          ? event.start.slice(0, 10) // all-day dates are already "YYYY-MM-DD"
          : ymdInTimezone(new Date(event.start), TIMEZONE);
        return eventDay === todayStr;
      });

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Failed to fetch calendar events", err);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
