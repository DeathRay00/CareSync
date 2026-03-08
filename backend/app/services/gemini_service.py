"""
Gemini AI service — handles multimodal prescription OCR,
medical report analysis, embedding generation, and RAG chat.
"""
from __future__ import annotations

import json
import re
from typing import Any

import google.generativeai as genai

from app.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

# Models
VISION_MODEL = "gemini-1.5-flash"          # multimodal (image + text)
TEXT_MODEL = "gemini-1.5-flash"            # fast text
EMBEDDING_MODEL = "models/text-embedding-004"  # 768-dim


# ─── Prescription OCR ─────────────────────────────────────────────────────────

async def extract_prescription_from_image(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    """
    Send prescription image to Gemini and get structured JSON back.
    Returns a dict with keys: medicines, instructions, raw_text.
    """
    model = genai.GenerativeModel(VISION_MODEL)

    prompt = (
        "You are a medical data extraction assistant. "
        "Extract all medicines, their dosages, frequencies, and instructions "
        "from this handwritten prescription image. "
        "Return ONLY a valid JSON object with this exact structure:\n"
        '{"medicines": [{"name": "...", "dosage": "...", "frequency": "...", "duration": "..."}], '
        '"instructions": "...", "raw_text": "..."}\n'
        "Do not add markdown fences or any text outside the JSON."
    )

    image_part = {"mime_type": mime_type, "data": image_bytes}
    response = model.generate_content([prompt, image_part])
    text = response.text.strip()

    # Strip possible markdown fences
    text = re.sub(r"^```[a-z]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: return raw text wrapped
        return {"medicines": [], "instructions": "", "raw_text": text}


# ─── Medical Report Analysis ──────────────────────────────────────────────────

async def analyze_medical_report(content: str | bytes, mime_type: str = "text/plain") -> str:
    """
    Analyze a medical report and return a patient-friendly summary.
    `content` can be plain extracted text or raw image bytes.
    """
    model = genai.GenerativeModel(TEXT_MODEL if isinstance(content, str) else VISION_MODEL)

    prompt = (
        "You are a compassionate medical assistant helping a patient understand their lab report. "
        "Analyze the following medical report and:\n"
        "1. Summarize the key findings in simple, non-technical language.\n"
        "2. Highlight any abnormal values and explain what they might mean.\n"
        "3. Suggest general lifestyle advice if applicable.\n"
        "Keep the response concise and empathetic.\n\n"
    )

    if isinstance(content, str):
        response = model.generate_content(prompt + content)
    else:
        image_part = {"mime_type": mime_type, "data": content}
        response = model.generate_content([prompt, image_part])

    return response.text.strip()


# ─── Embeddings ───────────────────────────────────────────────────────────────

async def generate_embedding(text: str) -> list[float]:
    """Generate a 768-dimensional embedding for the given text."""
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="RETRIEVAL_DOCUMENT",
    )
    return result["embedding"]


async def generate_query_embedding(text: str) -> list[float]:
    """Generate a query-optimised embedding."""
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="RETRIEVAL_QUERY",
    )
    return result["embedding"]


# ─── RAG Chat ─────────────────────────────────────────────────────────────────

async def chat_with_context(user_message: str, context_chunks: list[str]) -> str:
    """
    Generate a context-aware response using RAG context chunks.
    """
    model = genai.GenerativeModel(TEXT_MODEL)

    context_block = "\n\n---\n\n".join(context_chunks) if context_chunks else "No context available."

    system_prompt = (
        "You are a knowledgeable and empathetic AI medical assistant. "
        "Use ONLY the provided medical context about this specific patient to answer their question. "
        "If the context does not contain enough information, say so clearly. "
        "Never make up medical information. Always recommend consulting a doctor for serious concerns.\n\n"
        f"=== Patient's Medical Context ===\n{context_block}\n=== End of Context ===\n\n"
        f"Patient's question: {user_message}"
    )

    response = model.generate_content(system_prompt)
    return response.text.strip()
