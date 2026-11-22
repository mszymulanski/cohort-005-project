# Rules for emailing users who unsubscribed

Research for GitHub issue #13. Not legal advice. Researched 2026-11-21 from primary sources only (statute, regulator, standards body, mailbox-provider docs). Items I could not verify are marked **Unverified**.

## Short answer

- Every regime separates **promotional** mail (needs an opt-out or opt-in, and honouring unsubscribes) from **transactional / relationship / service** mail (not subject to unsubscribe).
- The test is the message's **primary purpose**, not the sender's relationship with the user. Regulators read the transactional category narrowly.
- A blanket unsubscribe that stops all **marketing** while still sending a closed list of genuine transactional messages (receipts, refund decisions, security notices) is consistent with all sources below.
- A blanket unsubscribe must not be a loophole: any promotion added to a transactional email can turn the whole message into marketing.

## US: CAN-SPAM (15 U.S.C. 7701 ff.; 16 CFR Part 316)

- Covers messages whose primary purpose is "the commercial advertisement or promotion of a commercial product or service" (15 USC 7702(2)(A)).
  Source: https://www.law.cornell.edu/uscode/text/15/7702
- **Transactional or relationship message** (15 USC 7702(17)(A)) means a message whose primary purpose is to:
  - facilitate, complete or confirm a transaction the recipient agreed to;
  - give warranty, recall, safety or security information;
  - notify of a change in terms, features or standing of a subscription, membership or account, or send periodic account statements;
  - give employment or benefit-plan information;
  - deliver goods or services the recipient is entitled to.
  Source: same URL as above.
- Transactional messages are exempt from the opt-out and ad-label rules but may not contain false or misleading routing or header information. The exemption itself is in 15 USC 7704(c), which I did not fetch. **Unverified here.**
- The FTC says the categories are read narrowly: an ongoing customer relationship alone does not make a message transactional.
  Source: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- **Mixed content:** 16 CFR 316.3(a)(2) deems the primary purpose commercial if a reasonable reader of the subject line would think it is an ad, or the transactional content is not at the beginning of the body.
  Source: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-316/section-316.3
- **Commercial email must have** (15 USC 7704(a)(3)-(5); FTC guide):
  - a clear and conspicuous opt-out mechanism (return address or web mechanism), working for at least 30 days after sending;
  - the opt-out honoured within 10 business days;
  - no fee, and no personal information required beyond an email address;
  - no selling or transferring the address of someone who opted out, except to a compliance vendor;
  - a valid physical postal address and (unless the recipient previously consented) an ad identifier.
  Sources: https://www.law.cornell.edu/uscode/text/15/7704 and the FTC guide above.
- The FTC guide says the sender must offer an option to stop all marketing messages.
- Penalties are up to $53,088 per violating email (FTC guide). Both the advertiser and the sending vendor can be liable.
- A later affirmative opt-in by the recipient lifts the prohibition (7704(a)(4)(B)).

## EU / UK: ePrivacy Directive and GDPR

- **ePrivacy Directive 2002/58/EC Art. 13** governs electronic direct marketing:
  - Default is prior consent (13(1)).
  - **Soft opt-in** (13(2)): you may market your own *similar* products to customers whose address you got in a sale, if they could object free of charge and easily at collection and in every later message.
  - Marketing that hides the sender's identity, or has no valid address to ask for it to stop, is prohibited (13(4)).
  Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32002L0058
- Art. 13 covers *direct marketing*. Transactional emails fall outside it, so no consent or unsubscribe is needed for them. The Directive does not define "service message", so the boundary is a national-regulator question. **Ambiguity.**
- **GDPR Art. 21(2)-(4)** (read via gdpr-info.eu, an unofficial copy of the EUR-Lex text; confirm against EUR-Lex before relying on exact wording):
  - The right to object to direct marketing is absolute and can be exercised at any time.
  - After an objection the data "shall no longer be processed for such purposes".
  - The right must be brought explicitly to the person's attention, separately from other information, at the latest at first contact.
  Source: https://gdpr-info.eu/art-21-gdpr/
- **GDPR Art. 7(3):** "It shall be as easy to withdraw as to give consent." Source: https://gdpr-info.eu/art-7-gdpr/
- An objection or withdrawal applies to the *marketing purpose*. Processing for a contract or a legal obligation continues on its own legal basis. GDPR Art. 17(3)(b),(e) (legal obligation, legal claims) support keeping records. Source: https://gdpr-info.eu/art-17-gdpr/. **Unverified:** Art. 6(1)(b) wording was not retrieved.
- **UK ICO** (PECR guidance):
  - Soft opt-in applies to existing customers who bought a similar product, and an opt-out must be offered "in every message".
  - Service messages are those that "aren't promotional but are for administrative or customer services purposes".
  - A service message containing direct marketing "counts as direct marketing" even if that is not the main purpose. This is stricter than the US primary-purpose test. Plain branding or a logo does not count.
  - ICO noted this guidance is under review because of the Data (Use and Access) Act.
  Sources: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ and https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/identify-direct-marketing/

## Canada: CASL (relevant to a global audience)

- Commercial electronic messages need recipient consent and an unsubscribe mechanism meeting s.11(1) (s.6(1)-(2)).
- s.6(6) exempts messages that only: facilitate or confirm an agreed transaction, give warranty, recall or safety information, update an existing subscription or account, or deliver goods or services owed.
  Source: https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html
- **Unverified:** the s.11 detail (10 business days to act, mechanism valid for 60 days). The fetched text did not include s.11, and the CRTC FAQ returned 403.

