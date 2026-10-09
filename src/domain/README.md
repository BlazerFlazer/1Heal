# src/domain

Pure, side-effect-free mirrors of the business rules that Postgres functions and Edge Functions
enforce for real: visit quota and tier limits, booking windows and overlap, waitlist promotion,
cancellation deadlines, no-show penalties, freeze eligibility and check-in token validity. A module
here takes plain data in and returns a decision out (`canBook(subscription, session, now)` →
`{ ok: true } | { ok: false, reason }`), imports nothing from React, Expo, Supabase or `src/services`,
and ships with a unit test for every branch so the client can show an accurate preview ("2 of 8
visits left", "cancellation is free until 18:00") without a round trip. The server remains the only
source of truth: every mirror states which `rpc_*` function or trigger it reflects, and when the two
disagree the UI must surface the server's answer, never the local one. Nothing lives here yet; the
first mirrors arrive with the booking and subscription milestones (M4, M5).
