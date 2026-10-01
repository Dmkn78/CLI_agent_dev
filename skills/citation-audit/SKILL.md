---
name: citation-audit
description: Audit evidence markers, claim support, source locations, and citation correctness before releasing an evidence-backed output.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Citation Audit

## Outcome

Produce a reproducible citation decision that identifies valid support, mismatches, or release blockers.

## When to use

Use before releasing any report, course, comparison, architecture recommendation, or other output containing factual claims.

## When NOT to use

Do NOT use when there is no draft with markers or when evidence_ledger is empty; audit would be moot and not reproducible.

## Agent bindings

This skill is invoked by the following agents:

- `citation-auditor`
- `orchestrator`
- `synthesizer`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Extract every internal and external citation marker from the draft.
2. Resolve each marker to exactly one evidence record and check source identity and location.
3. Compare the cited evidence with the claim's scope, strength, population, method, and uncertainty.
4. Detect orphaned evidence, unsupported important claims, circular references, fake locations, and duplicated support.
5. Return pass, risk, or fail with affected IDs and corrective actions; convert markers only after passing.

## Inputs

JSON { draft_report: string with markers, evidence_ledger: object[] {id,url,title,author,date,retrieved_at,location,excerpt}, claims: object[], citation_policy: object }.


## Outputs

Returns reproducible audit {marker->evidence_id, valid|mismatched|missing|orphaned|duplicated|circular, claim_scope_check, release_decision: pass|risk|fail, corrective_actions}.

## Input contract

### Required

- Draft with citation markers
- Evidence ledger and claims
- Citation policy and source metadata

### Optional

- Rendered report, prior audit, and source recheck capability

### Never assume

- A marker is valid because its ID exists
- The source supports exact wording without scope/location checking
- Missing access permits a guessed citation

## Artifact rules

- An existing ID is not enough; the source must support the actual sentence.
- Missing source access is a verification failure or risk, not a reason to guess.
- Do not edit the ledger silently to make a citation pass.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- Every released marker resolves deterministically.
- Important claims have direct enough support.
- The audit result can be reproduced from the draft and ledger alone.

## Anti-patterns

- Repairing missing citation by inventing source, broadening excerpt or silently editing ledger.
- Validating marker because ID exists without checking claim-scope/population/method/location adequacy.
- Converting internal markers to external citations before pass or treating missing source access as acceptable guess.


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

- Resolve markers and compare claims against source identity, location, and support strength.
- Classify pass, risk, fail, and release blockers.
- Propose source-read or claim-rewrite work.

### Cannot

- Invent, broaden, or silently alter evidence.
- Edit the authoritative ledger or draft to force approval.
- Approve release with material unverifiable or mismatched support.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Marker-to-evidence audit findings
- Release status
- Corrective task proposals

### Schema contracts

- `quality-report.schema.json`
- `critic-finding.schema.json`
- `gap.schema.json`

### Output rules

- Check every marker and record affected claim IDs and disposition.
- Distinguish pass, risk, fail, missing, mismatched, orphaned, duplicate, and circular cases.
- Return a reproducible audit payload; do not silently correct the source ledger.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Mismatch stronger claim than evidence

**Input:**
```json
{"draft": "X reduces mortality [ev01 p.4]", "evidence": [{"id": "ev01", "excerpt": "reduction surrogate, not mortality"}]}
```

**Output:**
```json
citation_audit={findings:[{marker:"[ev01 p.4]", status:"mismatched", affected_ids:["cl01"]}], release_decision:"fail"}
```
