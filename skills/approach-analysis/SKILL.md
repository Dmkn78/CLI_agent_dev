---
name: approach-analysis
description: Map complete candidate approaches with prerequisites, assumptions, evidence, tradeoffs, limitations, implementation, failure modes, and open questions.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Approach Analysis

## Outcome

Give the user a decision-ready option space without silently making the decision for them.

## When to use

Use for project design, method comparison, architecture choice, implementation strategy, or any request with competing paths.

## When NOT to use

Do NOT use when objective is open-ended without decision to make or when only one path is possible without alternative or tradeoff to arbitrate.

## Agent bindings

This skill is invoked by the following agents:

- `approach-mapper`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Define the objective and decision dimensions before listing approaches.
2. Include a simple baseline, materially different alternatives, and a reason to exclude irrelevant options.
3. Complete every candidate record: prerequisites, assumptions, evidence for/against, limitations, implementation direction, tools, failure modes, and open questions.
4. Compare tradeoffs in prose or explicit dimensions without inventing an aggregate score.
5. Respect the decision policy and identify the evidence or experiment that would change the choice.

## Inputs

JSON { objective: string, decision_dimensions: string[], constraints: object, evidence_ledger: object[], concepts: object[], decision_policy: object, critic_findings: object[] }.


## Outputs

Returns complete approach[] (prerequisites/assumptions/evidence_for/against/limitations/implementation/tools/failure_modes/open_questions) compared by dimensions without aggregate score.

## Input contract

### Required

- Decision objective
- Comparison dimensions and constraints
- Decision policy
- Evidence and implementation context

### Optional

- Concept graph, transfer insights, critic findings, and baseline architecture

### Never assume

- The user wants a winner
- Candidates are comparable without common dimensions
- A design proposal is validated

## Artifact rules

- When user autonomy is active, never add `rank`, `winner`, `best`, `score`, or silent elimination.
- A candidate's evidence against and limitations are first-class fields, not footnotes.
- Proposed implementation is not measured performance.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- Candidates are distinct and complete enough to compare.
- The user can see tradeoffs, prerequisites, risks, and unknowns.
- No candidate is made artificially attractive by omitting failure modes.

## Anti-patterns

- Adding rank/winner/best/score or silent elimination when decide_for_user=false.
- Making an approach artificially attractive by omitting limitations or evidence_against.
- Describing proposed implementation as measured performance or confusing trivial variant with baseline.


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

- Generate materially distinct candidates, including a baseline.
- Compare tradeoffs and expose prerequisites, limitations, risks, tools, and open questions.
- Propose experiments when policy allows.

### Cannot

- Rank, eliminate, or choose for the user when policy forbids it.
- Hide evidence against, failure modes, or costly options.
- Use an aggregate score without explicit policy and dimensions.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Complete `approaches`
- Tradeoff findings/claims
- Decision-changing questions

### Schema contracts

- `approach.schema.json`
- `claim.schema.json`
- `question.schema.json`

### Output rules

- Populate every approach field, including implementation, evidence against, limitations, failure modes, and open questions.
- Compare dimension by dimension.
- Preserve the configured decision autonomy boundary.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Choose RAG architecture

**Input:**
```json
{"objective": "choose RAG arch", "decision_dimensions": ["latency","cost","accuracy"], "constraints": "max_cost_units=50"}
```

**Output:**
```json
approaches=[{id:"ap_baseline", name:"BM25+LLM", limitations:["no semantics"]}, {id:"ap_gnn", name:"GraphRAG", failure_modes:["entity error propagation"]}]
```