## Mailbox-provider requirements (Gmail, Yahoo)

Bulk threshold for Google is 5,000+ messages a day to Gmail addresses. These are provider policies, not law, but they decide whether mail is delivered.

- **Google** (https://support.google.com/a/answer/81126 and https://support.google.com/a/answer/14229414):
  - Marketing and subscribed messages need both a `List-Unsubscribe` header (with a URL) and a `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header, plus a clearly visible unsubscribe link in the body.
  - The FAQ says "One-click unsubscribe is required only for marketing and promotional messages". Transactional examples given: password reset, reservation confirmation, form-submission confirmation. Purchase receipts are not named.
  - Honour requests within 48 hours. The FAQ frames this as a recommendation, but it appears in the enforcement table.
  - Spam rate below 0.30%, and SPF, DKIM and DMARC are required.
  - Google says the recipient, not Google, decides whether something was transactional, and the line varies by industry and regulation.
- **Yahoo** (https://senders.yahooinc.com/best-practices/):
  - One-click `List-Unsubscribe` header for marketing and subscribed messages, plus a visible body link (which may go to a preference page).
  - "Honor unsubscribes within 2 days."
  - Complaints below 0.3%.
  - Transactional mail is not explicitly exempted or covered. Yahoo advises separating it by IP or DKIM domain.
- **RFC 8058** (https://www.rfc-editor.org/rfc/rfc8058) defines one-click unsubscribe:
  - The message has one `List-Unsubscribe` header containing an HTTPS URI, and a `List-Unsubscribe-Post` header with exactly `List-Unsubscribe=One-Click`.
  - Both headers must be covered by a DKIM signature.
  - The URI must identify the recipient and the list. It should also include a hard-to-forge component.
  - The endpoint must accept a POST with no cookies or auth, must not redirect, and must not require a confirmation step.
  - The receiving mail client must have user consent before it POSTs.

## What an unsubscribe link or header must do

| Requirement | Source |
| --- | --- |
| Clear, conspicuous, free, needs only an email address | CAN-SPAM / FTC |
| Honour within 10 business days (US), 48 hours / 2 days (Gmail/Yahoo) | CAN-SPAM; Google; Yahoo |
| Keep working at least 30 days after sending | CAN-SPAM 7704(a)(3) |
| One click, no login, no confirmation step, no redirect, DKIM-signed headers | RFC 8058 |
| As easy as consenting; offered in every marketing message | GDPR 7(3); ICO |
| Do not sell or share the opted-out address | CAN-SPAM 7704(a)(4) |

## What a blanket unsubscribe with mandatory exceptions may and may not do

**May**
- Stop all promotional mail (newsletters, course promotions, discounts, win-back) while still sending purchase receipts, refund decisions and account or security notices. Each fits "facilitate, complete or confirm a transaction" or "change in standing of an account". (CAN-SPAM 7702(17); CASL 6(6); ICO service messages)
- Tell the user clearly which message types continue, ideally at unsubscribe time and on the preference page.
- Keep processing the address for the contract and for legal obligations such as tax records, even after a marketing objection. (GDPR Arts. 21 and 17(3))

**May not**
- Add promotional content (cross-sell, "you might also like") to a transactional email. Under the US test the primary purpose becomes commercial if the subject line reads promotional or the transactional content is not at the top (16 CFR 316.3). Under the ICO view any marketing element makes it direct marketing.
- Widen the exception list to everything an account holder "might want", such as course announcements and engagement nudges. The FTC says the categories are read narrowly.
- Require login, a reason, a fee or more data, or add confirmation steps, for the marketing unsubscribe. A marketing mail without a compliant one-click header risks Gmail and Yahoo rejection.
- Send marketing after an objection unless there is fresh affirmative consent (7704(a)(4)(B); GDPR 21(3)).
- Sell or share the address of someone who opted out.
- Use the exception list to dodge unsubscribe for mail that is really promotional. Recipients' complaints, not the sender's label, drive spam rates.

## Design pointers for the course platform

1. Define a closed list of transactional types (receipt, refund decision, password and security, enrolment confirmation, material changes to terms) and one list of marketing types. Unsubscribe means the marketing list.
2. Add `List-Unsubscribe` and `List-Unsubscribe-Post` (RFC 8058, DKIM-signed) and a body link to every marketing email. Transactional emails do not need them.
3. Honour marketing unsubscribes within 48 hours to satisfy every source above. The strictest source is Gmail and Yahoo.
4. Keep marketing out of transactional templates (a logo or branding is fine under ICO guidance).
5. Record the date and source of each opt-out and consent for audit.
6. For EU/UK/Canada users, marketing is opt-in (soft opt-in applies only to similar products the user bought), whereas US marketing is opt-out.

## Open ambiguities

- Whether "course recommendation" or "you completed 80%" nudges count as service or marketing. Regulators say narrow reading, so assume marketing.
- Whether refund-decision emails with a "keep learning" upsell become marketing. Yes under ICO; probably under 16 CFR 316.3 unless the transactional content is at the top and the subject is neutral.
- National EU implementations of Art. 13 differ, especially on whether business recipients are covered. Not researched.
- Other regimes for a global audience (e.g. Australia, Brazil, India) were not researched.
- CASL s.11 timing, the CAN-SPAM 7704(c) transactional exemption text and GDPR Art. 6(1)(b) are unverified.
- GDPR wording came from gdpr-info.eu, an unofficial copy.
