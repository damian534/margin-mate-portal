---
name: E-Signature
description: Built-in document e-signing with private signer links, audit trail, and signed certificate PDF
type: feature
---
Built-in simple e-sign (no third-party provider).

- Broker uploads a document (PDF/DOC) from the deal card **E-Sign** tab or the client profile **E-Sign** tab.
- Flexible signers per document, name + email, sequential signing order.
- Each signer gets a dedicated one-off link `/sign/:token` (not the client document portal).
- Signer draws or types a signature; consent checkbox required.
- Audit trail records sent / viewed / signed with timestamp, IP address, user agent.
- When all signers complete, a certificate page (signature images, emails, timestamps, IPs) is appended to the original PDF and stored as the signed copy; broker is emailed and a deal timeline note is written.
- Tables: `esign_documents`, `esign_signers`, `esign_events`. Storage bucket `esign-documents` (private, path prefixed by broker_id).
- Edge functions: `esign-send`, `esign-portal`, `esign-sign`.
