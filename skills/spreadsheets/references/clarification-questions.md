# Clarification questions

Check user attachments and references first and reuse answers already given. Review every category below. Ask exactly one question for each unanswered category. A reasonable default or an inferred preference does not count as an answer.

Within each category, ask about the missing detail that matters most. Do not combine categories into one question or limit the round to only the highest-priority categories.

## What to ask

| Detail | Ask for |
| --- | --- |
| Purpose | What the workbook should help someone do, such as track expenses, compare budgets, forecast demand, or decide where to invest. |
| Audience and use | Who will enter data, maintain the workbook, and read the results. Whether this is a one-time analysis or a tracker they will update regularly. |
| Scope and detail | What to include, such as teams, products, accounts, or projects, and the time period. What each row should represent, such as a transaction, customer, or monthly total. |
| Inputs and calculations | What users will enter and what the workbook should calculate. Any assumptions or business rules, such as tax rates, allocation rules, or forecast drivers. |
| Main metrics | Which numbers matter most and how to define them. Any targets or comparisons, such as actual versus budget or change from last month. |
| Outputs | What users need to see, such as a summary dashboard, detailed records, charts, or a scenario comparison. Which result should be easiest to find. |
| Data sources | Which files, sheets, or connected systems supply the data and which source to trust if they disagree. For recurring workbooks, how new data will arrive. If no data is available, whether to create a blank template or clearly labeled sample data. Ask about citations when needed. |
| Additional coverage | Any required columns, categories, exceptions, or existing layout to preserve. For example, separate currencies, overdue items, or a reporting format the team already uses. |

## How to ask

Use `request_user_input_async` to ask questions. Submit all questions together in one `request_user_input_async` call.

For structured questions, give the two best options for the task. For each option, include a short rationale/elaboration for the choice in the option's text. Add `Use your judgment` as the third option. Make either the 1st or 2nd option recommended

For open-ended question, include examples in the question text to help the user answer, such as "Is there anything else this should cover, such as a specific example or concern?" If the tool is unavailable, ask in a message.

If the user doesn't provide a template, you may find a template while the user answers. Otherwise, wait at least 90 seconds for a reply. If none arrives, make a reasonable assumption or use a placeholder and disclose it. Never invent data or citations to fill a missing source. Do not stop the turn.
