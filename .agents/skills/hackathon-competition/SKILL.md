---
name: hackathon-competition
description: Coordinate evidence-led hackathon strategy, team-owned ideation, feasibility, time-aware MVP scope, rubric-grounded judging, demo, and submission.
---
# Hackathon Competition Strategy

The primary agent orchestrates. Optimize for a feasible, compelling, verifiable submission within the actual remaining time. Do not invent event facts, weights, access, capabilities, or research sources. Read `AGENTS.md` and `.hackathon/{BRIEF,RESEARCH,PLAN,STATE}.md`.

## 1. Competition intelligence
Use official event sources for dates/timezone, eligibility, tracks, rules, judging criteria and actual weights, sponsor opportunities, available technology/credits, and submission requirements. Record decision-relevant facts and sources in `BRIEF.md`, marked `CONFIRMED`, `INFERRED`, or `UNKNOWN`. Escalate disqualification and deadline uncertainties. Research without a long questionnaire; ask only blocking questions.

## 2. Research problems; humans invent solutions
Invoke `.agents/skills/problem-research/SKILL.md` to investigate real problems that match the theme/track and write evidenced problem reports in `RESEARCH.md`. **Do not autonomously brainstorm, recommend, or rank product ideas.** Show problem findings and stop for team ideation. The team proposes and chooses concepts. Investigate follow-up questions when requested.

## 3. Challenge and validate team-proposed ideas
For material uncertainty, offer optional Grill Me and, if accepted, follow `.agents/skills/grilling/SKILL.md`. Do not duplicate its interview or force it. Research discoverable facts instead of interrogating teammates for them. After questioning, list the 1–3 highest-impact falsifiable assumptions and potential fatal blockers (API availability, permissions, datasets, time, technical capabilities). Check official docs and real access; where needed, run a **small, timeboxed technical proof** before committing to the full build. Record `VERIFIED`, `FAILED`, or `UNRESOLVED` with evidence; do not confuse an agent's argument with a successful experiment. Stop when evidence is sufficient, not when every uncertainty is resolved. Team decides go / simplify / investigate / no-go.

Present the smallest compelling competition MVP: user/problem, value, differentiation, critical technical achievement, visible demo, must/should/could/won't scope, biggest risks. Obtain team approval of MVP before substantial implementation. Keep product decisions in `BRIEF.md` rather than `RESEARCH.md`.

## 4. Execution with time-aware scope
Check event-local current time, deadline, time remaining, team capacity, and submission buffer at material checkpoints. If deadline/timezone unknown, mark it UNKNOWN and ask; do not fabricate hours. Set **event-specific** critical-path milestones in `PLAN.md` for riskiest proof, first end-to-end demo, integration, rehearsal, and submission. Assign lightweight owners and blockers; teammates can hand off when resting. No formal contracts or continual updates.

Let Superpowers handle engineering plans, implementation, debugging and reviews. Prefer small vertical slices and the simplest architecture that delivers the proof. Obtain team approval for major architecture/demo direction. One primary agent owns integration; optional read-only native subagents can independently investigate distinct research/review questions, then reconcile source disagreements. Parallelize analysis, not coupled file writes. No mandatory multi-agent tournament or Agent Arena.

At each scope-changing request ask: does it materially help the demo or actual rubric, is it on the critical path, can it be built AND verified with remaining time? If no, recommend deferral. If critical proof fails by its checkpoint, recommend simplification or pivot. As time decreases, reserve a realistic integration/rehearsal/submission buffer and protect the working demo; recommend feature freeze before late additions endanger it. Avoid rigid universal hour percentages.

## 5. Rubric-grounded judging
Extract the actual rubric and weights from official sources. Map each criterion to observed demo evidence, remaining gaps, and honest pitch claims. If weights are missing, state that and use qualitative coverage, not fabricated scores or win probabilities. Simulate skeptical judge questions, identify unsupported assertions, prioritize fixes that improve real criteria, and avoid claiming that a simulated score predicts winning.

## 6. Demo and submission are first-class
Invoke `.agents/skills/demo-readiness/SKILL.md` from the first approved MVP slice, repeatedly at meaningful milestones, and before submission. Track actual successful end-to-end verification in `STATE.md` with full Git commit hash, environment, scenario, timestamp, failures, and next verification. A build or unit test alone is not proof. Prepare truthful fallback, rehearse within judging format, verify submission links and required artifacts, and obtain human approval of final demo/pitch/risks/submission.

## 7. Retrospective
After the event, complete `.hackathon/RETROSPECTIVE.md` with outcomes, feedback, wasted time, invalid assumptions, demo problems, and actionable improvements. Never fabricate feedback.

## Keep state concise
`BRIEF.md`: event facts + approved product. `RESEARCH.md`: problem evidence only. `PLAN.md`: high-level execution, critical path, lightweight ownership. `STATE.md`: working demo truth and next action. `RETROSPECTIVE.md`: post-event lessons. Git is implementation history. Avoid needless paperwork.
