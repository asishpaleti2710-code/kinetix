import os
import hashlib
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings

class SalesVectorStore:
    def __init__(self):
        self.persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(self.persist_dir, exist_ok=True)
        
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=settings.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embeddings using Gemini embedding models if API key is set,
        or high-dimensional normalized hash vectors as a fallback.
        """
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                embeddings = []
                for text in texts:
                    result = genai.embed_content(
                        model="models/text-embedding-004",
                        content=text,
                        task_type="retrieval_document"
                    )
                    embeddings.append(result["embedding"])
                return embeddings
            except Exception as e:
                print(f"[VectorStore] Gemini embedding fallback triggered: {e}")

        # Deterministic 384-dimensional vector fallback for demo/offline resilience
        dim = 384
        all_vecs = []
        for text in texts:
            words = text.lower().split()
            vec = [0.0] * dim
            for i, word in enumerate(words):
                h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
                idx = h % dim
                weight = 1.0 / (1.0 + (i * 0.05))
                vec[idx] += weight
            norm = sum(x**2 for x in vec) ** 0.5 or 1.0
            all_vecs.append([x / norm for x in vec])
        return all_vecs

    def add_chunks(self, chunks: List[Dict[str, Any]], filename: str) -> int:
        """
        Stores chunked document content and metadata in ChromaDB.
        """
        if not chunks:
            return 0

        texts = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        ids = [f"{filename}_chunk_{i}_{hashlib.md5(c['text'].encode()).hexdigest()[:8]}" for i, c in enumerate(chunks)]
        
        embeddings = self._generate_embeddings(texts)

        self.collection.upsert(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        return len(texts)

    def query(self, query_text: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Performs semantic similarity search against the uploaded company knowledge base.
        """
        if self.collection.count() == 0:
            return []

        query_embedding = self._generate_embeddings([query_text])[0]
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self.collection.count()),
            include=["documents", "metadatas", "distances"]
        )

        formatted_results = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            dists = results["distances"][0] if "distances" in results else [0.0] * len(docs)

            for doc, meta, dist in zip(docs, metas, dists):
                formatted_results.append({
                    "content": doc,
                    "metadata": meta,
                    "similarity_score": round(1.0 - max(0.0, min(dist, 1.0)), 4)
                })

        return formatted_results

    def delete_by_filename(self, filename: str) -> int:
        """
        Deletes all chunks associated with a specific file.
        """
        existing = self.collection.get(where={"source": filename})
        if existing and "ids" in existing and existing["ids"]:
            self.collection.delete(ids=existing["ids"])
            return len(existing["ids"])
        return 0

    def get_stats(self) -> Dict[str, Any]:
        """
        Returns collection stats (total chunks, distinct sources).
        """
        total_chunks = self.collection.count()
        return {
            "total_chunks": total_chunks,
            "collection_name": settings.COLLECTION_NAME,
            "persist_dir": self.persist_dir
        }

# Global singleton
vector_store = SalesVectorStore()
