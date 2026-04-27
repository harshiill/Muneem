import os

from mem0 import Memory

from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

qdrant_url = os.getenv("QDRANT_URL")
qdrant_api_key = os.getenv("QDRANT_API_KEY")

vector_store_config = {"collection_name": "chat_memory"}
if qdrant_url and qdrant_api_key:
    # Explicitly instantiate the QdrantClient to bypass mem0's internal param parsing
    # which fails to correctly assign the port for cloud endpoints.
    client_instance = QdrantClient(url=qdrant_url, port=443, api_key=qdrant_api_key)
    vector_store_config["client"] = client_instance
else:
    vector_store_config["host"] = "localhost"
    vector_store_config["port"] = 6333

config = {
    "version": "v1.1",
    "embedder": {
        "provider": "openai",
        "config": {
            "api_key": os.getenv("OPENAI_API_KEY"),
            "model": "text-embedding-3-small",
        },
    },
    "llm": {
        "provider": "openai",
        "config": {"api_key": os.getenv("OPENAI_API_KEY"), "model": "gpt-4o-mini"},
    },
    "vector_store": {
        "provider": "qdrant",
        "config": vector_store_config,
    },
}

_mem_client = None


def get_mem_client():
    """Lazily initialize the mem0 Memory client on first use."""
    global _mem_client
    if _mem_client is None:
        _mem_client = Memory.from_config(config)
    return _mem_client


class LazyMemClient:
    """
    A proxy that defers mem0 Memory initialization until the first method call.
    Drop-in replacement for the previously eagerly-initialized mem_client.
    """

    def search(self, *args, **kwargs):
        return get_mem_client().search(*args, **kwargs)

    def add(self, *args, **kwargs):
        return get_mem_client().add(*args, **kwargs)

    def get_all(self, *args, **kwargs):
        return get_mem_client().get_all(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return get_mem_client().delete(*args, **kwargs)

    def update(self, *args, **kwargs):
        return get_mem_client().update(*args, **kwargs)

    def reset(self, *args, **kwargs):
        return get_mem_client().reset(*args, **kwargs)


# Public singleton — behaves exactly like the old mem_client but
# only connects to Qdrant when a method is first called.
mem_client = LazyMemClient()
