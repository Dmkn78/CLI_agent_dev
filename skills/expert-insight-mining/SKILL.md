---
name: expert-insight-mining
description: Derive evidence-bounded insights that change problem framing, diagnosis, implementation, or action.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Expert Insight Mining

## Outcome

Produce a small number of non-obvious but inspectable principles with clear applicability and failure boundaries.

## When to use

Use after the state contains enough concepts, evidence, relations, or approaches to support second-order reasoning.

## When NOT to use

Do NOT use when state lacks sufficient concepts/relations/evidence or when simple reformulation suffices without second-order mechanism.

## Agent bindings

This skill is invoked by the following agents:

- `expert-insight-miner`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Look for bottlenecks, asymmetries, hidden assumptions, second-order effects, and recurring mechanisms.
2. Test whether the candidate insight changes a question, design, interpretation, or decision rule.
3. Link it to supporting concepts, claims, relations, and evidence.
4. State why it matters, where it applies, and the boundary where it fails.
5. Label hypotheses and transfer ideas separately from established principles.

## Inputs

JSON { objective: string, concepts: object[], relations: object[], claims: object[], evidence: object[], approaches: object[], critic_findings: object[], graph_diagnostics: object }.


## Outputs

Returns expert-insight[] with insight/type/supporting_concepts/evidence/why_it_matters/applicability/boundary separating robust principle from hypothesis.

## Input contract

### Required

- Objective
- Validated concepts, relations, claims, evidence, and approaches
- Relevant boundaries or critic findings

### Optional

- Task history, analogies, implementation constraints, and second-order effects

### Never assume

- New wording is new insight
- A pattern is universal
- An analogy or intuition is a causal law

## Artifact rules

- Reject slogans, restatements, and unsupported sophistication.
- An insight must be more than a claim with a stronger adjective.
- Practical implications must follow from the mechanism and evidence shown.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- The insight is useful without pretending to be universal.
- A reviewer can inspect its support and breakpoint.
- The wording is no stronger than the evidence.

## Anti-patterns

- Manufacturing novelty by renaming existing claim with stronger adjective.
- Generalizing beyond supported populations/mechanisms or converting analogy into causal law.
- Producing slogan or tautology without diagnostic, decision rule or testable implementation implication.


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

- Derive evidence-bounded reframings, heuristics, diagnostics, and second-order effects.
- State applicability, boundary, and why the insight matters.
- Propose validation questions or implementation implications.

### Cannot

- Manufacture novelty by renaming a claim.
- Generalize beyond evidence or turn hypothesis into fact.
- Modify source claims or make the user's decision.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- `expert-insight` records
- Supporting findings
- Validation questions

### Schema contracts

- `expert-insight.schema.json`
- `question.schema.json`

### Output rules

- Every insight includes supporting concepts/evidence, why it matters, applicability, and boundary.
- Label hypothesis, analogy, heuristic, and supported principle distinctly.
- Return only insights that change framing, diagnosis, design, or action.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Latency arbitrage bottleneck

**Input:**
```json
{"concepts": ["market microstructure","latency arbitrage"], "relations": [{"type": "causal", "source": "latency", "target": "adverse_selection"}]}
```

**Output:**
```json
insights=[{id:"ins01", insight:"Bottleneck is queue position not spread; reducing internal latency without queue priority does not improve fill", boundary:"fails in pro-rata market"}]
```
