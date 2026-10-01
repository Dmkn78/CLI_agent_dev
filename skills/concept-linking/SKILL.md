---
name: concept-linking
description: Identify and validate conceptual relations such as dependency, causality, explanation, competition, composition, or structural resemblance.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Concept Linking

## Outcome

Replace vague association with an explicit mechanism, evidence status, assumptions, mediator, and failure condition.

## When to use

Use when the user asks how concepts connect, what depends on what, what causes or explains something, or why a link is missing.

## When NOT to use

Do NOT use when both endpoints are not defined in current context, or when vague association suffices without explicit mechanism, direction, mediator and failure condition.

## Agent bindings

This skill is invoked by the following agents:

- `concept-linker`
- `expert-insight-miner`
- `polymath-linker`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Name the candidate endpoints and define each one in the current context.
2. Choose a relation type and state direction and mechanism.
3. List assumptions, mediators, confounders, and boundary conditions.
4. Check evidence directness and distinguish observed relation from inferred mechanism.
5. Accept, qualify, reject, or defer the edge and create a question when support is insufficient.

## Inputs

JSON { source_concept: {id,name,definition}, target_concept: {id,name,definition}, candidate_type: enum[dependency|causal|explanatory|competitive|compositional|analogical], evidence: object[] }.


## Outputs

Returns single relation (relation.schema.json with status[supported|qualified|rejected|candidate]) + concept updates + new_questions if insufficient support.

## Input contract

### Required

- Defined source and target concepts
- Candidate relation type
- Relevant evidence

### Optional

- Mediators, confounders, ontology hints, and existing relations

### Never assume

- Association is causality
- A relation type is clear without endpoint definitions
- A missing mediator is irrelevant

## Artifact rules

- Do not use a generic `related_to` edge when a more precise type is possible.
- Unsupported relations remain candidates, not validated facts.
- Record failure conditions for causal, explanatory, and transfer claims.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- The relation would be understandable to a domain reader without the model's hidden reasoning.
- The edge's status is proportional to evidence.
- Missing mediators and competing explanations are explicit.

## Anti-patterns

- Using generic related_to when a precise type is possible.
- Validating causality without mediator, confounder or boundary condition.
- Hiding an ontology choice as if it were a domain fact.


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

- Evaluate and qualify a relation with direction, mechanism, assumptions, and boundary.
- Create relation candidates and targeted questions.
- Reject vague or unsupported edges with a reason.

### Cannot

- Validate a relation with missing endpoints.
- Use generic `related_to` when a precise type is required.
- Hide ontology decisions as domain facts.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- A qualified `relation`
- Concept status updates
- Support gaps or questions

### Schema contracts

- `relation.schema.json`
- `concept.schema.json`
- `question.schema.json`

### Output rules

- Use statuses such as supported, qualified, candidate, rejected, or unresolved.
- Include mediator, assumptions, confounders, and failure conditions when relevant.
- Link the edge to direct or indirect evidence explicitly.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Causal link regularization -> generalization

**Input:**
```json
{"source": "dropout", "target": "generalization", "candidate": "causal", "assumptions": ["i.i.d.", "sufficient capacity"]}
```

**Output:**
```json
relation={id:"r12", type:"causal", status:"qualified", failure_conditions:["distribution shift", "under-parameterization"]}
```
