---
name: concept-graph
description: Build and inspect a lightweight technology-independent concept graph with typed, evidence-linked relations and structural diagnostics.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Concept Graph

## Outcome

Expose dependencies, mediators, isolated concepts, unsupported edges, and the smallest subgraph needed by the current task.

## When to use

Use when the objective depends on relationships among concepts, methods, mechanisms, prerequisites, or structural gaps.

## When NOT to use

Do NOT use when objective is a linear list, summary or classification without dependencies, mediators, local subgraphs or structural diagnostics to expose.

## Agent bindings

This skill is invoked by the following agents:

- `concept-linker`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Define concept nodes and stable IDs before creating edges.
2. Add typed relations with direction, status, assumptions, failure conditions, and evidence references.
3. Run diagnostics for isolated nodes, missing endpoints, unsupported edges, and duplicate relations.
4. Select a local subgraph around task-relevant seeds instead of copying the entire graph into context.
5. Convert graph defects into explicit questions or bounded research tasks.

## Inputs

JSON { concepts: object[] (concept.schema.json), relations: object[] (relation.schema.json), claims: object[], evidence: object[], task_objective: string, seed_concepts: string[] }.


## Outputs

Returns typed relations (relation.schema.json with assumptions/failure_conditions/evidence_refs) + updated concepts + findings/gaps (isolated nodes, unsupported edges) + selective local subgraph.

## Input contract

### Required

- Concept records with IDs
- Relations, claims, and evidence
- Task objective and graph seed concepts

### Optional

- Ontology hints
- Existing diagnostics
- Graph scope or depth limit

### Never assume

- An endpoint exists because a name appears in prose
- The graph itself is evidence
- The entire graph belongs in context

## Artifact rules

- A graph is a representation of claims and relations, not evidence by itself.
- Do not require a graph database, embeddings, GraphRAG, or a graph neural network.
- Keep ontology choices and unresolved relation types explicit.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- Every important edge has a clear meaning and support status.
- The local subgraph answers the task without irrelevant graph growth.
- Unsupported or isolated structures become visible quality risks.

## Anti-patterns

- Creating an edge whose endpoints do not exist or are ambiguous.
- Treating co-occurrence or lexical similarity as validated relation.
- Copying entire graph into context instead of selecting useful local subgraph.


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

- Build a task-relevant local graph and validate endpoint integrity.
- Create typed relation candidates and diagnose isolated/unsupported structures.
- Convert graph defects into questions or bounded proposals.

### Cannot

- Create edges with missing endpoints.
- Require a graph database, embeddings, or a specific vendor stack.
- Mutate canonical graph state or dispatch work directly.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- Typed `relations`
- Relevant concept updates
- Graph diagnostics and gaps

### Schema contracts

- `concept.schema.json`
- `relation.schema.json`
- `gap.schema.json`

### Output rules

- State relation type, status, assumptions, failure conditions, and evidence references.
- Return the smallest useful subgraph.
- Keep ontology choices and unresolved edges explicit.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### RAG system dependency graph

**Input:**
```json
{"concepts": ["retrieval","ranking","generation"], "seed": "hallucination", "relations": ["r1:retrieval->generation"]}
```

**Output:**
```json
relations=[{id:"r02", type:"mediates", status:"supported"}] + diagnostics="isolated ranking resolved, retrieval->generation qualified conditional"
```
