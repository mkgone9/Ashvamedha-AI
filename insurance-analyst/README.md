# Ashvamedha AI Insurance Analyst — isolated prototype

This app lives under `insurance-analyst/` and is intentionally separate from the existing website's routes and deployment. It is a prototype, not production-ready insurance advice software.

## What is implemented
- Standalone Next.js app shell and responsive chat/needs-snapshot UI.
- Server-side chat endpoint with a low-cost OpenAI-compatible API option.
- Source-aware retrieval from a small curated public-source index.
- Fallback mode when no AI API key is configured.
- Deterministic input validation and a basic premium-budget-to-income calculation.
- WhatsApp click-to-chat UX gated by an explicit checkbox and environment configuration.
- No customer database, file upload, persistent chat storage or live insurer quotation integration.

## Run locally
1. Install Node.js 20+.
2. From this folder run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add an API key only if you want live model responses. Without it, the app uses keyword retrieval and should not be described as a full AI assistant.
5. Run `npm run dev` and open the local URL shown by Next.js.

Deploy only as a separate preview project or separate Vercel project rooted at `insurance-analyst`. Do not change the production project's root directory or alias the production domain.

## Knowledge and citations
`lib/knowledge.ts` contains a minimal starter index of official public portals. It does not crawl these sites or guarantee that a source was checked live for every response. `checkedAt` means the index entry was last reviewed, not that each underlying page is current. Before public launch:
- Replace generic portal entries with specific official circulars, current policyholder regulations, product pages and dated insurer documents.
- Record publisher, document title, version/date, effective date, URL, page/section, review date and reviewer.
- Add an admin-only ingestion pipeline for PDFs/HTML, text extraction, chunking, embeddings and retrieval. Keep untrusted document instructions separate from system instructions.
- Show citations only when the retrieved passage actually supports the answer; abstain when retrieval confidence is low.

## Required before production
- Persistent, access-controlled database and admin authentication.
- Private file storage, malware/type/size checks, OCR/PDF extraction, tenant isolation and retention/deletion controls.
- Rate limiting, abuse prevention, request size limits, audit logs with sensitive data minimised, and monitoring.
- Privacy notice, purpose-specific consent, data-processing/vendor review and incident response.
- Legal review of applicable IRDAI permissions, product solicitation, lead sharing, advertising and advice.
- Approved insurer product data and tested calculation engines; never infer official premium/benefit numbers from generic language-model output.
- WhatsApp Business Platform or approved provider integration, business number configuration, consent evidence, template/opt-out handling and secure server-side lead handoff. This prototype's link is only a user-initiated click-to-chat.
- Automated tests, dependency review, secret scanning and accessibility checks.

## Architecture
Browser UI -> Next.js server routes -> retrieval layer + optional model API.
The deterministic assessment endpoint is independent from the model. Future product quote calculations must be separate, versioned, unit-tested modules based on verified insurer rules. Model responses must never be the source of quote arithmetic.

## Seed sources
- IRDAI: https://irdai.gov.in/
- India Code: https://www.indiacode.nic.in/
- Income Tax Department: https://www.incometax.gov.in/

These are starting portals, not a substitute for source-level verification or legal review.
