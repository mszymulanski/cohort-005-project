// PROTOTYPE — THROWAWAY (see knock-prototype.server.ts)
import type { Route } from "./+types/api.prototype-knock";
import { getCurrentUserId } from "~/lib/session";
import {
  identifyUser,
  knockConfig,
  signTokenFor,
  triggerDiscussionReply,
  seedSample,
  SAMPLE_KINDS,
  type SampleKind,
} from "~/lib/knock-prototype.server";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw new Response("Select a user from the DevUI panel", { status: 401 });
  await identifyUser(userId);
  return Response.json({
    userId: String(userId),
    userToken: await signTokenFor(userId),
    ...knockConfig(),
  });
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw new Response("Select a user from the DevUI panel", { status: 401 });
  const form = await request.formData();
  const kind = form.get("kind") as SampleKind | null;
  if (kind && SAMPLE_KINDS.includes(kind)) {
    // Prototype: seed a sample Notification of this kind for the current user.
    return Response.json(await seedSample(userId, kind));
  }
  const result = await triggerDiscussionReply(Number(form.get("replyId")));
  return Response.json(result);
}
