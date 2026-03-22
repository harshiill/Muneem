from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# Load model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Store vectors + texts
memory_texts = []
memory_vectors = None


def add_to_memory(text):
    global memory_vectors

    embedding = model.encode([text])

    if memory_vectors is None:
        memory_vectors = embedding
    else:
        memory_vectors = np.vstack([memory_vectors, embedding])

    memory_texts.append(text)


def search_memory(query, k=3):
    global memory_vectors

    if memory_vectors is None or len(memory_texts) == 0:
        return []

    query_embedding = model.encode([query])

    # FAISS index
    dim = query_embedding.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(memory_vectors)

    distances, indices = index.search(query_embedding, k)

    results = [memory_texts[i] for i in indices[0] if i < len(memory_texts)]

    return results