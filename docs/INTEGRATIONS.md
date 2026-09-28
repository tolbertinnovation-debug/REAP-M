# Integration setup

## In-app communication

Customer account messages and staff replies are stored in the application database and work without third-party services. Staff can draft external messages from the customer directory. Marketing messages are blocked unless the contact has opted in, with consent checked again at send time.

## Email

Connect a verified sender domain in Resend. Set `RESEND_API_KEY`, `EMAIL_FROM` and `ENABLE_OUTBOUND=true` in the server environment. The adapter uses `POST https://api.resend.com/emails`, plain text content and an idempotency key. Test with an address controlled by the operator. Reference: https://resend.com/docs/api-reference/emails/send-email

## SMS

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` and `ENABLE_OUTBOUND=true`. Use an approved sender and E.164 recipient numbers. Check account destination permissions, sender availability and pricing for Liberia before enabling. Reference: https://www.twilio.com/docs/messaging/api/message-resource

## WhatsApp

Set `TWILIO_WHATSAPP_FROM` to an approved WhatsApp sender alongside the Twilio account credentials. The adapter sends free-form messages through Twilio's Messages API. These require a valid customer service conversation window; business-initiated messages outside that window need approved templates and a template-aware extension. Do not assume a drafted message can be sent to every contact. Connect approved templates and applicable opt-in policies before broad outbound campaigns.

## Message states

`draft` → `sending` → `accepted` on provider acceptance. Timeouts or failures become `review_required`; the app deliberately does not blindly resend messages whose delivery is uncertain. Check the provider dashboard before creating a replacement draft. No delivery webhook is implemented, so “accepted” is not “delivered.” A process interrupted during sending may retain `sending`; operators must reconcile it against the provider.

The demo always blocks sending, even if credentials are set. Secrets stay on the server. The settings page exposes connection booleans only.

## Payments

The customer chooses cash, mobile money or bank transfer. Staff independently verify funds and record amount, method and receipt/reference. The API rejects overpayments and refunds above the recorded amount. A paid order must be refunded before cancellation. The app does not initiate real money transfers.

To add a gateway, create checkout sessions on the server, verify signed callbacks, deduplicate provider event IDs, reconcile settlement, and post ledger entries only after verified payment events. Do not accept browser success messages as payment confirmation.

## Social advertising

Campaign records contain content, channel, status, planned budget, actual spend, impressions and clicks. The copy action supports manual publication in the chosen social account. Metrics are entered manually and identified as such. No account connection, posting permission, automatic scheduling or advertisement purchase is implied.
