"""Bound public context without silently dropping the user's original intent."""
import copy

PUBLIC_FIELDS = ('id', 'channelId', 'participantId', 'author', 'role', 'text', 'createdAt',
                 'roundId', 'sequence', 'readyToPlan')
MAX_PROJECTED_CHARACTERS = 40000


def public_context(messages: list[dict], limit: int, participant_ids: list[str] | None = None) -> tuple[list[dict], dict]:
    selected = {}
    total = sum(len(message['text']) for message in messages)

    def retain(index: int, characters: int) -> None:
        message = messages[index]
        excerpt = {key: copy.deepcopy(message[key]) for key in PUBLIC_FIELDS if key in message}
        if characters < len(message['text']):
            excerpt['text'] = message['text'][:characters]
            excerpt['contextExcerpt'] = {'originalCharacters': len(message['text']),
                'includedCharacters': characters, 'startCharacter': 0, 'endCharacter': characters}
        selected[index] = excerpt

    def retain_group(indexes: list[int], budget: int) -> int:
        # Fair allocation preserves an excerpt of every user correction/position,
        # rather than silently treating the oldest ones as never expressed.
        remaining = list(indexes)
        allocations = {index: 0 for index in indexes}
        while remaining and budget:
            share = max(1, budget // len(remaining))
            for index in list(remaining):
                extra = min(share, len(messages[index]['text']) - allocations[index], budget)
                allocations[index] += extra
                budget -= extra
                if allocations[index] == len(messages[index]['text']):
                    remaining.remove(index)
                if not budget:
                    break
        for index, characters in allocations.items():
            if characters:
                retain(index, characters)
        return sum(allocations.values())

    if total <= limit:
        for index, message in enumerate(messages):
            retain(index, len(message['text']))
    else:
        users = [index for index, message in enumerate(messages) if message['role'] == 'user']
        user_size = sum(len(messages[index]['text']) for index in users)
        user_budget = min(user_size, limit if len(users) == len(messages) else max(1, limit // 2))
        remaining = limit - retain_group(users, user_budget)
        latest_positions = {}
        active = set(participant_ids) if participant_ids is not None else None
        for index in reversed(range(len(messages))):
            participant = messages[index].get('participantId')
            if participant and (active is None or participant in active):
                latest_positions.setdefault(participant, index)
        positions = sorted(latest_positions.values())
        remaining -= retain_group(positions, remaining // 2)
        # Spend the remaining allowance on the most recent public exchanges,
        # extending a retained position when its complete text still fits.
        for index in reversed(range(len(messages))):
            if not remaining:
                break
            already = len(selected.get(index, {}).get('text', ''))
            extra = min(len(messages[index]['text']) - already, remaining)
            if extra:
                retain(index, already + extra)
                remaining -= extra
    # Labels identifying author/message/excerpts also consume provider context.
    # Bound those even when hundreds of tiny messages fit the text-only budget.
    def projected_size() -> int:
        return sum(len(entry['text']) + len(entry['author']) + len(entry.get('id', ''))
                   + len(entry.get('participantId') or '') + 180 for entry in selected.values())

    latest = {}
    active = set(participant_ids) if participant_ids is not None else None
    for index in reversed(range(len(messages))):
        identity = messages[index].get('participantId')
        if identity and (active is None or identity in active):
            latest.setdefault(identity, index)
    users = [index for index in selected if messages[index]['role'] == 'user']
    protected = set(sorted(latest.values())[-8:]) | ({min(users), max(users)} if users else set())
    candidates = [index for index in sorted(selected) if index not in protected and messages[index]['role'] != 'user']
    candidates += [index for index in sorted(selected) if index not in protected and messages[index]['role'] == 'user']
    # Extremely long histories can require dropping middle user corrections too;
    # the exact omitted IDs are reported, never replaced with a guessed summary.
    for index in candidates:
        if projected_size() <= MAX_PROJECTED_CHARACTERS:
            break
        selected.pop(index)
    context = [selected[index] for index in sorted(selected)]
    omitted = [message['id'] for index, message in enumerate(messages) if index not in selected]
    truncated = [message['id'] for message in context if 'contextExcerpt' in message]
    report = {'truncated': bool(omitted or truncated), 'totalMessages': len(messages),
              'includedMessages': len(context), 'omittedMessageIds': omitted,
              'excerptMessageIds': truncated, 'originalCharacters': total,
              'includedCharacters': sum(len(message['text']) for message in context),
              'characterLimit': limit,
              'estimatedProjectedCharacters': projected_size(), 'projectedCharacterLimit': MAX_PROJECTED_CHARACTERS,
              'includedUserMessageIds': [message['id'] for message in context if message['role'] == 'user'],
              'omittedUserMessageIds': [message['id'] for index, message in enumerate(messages)
                                        if message['role'] == 'user' and index not in selected]}
    return context, report


def identified_messages(messages: list[dict], participant_id: str) -> list[dict]:
    identified = []
    for message in messages:
        author = message['author']
        identity = message.get('participantId')
        if message['role'] == 'user':
            label = 'demande utilisateur' if message.get('id') else 'sujet du canal'
        elif identity == participant_id:
            label = 'votre réponse publique antérieure · id=' + identity
        else:
            label = 'réponse publique d’un pair · id=' + str(identity or 'non renseigné')
        if message.get('id'):
            label += ' · message=' + message['id']
        if message.get('contextExcerpt'):
            excerpt = message['contextExcerpt']
            label += ' · extrait initial ' + str(excerpt['includedCharacters']) + '/' + str(excerpt['originalCharacters']) + ' caractères'
        identified.append(dict(message, author=author + ' [' + label + ']'))
    return identified
