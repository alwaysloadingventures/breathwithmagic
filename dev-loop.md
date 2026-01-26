# Development Loop Workflow

This file defines the automated development loop for breathwithmagic.

## Loop Sequence

For every task in PROGRESS.md, execute in this exact order:

```
1. @coder      → Implement feature + run lint
2. @linter     → Verify code quality (PASS required)
3. @code-reviewer → Review code (APPROVED required)
4. @ui         → Review design (APPROVED required, or N/A)
5. @qa         → Test feature (PASSED required)
6. @specialist → If needed (APPROVED required)
7. UPDATE      → Update PROGRESS.md
8. NEXT        → Move to next task
```

## Failure Handling

```
If @linter returns FAIL:
  → Send issues to @coder
  → Re-run @linter after fixes
  → Max 3 retries, then escalate to human

If @code-reviewer returns CHANGES REQUIRED:
  → Send feedback to @coder
  → Re-run from @linter
  → Max 3 retries, then escalate to human

If @ui returns CHANGES REQUIRED:
  → Send feedback to @coder
  → Re-run from @linter
  → Max 3 retries, then escalate to human

If @qa returns FAILED:
  → Send reproduction steps to @coder
  → Re-run from @linter
  → Max 3 retries, then escalate to human
```

## Specialist Triggers

Certain tasks require specialist review:

| Task Contains                 | Specialist Agent       |
| ----------------------------- | ---------------------- |
| Stripe, payment, subscription | @stripe-specialist     |
| Onboarding, signup flow       | @onboarding-reviewer   |
| Video player, media controls  | @accessibility-auditor |
| Paywall, content protection   | @security-auditor      |
| End of phase                  | @performance-auditor   |

## Commands

| Command        | Action                        |
| -------------- | ----------------------------- |
| `start`        | Begin from first PENDING task |
| `continue`     | Resume from current state     |
| `status`       | Show progress summary         |
| `next`         | Force move to next task       |
| `retry [step]` | Retry specific step           |
| `escalate`     | Stop loop, ask human          |

## Required Context Files

Always load these before starting:

- `/docs/about.md`
- `/docs/prd.md`
- `/PROGRESS.md`
- `/CLAUDE.md` (if exists)
