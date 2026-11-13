---
name: demo-readiness
description: Verify, protect, rehearse, and submit a working hackathon demo under event time constraints.
---
# Demo Readiness

Start as soon as the MVP is approved, not at the end. Read `.hackathon/{BRIEF,PLAN,STATE}.md` and the real submission requirements.

1. Define the shortest judge-visible end-to-end journey and observable success criteria. Prefer a real vertical slice over slides or disconnected mocks. Mark simulated components clearly.
2. After each meaningful slice, **run** the journey when tools permit. Record in `STATE.md`: full Git commit SHA (`git rev-parse HEAD`), environment/deployment, scenario, result and timestamp, known failures, and next verification. If uncommitted changes affect the demo, say the hash does not represent those changes. Never mark a demo verified from a build passing alone.
3. Identify the critical demo path and likely failure modes: auth, network, API/model quota, latency, empty/malformed data, cold start, deployment, device/responsive behavior. Test the most likely ones. Keep honest fallback data/video/screenshots without implying they are live.
4. Rehearse to the actual time limit: problem, audience, why existing approaches fall short, working product, technical differentiator, rubric evidence, and closing. Prepare concise judge Q&A; flag unsupported claims.
5. Before submission, check official required fields, repository/deployment permissions, URLs, screenshots/video, eligibility, attribution, and deadline. Obtain human approval of demo/pitch/risks/submission. Do not submit or claim a successful deployment without verification.
6. Protect a known-good demo as time shrinks. Prefer fixes and reliability over speculative features; advise a feature freeze when appropriate. A failed verification is a blocker, not a successful demo.
