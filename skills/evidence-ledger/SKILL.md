---
name: evidence-ledger
description: Create traceable evidence records and link claims, relations, approaches, and insights to source-level support or refutation.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Evidence Ledger

## Outcome

Make every important assertion auditable from a stable ID to a source, location, and bounded excerpt or summary.

## When to use

Use whenever the answer contains factual, empirical, scholarly, comparative, implementation, or citation-sensitive claims.

## When NOT to use

Do NOT use for brainstorming, fiction or non-factual claims without audit need; useless when no assertion requires source/location/excerpt traceability.

## Agent bindings

This skill is invoked by the following agents:

- `academic-researcher`
- `approach-mapper`
- `citation-auditor`
- `critic`
- `domain-transfer`
- `paper-analyst`
- `web-researcher`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Split prose into atomic claims that can be supported or refuted independently.
2. Create one evidence record per material source-location-claim relationship with a stable ID.
3. Record URL or document ID, title, author/date, retrieval time, location, excerpt or summary, and source type.
4. Link claims and relations to evidence IDs and label supports, refutes, or context.
5. Record source, method, directness, independent support, and real-world validity as explicit heuristic dimensions.

## Inputs

JSON { prose_or_claims: string|object[], sources: object[] {url,title,author,retrieved_at,document_id,location}, claims: object[], relations: object[] } to atomize and link.


## Outputs

Returns evidence (evidence.schema.json with source_url/title/author/publication_date/retrieved_at/location/excerpt/supports_or_refutes/quality dimensions) + claims (claim.schema.json) linked via evidence_refs.

## Input contract

### Required

- Prose or atomic claims
- Inspected source metadata and locations
- Existing claims, relations, and evidence IDs

### Optional

- Source policy
- Contradictory findings
- Retrieval timestamps and document identifiers

### Never assume

- A source lead is readable evidence
- A citation supports the exact wording without scope checking
- Missing metadata can be guessed

## Artifact rules

- Never invent a source, quote, location, or evidence ID.
- A source lead is not evidence until the underlying material has been inspected.
- Preserve contradictions and unsupported claims instead of smoothing them away.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- A reviewer can navigate from prose to evidence and back.
- The evidence supports the exact strength and scope of the claim.
- Heuristic scores are not presented as probabilities or truth values.

## Anti-patterns

- Inventing URL, quote, location, author, date or evidence ID.
- Promoting an unread search lead to validated evidence.
- Smoothing away contradictions and unsupported claims instead of preserving them.


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

- Atomize claims and create traceable evidence records.
- Link support/refute/context relationships and preserve contradictions.
- Flag missing, orphaned, circular, or weak support.

### Cannot

- Invent source, quote, author, date, location, or evidence ID.
- Silently rewrite a claim to fit a source.
- Persist authoritative ledger changes without host reduction.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- `evidence`
- `claims`
- Support/refute/context links

### Schema contracts

- `evidence.schema.json`
- `claim.schema.json`

### Output rules

- Use stable IDs and bidirectional `evidence_refs`.
- Record directness, source quality, method quality, independent support, and real-world validity as heuristics.
- Preserve unsupported and conflicting claims instead of smoothing them away.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Traceability of architecture comparison

**Input:**
```json
{"prose": "RAG reduces hallucinations 40% vs fine-tuning alone [?]", "source": {"url": "https://arxiv.org/abs/2305...", "location": "Table 4 p.8"}}
```

**Output:**
```json
claims=[{id:"cl11", text:"RAG reduces hallucinations 40%", evidence_refs:["e41"]}] + evidence=[{id:"e41", location:"Table 4 p.8", supports:"supports"}]
```
