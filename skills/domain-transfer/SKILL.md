---
name: domain-transfer
description: Evaluate whether and how a concept transfers into a target domain, including mechanism, assumptions, data, implementation, validation, and non-transferable parts.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Domain Transfer

## Outcome

Produce a conditional transfer map that can be tested rather than a persuasive analogy or generic recommendation.

## When to use

Use when an idea from one field is proposed for trading, physics, software, engineering, education, policy, or another configured target domain.

## When NOT to use

Do NOT use when no source concept is precisely defined or when task is general comparison without implementation target or domain validation.

## Agent bindings

This skill is invoked by the following agents:

- `domain-transfer`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Define the source concept and its original mechanism, scale, observables, and assumptions.
2. Map source components to target components and identify missing or changed variables.
3. Classify the transfer as direct, adapted, heuristic, rejected, or unresolved.
4. Specify data, implementation shape, validation method, costs, and failure cases.
5. State what would falsify the transfer and what cannot be transferred at all.

## Inputs

JSON { source_concept: {id,definition,mechanism,assumptions,scale}, target_domain: string, objective: string, evidence: object[], graph_relations: object[], constraints: object }.


## Outputs

Returns conditional transfer {mechanism_mapping, transfer_status: direct|adapted|heuristic|rejected|unresolved, assumptions, data_needs, implementation_shape, validation_design, failure_cases, non_transferable} + linked claims.

## Input contract

### Required

- Precisely defined source concept and mechanism
- Target domain and objective
- Source evidence and target constraints

### Optional

- Target data, implementation context, prior analogy, and critic findings

### Never assume

- Elegance implies transfer
- Source performance predicts target performance
- Changed variables preserve the same mechanism

## Artifact rules

- Separate transfer mechanism from expected performance.
- Target-domain evidence is required for target-domain claims.
- Do not hide a change in definition that makes the mapping appear successful.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- A practitioner could design a validation step from the record.
- Assumptions, costs, and failure modes are explicit.
- The conclusion is conditional when the evidence is conditional.

## Anti-patterns

- Forcing transfer by silently redefining source concept to match target.
- Claiming target performance without target validation (copying source metrics).
- Hiding costs, frictions, missing data and non-transferable parts behind generic recommendation.


## Decision Logic & Branching

- If required inputs are missing or ambiguous, return `needs_replan: true` with explicit missing fields instead of hallucinating.
- If evidence is insufficient for the claim strength, downgrade wording (e.g., 'suggests' vs 'proves') and mark claim `status: provisional` with `evidence_refs: []`.
- If contradictions are detected, preserve both sides with `supports_or_refutes: context` and surface as `gaps` with priority high; never smooth away.
- Loop decision: `continue` only if `information_gain: high` and budget remains; `defer/stop/fail` when `budget_status.exhausted` or `saturation` detected.


## Tool Mapping & Integration

- Maps to agent `Required skills` via `config/agent-skill-bindings.json:1`. Agent must declare this skill to invoke it.
- Consumes `ResearchState` projection and produces schema-validated artifacts (`evidence`, `claims`, `relations`, etc.) per `schemas/*.schema.json`.
- Handoff via `requested_tasks` (untrusted): orchestrator validates `type`, `objective`, `assigned_role`, `parent_id`, and budget before dispatch.


## Observability & Metrics

- Emits `usage` with `tool_calls`, `search_calls`, `documents_read`, `cost_units`, and `elapsed_time` for budget tracking.
- Every artifact carries stable IDs and `evidence_refs` for traceability; `quality_checks` must pass before handoff.
- On failure returns partial valid artifacts plus `error` and `unresolved` explanation; never hides missing data behind fluent prose.
- Metrics feed `ResearchState.usage` and `task_history` for orchestrator checkpointing and `quality-report` gating.


## Failure Recovery

- On missing/ambiguous inputs: return `needs_replan: true` with missing fields; do not hallucinate.
- On insufficient evidence for claim strength: downgrade wording and mark `status: provisional`; preserve gap.
- On contradictions or circular citations: keep both sides, emit `gaps` with priority high, and propose targeted verification task.
- On budget/tool exhaustion: defer with `stopping_reason: budget_exhausted`, emit partial artifacts, and never fake `pass`.
- On ledger mismatch (orphaned/mismatched marker): block handoff, emit `critic_findings` with `recommended_action`, and require `source-read` or `claim-rewrite`.

## Permissions

### Can

- Map source mechanisms, assumptions, variables, and observables to a target domain.
- Propose conditional approaches, validation designs, and failure cases.
- Classify transfer as direct, adapted, heuristic, rejected, or unresolved.

### Cannot

- Claim target performance without target validation.
- Silently redefine the source concept.
- Hide target costs, frictions, or non-transferable components.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Conditional transfer record
- Linked claims
- Approaches/insights and validation questions

### Schema contracts

- `approach.schema.json`
- `expert-insight.schema.json`
- `claim.schema.json`

### Output rules

- Name mechanism mapping, changed variables, assumptions, data, validation, costs, and failure cases.
- Separate feasibility from expected target outcome.
- Use conditional wording whenever target evidence is incomplete.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Physical momentum -> trading momentum

**Input:**
```json
{"source_concept": "momentum (inertia, F=ma)", "target_domain": "trading momentum", "objective": "evaluate signal transfer"}
```

**Output:**
```json
transfer_record={transfer_status:"heuristic", validation_design:"out-of-sample backtest with costs + regime break test", failure_cases:["regime change"]}
```
