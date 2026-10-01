---
name: academic-source-strategy
description: Choose an academic-first source strategy for literature discovery, primary research, scholarly triangulation, and repository routing.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Academic Source Strategy

## Outcome

Match each claim to the strongest practical source type and explain why the source is relevant and sufficient.

## When to use

Use for literature reviews, scientific or methodological questions, paper discovery, replication checks, and claims that need scholarly support.

## When NOT to use

Do NOT use for pure implementation, opinion, popularization or when general web suffices; useless without a claim requiring academic hierarchy and scholarly triangulation.

## Agent bindings

This skill is invoked by the following agents:

- `academic-researcher`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Classify the claim as foundational, empirical, methodological, historical, implementation, or normative.
2. Search primary studies and official repositories first; use reviews to map coverage and disagreement.
3. Record query terms, source type, publication metadata, population or method, and relevance to the question.
4. Triangulate material claims with independent evidence and inspect whether cited sources are actually accessible and relevant.
5. Downgrade community or secondary material to lead status unless it is independently verified.

## Inputs

JSON { subquestions: object[], field_map: object[], source_policy: {hierarchy:string[],preferred_sources:string[]}, tools: {search,read}, existing_claims: object[] }.


## Outputs

Returns scholarly evidence (evidence.schema.json + author/publication_date/source_type[primary|review|meta_analysis]/method/population/location) + claims linked via supports/refutes/context + findings mapping disagreement.

## Input contract

### Required

- Claim or subquestions
- Source hierarchy and preferred repositories
- Academic search/read capabilities

### Optional

- Field map
- Existing claims/evidence
- Method, population, date, and replication filters

### Never assume

- A preprint, review, or citation count proves validity
- Authority replaces claim relevance
- Secondary evidence is primary evidence

## Artifact rules

- Separate discovery leads from evidence accepted into the ledger.
- Record limitations, replication status, and applicability rather than only authority signals.
- Treat source-quality dimensions as explicit heuristics, not calibrated probabilities.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- The source hierarchy follows the configured policy.
- The source is appropriate to the claim's scope and method.
- Conflicting or missing primary evidence remains visible.

## Anti-patterns

- Treating preprint, review or citation count as proof of validity.
- Merging results from different populations/estimands/methods without stating difference.
- Presenting heuristic source quality score as calibrated probability.


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

- Classify claims and select an appropriate scholarly source strategy.
- Prioritize primary studies, official repositories, reviews, or secondary leads.
- Record disagreement, replication status, and source-quality dimensions.

### Cannot

- Invent scholarly metadata or summarize unread full text.
- Convert heuristic quality scores into probabilities.
- Override the configured source policy or approve evidence without inspection.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Scholarly evidence
- Linked claims
- Disagreement and source-strategy findings

### Schema contracts

- `evidence.schema.json`
- `claim.schema.json`
- `source.schema.json`

### Output rules

- Separate discovery leads from inspected evidence.
- Match source type and method to claim scope.
- Downgrade claim wording when independent or direct support is missing.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Review on nudges and retirement savings

**Input:**
```json
{"claim": "opt-out nudge increases savings 30%", "query_terms": ["nudge","savings","RCT"]}
```

**Output:**
```json
evidence=[{id:"e21", source_type:"primary_research", method:"RCT N=2000", location:"Table 3"}] + claims=[{id:"cl04", status:"supported"}]
```
