# Development Loop Workflow

**This file defines the exact sequence for implementing each task.**

---

## The Loop

```
START
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: IMPLEMENTATION                                       │
│ Agent: @coder                                                │
│ Input: Task from PRD, context from docs                      │
│ Output: "Ready for review: YES" or "Blocked: [reason]"       │
│ On Block: Escalate to human                                  │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: LINTING                                              │
│ Agent: @linter                                               │
│ Input: Files changed by @coder                               │
│ Output: "Overall: PASS" or "Overall: FAIL"                   │
│ On FAIL: Return to Step 1 with issues                        │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: CODE REVIEW                                          │
│ Agent: @code-reviewer                                        │
│ Input: All changes for this task                             │
│ Output: "Decision: APPROVED" or "Decision: CHANGES REQUIRED" │
│ On CHANGES REQUIRED: Return to Step 1 with feedback          │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: UI REVIEW (if applicable)                            │
│ Agent: @ui-agent                                             │
│ Skip if: Task has no UI components                           │
│ Input: Screenshots or component review                       │
│ Output: "Decision: APPROVED" or "Decision: CHANGES REQUIRED" │
│ On CHANGES REQUIRED: Return to Step 1 with feedback          │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: QA TESTING                                           │
│ Agent: @qa-agent                                             │
│ Input: Feature to test, acceptance criteria from PRD         │
│ Output: "Decision: PASSED" or "Decision: FAILED"             │
│ On FAILED: Return to Step 1 with reproduction steps          │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: SPECIALIST REVIEW (if applicable)                    │
│ Agents: See trigger table below                              │
│ Skip if: No specialist triggers apply                        │
│ Output: "Approved" or specific recommendations               │
│ On recommendations: Return to Step 1 if critical             │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: UPDATE PROGRESS                                      │
│ Action: Update PROGRESS.md                                   │
│ - Mark all steps as complete                                 │
│ - Set task status to COMPLETE                                │
│ - Update phase progress counter                              │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
NEXT TASK
```

---

## Specialist Triggers

| Task Involves                 | Specialist Agent         | When to Call                  |
| ----------------------------- | ------------------------ | ----------------------------- |
| Stripe, payments, webhooks    | @stripe-specialist       | After QA passes               |
| Creator onboarding flow       | @onboarding-reviewer     | After QA passes               |
| Subscriber onboarding flow    | @onboarding-reviewer     | After QA passes               |
| Video/audio player            | @performance-auditor     | After QA passes               |
| Paywall, content protection   | @security-auditor        | After QA passes               |
| Authentication, authorization | @security-auditor        | After QA passes               |
| End of phase                  | All relevant specialists | Before marking phase complete |

---

## Loop Rules

### NEVER

- Skip any step in the sequence
- Proceed when an agent returns FAIL/CHANGES REQUIRED/FAILED
- Write code directly (always use @coder)
- Forget to update PROGRESS.md

### ALWAYS

- Read PRD context before calling @coder
- Pass specific feedback when looping back
- Update PROGRESS.md after each step completes
- Escalate after 3 consecutive failures on same step

---

## Step Details

### Step 1: Implementation (@coder)

**Before calling:**

```
1. Read the task from PROGRESS.md
2. Read relevant PRD section
3. Identify files that will be affected
```

**Call with:**

```
Task: [Task number and name]
PRD Reference: [Section of PRD]
Context: [Any relevant details]
Files to modify: [List of files]
```

**Expected output:**

```
Implementation complete.
Files changed: [list]
Ready for review: YES
```

### Step 2: Linting (@linter)

**Call with:**

```
Check files changed in Task [X.X]
```

**Expected output:**

```
## Linting Report
- ESLint: PASS/FAIL
- TypeScript: PASS/FAIL
- Prettier: PASS/FAIL
Overall: PASS/FAIL
```

### Step 3: Code Review (@code-reviewer)

**Call with:**

```
Review implementation of Task [X.X]: [Task name]
PRD requirements: [summary]
```

**Expected output:**

```
## Code Review
[Findings]
Decision: APPROVED / CHANGES REQUIRED
```

### Step 4: UI Review (@ui-agent)

**Skip if:** Task has no visual components (mark as N/A in PROGRESS.md)

**Call with:**

```
Review UI implementation for Task [X.X]
Design system reference: PRD Design System section
```

**Expected output:**

```
## UI Review
[Findings]
Decision: APPROVED / CHANGES REQUIRED
```

### Step 5: QA Testing (@qa-agent)

**Call with:**

```
Test Task [X.X]: [Task name]
Acceptance criteria: [from PRD]
```

**Expected output:**

```
## QA Report
[Test results]
Decision: PASSED / FAILED
```

### Step 6: Specialist Review

**Only if triggers apply.** See trigger table above.

### Step 7: Update PROGRESS.md

Update the task table:

```markdown
| Step            | Status         | Agent         | Notes |
| --------------- | -------------- | ------------- | ----- |
| Implementation  | ✓ Complete     | coder         |       |
| Linting         | ✓ Pass         | linter        |       |
| Code Review     | ✓ Approved     | code-reviewer |       |
| UI Review       | ✓ Approved     | ui-agent      |       |
| QA              | ✓ Passed       | qa-agent      |       |
| **Task Status** | ✓ **COMPLETE** |               |       |
```

---

## Failure Handling

### On FAIL/CHANGES REQUIRED/FAILED

1. Log the failure in PROGRESS.md notes column
2. Extract specific feedback from the agent
3. Return to Step 1 with context:
   ```
   Revise Task [X.X] based on [agent] feedback:
   [Specific feedback]
   ```
4. Increment retry counter

### After 3 Retries

1. Stop the loop
2. Report to user:
   ```
   Task [X.X] has failed [step] 3 times.
   Last feedback: [feedback]
   Please review and provide guidance.
   ```
3. Wait for user input before continuing

---

## End of Phase

When all tasks in a phase are COMPLETE:

1. Run end-of-phase reviews (see PROGRESS.md for which reviews)
2. Update phase status in PROGRESS.md overview
3. Report to user before starting next phase
