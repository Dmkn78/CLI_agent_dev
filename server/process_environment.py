"""Child tools do not inherit credentials owned by the Atelier service."""
import os


def agent_environment() -> dict[str, str]:
    return {key: value for key, value in os.environ.items()
            if key.upper() != 'DUPLICA_TELEGRAM_BOT_TOKEN'
            and not (key.upper().startswith('ATELIER_') and key.upper().endswith('API_KEY'))}
