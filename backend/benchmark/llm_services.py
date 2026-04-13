"""
LLM Services for Benchmark Comparison
Supports Anthropic Claude, OpenAI ChatGPT, and Google Gemini APIs
"""

import os
import json
import anthropic
import openai
import google.generativeai as genai
from typing import Dict, Any, Optional
from .config import BenchmarkConfig

class LLMService:
    """Base class for LLM services"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def generate_analysis(self, system_prompt: str, data_context: str) -> Dict[str, Any]:
        """Generate analysis using the LLM"""
        raise NotImplementedError

class AnthropicService(LLMService):
    """Anthropic Claude service"""
    
    def __init__(self, api_key: str, model_id: str = None):
        super().__init__(api_key)
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model_id = model_id or BenchmarkConfig.DEFAULT_ANTHROPIC_MODEL
    
    def generate_analysis(self, system_prompt: str, data_context: str) -> Dict[str, Any]:
        """Generate analysis using Anthropic Claude"""
        try:
            # Get model-specific max tokens
            model_info = BenchmarkConfig.get_model_info("anthropic", self.model_id)
            max_tokens = min(
                model_info.get("max_tokens", 4096),
                BenchmarkConfig.MAX_TOKENS
            )
            
            response = self.client.messages.create(
                model=self.model_id,
                max_tokens=max_tokens,
                temperature=BenchmarkConfig.TEMPERATURE,
                system=system_prompt,
                messages=[{"role": "user", "content": data_context}]
            )
            
            response_text = response.content[0].text.strip()
            return self._extract_json_from_response(response_text)
            
        except Exception as e:
            print(f"Error with Anthropic API: {str(e)}")
            return self._generate_fallback_response()
    
    def _extract_json_from_response(self, response_text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response"""
        try:
            # Try to find JSON in the response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                json_text = response_text.strip()
            
            return json.loads(json_text)
        except Exception as e:
            print(f"Error parsing JSON from Anthropic response: {str(e)}")
            return self._generate_fallback_response()
    
    def _generate_fallback_response(self) -> Dict[str, Any]:
        """Generate fallback response when API fails"""
        return {
            "swot_analysis": {
                "strengths": ["Analyse temporairement indisponible"],
                "weaknesses": ["Service API indisponible"],
                "opportunities": ["Réessayer plus tard"],
                "threats": ["Problème de connectivité"]
            },
            "recommendation": "Analyse temporairement indisponible - problème avec l'API Anthropic",
            "detailed_analysis": "Service temporairement indisponible",
            "company_definition": "Description temporairement indisponible - problème avec l'API"
        }

class OpenAIService(LLMService):
    """OpenAI ChatGPT service"""
    
    def __init__(self, api_key: str, model_id: str = None):
        super().__init__(api_key)
        self.client = openai.OpenAI(api_key=api_key)
        self.model_id = model_id or BenchmarkConfig.DEFAULT_OPENAI_MODEL
    
    def generate_analysis(self, system_prompt: str, data_context: str) -> Dict[str, Any]:
        """Generate analysis using OpenAI ChatGPT"""
        try:
            response = self.client.chat.completions.create(
                model=self.model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": data_context}
                ]
            )
            
            response_text = response.choices[0].message.content.strip()
            return self._extract_json_from_response(response_text)
            
        except Exception as e:
            print(f"Error with OpenAI API: {str(e)}")
            return self._generate_fallback_response()
    
    def _extract_json_from_response(self, response_text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response"""
        try:
            # Try to find JSON in the response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                json_text = response_text.strip()
            
            return json.loads(json_text)
        except Exception as e:
            print(f"Error parsing JSON from OpenAI response: {str(e)}")
            return self._generate_fallback_response()
    
    def _generate_fallback_response(self) -> Dict[str, Any]:
        """Generate fallback response when API fails"""
        return {
            "swot_analysis": {
                "strengths": ["Analyse temporairement indisponible"],
                "weaknesses": ["Service API indisponible"],
                "opportunities": ["Réessayer plus tard"],
                "threats": ["Problème de connectivité"]
            },
            "recommendation": "Analyse temporairement indisponible - problème avec l'API OpenAI",
            "detailed_analysis": "Service temporairement indisponible",
            "company_definition": "Description temporairement indisponible - problème avec l'API"
        }

class GoogleService(LLMService):
    """Google Gemini service"""
    
    def __init__(self, api_key: str, model_id: str = None):
        super().__init__(api_key)
        genai.configure(api_key=api_key)
        self.model_id = model_id or BenchmarkConfig.DEFAULT_GOOGLE_MODEL
        self.model = genai.GenerativeModel(self.model_id)
    
    def generate_analysis(self, system_prompt: str, data_context: str) -> Dict[str, Any]:
        """Generate analysis using Google Gemini"""
        try:
            # Combine system prompt and data context for Gemini
            full_prompt = f"{system_prompt}\n\n{data_context}"
            
            response = self.model.generate_content(full_prompt)
            response_text = response.text.strip()
            
            return self._extract_json_from_response(response_text)
            
        except Exception as e:
            print(f"Error with Google API: {str(e)}")
            return self._generate_fallback_response()
    
    def _extract_json_from_response(self, response_text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response"""
        try:
            # Try to find JSON in the response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                json_text = response_text.strip()
            
            return json.loads(json_text)
        except Exception as e:
            print(f"Error parsing JSON from Google response: {str(e)}")
            return self._generate_fallback_response()
    
    def _generate_fallback_response(self) -> Dict[str, Any]:
        """Generate fallback response when API fails"""
        return {
            "swot_analysis": {
                "strengths": ["Analyse temporairement indisponible"],
                "weaknesses": ["Service API indisponible"],
                "opportunities": ["Réessayer plus tard"],
                "threats": ["Problème de connectivité"]
            },
            "recommendation": "Analyse temporairement indisponible - problème avec l'API Google",
            "detailed_analysis": "Service temporairement indisponible",
            "company_definition": "Description temporairement indisponible - problème avec l'API"
        }

def get_llm_services(selected_models: Dict[str, str] = None) -> Dict[str, LLMService]:
    """Get configured LLM services with optional model selection"""
    services = {}
    
    # Anthropic service
    if BenchmarkConfig.ANTHROPIC_API_KEY:
        model_id = None
        if selected_models and "anthropic" in selected_models:
            model_id = selected_models["anthropic"]
        services["anthropic"] = AnthropicService(BenchmarkConfig.ANTHROPIC_API_KEY, model_id)
    
    # OpenAI service
    if BenchmarkConfig.OPENAI_API_KEY:
        model_id = None
        if selected_models and "openai" in selected_models:
            model_id = selected_models["openai"]
        services["openai"] = OpenAIService(BenchmarkConfig.OPENAI_API_KEY, model_id)
    
    # Google service
    if BenchmarkConfig.GOOGLE_API_KEY:
        model_id = None
        if selected_models and "google" in selected_models:
            model_id = selected_models["google"]
        services["google"] = GoogleService(BenchmarkConfig.GOOGLE_API_KEY, model_id)
    
    return services
