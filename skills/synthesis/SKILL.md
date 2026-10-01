---
name: synthesis
description: Synthesize a structured research state into an evidence-constrained report, explanation, comparison, or course.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Synthesis

## Outcome

Answer the original objective clearly while separating source-backed facts, interpretation, hypotheses, uncertainty, and user choice.

## When to use

Use only after core research, gap handling, and the applicable evidence checks are complete enough for the requested output.

## When NOT to use

Do NOT use while core research, critical gap handling and citation audit are not at required level for honest answer without hallucination.

## Agent bindings

This skill is invoked by the following agents:

- `synthesizer`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Start from the objective, audience background, requested format, and decision policy.
2. Build an outline around the answer, supported claims, concept relations, approaches, insights, limitations, and unresolved issues.
3. Attach evidence markers to important claims and state when a conclusion is interpretive or conditional.
4. Compare options on explicit dimensions and preserve alternatives when the user owns the decision.
5. Run a final unsupported-claim and gap pass before presenting the synthesis.

## Inputs

JSON { objective: string, audience_background: string, decision_policy: object, ResearchState: object, quality_findings: object, evidence_ledger: object[], unresolved_issues: object[] }.


## Outputs

Returns structured synthesis answer-first with findings/claims evidenced, outline distinguishing facts/interpretations/hypotheses/choices and visible caveats.

## Input contract

### Required

- Original objective and audience
- Validated claims/evidence/concepts/relations/approaches/insights
- Quality and citation status

### Optional

- Requested format, decision policy, known gaps, and rendering constraints

### Never assume

- A smooth transition is supported
- A missing citation is harmless
- The user delegated a choice without policy permission

## Artifact rules

- Use only evidence IDs that exist in the ledger.
- Do not use polished prose to bridge a material missing result.
- For deep requests, explain mechanisms and tradeoffs rather than returning a shallow list.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- The structure answers the user before mirroring internal workflow.
- Facts, interpretations, hypotheses, and recommendations are distinguishable.
- Caveats and unresolved gaps are visible at the point where they matter.

## Anti-patterns

- Inventing evidence/citation/consensus or bridging material gap with fluent prose without uncertainty marker.
- Turning candidate approach into recommendation when decision_policy reserves choice for user.
- Polishing answer that hides critical gaps or failed_tasks to appear complete.


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

- Organize validated material into answer-first content blocks.
- Separate fact, interpretation, hypothesis, recommendation, and open question.
- Expose caveats and unresolved gaps.

### Cannot

- Invent evidence, certainty, consensus, or completed work.
- Rank or eliminate approaches against policy.
- Silently repair the ledger or hide a blocking defect.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Structured synthesis findings/claims
- Evidence markers
- Caveat and unresolved-gap findings

### Schema contracts

- `claim.schema.json`
- `gap.schema.json`
- `quality-report.schema.json` when a report status is emitted

### Output rules

- Every important factual claim carries evidence references or an explicit uncertainty status.
- The host renders the final prose; the skill returns structured, JSON-compatible content.
- Use partial output when blocking inputs are missing.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Causes of eurozone inflation 2022-23

**Input:**
```json
{"objective": "Explain eurozone inflation 2022-23", "evidence": ["ev01:BCE","ev02:Eurostat"], "decision_policy": {"decide_for_user": false}}
```

**Output:**
```json
synthesis_blocks={answer:"Energy supply shock + post-Covid demand [ev01][ev02]", limitations:["salary data incomplete IT/ES"]}
```
