import os
import logging

# Latest Google ADK 1.2+ based import
from google.adk.agents import Agent

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
model = os.environ.get("MODEL", "gemini-2.0-flash-001")

root_agent = Agent(
    name="kakao_skill_server_agent",
    model=model,
    description="Kakao Skill Server Agent",
    instruction="당신은 사용자의 일반적이 질문에 간단한 대답을 제공하는 Agent 입니다. 사용자에게 반갑게 인사하고, 질문에 대다답해주세요",
    output_key="search_result",
)
