# Clean Code React/Next.js Course Index

Use `clean-code-react-nextjs-course.pdf` as a selective source of examples. The durable subjects are naming, responsibility, dependency direction, boundary validation, explicit state, incremental refactoring, and targeted tests. React and Next.js are the course's demonstration stack, not a universal architecture.

Search or open only the printed pages relevant to the current task. The PDF has three front-matter pages, so printed page N is PDF page N+3, or zero-based screenshot page N+2.

## Translate Course Terms

| Course term | General meaning |
| --- | --- |
| React component or page | Presentation unit or interface entry point |
| Hook | Framework lifecycle, state, subscription, or action orchestrator |
| Pure domain function | Framework-independent rule, calculation, parser, or transformation |
| Fetch/API module | Any HTTP, database, file, queue, subprocess, SDK, or device boundary |
| DTO and `unknown` parsing | Validate and map untrusted external representation once |
| Discriminated UI state | Enum, sealed type, variant, tagged struct, or state machine |
| AbortController cleanup | Native cancellation and resource-lifetime mechanism |
| Next.js static export | A deployment constraint that forbids unavailable runtime capabilities and client-side secrets |
| Component extraction | Extract a named cohesive unit only when it owns behavior, state, reuse, or a testable responsibility |

| Printed pages | Topic | Consult when |
| --- | --- | --- |
| 3-5 | Naming and filenames | Choosing domain names, symbol length, or file ownership |
| 5-8 | Functions and arguments | Splitting functions, aligning abstraction levels, or grouping parameters |
| 8-10 | Responsibilities, duplication, comments | Extracting a responsibility, removing conceptual duplication, or deciding why to comment |
| 10-11 | Errors and asynchronous states | Designing explicit error, loading, empty, and success states |
| 11-14 | React components and hooks | Separating rendering, interaction, React orchestration, and pure business logic |
| 14-15 | UI, application, domain, and API | Checking dependency direction or mapping DTOs to domain types |
| 15-18 | Static Next.js architecture | Working with static export, external backends, feature folders, public APIs, or secrets |
| 18-27 | Complete day-tracking refactor | Needing a worked decomposition from monolithic component to domain, API, hook, form, page, and tests |
| 27 | Complexity signals | Reviewing long functions, primitive parameters, state booleans, effects, imports, props, or growing utility files |
| 28-29 | Incremental refactoring and decision checklists | Planning a behavior-preserving sequence or reviewing a change before merge |
| 31 | Final development checklist | Performing final React, TypeScript, architecture, API, static-export, and verification checks |
| 32 | Repository audit limits | Deciding what must be learned from the actual codebase before applying the proposed architecture |

Treat the course's 40-line threshold as a diagnostic prompt, not a universal violation. Prefer repository evidence and an identifiable responsibility boundary over mechanical compliance.

For non-React work, read [language-adaptations.md](language-adaptations.md) and carry over the principle through the active language's native constructs.
