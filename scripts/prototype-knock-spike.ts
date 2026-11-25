// PROTOTYPE — THROWAWAY. Drives the running dev server + Knock's headless feed API.
// Usage: BASE=http://localhost:5174 npx tsx scripts/prototype-knock-spike.ts
import Knock from "@knocklabs/client";

const BASE = process.env.BASE ?? "http://localhost:5174";

async function sessionFor(userId: number) {
  const res = await fetch(`${BASE}/api/switch-user`, {
    method: "POST",
    body: new URLSearchParams({ userId: String(userId) }),
    redirect: "manual",
  });
  return res.headers.get("set-cookie")!.split(";")[0];
}

async function tokenFor(userId: number) {
  const cookie = await sessionFor(userId);
  const res = await fetch(`${BASE}/api/prototype-knock`, { headers: { cookie } });
  if (!res.ok) throw new Error(`token ${res.status} ${await res.text()}`);
  return { cookie, ...(await res.json()) } as {
    cookie: string; userId: string; userToken: string; publicKey: string; feedChannelId: string;
  };
}

function decodeJwt(t: string) {
  const [h, p] = t.split(".").slice(0, 2).map((x) => JSON.parse(Buffer.from(x, "base64url").toString()));
  return { header: h, payload: p };
}

async function feedFor(userId: number) {
  const t = await tokenFor(userId);
  const knock = new Knock(t.publicKey);
  knock.authenticate(t.userId, t.userToken);
  const feed = knock.feeds.initialize(t.feedChannelId);
  await feed.fetch();
  const s = feed.getState();
  return { t, knock, feed, items: s.items, meta: s.metadata };
}

const [cmd = "check1"] = process.argv.slice(2);

if (cmd === "check1") {
  const a = await tokenFor(7); // Olivia (student)
  const b = await tokenFor(1); // Alex (platform admin)
  console.log("token A:", decodeJwt(a.userToken));
  console.log("token B sub:", decodeJwt(b.userToken).payload.sub);
  const fa = await feedFor(7);
  const fb = await feedFor(1);
  console.log("feed as user 7 -> items", fa.items.length, "meta", fa.meta);
  console.log("feed as user 1 -> items", fb.items.length, "meta", fb.meta);
  // Negative: user 7's token against user 1's feed must be rejected.
  const bad = await fetch(
    `https://api.knock.app/v1/users/1/feeds/${a.feedChannelId}`,
    { headers: { Authorization: `Bearer ${a.publicKey}`, "X-Knock-User-Token": a.userToken } },
  );
  console.log("user 7 token reading user 1 feed ->", bad.status);
  const noTok = await fetch(
    `https://api.knock.app/v1/users/7/feeds/${a.feedChannelId}`,
    { headers: { Authorization: `Bearer ${a.publicKey}` } },
  );
  console.log("no user token reading user 7 feed ->", noTok.status);
  process.exit(0);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitForItems(userId: number, n: number) {
  for (let i = 0; i < 15; i++) {
    const f = await feedFor(userId);
    if (f.items.length >= n) return f;
    await sleep(1000);
  }
  return feedFor(userId);
}
const summarize = (f: Awaited<ReturnType<typeof feedFor>>) =>
  f.items.map((i: any) => ({ id: i.id, seen: !!i.seen_at, read: !!i.read_at, archived: !!i.archived_at, actors: i.actors?.map((a: any) => a.name), blocks: i.blocks?.map((b: any) => b.rendered ?? b.content) }));

if (cmd === "check2") {
  // Alex (1) replies to Olivia's question (comment 13 <- reply 14). Olivia (7) should get it, Alex should not.
  const a = await tokenFor(1);
  const res = await fetch(`${BASE}/api/prototype-knock`, { method: "POST", headers: { cookie: a.cookie }, body: new URLSearchParams({ replyId: "14" }) });
  console.log("trigger ->", res.status, await res.text());
  const olivia = await waitForItems(7, 1);
  const alex = await feedFor(1);
  console.log("Olivia feed:", olivia.meta, JSON.stringify(summarize(olivia), null, 1));
  console.log("Alex feed:", alex.meta.total_count, "items");
  process.exit(0);
}

if (cmd === "check3") {
  const f = await feedFor(7);
  console.log("list: ", f.items.length, "unread", f.meta.unread_count, "unseen", f.meta.unseen_count);
  await f.feed.markAsSeen(f.items);
  await f.feed.fetch();
  console.log("after markAsSeen:", f.feed.getState().metadata);
  await f.feed.markAsRead(f.items);
  await f.feed.fetch();
  console.log("after markAsRead:", f.feed.getState().metadata);
  await f.feed.markAsUnread(f.items);
  await f.feed.fetch();
  console.log("after markAsUnread:", f.feed.getState().metadata);
  await f.feed.markAllAsRead();
  await f.feed.fetch();
  console.log("after markAllAsRead:", f.feed.getState().metadata);
  process.exit(0);
}

if (cmd === "check4") {
  // Person mutes Feed for the discussion-reply category via THEIR OWN user token.
  const f = await feedFor(7);
  const { knock } = f;
  const set = async (channel_types: Record<string, boolean>) => {
    const prefs = await knock.user.setPreferences({ categories: { "discussion-reply": { channel_types } } } as any);
    console.log("prefs now:", JSON.stringify((prefs as any).categories));
  };
  const trigger = async () => {
    const a = await tokenFor(1);
    await fetch(`${BASE}/api/prototype-knock`, { method: "POST", headers: { cookie: a.cookie }, body: new URLSearchParams({ replyId: "14" }) });
    await sleep(4000);
    return (await feedFor(7)).meta.total_count;
  };
  const before = (await feedFor(7)).meta.total_count;
  await set({ in_app_feed: false });
  console.log("feed muted: total", before, "->", await trigger(), "(should be unchanged)");
  await set({ in_app_feed: true, email: false });
  console.log("feed on, email off: total ->", await trigger(), "(should be +1)");
  await set({ in_app_feed: true, email: true });
  process.exit(0);
}
