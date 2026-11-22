# Postmark: transactional sending, suppression and resend

Research for GitHub issue #12. Sources are Postmark's own docs only; fetched 2026-11-21. Items the docs do not state are marked "Not documented".

## Message streams

- Stream types are `Inbound`, `Broadcasts`, `Transactional`. A server has at most 10 streams and only one Inbound. Default streams cannot be deleted. [Message Streams API](https://postmarkapp.com/developer/api/message-streams-api)
- `MessageStream` on a send is optional; omitted means the `outbound` transactional stream. [Email API](https://postmarkapp.com/developer/api/email-api)
- Transactional: one recipient, triggered by user activity (password resets, receipts, notifications). Opt-out link not required. Broadcast: many recipients, own schedule (announcements, digests). Opt-out link required. Transactional and broadcast traffic use separate IP ranges. [Message streams overview](https://postmarkapp.com/message-streams)
- That page states no explicit rule against promotional content on a transactional stream ("unless it's spam!"), but says Postmark is built for application email. [Message streams overview](https://postmarkapp.com/message-streams)
- `UnsubscribeHandlingType` is `None` / `Postmark` / `Custom`. Defaults: Transactional `None`, Broadcasts `Postmark` (required; `Custom` needs approval). [Message Streams API](https://postmarkapp.com/developer/api/message-streams-api)

## Unsubscribe and suppression

- Unsubscribe is scoped to one stream: the address is added to that stream's Suppressions only. A broadcast unsubscribe does not block transactional mail. [Add an unsubscribe link](https://postmarkapp.com/support/article/1208-how-to-add-an-unsubscribe-link); [Why Broadcasts require an unsubscribe link](https://postmarkapp.com/support/article/1217-why-broadcasts-require-an-unsubscribe-link)
- Unsubscribe links (`{{{ pm:unsubscribe }}}`) also work on transactional streams, "though they are not required". Recipients get a re-subscribe option on the confirmation page. [Add an unsubscribe link](https://postmarkapp.com/support/article/1208-how-to-add-an-unsubscribe-link)
- Suppressions are managed per stream via `/message-streams/{stream_id}/suppressions`. Reasons: `HardBounce`, `SpamComplaint`, `ManualSuppression`. Origins filter: `Recipient`, `Customer`, `Admin` (not defined). Create/delete: up to 50 addresses per call. [Suppressions API](https://postmarkapp.com/developer/api/suppressions-api)
- Deleting a suppression: `SpamComplaint` cannot be deleted; deleting `HardBounce` reactivates the bounce. Whether `ManualSuppression` can be deleted: not documented on that page. [Suppressions API](https://postmarkapp.com/developer/api/suppressions-api)
- Subscription Change webhook fires when an address is added to or removed from a stream's suppression list. [Add an unsubscribe link](https://postmarkapp.com/support/article/1208-how-to-add-an-unsubscribe-link)
- Sending to an inactive recipient returns error 406 "You tried to send to a recipient that has been marked as inactive"; inactive means hard bounce, spam complaint or manual suppression. [Email API](https://postmarkapp.com/developer/api/email-api)
- Not documented in the pages read: whether an unsubscribe on a transactional stream blocks later transactional sends to that address. The docs say the address is listed in the suppressions "for your Stream", so it likely does for that stream; verify with a test.

## Bounces and spam complaints

- Bounce types include HardBounce (1), SoftBounce (4096), Transient (2), SpamNotification (512), SpamComplaint (100001), Blocked (100006). Only HardBounce/SoftBounce are explicitly labelled hard/soft. `Inactive` shows whether the bounce deactivated the address; `CanActivate` whether it can be reactivated. Which types deactivate: not listed. [Bounce API](https://postmarkapp.com/developer/api/bounce-api)
- Reactivate: `PUT /bounces/{bounceid}/activate`. Bounce records are kept for the retention period (45 days default); raw dumps are not stored beyond 30 days. [Bounce API](https://postmarkapp.com/developer/api/bounce-api)
- Spam complaint: Postmark deactivates the address and "will not let you reactivate it"; reactivation only via Postmark support. Example payload has `Inactive: true`, `CanActivate: false`. Webhook fields include Email, Tag, BouncedAt, Subject, Metadata. [Spam complaint webhook](https://postmarkapp.com/developer/webhooks/spam-complaint-webhook)

## Rate limits and size limits

- HTTP 429 means the request rate exceeds acceptable use; no numeric threshold is published in the API overview. [API overview](https://postmarkapp.com/developer/api/overview)
- Batch endpoint: up to 500 messages per call, 50 MB payload; single send 10 MB. Batch returns 200 even if individual messages fail, so check each result's `ErrorCode`. Up to 50 recipients (To+Cc+Bcc) per message. [Email API](https://postmarkapp.com/developer/api/email-api); [API overview](https://postmarkapp.com/developer/api/overview)
- SMTP: informal guidance of 10 concurrent connections per IP, not enforced. [SMTP rate limits](https://postmarkapp.com/support/article/do-we-have-rate-limits-for-smtp)
- A search summary claimed Postmark has no hard requests-per-second limit for sending; it came from migration guides that were not read directly, so treat it as unverified.

## Re-sending a message

- No outbound resend/retry endpoint is documented. The only retry endpoint is for failed inbound messages (`PUT /messages/inbound/{messageid}/retry`); bypass is inbound only. [Messages API](https://postmarkapp.com/developer/api/messages-api)
- The Email API has no idempotency key or resend guidance. [Email API](https://postmarkapp.com/developer/api/email-api)
- Previously sent content can be read back: `GET /messages/outbound/{messageid}/details` returns text/HTML bodies, recipients, status and events; `/dump` returns raw source (empty if unavailable). Search returns up to 10,000 messages (500 per request). Retention is 45 days by default, configurable 7 to 365 days. [Messages API](https://postmarkapp.com/developer/api/messages-api)
- Implication: a resend is a brand-new `POST /email` (new MessageID), built from app-stored content or from the Messages API details within retention. It is subject to the same suppression check (406 if the recipient is inactive). `Metadata`/`Tag` (Tag max 1,000 chars) can link the resend to the original.

## For the two decisions

(a) Postmark scopes unsubscribes per stream and does not require unsubscribe on transactional streams, so a blanket unsubscribe in the app is the app's own policy, not a Postmark constraint. Optional/bulk-style email belongs on a Broadcasts stream (unsubscribe mandatory); the app currently sends everything on `outbound`. Spam-complaint and hard-bounce suppressions block sending regardless of app preferences.

(b) Admin resend is an app-initiated new send; it must handle the 406 case and the retention limit if content is read back from Postmark.
