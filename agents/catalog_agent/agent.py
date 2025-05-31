import os
from google.adk.agents import Agent

from .prompt import return_instructions_root
from .tools import call_catalog_search
from .tools_prompt_checker import tool_prompt_checker

model = os.environ.get("MODEL", "gemini-2.0-flash")

root_agent = Agent(
    name="catalog_agent",
    model=model,
    description=(
        "Agent to search the product catalog."
    ),
    instruction=return_instructions_root(),
    tools=[call_catalog_search,tool_prompt_checker],
)