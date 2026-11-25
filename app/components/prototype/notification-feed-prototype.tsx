// PROTOTYPE — THROWAWAY. Answers "What does the Notification Feed look like in Cadence?" (wayfinder ticket).
// Lives on branch prototype/notification-feed, never merged to main.
//
// Plan: three structurally different Notification Feeds, mounted inside the real app layout and
// switchable with ?variant= (or the floating bar), all running against the REAL Knock headless feed
// (signed user token, realtime socket, seen/read state). Copy + link come from `item.data`.
//   A  Bell popover in the sidebar header. Badge = unseen (clears on open). Dots = unread.
//   B  Top-bar bell → right-hand drawer grouped by day. Badge = unread (clears only as you read).
//   C  "Notifications" sidebar item → full inbox page (list + detail pane, filters). Badge = unseen.
import Knock, { type FeedItem } from "@knocklabs/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Inbox,
  MessageCircle,
  MessageSquare,
  Receipt,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { UserAvatar } from "~/components/user-avatar";

export type Variant = "A" | "B" | "C";
const VARIANTS: { key: Variant; name: string }[] = [
  { key: "A", name: "Bell popover" },
  { key: "B", name: "Drawer, grouped by day" },
  { key: "C", name: "Inbox page" },
];
const KINDS = [
  "refund-declined",
  "refund-approved",
  "refund-requested",
  "seat-claimed",
  "enrollment",
  "discussion-question",
  "discussion-reply",
];

type Item = FeedItem<{ kind?: string; title?: string; body?: string; link?: string }>;
type Meta = { total_count: number; unread_count: number; unseen_count: number };

interface FeedCtx {
  variant: Variant;
  setVariant: (v: Variant) => void;
  items: Item[];
  meta: Meta;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  markSeen: () => void;
  markRead: (i: Item) => void;
  markUnread: (i: Item) => void;
  markAllRead: () => void;
  open: (i: Item) => void;
  seed: (kind: string) => Promise<void>;
  resetStates: () => void;
}
const Ctx = createContext<FeedCtx | null>(null);
const useFeed = () => useContext(Ctx);

