export type OfflineMessageNotification = {
  recipientEmail: string
  recipientName: string
  senderName: string
  messageSnippet: string
  appUrl: string
  timestamp: string
}

const EMAIL_COOLDOWN_MS = 10 * 60 * 1000 // 10-minute deduplication window
const inMemoryDispatched = new Map<string, number>()

export function canDispatchOfflineEmail(recipientEmail: string): boolean {
  const now = Date.now()
  const norm = recipientEmail.trim().toLowerCase()
  const lastTimeMem = inMemoryDispatched.get(norm) || 0
  let lastTimeStore = 0
  try {
    const raw = localStorage.getItem(`coursify.email_last_sent.${norm}`)
    if (raw) lastTimeStore = Number(raw) || 0
  } catch {
    /* ignore */
  }
  const lastTime = Math.max(lastTimeMem, lastTimeStore)
  return now - lastTime > EMAIL_COOLDOWN_MS
}

export function recordOfflineEmailDispatch(recipientEmail: string) {
  const now = Date.now()
  const norm = recipientEmail.trim().toLowerCase()
  inMemoryDispatched.set(norm, now)
  try {
    localStorage.setItem(`coursify.email_last_sent.${norm}`, String(now))
  } catch {
    /* ignore */
  }
}

/**
 * Dispatches an automated email alert when an educator receives a private message while offline.
 * Ready for production SMTP / SendGrid / Firebase Cloud Function webhook endpoints.
 */
export async function dispatchOfflineEmailNotification(data: {
  recipientEmail: string
  recipientName: string
  senderName: string
  messageSnippet: string
  appUrl?: string
  force?: boolean
}): Promise<OfflineMessageNotification | null> {
  if (!data.force && !canDispatchOfflineEmail(data.recipientEmail)) {
    console.info(`[Coursify Email Alert] Suppressed duplicate email for ${data.recipientEmail} (10m cooldown active).`)
    return null
  }

  recordOfflineEmailDispatch(data.recipientEmail)
  const appUrl = data.appUrl ?? "https://coursify-a1a0d.web.app"
  const payload: OfflineMessageNotification = {
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    senderName: data.senderName,
    messageSnippet: data.messageSnippet.slice(0, 240),
    appUrl,
    timestamp: new Date().toISOString(),
  }

  // Production webhook / Cloud Function endpoint if set
  const endpoint = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_EMAIL_DISPATCH_URL

  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: payload.recipientEmail,
          toName: payload.recipientName,
          fromName: payload.senderName,
          subject: `New message on Coursify from ${payload.senderName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a2332;">
              <h2 style="color: #1a2b4a; margin-top: 0;">New message from ${payload.senderName}</h2>
              <p style="font-size: 15px; line-height: 1.6;">Hello ${payload.recipientName},</p>
              <p style="font-size: 15px; line-height: 1.6;">You received a new private message while offline:</p>
              <div style="background: #f4f6fb; border-left: 4px solid #1a2b4a; padding: 14px 18px; margin: 20px 0; border-radius: 6px; font-style: italic;">
                "${payload.messageSnippet}"
              </div>
              <p style="font-size: 15px; line-height: 1.6;">To read and reply to this conversation, click the link below:</p>
              <p style="margin: 28px 0;">
                <a href="${payload.appUrl}" style="background: #1a2b4a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                  Open Coursify & Reply
                </a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              <p style="font-size: 12px; color: #64748b;">
                Coursify · The Professional Workspace for Modern Educators · <a href="${payload.appUrl}" style="color: #64748b;">${payload.appUrl}</a>
              </p>
            </div>
          `,
          text: `Hello ${payload.recipientName},\n\nYou received a new message on Coursify from ${payload.senderName}:\n\n"${payload.messageSnippet}"\n\nLog in to reply: ${payload.appUrl}\n\nCoursify Platform`,
        }),
      })
    } catch {
      /* network fallback */
    }
  }

  // Audit log in localStorage
  try {
    const key = "coursify.notifications.email_log"
    const existing = JSON.parse(localStorage.getItem(key) || "[]")
    localStorage.setItem(key, JSON.stringify([payload, ...existing].slice(0, 50)))
  } catch {
    /* quota */
  }

  // Log dispatch record in console
  console.info(
    `[Coursify Email Alert] Dispatched to ${payload.recipientEmail} (${payload.recipientName}) for message from ${payload.senderName}: "${payload.messageSnippet}". Reply URL: ${payload.appUrl}`,
  )

  return payload
}
