import os

import uvicorn
import asyncio

from fastapi import FastAPI, Request
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import InMemoryRunner
from google.adk.runners import Runner
from kakao_skill_server.agent import root_agent
from google.genai import types 
import textwrap
import dotenv

from pydantic import BaseModel

dotenv.load_dotenv()

class KakaoInput(BaseModel):
    # 기본값을 설정하기 위해 Optional 타입을 사용합니다.
    user_input: str 

class SimpleText(BaseModel):
    text: str

class OutputItem(BaseModel):
    simpleText: SimpleText

class Template(BaseModel):
    outputs: list[OutputItem]

class KakaoResponse(BaseModel):
    version: str = "2.0"
    template: Template

# Get the directory where main.py is located
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Example session DB URL (e.g., SQLite)
SESSION_DB_URL = "sqlite:///./sessions.db"

# Example allowed origins for CORS
ALLOWED_ORIGINS = ["http://localhost", "http://localhost:8080", "*"]
# Set web=True if you intend to serve a web interface, False otherwise
SERVE_WEB_INTERFACE = False

# Call the function to get the FastAPI app instance
# Ensure the agent directory name ('capital_agent') matches your agent folder
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    #session_db_url=SESSION_DB_URL,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

@app.get("/hello")
async def read_root():
    return {"Hello": "World"}

@app.post("/call_agent", tags=["KakaoInput"], response_model=KakaoResponse)
async def call_agent(kakaoInput: KakaoInput) -> KakaoResponse:

    print(f"user_input: {kakaoInput.user_input}")
    app_name = "kakao_skill_server"

    runner = InMemoryRunner(agent=root_agent, app_name=app_name)
    session = await runner.session_service.create_session(
        app_name=runner.app_name, user_id="test_user"
    )

    content = types.Content(parts=[types.Part(text=kakaoInput.user_input)])
    response = ""

    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=content,
    ):
        print(event)
        if event.content.parts and event.content.parts[0].text:
            agent_response_text = event.content.parts[0].text # Renamed for clarity


    # Construct the Kakao-specific response
    return KakaoResponse(
        template=Template(
            outputs=[
                OutputItem(
                    simpleText=SimpleText(text=agent_response_text or "No response from agent.")
                )
            ]
        )
    )


if __name__ == "__main__":
    # Use the PORT environment variable provided by Cloud Run, defaulting to 8080
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
