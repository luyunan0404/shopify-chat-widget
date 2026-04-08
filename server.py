"""
Sample backend for the Shopify chat widget.
Run: pip install fastapi uvicorn && uvicorn server:app --port 8080
"""

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@app.post("/chat/completions")
async def chat_completions(req: ChatRequest, authorization: str = Header(default="")):
    # Parse chat_id from the first message
    chat_id = None
    first_content = req.messages[0].content if req.messages else ""
    if first_content.startswith("chat_id:"):
        parts = first_content.split(" ", 1)
        chat_id = parts[0].split(":", 1)[1]

    last_user_msg = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            last_user_msg = msg.content
            # Strip chat_id prefix if present
            if last_user_msg.startswith("chat_id:"):
                last_user_msg = last_user_msg.split(" ", 1)[1] if " " in last_user_msg else ""
            break

    print(f"chat_id={chat_id} | user: {last_user_msg}")

    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": f"Echo: {last_user_msg}",
                }
            }
        ]
    }
