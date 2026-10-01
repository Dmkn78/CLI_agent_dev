# Clarification questions

Check user attachments and references first and reuse answers already given. Review every category below. Ask exactly one question for each unanswered category. A reasonable default or an inferred preference does not count as an answer.

Within each category, ask about the missing detail that matters most. Do not combine categories into one question or limit the round to only the highest-priority categories.

## What to ask

| Detail | Ask for |
| --- | --- |
| Purpose | What should the audience remember or agree to? |
| Audience | Who is the presentation for, such as customers evaluating a product or colleagues familiar with the project? |
| Delivery and timing | How will the deck be used, such as a 10-minute live presentation or a self-paced read? If live delivery is already established, ask only for the duration in minutes, including discussion. |
| Tone | How should it sound, such as an energetic pitch, candid update, or practical explanation? |
| Target coverage | Which topics must fit into the main presentation? A subject alone does not answer this category. |
| Key moment | Which finding, demo, comparison, or ask should get the most attention? |
| Visual preference | Ask only if no template was provided. Which visuals would best explain the content, such as charts, diagrams, screenshots, or photography? |
| Data sources | When evidence is needed, which data or sources should support the story, such as a results spreadsheet, customer research, or published references? |
| Additional coverage | What else must be included, such as a specific example, anticipated question, speaker notes, or closing next step? |

## How to ask

Use `request_user_input_async` to ask questions. Submit all questions together in one `request_user_input_async` call.

For structured questions, give the two best options for the task. For each option, include a short rationale/elaboration for the choice in the option's text. Add `Use your judgment` as the third option. Make either the 1st or 2nd option recommended

For open-ended question, include examples in the question text to help the user answer, such as "Is there anything else this should cover, such as a specific example or concern?" If the tool is unavailable, ask in a message.

If the user doesn't provide a template, you may find a template while the user answers. Otherwise, wait at least 90 seconds for a reply. If none arrives, make a reasonable assumption or use a placeholder and disclose it. Never invent data or citations to fill a missing source. Do not stop the turn.
