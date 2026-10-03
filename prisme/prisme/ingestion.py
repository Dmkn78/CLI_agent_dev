"""Preserve originals and page provenance; render scans for vision inputs."""
from __future__ import annotations

import base64
import binascii
import hashlib
import io
from pathlib import Path

from .storage import Library, identifier, timestamp

MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_TOTAL_BYTES = 40 * 1024 * 1024
MAX_PAGES = 100
SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"}


def import_sources(library: Library, files: list[dict], title: str = "") -> dict:
    if not isinstance(files, list) or not 1 <= len(files) <= 12:
        raise ValueError("Dépose entre 1 et 12 fichiers.")
    decoded = []
    page_count = 0
    for upload in files:
        if not isinstance(upload, dict) or not isinstance(upload.get("name"), str):
            raise ValueError("Fichier invalide.")
        name = Path(upload["name"].replace("\\", "/")).name[:180]
        extension = Path(name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Format non pris en charge : {extension or name}.")
        try:
            content = base64.b64decode(upload.get("content", ""), validate=True)
        except (ValueError, TypeError, binascii.Error) as error:
            raise ValueError("Fichier encodé incorrectement.") from error
        if not content or len(content) > MAX_FILE_BYTES:
            raise ValueError("Chaque fichier doit faire entre 1 octet et 25 Mo.")
        if extension in {".txt", ".md"}:
            try:
                text = content.decode("utf-8-sig")
            except UnicodeDecodeError as error:
                raise ValueError("Les fichiers texte doivent être encodés en UTF-8.") from error
            if not text.strip():
                raise ValueError("Ce fichier texte est vide.")
            page_count += (len(text) + 11999) // 12000
        elif extension == ".pdf":
            try:
                import fitz
                with fitz.open(stream=content, filetype="pdf") as document:
                    if document.needs_pass:
                        raise ValueError("Ce PDF est protégé par mot de passe. Fournis une copie déverrouillée.")
                    if not 1 <= len(document) <= MAX_PAGES:
                        raise ValueError("Limite de 100 pages par fichier.")
                    for index, page in enumerate(document):
                        if len(page.get_text("text").strip()) > 50000:
                            raise ValueError(f"Page {index + 1} trop dense. Découpe le fichier.")
                    page_count += len(document)
            except ImportError as error:
                raise ValueError("La lecture des PDF nécessite PyMuPDF : python -m pip install -r requirements.txt") from error
            except RuntimeError as error:
                raise ValueError("PDF illisible. Vérifie le fichier d'origine.") from error
        else:
            try:
                from PIL import Image
                with Image.open(io.BytesIO(content)) as image:
                    image.verify()
            except ImportError as error:
                raise ValueError("La lecture des images nécessite Pillow : python -m pip install -r requirements.txt") from error
            except (OSError, ValueError) as error:
                raise ValueError("Image illisible. Vérifie le fichier d'origine.") from error
            page_count += 1
        if page_count > MAX_PAGES:
            raise ValueError("Limite de 100 pages par cours. Découpe le document en chapitres.")
        decoded.append((name, extension, content))
    if sum(len(content) for _, _, content in decoded) > MAX_TOTAL_BYTES:
        raise ValueError("Le lot dépasse 40 Mo. Importe un chapitre à la fois.")
    course_id = identifier("course")
    course = {"id": course_id, "title": title.strip()[:160] or Path(decoded[0][0]).stem,
              "subtitle": "Tes sources sont prêtes à devenir un parcours.", "status": "imported",
              "createdAt": timestamp(), "chapters": [], "sources": [], "warnings": [], "origin": "import"}
    for name, extension, content in decoded:
        source_id = identifier("source")
        source_root = f"courses/{course_id}/sources/{source_id}"
        original = f"{source_root}/original{extension}"
        target = library.path(original)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        source = {"id": source_id, "name": name, "file": original, "bytes": len(content),
                  "sha256": hashlib.sha256(content).hexdigest(), "pages": []}
        if extension in {".txt", ".md"}:
            try:
                text = content.decode("utf-8-sig")
            except UnicodeDecodeError as error:
                raise ValueError("Les fichiers texte doivent être encodés en UTF-8.") from error
            if not text.strip():
                raise ValueError("Ce fichier texte est vide.")
            # Explicit chunks keep every character; no silent truncation.
            source["pages"] = [{"number": index + 1, "kind": "text", "text": text[start:start + 12000], "image": None}
                               for index, start in enumerate(range(0, len(text), 12000))]
        else:
            source["pages"] = _render_pages(library, source_root, target, extension)
        course["sources"].append(source)
        if sum(len(item["pages"]) for item in course["sources"]) > MAX_PAGES:
            raise ValueError("Limite de 100 pages par cours. Découpe le document en chapitres.")
    course["pageCount"] = sum(len(source["pages"]) for source in course["sources"])
    course["visionPages"] = sum(page["kind"] != "text" for source in course["sources"] for page in source["pages"])
    library.save_course(course)
    return course


def _render_pages(library: Library, relative: str, path: Path, extension: str) -> list[dict]:
    if extension != ".pdf":
        from PIL import Image, ImageOps
        image_path = f"{relative}/page-0001.png"
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original)
            image.thumbnail((1800, 1800))
            if image.mode == "RGBA":
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            else:
                image = image.convert("RGB")
            image.save(library.path(image_path), format="PNG")
        return [{"number": 1, "kind": "vision", "text": "", "image": image_path}]
    try:
        import fitz
    except ImportError as error:
        raise ValueError("La lecture des PDF et images nécessite PyMuPDF : python -m pip install -r requirements.txt") from error
    try:
        document = fitz.open(path)
    except Exception as error:
        raise ValueError("PDF ou image illisible. Vérifie le fichier d'origine.") from error
    with document:
        if document.needs_pass:
            raise ValueError("Ce PDF est protégé par mot de passe. Fournis une copie déverrouillée.")
        if not 1 <= len(document) <= MAX_PAGES:
            raise ValueError("Limite de 100 pages par fichier.")
        pages = []
        for index, page in enumerate(document):
            text = page.get_text("text").strip() if extension == ".pdf" else ""
            if len(text) > 50000:
                raise ValueError(f"Page {index + 1} trop dense. Découpe le fichier.")
            has_images = extension == ".pdf" and (bool(page.get_images()) or bool(page.get_drawings()))
            kind = "text" if len(text) >= 60 and not has_images else ("mixed" if len(text) >= 60 else "vision")
            image_path = f"{relative}/page-{index + 1:04}.png"
            scale = min(2, 1800 / max(page.rect.width, page.rect.height))
            pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            pixmap.save(str(library.path(image_path)))
            pages.append({"number": index + 1, "kind": kind, "text": text, "image": image_path})
        return pages


def generation_batches(course: dict) -> list[list[dict]]:
    batches, current, characters, images = [], [], 0, 0
    for source in course["sources"]:
        for page in source["pages"]:
            segments = [page["text"][start:start + 18000] for start in range(0, len(page["text"]), 18000)] or [""]
            for segment_index, text in enumerate(segments):
                image = page["image"] if page["kind"] != "text" and segment_index == 0 else None
                if current and (characters + len(text) > 26000 or images + bool(image) > 8 or len(current) >= 12):
                    batches.append(current)
                    current, characters, images = [], 0, 0
                current.append({"sourceId": source["id"], "name": source["name"], "page": page["number"],
                                "text": text, "image": image, "kind": page["kind"]})
                characters += len(text)
                images += bool(image)
    if current:
        batches.append(current)
    return batches

