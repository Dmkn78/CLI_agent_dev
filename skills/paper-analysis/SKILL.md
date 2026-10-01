---
name: paper-analysis
description: Analyze papers beyond summarization by extracting questions, methods, assumptions, results, validity, limitations, frictions, and open questions.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Paper Analysis

## Outcome

Make a paper usable as inspectable evidence and as a source of transferable or non-transferable methods.

## When to use

Use whenever a paper, preprint, report, thesis, or technical document is central to the research objective.

## When NOT to use

Do NOT use when no paper/preprint/report/thesis is central to the objective, or when generic summary suffices without extracting method, validity and transfer frictions.

## Agent bindings

This skill is invoked by the following agents:

- `paper-analyst`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Identify the research question, estimand, hypotheses, baseline, data, sample, and method.
2. List assumptions and determine which are measured, imposed, tested, or merely asserted.
3. Extract main and null results with exact table, figure, section, or page locations.
4. Assess internal validity, external validity, robustness, alternative explanations, and uncertainty.
5. Inspect implementation frictions such as costs, leakage, latency, capacity, data drift, multiple testing, or deployment constraints.

## Inputs

JSON { paper_ref: {url:string,document_id:string|null}, task_objective: string, concepts: object[], questions: object[], source_metadata: object }.


## Outputs

Returns atomic evidence per method/result/limitation/friction (evidence.schema.json with location section|table|figure|page) + claims distinguishing reported observation vs author interpretation vs analyst inference.

## Input contract

### Required

- Readable paper/document reference
- Analysis objective
- Relevant concepts and source metadata

### Optional

- Appendices, datasets, competing papers, and implementation constraints

### Never assume

- The abstract contains all limitations
- Correlation establishes causation
- A proposed implementation is demonstrated

## Artifact rules

- Separate reported observation, author interpretation, and analyst inference.
- Create claim-level evidence records rather than one broad paper summary citation.
- State what would need to be replicated or tested before transfer.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- Important claims have stable locations.
- Causal strength matches the design.
- Negative results and boundary conditions are not omitted.

## Anti-patterns

- Inferring causality from correlational design without stating limitation.
- Omitting null results, exclusions, robustness failures or inconvenient caveats.
- Treating an implementation sketch as demonstrated transferable performance.


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

- Inspect the assigned document and extract methods, results, limitations, and locations.
- Separate observation, author interpretation, and analyst inference.
- Propose replication, transfer, or missing-section questions.

### Cannot

- Fill inaccessible pages, tables, or appendices from memory.
- Omit null results, exclusions, robustness failures, or caveats.
- Generalize beyond the paper's design, sample, or assumptions.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Location-aware evidence
- Atomic claims
- Validity/transfer findings and questions

### Schema contracts

- `evidence.schema.json`
- `claim.schema.json`
- `question.schema.json`

### Output rules

- Each material extraction includes a stable page/section/table/figure location.
- State what is reported, interpreted, and inferred.
- Return partial artifacts with missing sections explicit.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Analysis of RLHF paper with evaluation bias

**Input:**
```json
{"paper": "Ouyang et al. 2022 InstructGPT", "objective": "transfer RLHF to medical domain", "focus": ["estimand","robustness"]}
```

**Output:**
```json
evidence=[{id:"e31", location:"Table 2 p.7", excerpt:"win-rate 73% vs SFT"}] + claims=[{status:"supported"}] + gaps=["external validity untested"]
```
