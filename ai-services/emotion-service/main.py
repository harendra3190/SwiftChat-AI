# ai-services/emotion-service/main.py
import os
import json
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import List
import httpx
from openai import AsyncOpenAI
from dotenv import load_dotenv
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.auth import verify_api_key

load_dotenv()

app = FastAPI(title="SwiftChat Emotion Service", version="1.0.0")

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

EMOTION_VIBES = {
    "joy": "Electric",
    "happiness": "Electric",
    "euphoria": "Electric",
    "calm": "Resonant",
    "peace": "Resonant",
    "serenity": "Resonant",
    "melancholy": "Indigo",
    "sadness": "Indigo",
    "loneliness": "Indigo",
    "inspired": "Vivid",
    "creative": "Vivid",
    "motivated": "Vivid",
    "energetic": "Pulse",
    "excited": "Pulse",
    "restless": "Pulse",
    "nostalgic": "Amber",
    "reflective": "Amber",
    "zen": "Crystal",
    "focused": "Crystal",
    "deep": "Crystal",
    "anger": "Pulse",
    "fear": "Indigo",
    "surprise": "Electric",
    "disgust": "Indigo",
    "anticipation": "Vivid",
    "trust": "Resonant",
    "love": "Electric",
    "anxiety": "Pulse",
    "confusion": "Amber",
    "pride": "Vivid",
    "shame": "Indigo",
    "gratitude": "Resonant",
    "awe": "Crystal",
    "boredom": "Amber",
    "curiosity": "Crystal",
    "neutral": "Electric",
}


class EmotionRequest(BaseModel):
    text: str


class EmotionResponse(BaseModel):
    emotion: str
    score: float
    vibe: str
    tags: List[str]


@app.get("/health")
def health():
    return {"status": "healthy", "service": "emotion-service"}


@app.post(
    "/analyze", response_model=EmotionResponse, dependencies=[Depends(verify_api_key)]
)
async def analyze_emotion(req: EmotionRequest):
    text_lower = req.text.lower()

    if NVIDIA_API_KEY:
        fallback_models = [
            "meta/llama-4-maverick-17b-128e-instruct",
            "mistralai/mistral-small-3.1-24b-instruct-2503",
            "ibm/granite-3.3-8b-instruct",
            "deepseek-ai/deepseek-r1",
        ]

        prompt = """Analyze the emotion in the following text. 
Return ONLY valid JSON in this format: {"emotion": "primary emotion name", "score": 0.0-1.0, 
"tags": ["tag1", "tag2"]}. Keep emotion as one word."""

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": req.text},
        ]

        for model in fallback_models:
            print(f"[EMOTION] Attempting fallback model: {model}")
            try:
                async with httpx.AsyncClient(timeout=15.0) as http_client:
                    client = AsyncOpenAI(api_key=NVIDIA_API_KEY, base_url=NVIDIA_BASE_URL, http_client=http_client)
                    response = await client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=0.3,
                        max_tokens=200,
                    )
                    content = response.choices[0].message.content
                    print(f"[EMOTION] Using model success: {model}")
                    
                    import re
                    match = re.search(r'\{.*\}', content, re.DOTALL)
                    if match:
                        result = json.loads(match.group())
                    else:
                        raise ValueError("No valid JSON object found in response")

                    emotion = result.get("emotion", "Neutral").lower()
                    vibe = EMOTION_VIBES.get(emotion, "Electric")
                    return EmotionResponse(
                        emotion=emotion.capitalize(),
                        score=result.get("score", 0.75),
                        vibe=vibe,
                        tags=result.get("tags", [emotion]),
                    )
            except Exception as e:
                print(f"[EMOTION] Model {model} failed: {e}")
                continue

    # Keyword-based fallback
    for keyword, vibe in EMOTION_VIBES.items():
        if keyword in text_lower:
            return EmotionResponse(
                emotion=keyword.capitalize(), score=0.75, vibe=vibe, tags=[keyword]
            )

    return EmotionResponse(
        emotion="Neutral", score=0.5, vibe="Electric", tags=["neutral"]
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT_EMOTION", 8002)),
        reload=True,
    )
