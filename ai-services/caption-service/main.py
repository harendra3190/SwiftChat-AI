# ai-services/caption-service/main.py
import os
import json
import httpx
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Optional, List
from openai import OpenAI
from dotenv import load_dotenv
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.auth import verify_api_key

load_dotenv()

app = FastAPI(title="SwiftChat Caption Service", version="1.0.0")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

# OpenAI-compatible client for non-streaming calls
if NVIDIA_API_KEY:
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1", api_key=NVIDIA_API_KEY
    )
else:
    client = None

INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

TONE_PROMPTS = {
    "witty": "clever and humorous with wordplay",
    "funny": "laugh-out-loud funny with emojis",
    "heartfelt": "emotionally touching and genuine",
    "professional": "polished, professional, brand-friendly",
    "ethereal": "dreamy, poetic, and mystical",
    "vibrant": "energetic, bold, and exciting",
    "deep": "thought-provoking and philosophical",
    "sarcastic": "dry, sarcastic, and sharp-witted",
    "poetic": "lyrical, elegant, and deeply poetic",
    "cinematic": "dramatic, atmospheric, and cinematic",
    "minimalist": "short, clean, and minimalist",
    "cyberpunk": "neon-soaked, tech-savvy, and futuristic",
    "gen-z": "trendy, slang-heavy, and relatable to Gen-Z",
}


class CaptionRequest(BaseModel):
    prompt: Optional[str] = None
    tone: str = "witty"
    imageUrl: Optional[str] = None
    image: Optional[str] = None  # Base64 data
    count: int = 3


class CaptionDraft(BaseModel):
    text: str
    mood: str


class CaptionResponse(BaseModel):
    captions: List[CaptionDraft]


MOCK_CAPTIONS = {
    "witty": [
        {
            "text": "When the algorithm finally understands your vibe ⚡ #NeuralMatch",
            "mood": "VIBRANT",
        },
        {"text": "404: Chill not found. Uploading more chaos... 🌀", "mood": "DEEP"},
        {
            "text": "My aesthetic finally loaded. Please stand by for pure art. 🎨",
            "mood": "ETHEREAL",
        },
    ],
    "funny": [
        {"text": "Me: I'm fine. Also me: 🤯", "mood": "VIBRANT"},
        {
            "text": "If my vibe was a loading bar, it'd be stuck at 69% forever. 😂",
            "mood": "DEEP",
        },
        {
            "text": "Living my best glitchy simulation life. 🎮 #BugFeatures",
            "mood": "ETHEREAL",
        },
    ],
    "heartfelt": [
        {
            "text": "Every pixel of this moment matters. Grateful for the frequencies that led here. ✨",
            "mood": "VIBRANT",
        },
        {
            "text": "Found beauty in the noise today. Sometimes clarity hides in the chaos. 💫",
            "mood": "DEEP",
        },
        {
            "text": "The heart knows what the algorithm can't compute. Stay soft. 🌸",
            "mood": "ETHEREAL",
        },
    ],
    "ethereal": [
        {
            "text": "Catching light and feelings in the heart of the digital neon. ⚡",
            "mood": "VIBRANT",
        },
        {
            "text": "Just another glitch in the beautiful simulation we call home. 🚀",
            "mood": "DEEP",
        },
        {
            "text": "Lost in the frequency of a midnight dream. Where code meets soul. 🌌 #FutureVibes",
            "mood": "ETHEREAL",
        },
    ],
}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "caption-service"}


@app.post(
    "/generate", response_model=CaptionResponse, dependencies=[Depends(verify_api_key)]
)
async def generate_captions(req: CaptionRequest):
    tone = req.tone.lower() if req.tone.lower() in TONE_PROMPTS else "witty"

    if NVIDIA_API_KEY:
        models = [
            {"id": "google/gemma-3-27b-it", "timeout": 15.0},
            {"id": "mistralai/mistral-small-3.1-24b-instruct-2503", "timeout": 15.0},
            {"id": "microsoft/phi-4-multimodal-instruct", "timeout": 45.0},
        ]

        for model_info in models:
            model_id = model_info["id"]
            timeout_val = model_info["timeout"]

            try:
                tone_desc = TONE_PROMPTS.get(tone, "witty and clever")
                user_prompt = f"Describe this image in detail and then generate exactly {req.count} captions in the {tone_desc} tone based strictly on the visual elements present."

                system_prompt = (
                    "You are an AI Vision content strategist for SwiftChat. "
                    "Analyze images deeply and provide grounded, creative social media captions. "
                    "Each caption must include relevant emojis and be under 150 characters. "
                    'Return ONLY valid JSON in this exact format: {"captions": [{"text": "...", "mood": "VIBRANT|DEEP|ETHEREAL"}]}'
                )

                headers = {
                    "Authorization": f"Bearer {NVIDIA_API_KEY}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }

                instructions = f"{system_prompt}\n\nUSER REQUEST: {user_prompt}\nIMPORTANT: Use a strictly {tone_desc} tone in your output."
                content = [{"type": "text", "text": instructions}]

                if req.image:
                    content.append(
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{req.image}"},
                        }
                    )
                elif req.imageUrl:
                    content.append(
                        {"type": "image_url", "image_url": {"url": req.imageUrl}}
                    )

                payload = {
                    "model": model_id,
                    "messages": [{"role": "user", "content": content}],
                    "temperature": 0.2,
                    "max_tokens": 800,
                    "stream": False,
                }

                async with httpx.AsyncClient(timeout=timeout_val) as http_client:
                    response = await http_client.post(
                        INVOKE_URL, headers=headers, json=payload
                    )
                    response.raise_for_status()
                    res_json = response.json()
                    accumulated = res_json["choices"][0]["message"]["content"]

                # Strip markdown fences
                content_text = accumulated.strip()
                if "```json" in content_text:
                    content_text = (
                        content_text.split("```json")[1].split("```")[0].strip()
                    )
                elif "```" in content_text:
                    content_text = content_text.split("```")[1].split("```")[0].strip()

                result = json.loads(content_text)
                return CaptionResponse(
                    captions=[
                        CaptionDraft(**c) for c in result["captions"][: req.count]
                    ]
                )
            except Exception:
                pass
                continue  # Jump to next model in loop

    # Fallback mock captions
    mock = MOCK_CAPTIONS.get(tone, MOCK_CAPTIONS["witty"])
    if req.prompt:
        mock = [dict(c) for c in mock]  # shallow copy to avoid mutating the constant
        mock[0]["text"] = f"{req.prompt} — where every moment resonates. ✨"
    return CaptionResponse(captions=[CaptionDraft(**c) for c in mock[: req.count]])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT_CAPTION", 8001)),
        reload=True,
    )
