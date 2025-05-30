import os
from google.adk.agents import Agent

from .prompt import return_instructions_root
from .tools import call_catalog_search

model = os.environ.get("MODEL", "gemini-2.0-flash")

root_agent = Agent(
    name="catalog_agent",
    model=model,
    description=(
        "Agent to search the product catalog."
    ),
    instruction=return_instructions_root(),
    tools=[call_catalog_search],
)