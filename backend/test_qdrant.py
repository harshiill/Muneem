import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

# Load the environment variables from .env
load_dotenv()

qdrant_url = os.getenv("QDRANT_URL")
qdrant_api_key = os.getenv("QDRANT_API_KEY")

print("Attempting to connect to Qdrant Cloud...")

try:
    # Explicitly using port=443 as we configured earlier
    client = QdrantClient(url=qdrant_url, port=443, api_key=qdrant_api_key)
    
    # Try fetching collections
    collections = client.get_collections().collections
    names = [c.name for c in collections]
    
    print("Successfully connected to Qdrant Cloud!")
    print(f"Collections found: {names}")
    
    if "chat_memory" in names:
        # Check how many items are inside
        count = client.count(collection_name="chat_memory").count
        print(f"The 'chat_memory' collection has {count} vector points stored.")
    else:
        print("The 'chat_memory' collection doesn't exist yet. It will be created when you use the app.")
        
except Exception as e:
    print(f"Failed to connect to Qdrant Cloud. Error: {e}")
