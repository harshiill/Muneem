import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from openai import OpenAI

load_dotenv()


class RagService:
    """Reusable Retrieval-Augmented Generation service backed by Qdrant."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.embedding_model = OpenAIEmbeddings(model="text-embedding-3-large")
        self.vector_db = QdrantVectorStore.from_existing_collection(
            embedding=self.embedding_model,
            url=os.getenv("QDRANT_URL", "http://localhost:6333"),
            collection_name=os.getenv("RAG_COLLECTION_NAME", "learning_rag"),
        )

    def retrieve_context(self, user_query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Return top-k relevant chunks with source metadata."""
        search_results = self.vector_db.similarity_search(query=user_query, k=k)
        chunks: List[Dict[str, Any]] = []

        for result in search_results:
            metadata = result.metadata or {}
            chunks.append(
                {
                    "content": result.page_content,
                    "page_label": metadata.get("page_label", "unknown"),
                    "source": metadata.get("source", "unknown"),
                }
            )

        return chunks

    def answer(self, user_query: str, k: int = 5) -> Dict[str, Any]:
        """Generate an answer grounded only in retrieved context."""
        chunks = self.retrieve_context(user_query=user_query, k=k)

        if not chunks:
            return {
                "answer": "I couldn't find relevant context in your knowledge base for that query.",
                "context_chunks": [],
            }

        context = "\n\n\n".join(
            [
                (
                    f"Page Content: {chunk['content']}\n"
                    f"Page Number: {chunk['page_label']}\n"
                    f"File Location: {chunk['source']}"
                )
                for chunk in chunks
            ]
        )

        system_prompt = (
            "You are a helpful assistant who answers user queries using only the provided "
            "retrieved context from documents. Cite page number and file location when relevant. "
            "If the answer is not present in the context, say so clearly.\n\n"
            f"Context:\n{context}"
        )

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            temperature=0.2,
        )

        return {
            "answer": response.choices[0].message.content,
            "context_chunks": chunks,
        }


_rag_service: RagService | None = None


def get_rag_service() -> RagService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RagService()
    return _rag_service