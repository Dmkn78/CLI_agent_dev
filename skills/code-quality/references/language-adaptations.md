# Cross-Language Adaptations

Read only the section for the active stack. Repository conventions and supported versions take precedence. Translate responsibilities and failure modes; do not transplant syntax or architecture mechanically.

## Concept Map

| General responsibility | Possible implementations |
| --- | --- |
| Pure rule or transformation | Free function, module function, static method, value object, algebraic function, numerical kernel |
| Use-case orchestration | Application service, command handler, controller action, hook, view model, job, pipeline stage, CLI command |
| External boundary | HTTP client, repository implementation, database gateway, parser, filesystem adapter, subprocess wrapper, device driver, SDK adapter |
| Interface | Web component, desktop view, controller response, CLI/TUI renderer, template, notebook cell, library facade |
| Explicit state | Discriminated union, enum plus payload, sealed hierarchy, variant, tagged struct, state machine |
| Resource lifetime | Scope, context manager, RAII owner, `defer`, structured concurrency, cancellation token, signal |

Do not require every project to have every role or directory. Separate a role only when it creates a stable name, a testable boundary, clearer ownership, or safer change.

## TypeScript and JavaScript

- Parse external `unknown` data before it enters core logic; avoid `any` unless data is immediately narrowed.
- Use discriminated unions for state with mutually exclusive payloads.
- Use `AbortSignal`, bounded timers, and lifecycle cleanup for browser and Node work.
- Keep pure calculations independent from React, Express, Next.js, or other frameworks.
- Verify with the repository's typecheck, ESLint, unit tests, and build. Do not add TypeScript to a JavaScript project unless requested.
- For React or Next.js, consult [course-index.md](course-index.md).

## Python

- Type public functions and boundary contracts. Prefer `dataclass`, `Enum`, `TypedDict`, `Protocol`, Pydantic or equivalent existing schemas over unstructured dictionaries in core code.
- Use exceptions with contextual messages for exceptional failure; use explicit optional or result-style values only when absence or failure is part of the normal contract.
- Use context managers for files, locks, transactions, and other resources. Avoid mutable default arguments and hidden mutation of caller-owned containers.
- Bound HTTP and subprocess calls. Preserve `asyncio` cancellation and avoid detached tasks without an owner.
- Organize by cohesive modules and packages; do not create one class per file by default.
- Verify with focused tests plus the configured formatter, linter, type checker, or direct execution, such as pytest, Ruff, mypy, or pyright when already present.

## C and C++

- Make ownership, lifetime, and mutation explicit. Prefer RAII, value semantics, const correctness, references, spans, and smart pointers over raw owning pointers.
- Use structs, classes, enums, variants, `optional`, or the repository's result/error convention to prevent magic states. Do not impose exceptions or `expected` when the project standard differs or the language version lacks support.
- Separate pure calculations from I/O, allocation policy, platform APIs, UI, and device or network boundaries.
- Use scoped locks, `jthread` or stop tokens when supported, and explicit timeout/lifetime owners for concurrency.
- Respect header/source, module, template, ABI, and compile-time constraints. Avoid abstractions that inflate build time or hide allocation without a concrete benefit.
- Verify with focused tests, the configured build system, compiler warnings, static analysis, and sanitizers when relevant and available.

## Java and Kotlin

- Use records, data classes, enums, sealed hierarchies, value objects, and validated constructors when they make states and contracts explicit.
- Keep controllers, listeners, and framework entry points thin. Put stable rules in framework-independent units and external protocols in adapters.
- Do not turn `Service`, `Manager`, or dependency injection into dumping grounds. Name application operations after the use case.
- Add context to exceptions and preserve causes. Apply timeouts and cancellation to futures, coroutines, HTTP clients, database calls, and executors.
- Respect checked-exception, nullability, package, module, and framework conventions already established by the repository.
- Verify with focused JUnit or project tests and the configured Maven, Gradle, compiler, formatter, or static-analysis tasks.

## Rust

- Model absence and failure with `Option` and `Result`; use enums to represent valid states and newtypes for meaningful domain distinctions.
- Avoid `unwrap` and `expect` in production paths unless an invariant is locally proven and explained.
- Let ownership and borrowing express lifetime. Isolate interior mutability, unsafe code, and external I/O behind narrow contracts.
- Use structured tasks and bounded timeout or cancellation primitives provided by the active runtime.
- Preserve error context using the repository's error strategy; do not add an error crate solely for style.
- Verify with focused tests, `cargo fmt`, `cargo clippy`, and the narrowest relevant build or feature set.

## Go

- Use explicit structs and small interfaces owned by their consumers. Avoid `map[string]interface{}` outside unavoidable boundaries.
- Wrap errors with operation and identifier context. Preserve `errors.Is` and `errors.As` behavior when callers depend on it.
- Pass `context.Context` through cancellable boundaries and honor deadlines. Every goroutine needs a clear owner and termination path.
- Keep packages cohesive and dependency direction simple; avoid generic utility packages and premature interfaces.
- Prefer explicit, readable control flow over abstraction for its own sake.
- Verify with focused `go test`, `gofmt`, `go vet`, and the race detector when concurrency risk justifies it.

## Shell and Automation Scripts

- Quote variables, name paths and commands, check exit status, and use strict mode only when its edge cases are understood for the target shell.
- Split input parsing, core decisions, and side effects into small named functions once the script is no longer trivial.
- Use traps or equivalent cleanup for temporary resources and bound network or subprocess work when a timeout tool is available.
- Avoid parsing human-formatted output when a structured format or command flag exists.
- Verify with a dry run or fixture, the target shell, and ShellCheck when configured.

## Unlisted Languages

Identify the language's native answers to five questions: how it models valid state, signals failure, owns resources, cancels concurrent work, and structures modules. Apply the general quality rules through those mechanisms and keep unsupported features, libraries, and fashionable architecture out of the change.
