"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bookmark, Check, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ReleaseCountdown({
  date,
  verified,
}: {
  date: string | null;
  verified: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (!date || !verified || !Number.isFinite(Date.parse(date)))
    return (
      <div className="countdown-pending">
        <span>Awaiting a verified release date</span>
        <p>We only count down to an officially sourced date.</p>
      </div>
    );
  const seconds = now
    ? Math.max(0, Math.floor((new Date(date).getTime() - now) / 1000))
    : 0;
  if (now && seconds === 0)
    return (
      <p>
        The configured release date has arrived. Check the latest official
        announcements.
      </p>
    );
  return (
    <div
      className="countdown"
      aria-label="Time until configured GTA VI release"
    >
      {[
        [Math.floor(seconds / 86400), "Days"],
        [Math.floor(seconds / 3600) % 24, "Hours"],
        [Math.floor(seconds / 60) % 60, "Minutes"],
        [seconds % 60, "Seconds"],
      ].map(([value, label]) => (
        <div key={label}>
          <strong>{now ? String(value).padStart(2, "0") : "—"}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
const bookmarkKey = "lsw-bookmarks";
function subscribeBookmarks(callback: () => void) {
  window.addEventListener("bookmarkschange", callback);
  return () => window.removeEventListener("bookmarkschange", callback);
}
export function BookmarkButton({ slug }: { slug: string }) {
  const raw = useSyncExternalStore(
    subscribeBookmarks,
    () => {
      try {
        return localStorage.getItem(bookmarkKey) || "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  let saved: string[];
  try {
    saved = JSON.parse(raw);
    if (!Array.isArray(saved)) saved = [];
  } catch {
    saved = [];
  }
  const selected = saved.includes(slug);
  function toggle() {
    try {
      localStorage.setItem(
        bookmarkKey,
        JSON.stringify(
          selected ? saved.filter((v) => v !== slug) : [...saved, slug],
        ),
      );
      window.dispatchEvent(new Event("bookmarkschange"));
    } catch {}
  }
  return (
    <Button variant="secondary" onClick={toggle} aria-pressed={selected}>
      <Bookmark size={16} fill={selected ? "currentColor" : "none"} />
      {selected ? "Saved" : "Save story"}
    </Button>
  );
}
export function ShareLinks({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const u = encodeURIComponent(url),
    t = encodeURIComponent(title);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(true);
    }
  }
  return (
    <div className="share-links">
      <Button variant="secondary" onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
        {copied ? "Copied" : "Copy link"}
      </Button>
      {[
        ["X", `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
        ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
        ["Reddit", `https://www.reddit.com/submit?url=${u}&title=${t}`],
        ["WhatsApp", `https://wa.me/?text=${t}%20${u}`],
      ].map(([name, href]) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="share-link"
        >
          {name}
        </a>
      ))}
      {error && <span role="status">Copy the address from your browser.</span>}
    </div>
  );
}
type SearchResult = { title: string; href: string; type: string };
export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery),
    [results, setResults] = useState<SearchResult[]>([]),
    [resultsFor, setResultsFor] = useState(''),
    [state, setState] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState("Searching…");
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        setResults(data.results);
        setResultsFor(query);
        setState(data.results.length ? "" : "No matching stories or guides.");
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setResultsFor(query);
          setState("Search is unavailable. Please try again.");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <div className="search-area">
      <form action="/search" className="search-form">
        <Search />
        <input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the publication"
          placeholder="Search news, vehicles, characters, heists…"
          autoComplete="off"
          maxLength={100}
        />
        <Button type="submit">Search</Button>
      </form>
      {query.trim().length >= 2 && (
        <div className="search-results">
          <p role="status" className="muted">
            {resultsFor === query ? state : 'Searching…'}
          </p>
          {resultsFor === query && results.map((r) => (
            <Link key={r.href} href={r.href}>
              <span className="eyebrow">{r.type}</span>
              <strong>{r.title}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
export function ArticleView({ id }: { id: string }) {
  useEffect(() => {
    try {
      const key = `lsw-view-${id}`;
      if (sessionStorage.getItem(key)) return;
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .then((r) => {
          if (r.ok) sessionStorage.setItem(key, "1");
        })
        .catch(() => {});
    } catch {}
  }, [id]);
  return null;
}
