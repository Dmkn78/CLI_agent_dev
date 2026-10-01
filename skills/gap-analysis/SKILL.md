---
name: gap-analysis
description: Convert research weaknesses into prioritized gaps, expected resolution evidence, and bounded loop decisions.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Gap Analysis

## Outcome

Make incompleteness explicit and decide whether to continue, replan, defer, stop, or fail.

## When to use

Use after criticism, graph diagnostics, evidence audits, task failures, approach reviews, or any material quality defect.

## When NOT to use

Do NOT use when no finding/diagnostic/failure exists or when filling the gap would bring only marginal gain without blocking synthesis.

## Agent bindings

This skill is invoked by the following agents:

- `gap-finder`
- `orchestrator`
- `question-generator`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Collect gaps from all current diagnostics and trace each one to its origin record.
2. Deduplicate by underlying resolution need, not just wording.
3. Assign priority from impact, uncertainty, dependencies, information gain, and cost.
4. State expected resolution evidence, status, and whether the gap blocks synthesis.
5. Choose a loop action and record the budget or evidence reason for it.

## Inputs

JSON { critic_findings: object[], unresolved_issues: object[], graph_diagnostics: object, evidence_coverage: object, approach_completeness: object, task_history: object[], budgets: object }.


## Outputs

Returns deduplicated gaps[] with origin/priority/status/expected_resolution_evidence plus loop-decision {continue|replan|defer|stop|fail} justified by budget and coverage.

## Input contract

### Required

- Critic findings or diagnostics
- Unresolved issues and evidence coverage
- Task history and remaining budget

### Optional

- Approach completeness, citation audit, failed tool records, and prior gaps

### Never assume

- A related record resolves a gap
- All gaps deserve continuation
- A full queue means a good answer

## Artifact rules

- A gap is resolved only when its expected artifact exists and addresses the original cause.
- Critical contradictions and unsupported core claims remain release blockers.
- Budget exhaustion produces risk or failure, not a false pass.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- High and critical gaps are actionable or explicitly externally blocked.
- The action follows from evidence status and budget state.
- Duplicate loops are prevented by stable IDs and resolution criteria.

## Anti-patterns

- Marking gap resolved because vaguely related record exists without addressing original cause.
- Reopening duplicate gap indefinitely without new information or changed expected_resolution_evidence.
- Turning budget exhaustion into proof of completeness (false pass) instead of risk/fail with preserved blockers.


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

- Deduplicate and prioritize actionable gaps.
- Define expected resolution evidence and recommend a loop action.
- Propose questions/tasks for material unresolved gaps.

### Cannot

- Mark a gap resolved without its resolution artifact.
- Dispatch work or change task state directly.
- Convert budget exhaustion into a successful completion decision.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- `gaps`
- `loop-decision`
- Questions and bounded task proposals

### Schema contracts

- `gap.schema.json`
- `loop-decision.schema.json`
- `question.schema.json`

### Output rules

- Every gap has origin, priority, status, question, and expected resolution evidence.
- Use continue/replan/defer/stop/fail with evidence and budget reasons.
- Preserve critical blockers for the quality gate.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Critical gap blocks synthesis

**Input:**
```json
{"critic_findings": [{"id": "cf01", "severity": "critical"}], "budgets": {"remaining_cost": 12}}
```

**Output:**
```json
gaps=[{id:"g01", question:"What primary evidence supports cl01 in target population?", priority:"high"}] + loop_decision={action:"continue"}
```
