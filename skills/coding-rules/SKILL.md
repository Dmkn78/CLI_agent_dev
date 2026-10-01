---
name: coding-rules
description: Apply precise, searchable naming, explicit types, focused file roles, named constants, readable returns, stable imports, and one source of truth. Use whenever Codex writes, edits, reviews, refactors, or organizes code in any language, especially when naming symbols, defining public APIs, modeling state, extracting files, or removing duplication.
---

# Coding Rules

## Workflow

1. Inspect the repository's established naming, layout, type, and import conventions.
2. Identify the language, runtime, framework, build system, and supported version before choosing an idiom.
3. Apply the rules below to the smallest coherent change.
4. Read back edited ranges and run the narrowest useful check.
5. Complete the checklist before returning.

## Prefer Native Idioms

Apply guidance in this order:

1. Explicit user and repository instructions.
2. Established repository conventions that are coherent and safe.
3. Idioms of the language, framework, and supported version.
4. The general heuristics in this skill.

Translate principles, not syntax. Do not force TypeScript unions into a Java codebase, object-oriented wrappers into a functional module, exceptions into a codebase standardized on result values, or a layered application architecture into a small library that does not need it. Preserve public compatibility unless the task explicitly changes it.

## Name by Domain Intent

- Choose complete, pronounceable, searchable names that reveal the domain role or computed result.
- Avoid vague names such as `data`, `value`, `tmp`, `res`, `item`, `obj`, `thing`, `handle`, `manage`, `process`, `helper`, and `utils` unless a tiny local scope makes the meaning unambiguous.
- Reserve short names for conventional tiny scopes: loop indices, coordinates in local math, rows and columns, or established low-level terms.
- Name booleans as propositions: `isPresent`, `hasAccess`, `canRetry`, `shouldRender`, `wasLoaded`.
- Name collections in the plural and derived values by their transformation: `activeOrders`, `normalizedEmail`, `discountedCashFlows`.
- Name functions with verb phrases and types with nouns.
- Avoid unexplained abbreviations. Prefer repository vocabulary over clever shorthand.
- Make a filename describe its primary export or single responsibility, following the repository's existing casing convention.

## Design Explicit Interfaces

- Do not use a boolean flag argument to switch a function between distinct behaviors. Expose two named operations or an explicit strategy.
- Group primitive parameters into a typed object, struct, record, or domain value when they form a real concept or recur together.
- Type public parameters, public returns, exported APIs, props, DTOs, schemas, and boundary values explicitly when the language supports it.
- Parse untrusted values at the boundary. In TypeScript, prefer `unknown` plus validation over `any`.
- Represent states with discriminated unions, enums, sealed types, `Result`, `Option`, or state machines when booleans or nullable fields could contradict each other.
- Avoid untyped dictionary-shaped core models. Use the language's structured type facilities.
- Follow ownership and error idioms of the language: RAII and const correctness in C++, `Result` and `Option` in Rust, typed public functions and context managers in Python, records or sealed types in Java when appropriate, and `context.Context` for cancellable Go boundaries.
- Do not introduce a new validation, dependency injection, result, or type library when existing language features or repository dependencies already solve the problem.

## Give Each File One Role

Use the repository's structure when clear. Otherwise classify a file by one role:

- Domain: pure rule, calculation, validation, parser, transformation, or policy.
- Application: orchestration of a use case, command, workflow, or feature.
- Boundary: HTTP, database, filesystem, CLI input, environment, subprocess, queue, SDK, browser, or OS integration.
- Presentation: UI component, page, route output, CLI rendering, template, or screen.
- Contract: public type, DTO, schema, interface, protocol, or validation model.
- Configuration: named constants, paths, thresholds, timeouts, and supported values.
- Test: focused coverage for a rule, use case, boundary, or regression.

Do not mix pure domain logic with UI, network, database, filesystem, environment, or framework behavior in one file. Prefer small targeted modules over monoliths, but do not create a file for a trivial fragment that has no independent responsibility.

Let the language determine the physical unit. A responsibility may live in a module, package, namespace, class, free function, trait implementation, command, or translation unit rather than one class per file.

## Name Meaningful Constants

- Name business thresholds, limits, durations, statuses, routes, events, field lists, and repeated meaningful strings.
- Keep a constant local when it has one local use and place shared constants with their owning feature or domain.
- Do not create a global dumping ground for unrelated constants.

## Keep One Source of Truth

- Extract duplicated formulas, validators, parsers, request fields, error mappings, type shapes, and business conditions.
- Import the shared concept from its owner instead of re-declaring it.
- Preserve intentional duplication at generated or independent boundaries when the repository documents that choice.
- Avoid catch-all files named `helpers`, `utils`, `manager`, `processor`, or `service`; name modules after their domain action.

## Make Functions Read Top Down

Order a file as follows unless the language or repository requires otherwise:

1. External imports.
2. Internal imports.
3. Public then private types.
4. Constants.
5. Primary export or public entry point.
6. Helpers used by that entry point.
7. Secondary exports.

Make the primary function read like a summary. In non-trivial functions, assign the final business result to a descriptive variable before returning it. Allow concise guard clauses when they improve clarity.

## Checklist

- Confirm names are precise, searchable, and consistent with the domain.
- Confirm the solution follows repository and language idioms before general heuristics.
- Confirm booleans read as propositions, functions as actions, and types as nouns.
- Confirm no boolean flag argument hides two behaviors.
- Confirm public and boundary contracts are explicitly typed and parsed.
- Confirm impossible states are not representable where practical.
- Confirm each file has one identifiable role.
- Confirm meaningful literals have names and owners.
- Confirm repeated concepts have one source of truth.
- Confirm the primary flow reads top down and non-trivial final returns are named.
- Confirm edited ranges and a targeted verification were checked.
