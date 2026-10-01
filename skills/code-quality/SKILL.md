---
name: code-quality
description: Improve architecture, responsibility boundaries, function design, duplication, comments, mutation, concurrency, external-call safety, errors, and verification while preserving behavior. Use when implementing, fixing, debugging, reviewing, cleaning, or refactoring software in TypeScript/JavaScript, Python, C/C++, Java/Kotlin, Rust, Go, shell, or other languages, including UIs, services, CLIs, libraries, data pipelines, and infrastructure.
---

# Code Quality

Apply `$coding-rules` alongside this skill when it is available.

## Operating Loop

1. Identify the smallest user-visible behavior or defect in scope.
2. Identify the language, runtime, framework, build system, deployment model, and local conventions.
3. Trace only the relevant execution path.
4. Place each responsibility at the narrowest stable boundary the codebase supports.
5. Extract pure rules before framework orchestration or interface details when that separation reduces real complexity.
6. Make the smallest coherent edit that preserves unrelated behavior and public compatibility.
7. Verify with the narrowest useful test, typecheck, static analysis, lint, build, execution, or readback.
8. Stop when the requested behavior and relevant quality gates are satisfied.

Prefer targeted search and bounded command output. Do not reload unchanged files or explore broadly after the execution path is understood.

## Adapt Before Applying

Read [language-adaptations.md](references/language-adaptations.md) when a task needs stack-specific choices for types, ownership, cancellation, errors, files, concurrency, or verification. For an unlisted language, map the underlying responsibility to its native construct instead of copying syntax from another ecosystem.

For React, TypeScript, or Next.js work, also read [course-index.md](references/course-index.md) and consult only the relevant pages of the bundled PDF. Treat its examples as one concrete application of the general rules, not as the default architecture for other stacks.

## Keep Functions Coherent

- Treat 40 lines as a review signal, not a mechanical law. Split a longer function when an extracted name exposes a decision, the part can be tested alone, or it changes for a different reason.
- Keep one level of abstraction per function: orchestrate named steps or implement one detailed step, not both.
- Make the primary function read like a summary and place helpers below it when conventions allow.
- Use early guards to reduce nesting when invalid cases can exit clearly.
- Group parameters into a typed request or domain object when they form a concept. Avoid blind wrapper types for unrelated pairs.

## Separate Stable Rules From Volatile Details

Use these conceptual roles only when they clarify the system:

1. Domain/core: pure rules, calculations, validation, policies, parsers, and transformations. Do not import UI, HTTP, database, filesystem, environment, or framework code.
2. Application/use case: orchestrate a user action, command, job, or feature through domain functions and ports.
3. Boundary/infrastructure: own protocols, DTOs, endpoints, SQL, SDKs, files, environment, subprocesses, queues, and external error mapping.
4. Presentation/interface: render UI or command/API output from ready-to-use values. Do not calculate business rules or parse raw external payloads here.
5. Tests: cover domain rules, use cases, boundaries, and regressions at the narrowest effective level.

Point dependencies inward toward stable concepts. Convert external data into internal types once at the boundary. Keep environment values and external protocol details out of domain and presentation code.

Do not manufacture layers that add only forwarding. A library, compiler pass, numerical kernel, embedded program, plugin, or small script may need different boundaries. Even in one file, keep input parsing, core calculation, and side effects visibly separate.

## Avoid Accidental Complexity

- Extract repeated business formulas, validation, parsing, request shapes, error mapping, and state conditions to one named owner.
- Avoid generic wrappers that hide intention. Name functions and modules after the domain action they perform.
- Prefer explicit intermediate variables over dense nested expressions.
- Do not optimize for micro-performance without a measured bottleneck or explicit requirement.
- Prefer transformations that return new values. Do not mutate caller-owned inputs in domain code.
- Isolate necessary mutation at a clearly named boundary and keep ownership visible.
- Preserve locality when extraction would make a reader jump across many files without creating a stable concept.

## Comment Only What Code Cannot Say

Use a short comment for an external constraint, fragile business rule, formula source, risk avoided, compatibility issue, or non-obvious tradeoff. Replace narration of obvious code with clearer names and structure.

## Make External Calls Bounded

- Prefer one grouped request over repeated N+1 calls when the API supports it.
- Centralize shared field lists, schemas, query builders, and request construction.
- Apply a timeout or deadline where the environment supports one.
- Propagate cancellation and clean up work when its owner ends, disconnects, shuts down, or cancels.
- Use narrow, bounded retries only for retryable failures.
- Add context that identifies the operation, resource, and external system.
- Do not leave unowned background tasks or infinite waits.

Use the stack-specific lifetime and cancellation mechanisms in [language-adaptations.md](references/language-adaptations.md).

## Model Errors and Absence Explicitly

- Use the language's exception, typed error, `Result`, or error-object convention.
- Do not disguise failure as `-1`, `false`, an empty string, an empty collection, or a nullable value without an explicit contract.
- State what operation failed, which identifier or value was involved, and which constraint or external boundary caused it.
- Keep each try/catch or error branch focused on one operation.
- Represent absence with an optional type, `Option`, union, or boundary-local nullable value. Do not deliberately pass null through core logic.

## Refactor Safely

1. Choose one concrete behavior to preserve.
2. Add a focused safety net or write down the exact manual observation when tests are unavailable.
3. Rename confusing concepts without moving them first.
4. Extract pure domain rules and test them.
5. Isolate and validate the external boundary.
6. Extract state or lifecycle orchestration only when complexity remains.
7. Split presentation into named units with explicit inputs.
8. Remove dead imports and obsolete abstractions, then run targeted checks.

Keep each batch small, reviewable, executable, and focused on one risk. Do not combine broad file moves, mass renaming, a new library, and an architecture change in one refactor.

Prioritize defects and data risks, invalid external contracts, duplicated business rules, modules that block routine changes, naming and placement, then local aesthetics.

## Verify Proportionally

Add or update tests for bug fixes, changed business rules, fragile parsers or validators, non-obvious formulas, and risky behavior-preserving refactors. Run the narrowest relevant test first. When no tests exist, use typecheck, lint, build, direct execution, or edited-range readback.

Before returning, confirm:

- Functions have one responsibility and one abstraction level.
- Stable core rules are isolated from volatile details where that boundary helps.
- External contracts are parsed once and errors carry context.
- Interface code contains no hidden business calculations or raw protocol details.
- Concurrent or asynchronous work has an explicit owner, bounded lifetime, and cleanup.
- No hidden input mutation, duplicated domain rule, or opaque generic wrapper remains.
- The solution follows the repository's language and framework idioms.
- The changed behavior is covered by a targeted verification.
- The resulting structure is easier to explain than before.
