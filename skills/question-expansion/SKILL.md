---
name: question-expansion
description: Generate and prioritize research questions from explicit gaps in definitions, evidence, relations, contradictions, approaches, or implementation.
license: MIT
metadata:
  version: "0.1.0"
  portability: "agent-skills-compatible"
---

# Question Expansion

## Outcome

Turn uncertainty into a small, ordered set of questions that can be answered by identifiable evidence or artifacts.

## When to use

Use after field mapping, criticism, graph diagnostics, paper analysis, approach review, or whenever the current state does not say what to investigate next.

## When NOT to use

Do NOT use when gaps are already converted into prioritized actionable tasks or when terminal synthesis is blocked only by execution, not by missing research questions.

## Agent bindings

This skill is invoked by the following agents:

- `field-mapper`
- `gap-finder`
- `planner`
- `question-generator`

The agent remains responsible for the final `AgentResult`, policy checks, and state handoff. The skill supplies behavior and artifact rules; it does not spawn agents or own authoritative state.

## Workflow

1. Inventory unsupported claims, ambiguous concepts, missing relations, contradictions, approach assumptions, and failed tasks.
2. Write one question per gap and name the state record that motivated it.
3. Specify the expected resolution evidence and the information that would change the plan.
4. Deduplicate semantically similar questions while retaining different hypotheses or populations.
5. Prioritize by blocking impact, uncertainty, information gain, and cost; stop when the backlog is actionable.

## Inputs

JSON { research_state: object (questions/concepts/relations/claims/evidence/gaps/critic_findings), task: {objective: string}, budgets: {max_depth:int,max_sources:int}, decision_policy: object }.


## Outputs

Returns new_questions (question.schema.json: id/text/priority[critical|high|medium|low]/status/origin/expected_information_gain) + bounded requested_tasks 1:1 + findings explaining blocking/useful/deferrable.

## Input contract

### Required

- Objective
- State defects: gaps, unsupported claims, contradictions, or failed tasks
- Budget and decision policy

### Optional

- Graph diagnostics
- Approach assumptions
- Existing question backlog

### Never assume

- A related mention resolves the gap
- Every uncertainty needs a task
- A question is schedulable without resolution evidence

## Artifact rules

- Use precise, answerable wording rather than broad prompts such as `research more`.
- Separate descriptive, causal, comparative, implementation, and decision questions.
- Never imply that a question is resolved without a matching artifact or evidence record.

## Evidence and uncertainty

Accept JSON-compatible context and return schema-compatible artifacts. Keep provider names, model names, databases, queues, and framework objects outside the domain result. Use stable IDs, separate observations from claims and interpretations, and state unsupported or conflicting information explicitly.

## Quality checks

- A planner can create a task directly from the question.
- Priority is justified by consequence, not by rhetorical urgency.
- The list remains bounded by the configured depth and budget.

## Anti-patterns

- Generating a long undifferentiated backlog without resolution criteria.
- Marking a question resolved because a related topic was mentioned.
- Creating tasks without a completion signal or expected resolution artifact.


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

- Read the state projection and identify actionable uncertainty.
- Create deduplicated questions with priority, origin, and resolution criteria.
- Propose bounded tasks through the invoking agent.

### Cannot

- Create an unbounded curiosity backlog.
- Mark a question resolved without its expected artifact.
- Dispatch, retry, or mutate the authoritative queue.

## Output format

Return a JSON-compatible domain payload for the invoking agent. The host wraps it in `AgentResult` with the task ID, status, all collection fields, completion, error, and usage.

### Primary artifacts

- `new_questions`
- Bounded `requested_tasks` proposals
- Blocking/useful/deferrable findings

### Schema contracts

- `question.schema.json`
- `research-task.schema.json` when a task proposal is emitted

### Output rules

- One question must map to one underlying gap and one resolution signal.
- Preserve distinct hypotheses or populations.
- Set `needs_replan` in the wrapping AgentResult when the plan must change.

## Version & Portability

- Version `0.1.0`, `portability: agent-skills-compatible` per `spec/PORTABLE_SKILL_SPEC.md:1`.
- Follows `agentskills.io` filesystem pattern: `skills/<name>/SKILL.md` with frontmatter `name` matching directory.
- Portable behavior: JSON-compatible inputs/outputs, no provider/queue/framework assumptions; adapter translates to prompt/tool/handoff.
- License `MIT` per frontmatter; reuse allowed with attribution.
- Schemas: inputs/outputs validated against `schemas/*.schema.json`; see `object_schema()` in `scaffold_definitions.py:1500`.

## Handoff

Workers may propose `requested_tasks`; only the orchestrator may validate and execute them. Keep the request bounded by objective, role, expected output, dependency, and available budget. Return partial valid artifacts on failure and explain what remains unresolved.

## Examples

### Generation after graph diagnostics

**Input:**
```json
{"gaps": ["claim c12 without support", "relation r3 unsupported"], "critic_findings": [{"severity": "high"}]}
```

**Output:**
```json
new_questions=[{id:"q07", text:"Does causal effect X->Y hold beyond student sample?", priority:"high"}] + requested_tasks=[{type:"academic-research"}]
```
