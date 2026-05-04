import webpush from "web-push";
import { getPushSubscriptionsForUserIds } from "../db";
import { ENV } from "./env";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:support@houdini-locksmith.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a specific user's subscriptions
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<boolean> {
  try {
    const subscriptions = await getPushSubscriptionsForUserIds([userId]);
    if (subscriptions.length === 0) return false;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "https://cdn.manus.im/houdini-mascot-192.png",
      badge: payload.badge || "https://cdn.manus.im/houdini-mascot-192.png",
      tag: payload.tag || "houdini-notification",
      data: payload.data || {},
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload
        )
      )
    );

    return results.some((r) => r.status === "fulfilled");
  } catch (error) {
    console.error("[Push] Error sending notification:", error);
    return false;
  }
}

/**
 * Send a push notification to multiple users
 */
export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<number> {
  let successCount = 0;
  for (const userId of userIds) {
    const success = await sendPushToUser(userId, payload);
    if (success) successCount++;
  }
  return successCount;
}
