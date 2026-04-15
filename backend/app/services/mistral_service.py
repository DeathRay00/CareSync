"""
Mistral AI service — handles medical report analysis and embedding generation.
"""
import json
from typing import Any
from mistralai.client import Mistral
from app.config import settings

# Initialize Mistral client
client = Mistral(
    api_key=settings.MISTRAL_API_KEY,
    # Adding a higher timeout (60 seconds) so Mistral has time to respond during Chat payload generation
    timeout_ms=60000 
)

TEXT_MODEL = "mistral-large-latest"
EMBEDDING_MODEL = "mistral-embed"

# ─── Medical Report Analysis ──────────────────────────────────────────────────

async def analyze_medical_report(content_text: str) -> str:
    """
    Analyze extracted text from a medical report and return a patient-friendly summary and structured parameters as JSON.
    """
    system_prompt = (
        "You are a compassionate medical assistant analyzing lab reports. "
        "Extract ALL health parameters from the report and provide a simple analysis.\n"
        "Return ONLY a valid JSON object with the following exact structure, with no markdown fences (like ```json):\n"
        "{\n"
        '  "summary": "Your detailed analysis and summary of the key findings in simple language. Highlight any abnormal values. Do not use asterisks (**) for bolding, just use plain text or capitalization.",\n'
        '  "parameters": [\n'
        "    {\n"
        '      "name": "Parameter Name (e.g., Hemoglobin, Fasting Blood Sugar, Vitamin D)",\n'
        '      "category": "Short category (e.g., Blood, Blood Sugar, Vitamins, Kidney, Liver)",\n'
        '      "value": "Measured value with units if any",\n'
        '      "normal_range": "Reference range with units",\n'
        '      "status": "normal" | "high" | "low"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Include every parameter you can clearly identify."
    )

    response = await client.chat.complete_async(
        model=TEXT_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Here is the report content:\n\n{content_text}"}
        ]
    )

    text = response.choices[0].message.content.strip()
    # Ensure no leading/trailing markdown blocks if Mistral still outputs them
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
        
    return text.strip()


# ─── Embeddings ───────────────────────────────────────────────────────────────

async def generate_embedding(text: str) -> list[float]:
    """Generate a 1024-dimensional embedding for the given text using Mistral."""
    response = await client.embeddings.create_async(
        model=EMBEDDING_MODEL,
        inputs=[text]
    )
    return response.data[0].embedding


async def generate_query_embedding(text: str) -> list[float]:
    """Generate a query-optimised embedding."""
    # Mistral uses the same endpoint/model for query embeddings
    return await generate_embedding(text)


# ─── RAG Chat ─────────────────────────────────────────────────────────────────

async def chat_with_context(user_message: str, context_chunks: list[str]) -> str:
    """
    Generate a context-aware response using RAG context chunks.
    """
    context_block = "\n\n---\n\n".join(context_chunks) if context_chunks else "No context available."

    system_prompt = (
        "You are a knowledgeable and empathetic AI medical assistant. "
        "Use ONLY the provided medical context about this specific patient to answer their question. "
        "If the context does not contain enough information, say so clearly. "
        "Never make up medical information. Always recommend consulting a doctor for serious concerns.\n\n"
        f"=== Patient's Medical Context ===\n{context_block}\n=== End of Context ==="
    )

    response = await client.chat.complete_async(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Patient's question: {user_message}"}
        ]
    )
    
    return response.choices[0].message.content.strip()
