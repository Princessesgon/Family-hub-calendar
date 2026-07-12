"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

type CalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  allDay: boolean;
};

function formatEventTime(iso: string | null, allDay: boolean) {
  if (!iso) return "";
  if (allDay) return "All day";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function useTodayEvents(enabled: boolean) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/calendar/events")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { events, loading, error };
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
}

function extractPhotoUrl(item: unknown): string | null {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const candidate = obj.dataUrl ?? obj.url ?? obj.src;
    if (typeof candidate === "string") return candidate;
  }
  return null;
}

const INACTIVITY_MS = 3 * 60 * 1000;
const SLIDE_INTERVAL_MS = 8000;

export default function Home() {
  const now = useClock();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && !session?.error;
  const { events, loading, error } = useTodayEvents(isSignedIn);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ from: "user" | "hub"; text: string }[]>([
    {
      from: "hub",
      text: "Hi! Ask me what's happening today, or tell me to add something to the calendar.",
    },
  ]);

  const [photos, setPhotos] = useState<string[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPhotos = useCallback(() => {
    setPhotosLoading(true);
    setPhotosError(null);
    fetch("/api/photos")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load photos");
        return res.json();
      })
      .then((data) => {
        const raw = data.photos ?? data.images ?? [];
        const urls = (raw as unknown[])
          .map(extractPhotoUrl)
          .filter((u): u is string => Boolean(u));
        setPhotos(urls);
      })
      .catch((err) => {
        setPhotosError(err.message);
      })
      .finally(() => {
        setPhotosLoading(false);
      });
  }, []);

  const openSlideshow = useCallback(() => {
    setSlideIndex(0);
    setShowSlideshow(true);
    if (photos.length === 0) loadPhotos();
  }, [photos.length, loadPhotos]);

  const closeSlideshow = useCallback(() => {
    setShowSlideshow(false);
  }, []);

  useEffect(() => {
    if (!showSlideshow || photos.length === 0) return;
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % photos.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [showSlideshow, photos.length]);

  useEffect(() => {
    if (!isSignedIn) return;

    function resetTimer() {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        openSlideshow();
      }, INACTIVITY_MS);
    }

    const events = ["mousemove", "mousedown", "touchstart", "keydown", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isSignedIn, openSlideshow]);

  const dateLabel = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";
  const timeLabel = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";

  function sendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { from: "user", text },
      {
        from: "hub",
        text: "I'm just a placeholder for now — once we connect the calendar and AI, I'll actually answer this.",
      },
    ]);
    setChatInput("");
  }

  return (
    <main className="flex-1 flex flex-col gap-5 p-5 sm:p-8 max-w-5xl w-full mx-auto">
      <header className="flex items-center justify-between gap-4 rounded-3xl bg-paper border border-line px-6 py-5 sm:px-8 sm:py-6">
        <div>
          <p className="font-body text-ink-soft text-sm sm:text-base uppercase tracking-[0.15em]">
            {dateLabel || "\u00A0"}
          </p>
          <p className="font-display text-4xl sm:text-5xl text-ink italic">
            {timeLabel || "\u00A0"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-oat px-5 py-3">
            <span className="text-3xl sm:text-4xl" aria-hidden>
              ☀️
            </span>
            <div className="text-right">
              <p className="font-display text-2xl sm:text-3xl text-ink leading-none">78°</p>
              <p className="text-ink-soft text-xs sm:text-sm">Miami · Sunny</p>
            </div>
          </div>
          {isSignedIn && (
            <button
              onClick={openSlideshow}
              className="rounded-2xl bg-oat px-4 py-3 text-ink-soft text-sm font-semibold"
            >
              📷 Photos
            </button>
          )}
          {isSignedIn ? (
            <button
              onClick={() => signOut()}
              className="rounded-2xl bg-oat px-4 py-3 text-ink-soft text-sm font-semibold"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="rounded-2xl bg-teal text-paper px-5 py-3 text-sm font-semibold"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <section className="rounded-3xl bg-paper border border-line p-6 flex flex-col gap-4">
        <h2 className="font-display text-2xl text-ink">📅 Today</h2>
        {!isSignedIn ? (
          <p className="text-ink-soft text-sm">
            Sign in with Google above to show today&apos;s real events here.
          </p>
        ) : loading ? (
          <p className="text-ink-soft text-sm">Loading events…</p>
        ) : error ? (
          <p className="text-coral text-sm">Couldn&apos;t load events: {error}</p>
        ) : events.length === 0 ? (
          <p className="text-ink-soft text-sm">Nothing scheduled today. 🎉</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 rounded-xl bg-oat px-4 py-3"
              >
                <span
                  className="w-1.5 h-6 rounded-full shrink-0 bg-teal"
                  aria-hidden
                />
                <span className="font-semibold text-ink text-sm sm:text-base w-24 shrink-0">
                  {formatEventTime(ev.start, ev.allDay)}
                </span>
                <span className="text-ink text-sm sm:text-base">{ev.title}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-paper border border-line px-6 py-5 sm:px-8">
        <h2 className="font-display text-xl text-ink mb-3">🛒 Shopping list</h2>
        <p className="text-ink-soft text-sm">
          Placeholder — this will become a shared, tappable list.
        </p>
      </section>

      <section className="rounded-3xl bg-teal-deep px-6 py-5 sm:px-8 sm:py-6 flex flex-col gap-4 flex-1 min-h-[220px]">
        <h2 className="font-display text-xl text-paper">💬 Family Assistant</h2>
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:text-base " +
                (m.from === "user"
                  ? "self-end bg-amber text-teal-deep"
                  : "self-start bg-paper text-ink")
              }
            >
              {m.text}
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-3"
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="¿Qué tenemos hoy?"
            className="flex-1 rounded-2xl bg-paper px-5 py-3.5 text-ink text-sm sm:text-base outline-none placeholder:text-ink-soft"
          />
          <button
            type="submit"
            className="rounded-2xl bg-amber text-teal-deep font-semibold px-6 py-3.5 text-sm sm:text-base active:scale-95 transition-transform"
          >
            Send
          </button>
        </form>
      </section>

      {showSlideshow && (
        <div
          onClick={closeSlideshow}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
        >
          {photosLoading ? (
            <p className="text-paper text-lg">Loading photos…</p>
          ) : photosError ? (
            <p className="text-paper text-lg px-8 text-center">
              Couldn&apos;t load photos: {photosError}
            </p>
          ) : photos.length === 0 ? (
            <p className="text-paper text-lg">No photos found yet.</p>
          ) : (
            <img
              src={photos[slideIndex]}
              alt="Family photo"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      )}
    </main>
  );
}
