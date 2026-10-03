"""Schema for generated lessons, and strict validation before publication."""
from __future__ import annotations

import json

TEXT = {"type": "string"}


def object_schema(properties: dict) -> dict:
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


def array_schema(item: dict) -> dict:
    return {"type": "array", "items": item}


CHAPTER_SCHEMA = object_schema({
    "title": TEXT, "kicker": TEXT, "intro": TEXT, "intuition": TEXT, "prerequisites": TEXT,
    "formula": TEXT, "variables": array_schema(object_schema({"symbol": TEXT, "meaning": TEXT})),
    "proof": array_schema(object_schema({"title": TEXT, "body": TEXT})),
    "prediction": object_schema({"question": TEXT, "choices": array_schema(TEXT), "answer": {"type": "integer"}, "explanation": TEXT}),
    "exercise": object_schema({"question": TEXT, "hint": TEXT, "solution": TEXT}),
    "pitfall": TEXT, "application": TEXT, "questions": array_schema(TEXT),
    "lab": object_schema({"kind": {"type": "string", "enum": ["brownian", "expectation", "derivative", "surface", "custom"]},
                          "title": TEXT, "description": TEXT, "html": TEXT}),
    "sourceRefs": array_schema(object_schema({"sourceId": TEXT, "page": {"type": "integer"}})),
})
COURSE_SCHEMA = object_schema({"title": TEXT, "subtitle": TEXT, "chapters": array_schema(CHAPTER_SCHEMA), "warnings": array_schema(TEXT)})


def validate_generated(document: dict, allowed_pages: set[tuple[str, int]]) -> dict:
    _validate_schema(document, COURSE_SCHEMA, "cours")
    chapters = document["chapters"]
    if not 1 <= len(chapters) <= 12:
        raise ValueError("Codex doit produire entre 1 et 12 sections par lot.")
    if not document["title"].strip():
        raise ValueError("Le cours n'a pas de titre.")
    referenced_pages = set()
    for chapter in chapters:
        if not chapter["title"].strip() or not chapter["intro"].strip() or not chapter["intuition"].strip():
            raise ValueError("Une section est incomplète.")
        prediction = chapter["prediction"]
        if not 2 <= len(prediction["choices"]) <= 5 or not 0 <= prediction["answer"] < len(prediction["choices"]):
            raise ValueError("Question de prédiction invalide.")
        if not chapter["proof"] or not chapter["exercise"]["solution"].strip():
            raise ValueError("Démonstration ou correction manquante.")
        if not chapter["sourceRefs"]:
            raise ValueError("Chaque section doit être reliée à une page source.")
        for reference in chapter["sourceRefs"]:
            if (reference["sourceId"], reference["page"]) not in allowed_pages:
                raise ValueError("Une référence ne correspond pas aux pages fournies.")
            referenced_pages.add((reference["sourceId"], reference["page"]))
        if chapter["lab"]["kind"] == "custom" and not chapter["lab"]["html"].strip():
            raise ValueError("L'expérience personnalisée est vide.")
    if referenced_pages != allowed_pages:
        raise ValueError("Certaines pages du lot ne sont reliées à aucune section. La création doit couvrir toutes les sources.")
    return document


def parse_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        document = json.loads(text)
    except (json.JSONDecodeError, ValueError) as error:
        raise ValueError("Codex n'a pas renvoyé un cours JSON valide. La réponse est conservée dans les preuves.") from error
    return document


def _validate_schema(value, schema: dict, path: str) -> None:
    kind = schema["type"]
    expected = {"object": dict, "array": list, "string": str, "integer": int}[kind]
    if type(value) is not expected:
        raise ValueError(f"Champ {path} : type {kind} attendu.")
    if kind == "object":
        if set(value) != set(schema["properties"]):
            raise ValueError(f"Champs manquants ou inconnus : {path}.")
        for key, child in schema["properties"].items():
            _validate_schema(value[key], child, f"{path}.{key}")
    elif kind == "array":
        if len(value) > 100:
            raise ValueError(f"Liste trop longue : {path}.")
        for item in value:
            _validate_schema(item, schema["items"], path)
    elif kind == "string" and len(value) > (120000 if path.endswith(".html") else 20000):
        raise ValueError(f"Champ trop long : {path}.")
    if "enum" in schema and value not in schema["enum"]:
        raise ValueError(f"Choix invalide : {path}.")