export function FeedPrototypeProvider({
  currentUserId,
  children,
}: {
  currentUserId: number | null;
  children: React.ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("variant") as Variant) || "A";
  const [variant, setVariantState] = useState<Variant>(
    VARIANTS.some((v) => v.key === initial) ? initial : "A"
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<Meta>({ total_count: 0, unread_count: 0, unseen_count: 0 });
  const [status, setStatus] = useState<FeedCtx["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<ReturnType<Knock["feeds"]["initialize"]> | null>(null);
  const variantRef = useRef(variant);
  variantRef.current = variant;

  const setVariant = useCallback(
    (v: Variant) => {
      setVariantState(v);
      setParams(
        (p) => {
          p.set("variant", v);
          return p;
        },
        { replace: true }
      );
      if (v === "C" && !location.pathname.startsWith("/prototype/notifications")) {
        navigate(`/prototype/notifications?variant=C`);
      }
    },
    [setParams, navigate, location.pathname]
  );

  // Keep ?variant= on the URL after in-app navigation drops it.
  useEffect(() => {
    if (params.get("variant") !== variant) {
      setParams(
        (p) => {
          p.set("variant", variant);
          return p;
        },
        { replace: true }
      );
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    let knock: Knock | null = null;
    setStatus("loading");
    setItems([]);
    (async () => {
      try {
        const res = await fetch("/api/prototype-knock");
        if (!res.ok) throw new Error(`token ${res.status}`);
        const cfg = await res.json();
        knock = new Knock(cfg.publicKey);
        knock.authenticate(cfg.userId, cfg.userToken);
        const feed = knock.feeds.initialize(cfg.feedChannelId, { page_size: 50 });
        feedRef.current = feed;
        const sync = () => {
          const s = feed.getState();
          setItems(s.items as Item[]);
          setMeta(s.metadata as Meta);
        };
        feed.store.subscribe(sync);
        feed.on("items.received.realtime", ({ items: fresh }: any) => {
          const latest = fresh?.[0] as Item | undefined;
          if (latest && variantRef.current !== "B") {
            toast(latest.data?.title ?? "New notification", {
              description: latest.data?.body || undefined,
            });
          }
        });
        await feed.fetch();
        feed.listenForUpdates();
        if (!cancelled) setStatus("ready");
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setError(e.message);
        }
      }
    })();
    return () => {
      cancelled = true;
      feedRef.current?.teardown();
      feedRef.current = null;
      knock?.teardown();
    };
  }, [currentUserId]);

  const value = useMemo<FeedCtx>(() => {
    const f = () => feedRef.current;
    return {
      variant,
      setVariant,
      items,
      meta,
      status,
      error,
      markSeen: () => {
        if (meta.unseen_count > 0) f()?.markAllAsSeen();
      },
      markRead: (i) => void f()?.markAsRead(i),
      markUnread: (i) => void f()?.markAsUnread(i),
      markAllRead: () => void f()?.markAllAsRead(),
      open: (i) => {
        f()?.markAsRead(i);
        f()?.markAsInteracted(i);
        if (i.data?.link) navigate(i.data.link);
      },
      seed: async (kind) => {
        await fetch("/api/prototype-knock", {
          method: "POST",
          body: new URLSearchParams({ kind }),
        });
      },
      resetStates: () => {
        f()?.markAsUnseen(items);
        f()?.markAsUnread(items);
      },
    };
  }, [variant, setVariant, items, meta, status, error, navigate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------- shared bits ----------

// Items from the earlier spike have no data.title: fall back to Knock's rendered template text.
function titleOf(i: Item) {
  if (i.data?.title) return i.data.title;
  const b = (i.blocks?.[0] as any)?.rendered as string | undefined;
  return b ? b.replace(/<[^>]+>/g, "").trim() : "Notification";
}

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function KindIcon({ kind, className }: { kind?: string; className?: string }) {
  const c = cn("size-4", className);
  if (kind?.startsWith("refund")) return <Receipt className={c} />;
  if (kind === "seat-claimed") return <UsersRound className={c} />;
  if (kind === "enrollment") return <GraduationCap className={c} />;
  if (kind === "discussion-question") return <MessageSquare className={c} />;
  return <MessageCircle className={c} />;
}

function Leading({ item }: { item: Item }) {
  const actor = item.actors?.[0] as any;
  if (actor?.name) return <UserAvatar name={actor.name} avatarUrl={actor.avatar ?? null} />;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <KindIcon kind={item.data?.kind} />
    </span>
  );
}

function CountBadge({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground",
        className
      )}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

function Empty({ text = "You're all caught up." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
      <Bell className="size-6 opacity-40" />
      {text}
    </div>
  );
}

// ---------- Variant A: bell popover in the sidebar header ----------

export function FeedBellA() {
  const feed = useFeed();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  if (!feed || feed.variant !== "A") return null;
  const shown = tab === "unread" ? feed.items.filter((i) => !i.read_at) : feed.items;
  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) feed.markSeen(); // opening the popover = "seen"
        }}
        title="Notifications"
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Bell className="size-4" />
        <CountBadge n={feed.meta.unseen_count} className="absolute -right-0.5 -top-0.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex gap-1 text-sm">
              {(["all", "unread"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md px-2 py-1 capitalize",
                    tab === t ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"
                  )}
                >
                  {t}
                  {t === "unread" && feed.meta.unread_count > 0 ? ` (${feed.meta.unread_count})` : ""}
                </button>
              ))}
            </div>
            <button
              onClick={feed.markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {shown.length === 0 && <Empty />}
            {shown.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  feed.open(i);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-accent/50"
              >
                <Leading item={i} />
                <div className="min-w-0 flex-1">
                  <div className={cn("line-clamp-2 text-sm", !i.read_at && "font-medium")}>
                    {titleOf(i)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{ago(i.inserted_at)}</div>
                </div>
                {!i.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Variant B: top bar bell → right drawer grouped by day ----------

function dayGroup(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return "Earlier";
}

export function FeedTopBarB() {
  const feed = useFeed();
  const [open, setOpen] = useState(false);
  if (!feed || feed.variant !== "B") return null;
  const groups = ["Today", "Yesterday", "Earlier"]
    .map((g) => ({ g, rows: feed.items.filter((i) => dayGroup(i.inserted_at) === g) }))
    .filter((x) => x.rows.length);
  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center justify-end border-b bg-background/90 px-6 backdrop-blur">
        <button
          onClick={() => setOpen(true)}
          className="relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-accent"
        >
          <Bell className="size-4" />
          Notifications
          <CountBadge n={feed.meta.unread_count} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-[54] bg-black/30" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 right-0 z-[55] flex w-[28rem] max-w-full flex-col border-l bg-background shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b px-5">
              <div>
                <div className="font-semibold">Notifications</div>
                <div className="text-xs text-muted-foreground">
                  {feed.meta.unread_count} unread of {feed.meta.total_count}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={feed.markAllRead}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Mark all read
                </button>
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-accent">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 && <Empty />}
              {groups.map(({ g, rows }) => (
                <section key={g}>
                  <h3 className="sticky top-0 bg-muted/70 px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    {g}
                  </h3>
                  {rows.map((i) => (
                    <div
                      key={i.id}
                      className={cn("group relative flex gap-3 border-b px-5 py-4", !i.read_at && "bg-primary/5")}
                    >
                      {!i.read_at && <span className="absolute left-2 top-5 size-1.5 rounded-full bg-primary" />}
                      <Leading item={i} />
                      <div className="min-w-0 flex-1">
                        <div className={cn("text-sm", !i.read_at && "font-semibold")}>{titleOf(i)}</div>
                        {i.data?.body && (
                          <div className="mt-1 text-sm text-muted-foreground">{i.data.body}</div>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{ago(i.inserted_at)}</span>
                          <button
                            onClick={() => {
                              feed.open(i);
                              setOpen(false);
                            }}
                            className="flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            View <ExternalLink className="size-3" />
                          </button>
                          <button
                            onClick={() => (i.read_at ? feed.markUnread(i) : feed.markRead(i))}
                            className="invisible hover:text-foreground group-hover:visible"
                          >
                            Mark {i.read_at ? "unread" : "read"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// ---------- Variant C: sidebar nav item → inbox page ----------

export function FeedNavC() {
  const feed = useFeed();
  if (!feed || feed.variant !== "C") return null;
  return (
    <NavLink
      to="/prototype/notifications"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Inbox className="size-4" />
      Notifications
      <CountBadge n={feed.meta.unseen_count} className="ml-auto" />
    </NavLink>
  );
}

export function FeedInboxPageC() {
  const feed = useFeed();
  const [filter, setFilter] = useState<"all" | "unread" | "refunds" | "discussions" | "teams">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seenOnce = useRef(false);
  useEffect(() => {
    if (feed && feed.status === "ready" && !seenOnce.current) {
      seenOnce.current = true;
      feed.markSeen(); // visiting the page = "seen"
    }
  }, [feed?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!feed) return null;
  if (feed.variant !== "C")
    return (
      <div className="p-8 text-sm text-muted-foreground">
        The inbox page only exists in variant C. Switch with the bar below.
      </div>
    );
  const match = (i: Item) => {
    const k = i.data?.kind ?? "";
    if (filter === "unread") return !i.read_at;
    if (filter === "refunds") return k.startsWith("refund");
    if (filter === "discussions") return k.startsWith("discussion");
    if (filter === "teams") return k === "seat-claimed" || k === "enrollment";
    return true;
  };
  const rows = feed.items.filter(match);
  const selected = feed.items.find((i) => i.id === selectedId) ?? null;
  return (
    <div className="flex h-full">
      <div className="flex w-[26rem] shrink-0 flex-col border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Notifications</h1>
            <button
              onClick={feed.markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["all", "unread", "refunds", "discussions", "teams"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs capitalize",
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                {f}
                {f === "unread" && ` ${feed.meta.unread_count}`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 && <Empty text="Nothing matches this filter." />}
          {rows.map((i) => (
            <button
              key={i.id}
              onClick={() => {
                setSelectedId(i.id);
                feed.markRead(i);
              }}
              className={cn(
                "flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-accent/50",
                selectedId === i.id && "bg-accent"
              )}
            >
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <KindIcon kind={i.data?.kind} />
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-sm", !i.read_at && "font-semibold")}>
                  {titleOf(i)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {i.data?.body || i.data?.kind}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] text-muted-foreground">{ago(i.inserted_at)}</span>
                {!i.read_at && <span className="size-2 rounded-full bg-primary" />}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        {!selected ? (
          <Empty text="Select a Notification to read it." />
        ) : (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <KindIcon kind={selected.data?.kind} className="size-3.5" />
              {selected.data?.kind}
              <span>· {new Date(selected.inserted_at).toLocaleString()}</span>
            </div>
            <h2 className="text-xl font-semibold">{titleOf(selected)}</h2>
            {selected.data?.body && <p className="text-muted-foreground">{selected.data.body}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => feed.open(selected)}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Open
              </button>
              <button
                onClick={() => feed.markUnread(selected)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Mark unread
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- floating prototype bar: variant switcher + sample seeding + live state ----------

export function FeedPrototypeBar() {
  const feed = useFeed();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState(KINDS[0]);
  useEffect(() => {
    if (!feed) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable]")) return;
      const idx = VARIANTS.findIndex((v) => v.key === feed.variant);
      if (e.key === "ArrowLeft") feed.setVariant(VARIANTS[(idx + VARIANTS.length - 1) % VARIANTS.length].key);
      if (e.key === "ArrowRight") feed.setVariant(VARIANTS[(idx + 1) % VARIANTS.length].key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [feed]);
  if (!feed || process.env.NODE_ENV === "production") return null;
  const idx = VARIANTS.findIndex((v) => v.key === feed.variant);
  const go = (d: number) => feed.setVariant(VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length].key);
  const cur = VARIANTS[idx];
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 px-3 py-2 text-xs text-white shadow-2xl ring-1 ring-white/20">
      <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-white/15">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-44 text-center font-medium">
        {cur.key} ({cur.name})
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/15">
        <ChevronRight className="size-4" />
      </button>
      <span className="h-4 w-px bg-white/30" />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="rounded bg-zinc-800 px-1.5 py-1 text-white"
      >
        {KINDS.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await feed.seed(kind);
          setBusy(false);
        }}
        className="rounded-full bg-white px-2.5 py-1 font-semibold text-zinc-900 disabled:opacity-50"
      >
        {busy ? "…" : "+ send"}
      </button>
      <button onClick={feed.resetStates} className="rounded-full px-2 py-1 hover:bg-white/15">
        reset
      </button>
      <span className="h-4 w-px bg-white/30" />
      <span className="font-mono text-[11px] text-white/80">
        {feed.status === "error"
          ? `error: ${feed.error}`
          : `total ${feed.meta.total_count} · unread ${feed.meta.unread_count} · unseen ${feed.meta.unseen_count}`}
      </span>
    </div>
  );
}
