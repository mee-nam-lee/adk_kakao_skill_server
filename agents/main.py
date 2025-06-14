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

app_name = "kakao_skill_server"
runner = InMemoryRunner(agent=root_agent, app_name=app_name)

@app.post("/hello", response_model=KakaoResponse)
async def read_root() -> KakaoResponse:
    return KakaoResponse(
        template=Template(
            outputs=[
                OutputItem(
                    simpleText=SimpleText(text="hello I'm Ryan")
                )
            ]
        )
    )

@app.post("/call_agent", tags=["KakaoInput"], response_model=KakaoResponse)
async def call_agent(kakaoInput: dict) -> KakaoResponse: # Changed KakaoInput to dict
    user_id = kakaoInput.get("userRequest", {}).get("user", {}).get("id") or "test_user"
    session_id ="session123"

    print(f"kakaoInput: {kakaoInput}")

    user_input_text = kakaoInput.get("userRequest", {}).get("utterance") # Safely get nested utterance
    print(f"user_input: {user_input_text}")
    
    session = await runner.session_service.get_session(app_name=app_name,
                                            user_id=user_id, 
                                            session_id=session_id)
    
    if session is None:  
        print(f"Creating new session : {session_id}")
        session = await runner.session_service.create_session(
            app_name=runner.app_name, user_id=user_id, session_id=session_id
        )

    #print(f"State agent run: {session.state}")
    content = types.Content(parts=[types.Part(text=user_input_text)], role="user") # Use extracted text
    response = ""

    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=content,
    ):
        print(event)
        if event.content.parts and event.content.parts[0].text:
            agent_response_text = event.content.parts[0].text # Renamed for clarity

    print(f"agent_response_text #### : {agent_response_text}")

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
