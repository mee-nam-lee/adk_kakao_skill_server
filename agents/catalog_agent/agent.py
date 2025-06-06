import os
import logging
from typing import Optional

# Latest Google ADK 1.2+ based import
from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.genai import types  # Content and Part are imported from here

from .prompt import return_instructions_root
from .tools import call_catalog_search
from .model_armor import check_prompt_safety

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
model = os.environ.get("MODEL", "gemini-2.0-flash-001")


def extract_user_input(callback_context: CallbackContext) -> str:
    """Extract user input from CallbackContext."""
    if not hasattr(callback_context, 'user_content') or not callback_context.user_content:
        return ""
    
    user_content = callback_context.user_content
    
    # Handle Content with parts (latest approach)
    if hasattr(user_content, 'parts') and user_content.parts:
        for part in user_content.parts:
            if hasattr(part, 'text') and part.text:
                return part.text.strip()
    
    # Handle string content
    if isinstance(user_content, str):
        return user_content.strip()
    
    # Handle content with text attribute
    if hasattr(user_content, 'text') and user_content.text:
        return user_content.text.strip()
    
    return ""


def check_model_armor_rules(callback_context: CallbackContext) -> Optional[types.Content]:
    """
    Check prompt safety using Model Armor before agent execution.
    
    Args:
        callback_context: The callback context
        
    Returns:
        Content to skip agent execution if prompt is blocked, None if safe to proceed
    """
    agent_name = callback_context.agent_name
    invocation_id = callback_context.invocation_id
    
    logger.info(f"[Callback] Entering agent: {agent_name} (Invocation ID: {invocation_id})")
    
    # Extract user input
    user_input = extract_user_input(callback_context)
    
    if not user_input:
        logger.info(f"[Callback] No user input found, proceeding with agent {agent_name}")
        return None
    
    # Check prompt safety using Model Armor
    if check_prompt_safety(user_input):
        logger.warning(f"[Callback] Prompt blocked by Model Armor: Skipping agent {agent_name}")
        return types.Content(
            parts=[types.Part(text=(
                "Sorry, the catalog search service is not available for this request "
                "due to safety policies. Please modify your request and try again."
            ))],
            role="model"
        )
    
    logger.info(f"[Callback] Prompt passed safety check: Proceeding with agent {agent_name}")
    return None


# Create agent with Model Armor callback
root_agent = Agent(
    name="catalog_agent",
    model=model,
    description="An agent that searches the product catalog.",
    instruction=return_instructions_root(),
    tools=[call_catalog_search],
    before_agent_callback=check_model_armor_rules
)

##################################
# Task 7: Enhance the conversational product search Agent created in Task 6 
# by adding a prompt sanitization feature add the line below 
# before_agent_callback=check_model_armor_rules
##################################