# ai-services/search-service/main.py
import os
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Optional, List, Any
import pymongo
from bson import ObjectId
import httpx
import uuid
from openai import OpenAI
from dotenv import load_dotenv
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.auth import verify_api_key

load_dotenv()

app = FastAPI(title="SwiftChat Search Service", version="1.0.0")

if os.getenv("NVIDIA_API_KEY"):
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.getenv("NVIDIA_API_KEY"),
    )
else:
    client = None


class SearchRequest(BaseModel):
    query: str
    limit: int = 7
    emotion_filter: Optional[str] = None
    user_id: Optional[str] = None


class SearchResponse(BaseModel):
    posts: List[Any]
    total: int


def get_embedding(text: str) -> List[float]:
    """Get text embedding from NVIDIA NIM explicitly specified as query type"""
    response = client.embeddings.create(
        input=[text],
        model="nvidia/llama-3.2-nemoretriever-300m-embed-v1",
        extra_body={"input_type": "query", "truncate": "NONE"},
    )
    return response.data[0].embedding


def get_mongo_collection():
    uri = os.getenv("MONGODB_URI")
    db_client = pymongo.MongoClient(uri)
    db = db_client.get_default_database()
    return db.posts


@app.get("/health")
def health():
    return {"status": "healthy", "service": "search-service"}


@app.post(
    "/search", response_model=SearchResponse, dependencies=[Depends(verify_api_key)]
)
async def semantic_search(req: SearchRequest):
    if client:
        try:
            posts_collection = get_mongo_collection()

            # Base match criteria
            match_criteria = {"isPublic": True, "isFlagged": False}

            # Exact emotion matching for mood/tone chips (Case-insensitive Regex)
            match_criteria["emotion"] = {"$regex": f"^{req.query}$", "$options": "i"}

            if req.user_id:
                try:
                    match_criteria["user"] = ObjectId(req.user_id)
                except Exception:
                    pass

            rows = []

            # PHASE 1: Try direct match on emotion field (for chips)
            rows = list(posts_collection.find(match_criteria).sort("createdAt", -1).limit(req.limit))
            for r in rows:
                r["id"] = str(r["_id"])
                del r["_id"]
                author = posts_collection.database.users.find_one({"_id": r["user"]})
                if author:
                    r["user"] = {
                        "username": author.get("username"),
                        "displayName": author.get("displayName"),
                        "avatarUrl": author.get("avatarUrl"),
                    }
                else:
                    r["user"] = {"username": "unknown", "displayName": "Unknown User"}
                r["likesCount"] = len(r.get("likes", []))
                r["commentsCount"] = len(r.get("comments", []))

            # PHASE 2: If no matches, try semantic search
            if not rows:
                try:
                    embedding = get_embedding(req.query)
                    pipeline = [
                        {
                            "$vectorSearch": {
                                "index": "vector_index",
                                "path": "embedding",
                                "queryVector": embedding,
                                "numCandidates": 150,
                                "limit": 50,
                            }
                        },
                        {"$match": {"isPublic": True, "isFlagged": False}},
                        {
                            "$lookup": {
                                "from": "users",
                                "localField": "user",
                                "foreignField": "_id",
                                "as": "author",
                            }
                        },
                        {"$unwind": "$author"},
                        {
                            "$project": {
                                "_id": 0,
                                "id": {"$toString": "$_id"},
                                "caption": 1,
                                "mediaUrl": 1,
                                "mediaType": 1,
                                "emotion": 1,
                                "createdAt": 1,
                                "likesCount": {"$size": {"$ifNull": ["$likes", []]}},
                                "commentsCount": {"$size": {"$ifNull": ["$comments", []]}},
                                "user": {
                                    "username": "$author.username",
                                    "displayName": "$author.displayName",
                                    "avatarUrl": "$author.avatarUrl",
                                },
                            }
                        },
                    ]
                    rows = list(posts_collection.aggregate(pipeline))
                except Exception as e:
                    print(f"[SEARCH] Semantic search failed: {e}")

            # PHASE 3: AI Fallback — generate 4 synthetic posts if still no results
            if not rows:
                print(f"[SEARCH] No real results for '{req.query}'. Triggering AI Fallback.")
                final_rows = []
                fallback_models = [
                    "meta/llama-4-maverick-17b-128e-instruct",
                    "deepseek-v3.2",
                    "mistralai/mistral-small-3.1-24b-instruct-2503",
                    "ibm/granite-3.3-8b-instruct",
                ]

                prompt = f"Generate 4 short, engaging social media post captions for the mood: {req.query}. Return only a JSON array of 4 strings, nothing else."

                content = None
                for model in fallback_models:
                    try:
                        response = client.chat.completions.create(
                            model=model,
                            messages=[
                                {"role": "system", "content": "You are a creative social media assistant. Return only a JSON array of strings."},
                                {"role": "user", "content": prompt},
                            ],
                            temperature=0.8,
                            max_tokens=500,
                        )
                        content = response.choices[0].message.content.strip()
                        if content:
                            break
                    except Exception as e:
                        print(f"[SEARCH AI] Fallback {model} failed: {e}")
                        continue

                if content:
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()

                    try:
                        import json
                        captions = json.loads(content)
                        if isinstance(captions, list):
                            for i, caption in enumerate(captions[:4]):
                                final_rows.append({
                                    "id": f"synthetic-{uuid.uuid4().hex[:8]}",
                                    "caption": caption,
                                    "image": f"https://picsum.photos/seed/{req.query.lower()}{i}/400/400",
                                    "mediaUrl": f"https://picsum.photos/seed/{req.query.lower()}{i}/400/400",
                                    "emotion": req.query,
                                    "isSynthetic": True,
                                    "author": {"displayName": "ARIA", "username": "aria_system"},
                                    "user": {"displayName": "ARIA", "username": "aria_system"},
                                    "createdAt": "Just now",
                                    "likesCount": 42,
                                    "commentsCount": 0,
                                })
                    except Exception as e:
                        print(f"[SEARCH AI] JSON Parse Error: {e}")

                return SearchResponse(posts=final_rows, total=len(final_rows))

            return SearchResponse(posts=rows[:req.limit], total=len(rows))

        except Exception as e:
            print(f"[SEARCH] Critical error: {e}")
            return SearchResponse(posts=[], total=0)

    # Fallback when NVIDIA client is not available
    return SearchResponse(posts=[], total=0)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT_SEARCH", 8003)),
        reload=True,
    )