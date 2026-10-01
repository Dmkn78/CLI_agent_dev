---
name: polymath-linking
description: Explore cross-domain structural connections with controls for analogy type, usefulness, evidence, and breakpoint.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Polymath Linking

## Outcome

Extract a useful question or method from a cross-domain comparison without mistaking analogy for equivalence.

## When to use

Use for mathematical resemblance, methodological transfer, structural analogy, interdisciplinary connection, or deliberate contrarian exploration.

## When NOT to use

Do NOT use when task requires intra-domain proof, direct factual answer or empirical validation without benefit from cross-domain structural analogy.

## Agent bindings

This skill is invoked by the following agents:

- `polymath-linker`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Describe the source and target systems in terms of components, relations, variables, constraints, and outcomes.
2. Classify the connection as exact equivalence, structural analogy, heuristic transfer, metaphor, or speculation.
3. Map only the elements that correspond and list the non-corresponding elements.
4. State usefulness, suggested question or method, evidence needed, and the breakpoint.
5. Downgrade or reject the connection when the target domain changes the mechanism materially.

## Inputs

JSON { source_domain: string, target_domain: string, objective: string, concepts: object[], relations: object[], evidence_refs: string[], transfer_intent: string }.


## Outputs

Returns qualified analogies with relation_type, usefulness, breakpoint and status plus motivated rejections and bounded requested_tasks.

## Input contract

### Required

- Defined source and target systems
- Cross-domain objective
- Concepts, relations, and evidence references

### Optional

- Formal models
- Target constraints
- Prior analogies or rejected mappings

### Never assume

- Shared vocabulary or shape means equivalence
- Source evidence transfers automatically
- A metaphor can validate a target claim

## Artifact rules

- An attractive analogy is not evidence for the target-domain claim.
- Equivalence claims require stronger formal or empirical support than heuristic transfers.
- Keep speculative connections separate from supported relations and claims.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- The comparison yields an actionable research implication.
- The failure boundary is as concrete as the similarity.
- The connection does not erase domain-specific assumptions or constraints.

## Anti-patterns

- Mistaking lexical metaphor or equation fragment for mathematical equivalence without component/variable mapping.
- Importing source conclusion while ignoring missing invariants, observables, scales and incentives in target.
- Presenting speculation or metaphor as validated target-domain claim without breakpoint or evidence_needed.


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

- Compare components, variables, relations, constraints, and outcomes.
- Propose qualified analogies, useful methods, breakpoints, and validation questions.
- Reject structurally weak transfers.

### Cannot

- Present analogy or speculation as target-domain evidence.
- Claim equivalence without formal/empirical support.
- Dispatch validation work or merge analogy into the evidence ledger silently.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Qualified analogy/insight payload
- Motivated rejection findings
- Validation questions or task proposals

### Schema contracts

- `analogy.schema.json`
- `expert-insight.schema.json`
- `question.schema.json`

### Output rules

- Always state relation type, usefulness, non-correspondences, evidence needed, and breakpoint.
- Keep speculation separate from supported claims.
- The host maps analogy payloads into the wrapping `AgentResult` fields.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Hopfield network -> financial mean-reversion

**Input:**
```json
{"source_domain": "Hopfield network (energy, attractor)", "target_domain": "mean-reversion market", "objective": "test energy model transfer"}
```

**Output:**
```json
analogies=[{id:"a01", relation_type:"structural_analogy", breakpoint:"non-conservative market breaks energy symmetry"}]
```
