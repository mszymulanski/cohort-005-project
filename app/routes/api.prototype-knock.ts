// PROTOTYPE — THROWAWAY (see knock-prototype.server.ts)
import type { Route } from "./+types/api.prototype-knock";
import { getCurrentUserId } from "~/lib/session";
import {
  identifyUser,
  knockConfig,
  signTokenFor,
  triggerDiscussionReply,
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
  const result = await triggerDiscussionReply(Number(form.get("replyId")));
  return Response.json(result);
}
