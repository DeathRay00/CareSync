"""
Chatbot router — RAG-based conversational endpoint.
  POST /api/chat/
  
Flow:
  1. Embed user message (query embedding)
  2. Query pgvector for top-3 relevant chunks for this patient
  3. Feed chunks + question to Gemini
  4. Return response
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.models import DocumentEmbedding, User
from app.schemas import ChatMessage, ChatResponse
# Now using the updated mistral_service instead of gemini_service
from app.services.mistral_service import chat_with_context, generate_query_embedding

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


@router.post("/", response_model=ChatResponse)
async def chat(
    payload: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    # 1. Generate query embedding
    query_embedding = await generate_query_embedding(payload.message)

    # 2. Vector similarity search (cosine distance, top 3)
    #    pgvector operator: <=> is cosine distance
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
