import json
import logging
import requests
import google.auth
from google.auth import default
from google.auth.transport.requests import Request
import os

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Project configuration
project_id = google.auth.default()[1]
location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1") 
template_id = "model-armor-demo"


def check_model_armor_rules(project_id: str, location: str, template_id: str, prompt_text: str):
    """Check prompt using Model Armor REST API"""
    try:
        # Authentication
        credentials, _ = default()
        credentials.refresh(Request())
        
        # Model Armor API endpoint
        endpoint = f"https://modelarmor.{location}.rep.googleapis.com/v1/projects/{project_id}/locations/{location}/templates/{template_id}:sanitizeUserPrompt"
        
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        
        # API request payload
        payload = {
            "user_prompt_data": {
                "text": prompt_text
            }
        }
        
        logger.info(f"Calling Model Armor REST API with template_id: {template_id}")
        logger.info(f"Endpoint: {endpoint}")
        
        response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Model Armor API response: {result}")
            return parse_model_armor_response(result, prompt_text)
        else:
            logger.error(f"Model Armor API error: {response.status_code} - {response.text}")
            return create_armor_error_result(f"API error {response.status_code}: {response.text}", prompt_text)
            
    except Exception as e:
        logger.error(f"Error calling Model Armor API: {e}")
        return create_armor_error_result(str(e), prompt_text)


def parse_model_armor_response(response_data, prompt_text):
    """Parse Model Armor API response"""
    armor_results = {
        "sensitive_data_protection": {"status": "No Match Found", "details": None},
        "prompt_injection_jailbreak": {"status": "No Match Found", "details": None},
        "malicious_urls": {"status": "No Match Found", "details": None},
        "responsible_ai": {
            "status": "No Match Found",
            "categories": {
                "Sexually Explicit": "No Match Found",
                "Hate Speech": "No Match Found",
                "Harassment": "No Match Found",
                "Dangerous": "No Match Found",
            }
        },
        "sanitized_prompt_request_raw": prompt_text,
        "issues_found": False,
        "prompt_blocked_by_safety": False,
        "llm_response_text": ""
    }
    
    try:
        violations_found = []
        
        # Parse sanitizationResult
        sanitization_result = response_data.get("sanitizationResult", {})
        filter_results = sanitization_result.get("filterResults", {})
        
        # Check overall match state
        overall_match_state = sanitization_result.get("filterMatchState", "")
        if overall_match_state == "MATCH_FOUND":
            armor_results["issues_found"] = True
            armor_results["prompt_blocked_by_safety"] = True
        
        # 1. Sensitive Data Protection (SDP)
        sdp_result = filter_results.get("sdp", {}).get("sdpFilterResult", {})
        sdp_match_state = sdp_result.get("inspectResult", {}).get("matchState", "")
        if sdp_match_state == "MATCH_FOUND":
            armor_results["sensitive_data_protection"]["status"] = "Violations found"
            violations_found.append("sensitive_data")
        
        # 2. Prompt Injection and Jailbreak
        pi_result = filter_results.get("pi_and_jailbreak", {}).get("piAndJailbreakFilterResult", {})
        pi_match_state = pi_result.get("matchState", "")
        if pi_match_state == "MATCH_FOUND":
            armor_results["prompt_injection_jailbreak"]["status"] = "Violations found"
            violations_found.append("prompt_injection")
        
        # 3. Malicious URLs
        malicious_uri_result = filter_results.get("malicious_uris", {}).get("maliciousUriFilterResult", {})
        malicious_uri_match_state = malicious_uri_result.get("matchState", "")
        if malicious_uri_match_state == "MATCH_FOUND":
            armor_results["malicious_urls"]["status"] = "Violations found"
            violations_found.append("malicious_urls")
        
        # 4. Responsible AI (RAI)
        rai_result = filter_results.get("rai", {}).get("raiFilterResult", {})
        rai_type_results = rai_result.get("raiFilterTypeResults", {})
        
        rai_violations_found = False
        
        # Check RAI categories
        rai_categories = {
            "harassment": "Harassment",
            "sexually_explicit": "Sexually Explicit", 
            "hate_speech": "Hate Speech",
            "dangerous": "Dangerous"
        }
        
        for rai_key, display_name in rai_categories.items():
            if rai_key in rai_type_results:
                category_result = rai_type_results[rai_key]
                if category_result.get("matchState") == "MATCH_FOUND":
                    confidence = category_result.get("confidenceLevel", "Unknown")
                    armor_results["responsible_ai"]["categories"][display_name] = f"Violations found (Confidence: {confidence})"
                    violations_found.append(rai_key)
                    rai_violations_found = True
        
        # Set RAI overall status
        if rai_violations_found:
            armor_results["responsible_ai"]["status"] = "Violations found"
            violations_found.append("rai")
        
        # Set overall status
        if violations_found:
            violation_list = " • ".join(violations_found)
            armor_results["overall_status"] = f"Violations found: • {violation_list}"
            armor_results["issues_found"] = True
            armor_results["prompt_blocked_by_safety"] = True
        else:
            armor_results["overall_status"] = "No violations found"
    
    except Exception as e:
        logger.error(f"Error parsing Model Armor response: {e}")
        logger.error(f"Response data: {response_data}")
        return create_armor_error_result(f"Response parsing error: {e}", prompt_text)
    
    return armor_results


def create_armor_error_result(error_message, prompt_text):
    """Create error result for error scenarios"""
    return {
        "sensitive_data_protection": {"status": "API Error", "details": error_message},
        "prompt_injection_jailbreak": {"status": "API Error", "details": error_message},
        "malicious_urls": {"status": "API Error", "details": error_message},
        "responsible_ai": {
            "status": "API Error",
            "categories": {cat: "API Error" for cat in ["Sexually Explicit", "Hate Speech", "Harassment", "Dangerous"]},
        },
        "sanitized_prompt_request_raw": prompt_text,
        "issues_found": True,
        "prompt_blocked_by_safety": False,
        "llm_response_text": f"Model Armor API error: {error_message}",
        "overall_status": f"API error: {error_message}"
    }


def tool_prompt_checker(query: str) -> str:
    """Main function for prompt checking tool"""
    armor_results = check_model_armor_rules(project_id, location, template_id, query)
    
    if armor_results.get("prompt_blocked_by_safety", False):
        armor_results["llm_response_text"] = "Prompt blocked by Model Armor rules."
        
    return json.dumps(armor_results)