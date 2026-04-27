from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Distance, VectorParams
from sentence_transformers import SentenceTransformer
import uuid 
import os
from dotenv import load_dotenv

load_dotenv()

model = SentenceTransformer('all-MiniLM-L6-v2')

qdrant_url = os.getenv("QDRANT_URL")
qdrant_api_key = os.getenv("QDRANT_API_KEY")

if qdrant_url and qdrant_api_key:
    client = QdrantClient(url=qdrant_url, port=443, api_key=qdrant_api_key)
else:
    client = QdrantClient(path="./qdrant_data")

COLLECTION_NAME = "chat_memory"

def init_qdrant():
    collections = client.get_collections().collections
    names = [c.name for c in collections]
    
    
    if COLLECTION_NAME not in names:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
        
        
def add_memory(text : str):
    vector = model.encode(text).tolist()
    
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"text": text}
            )
        ]
    )
    
    
    
def search_memory(query, limit=3):
    print("QUERY:", query)
    query_vector = model.encode(query).tolist()
    
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=limit
    ).points
    
    print("QDRANT RESULTS:", results)
    
    return [point.payload["text"] for point in results]