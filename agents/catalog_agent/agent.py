import datetime
from zoneinfo import ZoneInfo
from google.adk.agents import Agent

from .prompt import return_instructions_root
from .tools import call_catalog_search


root_agent = Agent(
    name="catalog_agent",
    model="gemini-2.0-flash",
    description=(
        "Agent to search the product catalog."
    ),
    instruction=return_instructions_root(),
    tools=[call_catalog_search],
)