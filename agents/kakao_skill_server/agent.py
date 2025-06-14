import os
import logging

# Latest Google ADK 1.2+ based import
#from google.adk.agents import Agent
from google.adk.agents import LlmAgent

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
model = os.environ.get("MODEL", "gemini-2.0-flash-001")

kakao_skill_server_agent = LlmAgent(
    name="kakao_skill_server_agent",
    model=model,
    description="General QnA agent",
    instruction="사용자의 질문에 3줄 이내의 답변을 생성해주세요.",
    #instruction="Answer for user's questions",
    #output_key="search_result",
)
root_agent = kakao_skill_server_agent