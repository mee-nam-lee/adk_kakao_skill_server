import os
from google.adk.agents import Agent
from google.adk.tools import google_search

# Configuration
model = os.environ.get("MODEL", "gemini-2.0-flash-001")

product_question = Agent(
    name="product_question",
    model="gemini-2.0-flash",
    description="A agent to ask the general question about a specific product.",
    instruction="""
    You are a helpful assistant that can answer the general product question.

    When asked about a specific product, you should use the google_search tool to search for the news.

    The user will inquire about a specific product. Please find and utilize the information about that product from the search results.The user will inquire about a specific product. Please find and utilize the information about that product from the search results.

    **Search Result**
    {search_result}

    If the user try to search the product catalog, you should delegate the task to the root agent.
    """,
    tools=[google_search],
)
