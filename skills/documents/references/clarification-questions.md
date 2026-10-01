# Clarification questions

Check user attachments and references first and reuse answers already given. Review every category below. Ask exactly one question for each unanswered category. A reasonable default or an inferred preference does not count as an answer.

Within each category, ask about the missing detail that matters most. Do not combine categories into one question or limit the round to only the highest-priority categories.

## What to ask

| Detail | Ask for |
| --- | --- |
| Purpose | What should the reader understand, decide, or do after reading? |
| Audience | Who is the document for, such as executives deciding on a proposal or teammates learning a process? |
| Length | How many pages should the document be, including any appendices? |
| Tone | How should it sound, such as conversational, formal, or persuasive? |
| Target coverage | Which questions or topics must the document address? |
| Emphasis | Which argument, recommendation, or finding deserves the most space? |
| Data sources | When evidence is needed, which sources should support the claims, such as supplied research, internal reports, or external references to cite? |
| Additional coverage | What else must appear, such as a specific example, objection, risk, or recommendation? |

## How to ask

Use `request_user_input_async` to ask questions. Submit all questions together in one `request_user_input_async` call.

For structured questions, give the two best options for the task. For each option, include a short rationale/elaboration for the choice in the option's text. Add `Use your judgment` as the third option. Make either the 1st or 2nd option recommended

For open-ended question, include examples in the question text to help the user answer, such as "Is there anything else this should cover, such as a specific example or concern?" If the tool is unavailable, ask in a message.

If the user doesn't provide a template, you may find a template while the user answers. Otherwise, wait at least 90 seconds for a reply. If none arrives, make a reasonable assumption or use a placeholder and disclose it. Never invent data or citations to fill a missing source. Do not stop the turn.
