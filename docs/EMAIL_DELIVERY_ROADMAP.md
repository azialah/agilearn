# Future grade-email delivery

Agilearn currently keeps grade delivery teacher-controlled: a teacher previews one
learner's report and opens their own mail application. The browser never holds an
SMTP password, Resend API key, or service-role credential.

## When a sending domain is available

1. Verify the school's sending domain with Resend and publish the required DNS
   records.
2. Add a server-side or Supabase Edge Function delivery boundary. It must verify
   the caller, apply per-teacher rate limits, and never accept an arbitrary `from`
   address from the browser.
3. Require the teacher to select an individual learner and a student or guardian
   contact before composing a job. Never put grade recipients in BCC.
4. Store only the minimum audit data: initiating teacher, learner, report period,
   recipient type, provider message id, status, and timestamps. Do not store the
   grade report body in logs.
5. Provide explicit confirmation, a delivery-status view, retry rules for
   transient failures, and a clear explanation that a provider acceptance is not
   proof of recipient reading.
6. Review RLS, data retention, consent requirements, bounce handling, and local
   school privacy policy before enabling delivery.

## Security boundaries

- No service-role key, SMTP secret, or Resend key belongs in `src/` or a Vite
  environment variable.
- The browser may request a delivery job only for a classroom it owns; the server
  independently rechecks authorization and computes or fetches grades.
- Exported reports and signed files must expire promptly and be scoped to one
  recipient/report operation.
