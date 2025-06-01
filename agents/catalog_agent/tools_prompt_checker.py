import os
from google.adk.agents import Agent
import logging
import vertexai
from vertexai.generative_models import GenerativeModel, HarmCategory, HarmBlockThreshold, SafetySetting
from google.auth import default
from google.auth.transport.requests import Request
import requests
import json
from .prompt import return_instructions_root
from .tools import call_catalog_search
from google.adk.tools import ToolContext
from google.adk.tools.agent_tool import AgentTool
import google.auth
from google.cloud.retail import SearchRequest, SearchServiceClient, ProductServiceClient, GetProductRequest
import json
import os


# logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Model Armor REST API  ---
def check_model_armor_rules(project_id: str, location: str, template_id: str, prompt_text: str):
    """
    Model Armor REST API를 사용하여 프롬프트 검사
    """
    try:
        # Auth
        credentials, _ = default()
        credentials.refresh(Request())
        
        # Model Armor API Endpoint
        endpoint = f"https://modelarmor.{location}.rep.googleapis.com/v1/projects/{project_id}/locations/{location}/templates/{template_id}:sanitizeUserPrompt"
        
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        
        # API Request payload
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
            logger.info(f"Model Armor API Response: {result}")
            return parse_model_armor_response(result, prompt_text)
        else:
            logger.error(f"Model Armor API Error: {response.status_code} - {response.text}")
            return create_armor_error_result(f"API Error {response.status_code}: {response.text}", prompt_text)
            
    except Exception as e:
        logger.error(f"Error calling Model Armor API: {e}")
        return create_armor_error_result(str(e), prompt_text)

def parse_model_armor_response(response_data, prompt_text):
    """
    Model Armor API 응답 파싱 - 실제 응답 구조에 맞춤
    """
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
        
        # sanitizationResult 
        sanitization_result = response_data.get("sanitizationResult", {})
        filter_results = sanitization_result.get("filterResults", {})
        
        # overall match state check 
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
        rai_match_state = rai_result.get("matchState", "")
        rai_type_results = rai_result.get("raiFilterTypeResults", {})
        
        rai_violations_found = False
        
        # RAI Category Check
        if "harassment" in rai_type_results:
            harassment_result = rai_type_results["harassment"]
            if harassment_result.get("matchState") == "MATCH_FOUND":
                confidence = harassment_result.get("confidenceLevel", "Unknown")
                armor_results["responsible_ai"]["categories"]["Harassment"] = f"Violations found (Confidence: {confidence})"
                violations_found.append("harassment")
                rai_violations_found = True
        
        if "sexually_explicit" in rai_type_results:
            sexually_explicit_result = rai_type_results["sexually_explicit"]
            if sexually_explicit_result.get("matchState") == "MATCH_FOUND":
                confidence = sexually_explicit_result.get("confidenceLevel", "Unknown")
                armor_results["responsible_ai"]["categories"]["Sexually Explicit"] = f"Violations found (Confidence: {confidence})"
                violations_found.append("sexually_explicit")
                rai_violations_found = True
        
        if "hate_speech" in rai_type_results:
            hate_speech_result = rai_type_results["hate_speech"]
            if hate_speech_result.get("matchState") == "MATCH_FOUND":
                confidence = hate_speech_result.get("confidenceLevel", "Unknown")
                armor_results["responsible_ai"]["categories"]["Hate Speech"] = f"Violations found (Confidence: {confidence})"
                violations_found.append("hate_speech")
                rai_violations_found = True
        
        if "dangerous" in rai_type_results:
            dangerous_result = rai_type_results["dangerous"]
            if dangerous_result.get("matchState") == "MATCH_FOUND":
                confidence = dangerous_result.get("confidenceLevel", "Unknown")
                armor_results["responsible_ai"]["categories"]["Dangerous"] = f"Violations found (Confidence: {confidence})"
                violations_found.append("dangerous_content")
                rai_violations_found = True
        
        # RAI Overall Setting 
        if rai_violations_found:
            armor_results["responsible_ai"]["status"] = "Violations found"
            violations_found.append("rai")
        
        # Overall Setting 
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
    """
    Error
    """
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
        "llm_response_text": f"Model Armor API Error: {error_message}",
        "overall_status": f"API Error: {error_message}"
    }

project_id = google.auth.default()[1]
location = "us-central1"
template_id = "model-armor-demo"

def tool_prompt_checker(query: str,) -> str:

    armor_results = check_model_armor_rules(project_id, location, template_id, query)
    
    if armor_results.get("prompt_blocked_by_safety", False):
        armor_results["llm_response_text"] = "Prompt blocked by Model Armor rules."
        return armor_results, None
