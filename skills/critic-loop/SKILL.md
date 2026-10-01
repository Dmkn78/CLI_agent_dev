---
name: critic-loop
description: Critique a research state independently and drive bounded improvement loops for contradictions, omissions, weak support, and overclaiming.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Critic Loop

## Outcome

Turn criticism into concrete, prioritized repairs while preserving genuine unresolved disagreement.

## When to use

Use after evidence collection, graph construction, approach mapping, synthesis drafts, failed tasks, or before a quality release decision.

## When NOT to use

Do NOT use before evidence/graph/approaches/synthesis collection or when criticism would loop without new material to audit.

## Agent bindings

This skill is invoked by the following agents:

- `critic`
- `orchestrator`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Re-read the objective and define what a satisfactory answer must establish.
2. Inspect claims, evidence, relations, approaches, analogies, and gaps against those criteria.
3. Challenge at least support, scope, alternative explanation, omission, and implementation-risk dimensions where relevant.
4. Record severity, type, affected IDs, recommended action, and status for each material finding.
5. Request only targeted repairs with a resolution artifact and stop when marginal criticism becomes repetitive.

## Inputs

JSON { objective: string, ResearchState: object {claims,evidence,relations,approaches,insights}, quality_criteria: object, prior_critic_findings: object[], graph_diagnostics: object }.


## Outputs

Returns critic_findings[] with severity/type/affected_ids/recommended_action/status plus targeted requested_tasks and blocking/risk/style distinction.

## Input contract

### Required

- Objective and quality criteria
- Claims, evidence, relations, approaches, insights, and draft when available
- Prior findings and diagnostics

### Optional

- Citation audit
- Task history
- Source access for rechecking

### Never assume

- Fluent prose is supported
- Surprising means false
- A stylistic difference is a material defect

## Artifact rules

- Critic findings are diagnoses, not rewritten conclusions.
- A surprising claim is not automatically wrong; identify the exact missing support or assumption.
- Do not erase disagreement that evidence cannot resolve.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- Every finding is falsifiable and actionable or explicitly non-actionable.
- Severity reflects consequence for the objective.
- The downstream loop can act without guessing what the critic meant.

## Anti-patterns

- Rewriting synthesis to hide defect instead of emitting falsifiable finding with affected_ids.
- Rejecting surprising claim without pointing to missing support, confounder or absent baseline.
- Using criticism to impose user decision (hidden ranking) or issuing blanket pass without full source access.


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

- Audit selected artifacts and identify falsifiable defects.
- Classify severity, affected IDs, recommended action, and release consequence.
- Propose bounded repair tasks through the invoking agent.

### Cannot

- Rewrite evidence or synthesis to hide a defect.
- Issue a blanket pass with incomplete context.
- Impose a preferred user decision under the guise of criticism.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- `critic_findings`
- Blocking/risk/style classification
- Repair proposals

### Schema contracts

- `critic-finding.schema.json`
- `research-task.schema.json`

### Output rules

- Each finding names affected IDs and the missing support, assumption, or quality condition.
- Severity tracks consequence for the objective.
- Preserve unresolved disagreement and incomplete checks.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Weak support for mortality claim

**Input:**
```json
{"claims": [{"id": "cl01", "text": "X reduces mortality 30%"}], "evidence": [{"directness": 0.3}]}
```

**Output:**
```json
critic_findings=[{id:"cf01", severity:"high", type:"weak_support", affected_ids:["cl01"], recommended_action:"require mortality evidence or downgrade wording"}]
```
