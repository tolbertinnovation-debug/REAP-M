// Provider acceptance is not delivery confirmation. No third-party credentials are sent to browsers.
export function providerStatus(demo = false) {
  return {
    email: !demo && !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    sms:
      !demo &&
      !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_SMS_FROM
      ),
    whatsapp:
      !demo &&
      !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM
      ),
    enabled: !demo && process.env.ENABLE_OUTBOUND === "true",
    payments: "Manual verification",
    social: "Content planning and manual campaign metrics",
  };
}
export async function sendMessage(m) {
  const status = providerStatus();
  if (!status.enabled || !status[m.channel])
    throw new Error("Provider not configured.");
  let response;
  if (m.channel === "email") {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": m.id,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [m.email],
        subject: m.subject,
        text: m.body,
      }),
    });
    if (!response.ok) throw new Error("Email provider rejected request.");
    return (await response.json()).id;
  }
  const whatsapp = m.channel === "whatsapp";
  const to = m.phone.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(to))
    throw new Error("Recipient requires an international phone number.");
  const from = whatsapp
    ? process.env.TWILIO_WHATSAPP_FROM
    : process.env.TWILIO_SMS_FROM;
  const data = new URLSearchParams({
    To: whatsapp ? "whatsapp:" + to : to,
    From: whatsapp ? "whatsapp:" + from.replace(/^whatsapp:/, "") : from,
    Body: m.body,
  });
  response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Messages.json`,
    {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.TWILIO_ACCOUNT_SID +
              ":" +
              process.env.TWILIO_AUTH_TOKEN,
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: data,
    },
  );
  if (!response.ok) throw new Error("Messaging provider rejected request.");
  return (await response.json()).sid;
}
