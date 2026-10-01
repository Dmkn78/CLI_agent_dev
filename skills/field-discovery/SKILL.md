---
name: field-discovery
description: Map an unfamiliar or partially familiar field before synthesis, including vocabulary, prerequisites, subfields, schools, disputes, and foundational unknowns.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Field Discovery

## Outcome

Produce a navigable field map that tells the next worker what each concept means, depends on, and still needs to be established.

## When to use

Use at the start of a research, learning, literature, or audit request when the user's vocabulary, prerequisites, or field boundaries are incomplete.

## When NOT to use

Do NOT use when vocabulary, prerequisites and subfields are already validated by evidence and the task requires execution, synthesis or direct implementation without foundational exploration.

## Agent bindings

This skill is invoked by the following agents:

- `field-mapper`
- `planner`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Extract the objective, target audience, known concepts, weak concepts, and domain boundary.
2. Build a vocabulary table with canonical terms, aliases, definitions, and ambiguity notes.
3. Group concepts into foundations, mechanisms, methods, applications, institutions, and debates.
4. Add prerequisite and dependency edges; identify isolated or overloaded terms.
5. Mark each item provisional until evidence supports it and turn missing foundations into questions.

## Inputs

JSON { objective: string, background: enum[zero|partial|familiar|expert], known_concepts: string[], weak_or_new_concepts: string[], domain: string[], concepts: object[], questions: object[], evidence: object[] } projected from ResearchRequest/ResearchState.


## Outputs

Returns concepts (concept.schema.json: id/name/definition/status[provisional|supported|disputed|unresolved]/aliases/evidence_refs) + new_questions (question.schema.json) + findings distinguishing established vs disputed/provisional terminology.

## Input contract

### Required

- Objective and field boundary
- Audience/background level
- Known and weak concepts

### Optional

- Existing concepts, questions, evidence, and domain hints
- Prior map or terminology policy

### Never assume

- The first map is exhaustive
- A definition is canonical without status or support
- Advanced detail is useful before prerequisites are known

## Artifact rules

- Concepts need stable IDs, names, definitions, status, and evidence references where available.
- Questions need origin, priority, expected information gain, and completion evidence.
- Keep disputed definitions and competing schools visible instead of forcing one canonical map.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- A newcomer can see an efficient learning or research order.
- The map distinguishes terminology from evidence-backed domain claims.
- No claim of exhaustiveness is made without a defined scope and source basis.

## Anti-patterns

- Claiming the first map is exhaustive without defined scope and source basis.
- Turning a search snippet or model memory into a validated definition.
- Spending on advanced details before foundational vocabulary and dependencies are visible.


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

- Read the provided request/state projection and available evidence.
- Produce or propose concepts, prerequisite relations, and foundational questions.
- Mark terminology provisional, supported, disputed, or unresolved.

### Cannot

- Search or access external systems without a host-provided tool.
- Declare authoritative state changes or dispatch tasks.
- Turn memory, snippets, or analogies into validated definitions.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- `concepts`
- `new_questions`
- Terminology findings

### Schema contracts

- `concept.schema.json`
- `question.schema.json`

### Output rules

- Use stable IDs and evidence references when available.
- Keep disputed meanings and competing schools visible.
- The invoking agent wraps the payload in `AgentResult`; the skill emits no Markdown or hidden state mutation.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Onboarding Transformers for LLM audit

**Input:**
```json
{"objective": "audit LLM hallucination risks", "background": "partial", "weak_or_new_concepts": ["attention", "RLHF"]}
```

**Output:**
```json
concepts=[{id:"c01", name:"attention", status:"supported"}] + new_questions=[{id:"q01", text:"What operational definition of RLHF blocks the audit?"}]
```
