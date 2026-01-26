# CLAUDE.md — breathwithmagic

**This file is automatically read by Claude Code at the start of every session.**

## Project Overview

breathwithmagic is a creator-first wellness subscription platform. Think "OnlyFans for breathwork, yoga, and meditation."

## Critical Instructions

### ALWAYS Read These Files First

1. `/docs/about.md` — Product vision
2. `/docs/prd.md` — Implementation specifications
3. `/PROGRESS.md` — Current development state
4. `/orchestrator.md` — Workflow rules

### NEVER Do These Things

- Write code directly — always delegate to @coder
- Skip steps in the development loop
- Proceed when an agent returns FAIL/CHANGES REQUIRED/FAILED
- Forget to update PROGRESS.md after each step

### ALWAYS Do These Things

- Follow the orchestrator workflow
- Use @agentname to call sub-agents
- Update PROGRESS.md after every agent completes
- Read the PRD before implementing any feature

---

## Development Workflow

```
@coder → @linter → @code-reviewer → @ui → @qa → Update PROGRESS.md → Next
   ↑         |            |           |      |
   └─────────┴────────────┴───────────┴──────┘
              (loop back on any failure)
```

---

## Available Sub-Agents

| Agent                  | Model  | Purpose                  |
| ---------------------- | ------ | ------------------------ |
| @prd-architect         | Opus   | PRD review, architecture |
| @security-auditor      | Opus   | Security review          |
| @ux-writer             | Sonnet | Copy and messaging       |
| @coder                 | Sonnet | Implementation           |
| @code-reviewer         | Opus   | Code review              |
| @ui                    | Sonnet | Design review            |
| @qa                    | Sonnet | Testing                  |
| @linter                | Haiku  | Code quality checks      |
| @onboarding-reviewer   | Opus   | Onboarding UX            |
| @stripe-specialist     | Opus   | Payment integration      |
| @accessibility-auditor | Sonnet | WCAG compliance          |
| @performance-auditor   | Sonnet | Performance optimization |

---

## Commands

| Say This       | Does This                                 |
| -------------- | ----------------------------------------- |
| "start"        | Begin development from first pending task |
| "continue"     | Resume from current state                 |
| "status"       | Show progress summary                     |
| "refine prd"   | Run PRD refinement workflow               |
| "phase review" | Run end-of-phase specialist reviews       |

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Auth**: Clerk
- **Database**: PostgreSQL (Neon) + Prisma
- **Payments**: Stripe Connect
- **Storage**: Cloudflare R2
- **Video**: Cloudflare Stream
- **UI**: shadcn/ui + Tailwind CSS
- **Hosting**: Vercel

---

## Design System

- **Colors**: Warm neutrals (terracotta primary, cream accents)
- **Tone**: Calm, human, warm, trust-forward
- **NOT**: Corporate, overly spiritual, generic

---

## Quick Reference

```bash
# Start development
"continue"

# Check status
"status"

# Refine PRD first
"refine prd"

# After completing a phase
"phase review"
```
