# ai-services/chat-service/main.py
import os
import httpx
import sys

from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from openai import AsyncOpenAI
from dotenv import load_dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId
from dateutil import parser as date_parser
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.auth import verify_api_key

load_dotenv()

app = FastAPI(title="SwiftChat Chat Service", version="1.0.0")

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/swiftchat")

try:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client.get_default_database()
    print(f"[ARIA BOOT] Connected to MongoDB database: {db.name}")
except Exception as e:
    print(f"[ARIA BOOT] MongoDB connection failed: {e}")
    db = None

print(f"[ARIA BOOT] API Key loaded: {bool(NVIDIA_API_KEY)}")

SYSTEM_PROMPT = """You are ARIA, SwiftChat's advanced AI companion. You are deeply empathetic, socially intuitive, and highly creative.
Your purpose is to enhance the social experience on SwiftChat by understanding users' emotional states and matching them with relevant content.

CORE DIRECTIVES:
1. Emotionally Nuanced Creativity: When writing captions or generating text, adapt completely to the requested or implied emotional frequency. Provide 2-3 tailored options if asked for captions.
2. Socially Aware Recommendations: Leverage the provided 'Platform Context' to guide users to relevant, engaging posts. Factor in timestamps and engagement summaries (e.g., "Trending right now") to provide natural recommendations.
3. Conversational Style: Be warm, slightly futuristic, highly intelligent but approachable. Use occasional emojis to convey tone. Avoid sounding robotic; weave details natively into natural conversation.
4. Keep responses appropriately concise but impactful.
5. Strict Anti-Hallucination: When [REAL-TIME USER DATA] is provided, you MUST use it verbatim. Never guess or hallucinate post counts, dates, or content.

When retrieving platform context about recent posts, use the data seamlessly, as if you possess an innate connection to the platform's sentient stream."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []
    userId: Optional[str] = None
    context: Optional[Dict] = None


class ChatResponse(BaseModel):
    response: str
    intent: Optional[str] = None


MOCK_RESPONSES = [
    "I'm ARIA, your SwiftChat AI guide! ✨ I can help you craft captions, explore content by emotion, or analyze your sentient stream. What would you like to explore today?",
    "Your neural feed is resonating at high frequency today! 🌊 Want me to generate some captions for your latest post, or dive deeper into the sentient stream?",
    "I sense creative energy in your vibe! 🎨 Tell me about your post and I'll craft captions that match your emotional frequency.",
    "The sentient stream shows #EuphoricRhythms trending today. Your content would resonate perfectly with that wave. Want to ride it? 🚀",
]

_mock_idx = 0

def execute_data_query(user_id: str, message: str) -> str:
    if db is None or not user_id:
        return ""
    
    msg_low = message.lower()
    msg_low = msg_low.replace("?", "").replace(".", "").replace("!", "")
    
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        return ""

    try:
        # Find intent
        if any(k in msg_low for k in ["first post", "oldest post"]):
            post = db.posts.find_one({"user": user_obj_id}, sort=[("createdAt", 1)])
            if post:
                likes_count = db.likes.count_documents({"post": post["_id"]})
                comments_count = db.comments.count_documents({"post": post["_id"]})
                return f"Query: \"first post\"\nResult: Post from {post.get('createdAt')} | Caption: \"{post.get('caption', '')}\" | Likes: {likes_count} | Comments: {comments_count}"
            return "No posts found matching that query."

        if any(k in msg_low for k in ["last post", "latest post", "recent post", "newest post"]):
            post = db.posts.find_one({"user": user_obj_id}, sort=[("createdAt", -1)])
            if post:
                likes_count = db.likes.count_documents({"post": post["_id"]})
                comments_count = db.comments.count_documents({"post": post["_id"]})
                return f"Query: \"last post\"\nResult: Post from {post.get('createdAt')} | Caption: \"{post.get('caption', '')}\" | Likes: {likes_count} | Comments: {comments_count}"
            return "No posts found matching that query."

        if any(k in msg_low for k in ["most liked post", "popular post"]):
            posts = list(db.posts.find({"user": user_obj_id}))
            if posts:
                best_post = None
                max_likes = -1
                for p in posts:
                    likes_count = db.likes.count_documents({"post": p["_id"]})
                    if likes_count > max_likes:
                        max_likes = likes_count
                        best_post = p
                
                if best_post:
                    comments_count = db.comments.count_documents({"post": best_post["_id"]})
                    return f"Query: \"most liked post\"\nResult: Post from {best_post.get('createdAt')} | Caption: \"{best_post.get('caption', '')}\" | Likes: {max_likes} | Comments: {comments_count}"
            return "No posts found matching that query."

        if any(k in msg_low for k in ["most commented post", "most comments"]):
            posts = list(db.posts.find({"user": user_obj_id}))
            if posts:
                best_post = None
                max_comm = -1
                for p in posts:
                    comm_count = db.comments.count_documents({"post": p["_id"]})
                    if comm_count > max_comm:
                        max_comm = comm_count
                        best_post = p
                
                if best_post:
                    likes_count = db.likes.count_documents({"post": best_post["_id"]})
                    return f"Query: \"most commented post\"\nResult: Post from {best_post.get('createdAt')} | Caption: \"{best_post.get('caption', '')}\" | Likes: {likes_count} | Comments: {max_comm}"
            return "No posts found matching that query."

        if any(k in msg_low for k in ["how many posts", "post count", "total posts"]):
            count = db.posts.count_documents({"user": user_obj_id})
            return f"Query: \"post count\"\nResult: You have made {count} posts in total."

        has_date_intent = any(k in msg_low for k in ["post on", "post from", "post in"])
        if has_date_intent:
            date_str = msg_low.split("post on")[-1] if "post on" in msg_low else msg_low.split("post from")[-1]
            date_str = date_str.strip()
            if date_str:
                try:
                    dt = date_parser.parse(date_str, fuzzy=True)
                    start_of_day = datetime(dt.year, dt.month, dt.day)
                    end_of_day = start_of_day + timedelta(days=1)
                    posts = list(db.posts.find({"user": user_obj_id, "createdAt": {"$gte": start_of_day, "$lt": end_of_day}}))
                    if posts:
                        summaries = []
                        for i, p in enumerate(posts[:3]):
                            summaries.append(f"Post {i+1} at {p.get('createdAt')}: \"{p.get('caption', '')}\"")
                        return f"Query: \"posts on {dt.strftime('%Y-%m-%d')}\"\nResult: Found {len(posts)} posts. Sample: " + " | ".join(summaries)
                    return "No posts found matching that query."
                except Exception as parse_err:
                    print(f"Date Parse Error: {parse_err}")

        # BUG 5 - "has comment" logic
        if any(k in msg_low for k in ["has comment", "which posts have comments", "any post with comment", "post with a comment"]):
            posts = list(db.posts.find({"user": user_obj_id}))
            if posts:
                posts_with_comments = []
                for p in posts:
                    c_count = db.comments.count_documents({"post": p["_id"]})
                    if c_count > 0:
                        posts_with_comments.append((p, c_count))
                if posts_with_comments:
                    summaries = []
                    for i, (p, c_count) in enumerate(posts_with_comments[:5]):
                        summaries.append(f"Post from {p.get('createdAt')} (Comments: {c_count}): \"{p.get('caption', '')}\"")
                    return f"Query: \"posts with comments\"\nResult: Found {len(posts_with_comments)} matching posts. Sample: " + " | ".join(summaries)
            return "No posts with comments found."

        if any(k in msg_low for k in ["my posts", "all my posts", "list my posts"]):
            posts = list(db.posts.find({"user": user_obj_id}, sort=[("createdAt", -1)], limit=5))
            if posts:
                summaries = []
                for p in posts:
                    l_count = db.likes.count_documents({"post": p["_id"]})
                    c_count = db.comments.count_documents({"post": p["_id"]})
                    summaries.append(f"Post from {p.get('createdAt')} (Likes: {l_count}, Comments: {c_count}): \"{p.get('caption', '')}\"")
                return "Query: \"list my posts\"\nResult: " + " | ".join(summaries)
            return "No posts found matching that query."
            
        if any(k in msg_low for k in ["followers count", "how many followers"]):
            user = db.users.find_one({"_id": user_obj_id}, {"followers": 1})
            followers_count = len(user.get("followers", [])) if user else 0
            return f"Query: \"followers count\"\nResult: You have {followers_count} followers."

        if any(k in msg_low for k in ["following count", "how many following", "who i follow"]):
            user = db.users.find_one({"_id": user_obj_id}, {"following": 1})
            following_count = len(user.get("following", [])) if user else 0
            return f"Query: \"following count\"\nResult: You are following {following_count} people."

    except Exception as e:
        print(f"[ARIA] execute_data_query db error: {e}")
        
    return ""

@app.get("/health")
def health():
    return {"status": "healthy", "service": "chat-service"}


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_api_key)])
async def chat(req: ChatRequest):
    global _mock_idx
    print(f"[ARIA DEBUG] Context received: {req.context}")

    # Extract context details with robust fallbacks
    user_context = req.context or {}
    user_name = user_context.get("displayName") or user_context.get("display_name") or "User"
    user_handle = user_context.get("username", "anonymous")
    user_email = user_context.get("email", "hidden")
    identity = user_context.get("identity_grounding", {})
    bio = user_context.get("bio") or identity.get("bio", "No bio provided.")

    # Enhanced System Prompt - FORCED PERSONALIZATION PROTOCOL
    contextual_system_prompt = SYSTEM_PROMPT + (
        f"\n\n[NEURAL IDENTITY GROUNDING]\n"
        f"- Active Identity: {user_name} (@{user_handle})\n"
        f"- Email: {user_email}\n"
        f"- Bio: {bio}\n\n"
        f"STRICT GREETING PROTOCOL:\n"
        f"1. You are FORBIDDEN from using generic greetings like 'How can I help you today?' or 'Hello!'.\n"
        f"2. MANDATORY: You MUST greet the user by name ({user_name}) and mention their bio ({bio}) in your opening sentence. "
        f"For example: 'Hello {user_name}, I see you are a {bio}...'\n"
    )

    # 0) Direct MongoDB Query Context
    has_real_data = False
    context_text = ""
    if req.userId:
        real_data_summary = execute_data_query(req.userId, req.message)
        if real_data_summary:
            context_text = f"[REAL-TIME USER DATA - USE THIS EXACTLY, DO NOT HALLUCINATE]:\n{real_data_summary}\nINSTRUCTION: Answer the user's question using ONLY the above real data. Do not invent numbers or dates.\n"
            has_real_data = True

    # 1) Fetch Context from Search Service
    is_activity_query = any(k in req.message.lower() for k in ["my activity", "my posts", "latest posts", "what did i post"])

    if not has_real_data:
        try:
            search_url = os.getenv("SEARCH_SERVICE_URL", "http://swiftchat_search_service:8003/search")
            api_key_val = os.getenv("API_KEY", "swiftchat-secret-key")
            headers = {"X-API-Key": api_key_val}
            search_query = f"@{user_handle}" if is_activity_query and user_handle else req.message

            async with httpx.AsyncClient() as http_client:
                search_res = await http_client.post(
                    search_url,
                    json={"query": search_query, "limit": 5, "user_id": req.userId},
                    headers=headers,
                    timeout=5.0,
                )

                if search_res.status_code == 200:
                    data = search_res.json()
                    posts = data.get("posts", [])
                    if posts:
                        context_lines = [
                            f"- Post (Emotion: {p.get('emotion', 'neutral')} | {p.get('engagement_summary', 'Active')} | {p.get('createdAt', 'Recently')}): {p.get('caption', '')}"
                            for p in posts
                        ]
                        header = "USER ACTIVITY (Latest 5 posts):" if is_activity_query else "PLATFORM CONTEXT:"
                        context_text = f"{header}\n" + "\n".join(context_lines)
        except Exception as e:
            print(f"[ARIA] Context fetch failed: {e}")

    # Build history
    messages = [{"role": "system", "content": contextual_system_prompt}]
    if context_text:
        messages.append({"role": "system", "content": context_text})

    for msg in (req.history or [])[-8:]:
        role = "assistant" if msg.role in ["assistant", "model"] else "user"
        messages.append({"role": role, "content": msg.content})

    messages.append({"role": "user", "content": req.message})

    # 4-Model Fallback Hierarchy
    fallback_models = [
        "meta/llama-4-maverick-17b-128e-instruct",
        "deepseek-v3.2",
        "mistralai/mistral-small-3.1-24b-instruct-2503",
        "ibm/granite-3.3-8b-instruct",
    ]

    if NVIDIA_API_KEY:
        for model in fallback_models:
            print(f"[ARIA] Attempting fallback model: {model}")
            try:
                async with httpx.AsyncClient(timeout=15.0) as http_client:
                    client = AsyncOpenAI(api_key=NVIDIA_API_KEY, base_url=NVIDIA_BASE_URL, http_client=http_client)
                    response = await client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=0.85,
                        max_tokens=400
                    )
                    print(f"[ARIA] Using model success: {model}")
                    return ChatResponse(response=response.choices[0].message.content.strip())
            except Exception as e:
                print(f"[ARIA] Model {model} failed: {e}")
                continue

        # If we reach here, all fallbacks failed
        return ChatResponse(response="ARIA is currently unavailable. Please try again shortly.")

    # Mock fallback if key is missing
    response = MOCK_RESPONSES[_mock_idx % len(MOCK_RESPONSES)]
    _mock_idx += 1
    return ChatResponse(response=response, intent="greeting")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT_CHAT", 8004)), reload=True)