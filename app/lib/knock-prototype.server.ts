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
