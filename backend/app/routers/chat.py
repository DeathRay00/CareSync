"""
Chatbot router — RAG-based conversational endpoint.
  POST /api/chat/
  
Flow:
  1. Embed user message (query embedding)
  2. Query pgvector for top-3 relevant chunks for this patient
  3. Feed chunks + question to Gemini
  4. Return response
"""
import math
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.models import DocumentEmbedding, User
from app.schemas import ChatMessage, ChatResponse
from app.services.gemini_service import chat_with_context, generate_query_embedding

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))

    if norm_a == 0 or norm_b == 0:
        return -1.0

    return dot / (norm_a * norm_b)


def _to_float_list(value: Any) -> list[float] | None:
    if value is None:
        return None

    if isinstance(value, list):
        return [float(x) for x in value]

    if isinstance(value, str):
        cleaned = value.strip().strip("[]")
        if not cleaned:
            return []
        return [float(x.strip()) for x in cleaned.split(",")]

    return None


@router.post("/", response_model=ChatResponse)
async def chat(
    payload: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    # 1. Generate query embedding
    query_embedding = await generate_query_embedding(payload.message)

    # 2. Vector similarity search
    if db.bind and db.bind.dialect.name == "sqlite":
        result = await db.execute(
            select(DocumentEmbedding.content_text, DocumentEmbedding.embedding)
            .where(DocumentEmbedding.patient_id == current_user.id)
        )
        rows = result.all()

        scored_chunks: list[tuple[float, str]] = []
        for content_text, embedding_value in rows:
            stored_embedding = _to_float_list(embedding_value)
            if stored_embedding is None:
                continue
            score = _cosine_similarity(query_embedding, stored_embedding)
            scored_chunks.append((score, content_text))

        scored_chunks.sort(key=lambda item: item[0], reverse=True)
        context_chunks = [chunk for _, chunk in scored_chunks[:3]]
    else:
        # pgvector operator: <=> is cosine distance
        embedding_literal = "[" + ",".join(str(v) for v in query_embedding) + "]"
        sql = text(
            """
            SELECT content_text
            FROM document_embeddings
            WHERE patient_id = :patient_id
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT 3
            """
        )
        result = await db.execute(
            sql,
            {"patient_id": str(current_user.id), "embedding": embedding_literal},
        )
        rows = result.fetchall()
        context_chunks = [row[0] for row in rows]

    # 3. Generate AI response
    reply = await chat_with_context(payload.message, context_chunks)

    return ChatResponse(reply=reply, context_used=context_chunks)
