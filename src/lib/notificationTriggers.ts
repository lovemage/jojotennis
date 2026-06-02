import "server-only";
import { getAdminMessaging } from "./firebaseAdmin";
import { getSupabaseServiceClient, hasSupabaseConfig } from "./supabase";

export type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function notifyUser(uid: string, payload: NotificationPayload) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { sent: 0 };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("fcm_tokens").select("token").eq("uid", uid);
  if (error) throw error;

  const tokens = (data ?? []).map((row) => row.token).filter(Boolean);
  if (tokens.length === 0) return { sent: 0 };

  const messaging = getAdminMessaging();
  const responses = await Promise.allSettled(
    tokens.map((token) =>
      messaging.send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: { url: payload.url ?? "/" },
      }),
    ),
  );

  const staleTokens = responses
    .map((result, index) => ({ result, token: tokens[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ token }) => token);

  if (staleTokens.length > 0) {
    await supabase.from("fcm_tokens").delete().in("token", staleTokens);
  }

  return { sent: responses.filter((result) => result.status === "fulfilled").length };
}
