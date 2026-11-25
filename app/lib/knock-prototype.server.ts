// PROTOTYPE — THROWAWAY. Answers "Does Knock hold up against Cadence?" (wayfinder ticket).
// Lives on branch prototype/knock-spike, never merged to main.
import { Knock, signUserToken } from "@knocklabs/node";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { comments, users } from "~/db/schema";

try {
  process.loadEnvFile(".env");
} catch {}

export const knock = new Knock({ apiKey: process.env.KNOCK_SECRET_API_KEY });

export const knockConfig = () => ({
  publicKey: process.env.KNOCK_PUBLIC_API_KEY!,
  feedChannelId: process.env.KNOCK_FEED_CHANNEL_ID!,
});

/** Check 1: server signs an RS256 user token for the session user. */
export async function signTokenFor(userId: number) {
  return signUserToken(String(userId), {
    signingKey: process.env.KNOCK_SIGNING_KEY,
    expiresInSeconds: 60 * 60,
  });
}

export async function identifyUser(userId: number) {
  const u = db.select().from(users).where(eq(users.id, userId)).get();
  if (!u) throw new Error(`no user ${userId}`);
  return knock.users.update(String(u.id), {
    name: u.name,
    email: u.email,
    custom_properties: { role: u.role },
  } as any);
}

/** Check 2: fire the real catalogue Notification "Discussion Reply -> question author". */
export async function triggerDiscussionReply(replyId: number) {
  const reply = db.select().from(comments).where(eq(comments.id, replyId)).get();
  if (!reply?.parentId) throw new Error("not a reply");
  const question = db
    .select()
    .from(comments)
    .where(eq(comments.id, reply.parentId))
    .get()!;
  const actor = db.select().from(users).where(eq(users.id, reply.userId)).get()!;
  const author = db.select().from(users).where(eq(users.id, question.userId)).get()!;
  await Promise.all([identifyUser(actor.id), identifyUser(author.id)]);
  return knock.workflows.trigger("discussion-reply", {
    recipients: [String(author.id)],
    actor: String(actor.id),
    data: {
      lessonId: reply.lessonId,
      replyId: reply.id,
      questionId: question.id,
      excerpt: reply.body.slice(0, 120),
    },
  });
}

// ---- Notification Feed prototype (ticket: "What does the Notification Feed look like in Cadence?") ----
// All catalogue kinds go through the one workflow that exists in Knock (discussion-reply); the
// rendered copy and link ride in `data`. Real workflows per Notification are a build-time job.
export const SAMPLE_KINDS = [
  "refund-declined",
  "refund-approved",
  "refund-requested",
  "seat-claimed",
  "enrollment",
  "discussion-question",
  "discussion-reply",
] as const;
export type SampleKind = (typeof SAMPLE_KINDS)[number];

export async function seedSample(recipientId: number, kind: SampleKind) {
  const pick = (id: number) => db.select().from(users).where(eq(users.id, id)).get()!;
  const actors = [5, 6, 8, 9].map(pick);
  const actor = actors[Math.floor(Math.random() * actors.length)];
  const course = "Introduction to TypeScript";
  const lessonLink = "/courses/introduction-to-typescript/lessons/1";
  const samples: Record<SampleKind, { title: string; body: string; link: string; system?: boolean }> = {
    "refund-declined": {
      title: `Your refund request for “${course}” was declined`,
      body: "Decision note: you've completed more than half of the course. You can ask again.",
      link: "/dashboard",
      system: true,
    },
    "refund-approved": {
      title: `Your refund request for “${course}” was approved`,
      body: "$49.00 will go back to your original payment method.",
      link: "/dashboard",
      system: true,
    },
    "refund-requested": {
      title: `${actor.name} requested a refund for “${course}”`,
      body: "$49.00 · “The course wasn't what I expected.”",
      link: "/admin/refunds",
    },
    "seat-claimed": {
      title: `${actor.name} claimed a Seat in “${course}”`,
      body: "3 Seats left on your Team Licence.",
      link: "/team",
    },
    enrollment: {
      title: `${actor.name} enrolled in “${course}”`,
      body: "",
      link: "/instructor/1/students",
    },
    "discussion-question": {
      title: `${actor.name} asked a question in “What is TypeScript?”`,
      body: "“Does `unknown` replace `any` everywhere, or only at API boundaries?”",
      link: lessonLink,
    },
    "discussion-reply": {
      title: `${actor.name} replied to your question in “What is TypeScript?”`,
      body: "“Mostly at boundaries — `any` still shows up in migration code.”",
      link: lessonLink,
    },
  };
  const s = samples[kind];
  await Promise.all([identifyUser(recipientId), identifyUser(actor.id)]);
  return knock.workflows.trigger("discussion-reply", {
    recipients: [String(recipientId)],
    ...(s.system ? {} : { actor: String(actor.id) }),
    data: { kind, title: s.title, body: s.body, link: s.link },
  });
}
