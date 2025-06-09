import os
import logging
import json
from typing import Dict, Any, Optional

# Latest Google Auth approach (no deprecated dependencies)
try:
    from google.auth import default
    from google.auth.transport.requests import Request
    import requests
    AUTH_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Google Auth is not available: {e}")
    AUTH_AVAILABLE = False

# Logging configuration
logger = logging.getLogger(__name__)

# Configuration
try:
    if AUTH_AVAILABLE:
        credentials, project_id = default()
    else:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
except Exception as e:
    logger.warning(f"Could not get project_id from default credentials: {e}")
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
template_id = "model-armor-demo"


def get_access_token() -> Optional[str]:
    """Get Google Cloud access token (latest approach)."""
    if not AUTH_AVAILABLE:
        return None
    
    try:
        credentials, _ = default()
        credentials.refresh(Request())
        return credentials.token
    except Exception as e:
        logger.error(f"Failed to get access token: {e}")
        return None


def call_model_armor_api(prompt_text: str) -> Dict[str, Any]:
    """
    Call Model Armor REST API (latest approach).
    
    Args:
        prompt_text: User input text to check
        
    Returns:
        Dictionary containing API response or error information
    """
    if not AUTH_AVAILABLE:
        logger.warning("Google Auth is not available, allowing all prompts")
        return {"mock": True, "safe": True}
    
    try:
        # Get access token
        access_token = get_access_token()
        if not access_token:
            return {"error": "Could not obtain access token"}
        
        # Model Armor API endpoint
        endpoint = (
            f"https://modelarmor.{location}.rep.googleapis.com/v1/"
            f"projects/{project_id}/locations/{location}/templates/{template_id}:sanitizeUserPrompt"
        )
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "User-Agent": "google-adk-agent/1.0"
        }
        
        # API request payload
        payload = {
            "user_prompt_data": {
                "text": prompt_text
            }
        }
        
        logger.debug(f"Calling Model Armor API: template_id={template_id}")
        
        # Make API call
        response = requests.post(
            endpoint, 
            headers=headers, 
            json=payload, 
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.debug(f"Model Armor API response: {result}")
            return result
        else:
            error_msg = f"API error {response.status_code}: {response.text}"
            logger.error(error_msg)
            return {"error": error_msg}
            
    except requests.exceptions.Timeout:
        error_msg = "Model Armor API timeout"
        logger.error(error_msg)
        return {"error": error_msg}
    except requests.exceptions.RequestException as e:
        error_msg = f"Model Armor API request failed: {e}"
        logger.error(error_msg)
        return {"error": error_msg}
    except Exception as e:
        error_msg = f"Unexpected error: {e}"
        logger.error(error_msg)
        return {"error": error_msg}


def is_prompt_blocked(armor_response: Dict[str, Any]) -> bool:
    """
    Determine if prompt should be blocked based on Model Armor response.
    
    Args:
        armor_response: Model Armor API response
        
    Returns:
        True if prompt should be blocked, False if safe to proceed
    """
    # Allow if error or mock mode (fail-open)
    if "error" in armor_response or armor_response.get("mock", False):
        if armor_response.get("mock"):
            logger.debug("Mock mode: allowing all prompts")
        else:
            logger.warning("Model Armor API error, allowing request")
        return False
    
    try:
        sanitization_result = armor_response.get("sanitizationResult", {})
        filter_results = sanitization_result.get("filterResults", {})
        
        # Check only medium+ confidence RAI violations
        rai_result = filter_results.get("rai", {}).get("raiFilterResult", {})
        rai_type_results = rai_result.get("raiFilterTypeResults", {})
        
        # Block only medium+ confidence violations
        for category, category_result in rai_type_results.items():
            if (category_result.get("matchState") == "MATCH_FOUND" and 
                category_result.get("confidenceLevel") in ["MEDIUM_AND_ABOVE", "HIGH_AND_ABOVE"]):
                logger.info(f"High-confidence RAI violation detected: {category}")
                return True
        
        # Check prompt injection and jailbreak attempts
        pi_result = filter_results.get("pi_and_jailbreak", {}).get("piAndJailbreakFilterResult", {})
        if pi_result.get("matchState") == "MATCH_FOUND":
            logger.info("Prompt injection/jailbreak detected")
            return True
        
        # Check malicious URLs
        malicious_uri_result = filter_results.get("malicious_uris", {}).get("maliciousUriFilterResult", {})
        if malicious_uri_result.get("matchState") == "MATCH_FOUND":
            logger.info("Malicious URI detected")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error parsing Model Armor response: {e}")
        # Allow on parsing errors (fail-open)
        return False


def check_prompt_safety(prompt_text: str) -> bool:
    """
    Main function to check if a prompt is safe using Model Armor.
    
    Args:
        prompt_text: User input text to check
        
    Returns:
        True if prompt should be blocked, False if safe to proceed
    """
    if not prompt_text or not prompt_text.strip():
        return False
    
    logger.info(f"Checking prompt safety for: '{prompt_text[:50]}{'...' if len(prompt_text) > 50 else ''}'")
    
    # Call Model Armor API
    armor_response = call_model_armor_api(prompt_text.strip())
    
    # Determine if prompt should be blocked
    return is_prompt_blocked(armor_response)