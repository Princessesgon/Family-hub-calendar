"use client";

import { useEffect, useState } from "react";

type Member = {
  name: string;
  color: string;
  emoji: string;
  events: { time: string; title: string }[];
};

const FAMILY: Member[] = [
  {
    name: "Sofía",
    color: "var(--coral)",
    emoji: "👧",
    events: [
      { time: "5:30 PM", title: "Ballet" },
      { time: "7:15 PM", title: "Dentist" },
    ],
  },
  {
    name: "Emma",
    color: "var(--violet)",
    emoji: "🧒",
    events: [{ time: "6:00 PM", title: "Soccer practice" }],
  },
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: avoids server/client hydration mismatch for the clock
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Home() {
  const now = useClock();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ from: "user" | "hub"; text: string }[]>([
    {
      from: "hub",
      text: "Hi! Ask me what's happening today, or tell me to add something to the calendar.",
    },
  ]);

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
      {/* Top bar: date, time, weather */}
      <header className="flex items-center justify-between gap-4 rounded-3xl bg-paper border border-line px-6 py-5 sm:px-8 sm:py-6">
        <div>
          <p className="font-body text-ink-soft text-sm sm:text-base uppercase tracking-[0.15em]">
            {dateLabel || "\u00A0"}
          </p>
          <p className="font-display text-4xl sm:text-5xl text-ink italic">
            {timeLabel || "\u00A0"}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-oat px-5 py-3">
          <span className="text-3xl sm:text-4xl" aria-hidden>
            ☀️
          </span>
          <div className="text-right">
            <p className="font-display text-2xl sm:text-3xl text-ink leading-none">78°</p>
            <p className="text-ink-soft text-xs sm:text-sm">Miami · Sunny</p>
          </div>
        </div>
      </header>

      {/* Family members + today's events */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {FAMILY.map((member) => (
          <div
            key={member.name}
            className="rounded-3xl bg-paper border border-line p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `color-mix(in srgb, ${member.color} 18%, white)` }}
                aria-hidden
              >
                {member.emoji}
              </span>
              <h2 className="font-display text-2xl text-ink">{member.name}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {member.events.length === 0 ? (
                <p className="text-ink-soft text-sm">Nothing scheduled today.</p>
              ) : (
                member.events.map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-oat px-4 py-3"
                  >
                    <span
                      className="w-1.5 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: member.color }}
                      aria-hidden
                    />
                    <span className="font-semibold text-ink text-sm sm:text-base w-20 shrink-0">
                      {ev.time}
                    </span>
                    <span className="text-ink text-sm sm:text-base">{ev.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Shopping list */}
      <section className="rounded-3xl bg-paper border border-line px-6 py-5 sm:px-8">
        <h2 className="font-display text-xl text-ink mb-3">🛒 Shopping list</h2>
        <p className="text-ink-soft text-sm">
          Placeholder — this will become a shared, tappable list.
        </p>
      </section>

      {/* Chat assistant */}
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
    </main>
  );
}
