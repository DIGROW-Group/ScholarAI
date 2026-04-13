"""
Benchmark Configuration
Handles environment variables and configuration for benchmark functionality
"""

import os
from dotenv import load_dotenv

load_dotenv()

class BenchmarkConfig:
    """Configuration for benchmark functionality"""
    
    # API Keys
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

    # Available models for each provider
    ANTHROPIC_MODELS = {
        "claude-opus-4-1-20250805": {
            "name": "Claude Opus 4.1",
            "description": "Most capable / advanced reasoning",
            "status": "active",
            "cost_tier": "premium"
        },
        "claude-opus-4-20250514": {
            "name": "Claude Opus 4",
            "description": "Previous flagship (stable snapshot)",
            "cost_tier": "premium"
        },
        "claude-sonnet-4-5-20250929": {
            "name": "Claude Sonnet 4",
            "description": "High-performance general model",
            "cost_tier": "standard"
        },
        "claude-3-7-sonnet-20250219": {
            "name": "Claude 3.7 Sonnet",
            "description": "Strong reasoning, 3.x family",
            "cost_tier": "standard"
        },
        "claude-3-5-haiku-20241022": {
            "name": "Claude 3.5 Haiku",
            "description": "Fastest/lowest cost",
            "cost_tier": "economy"
        },
        "claude-3-haiku-20240307": {
            "name": "Claude 3 Haiku",
            "description": "Legacy fast model",
            "cost_tier": "economy"
        }
    }
    
    OPENAI_MODELS = {
        "gpt-4.1": {
            "name": "GPT-4.1",
            "description": "Latest general model; stronger than 4o",
            "cost_tier": "premium"
        },
        "gpt-4.1-mini": {
            "name": "GPT-4.1 Mini",
            "description": "Fast, cheap general model",
            "cost_tier": "standard"
        },
        "o4-mini": {
            "name": "o4-mini",
            "description": "Reasoning-optimized small model",
            "cost_tier": "standard"
        },
        "gpt-4o": {
            "name": "GPT-4o",
            "description": "Older multimodal flagship (kept for back-compat)",
            "cost_tier": "premium",
        },

        # GPT-5 family
        "gpt-5": {
            "name": "GPT-5",
            "description": "Flagship auto-routed GPT-5 model",
            "cost_tier": "premium"
        },
        "gpt-5-mini": {
            "name": "GPT-5 Mini",
            "description": "Fast, efficient GPT-5 variant for general use",
            "cost_tier": "standard"
        },
        "gpt-5-nano": {
            "name": "GPT-5 Nano",
            "description": "Ultra-compact GPT-5, API-focused and very cheap",
            "cost_tier": "standard"
        },
        "gpt-5-pro": {
            "name": "GPT-5 Pro",
            "description": "High-capacity GPT-5 for Pro/Enterprise workloads",
            "cost_tier": "premium"
        },
        "gpt-5-thinking": {
            "name": "GPT-5 Thinking",
            "description": "Deep reasoning GPT-5 variant for complex tasks",
            "cost_tier": "premium"
        }
        # Drop: gpt-4-turbo, gpt-4, gpt-3.5-turbo
    }

    GOOGLE_MODELS = {
        # Gemini API models
        "gemini-2.5-pro": {
            "name": "Gemini 2.5 Pro",
            "description": "Most advanced Gemini – Deep Think, multimodal reasoning",
            "cost_tier": "premium"
        },
        "gemini-2.5-flash": {
            "name": "Gemini 2.5 Flash",
            "description": "Fast and efficient Gemini default",
            "cost_tier": "standard"
        },
        "gemini-2.5-flash-lite": {
            "name": "Gemini 2.5 Flash-Lite",
            "description": "Budget-friendly Gemini variant",
            "cost_tier": "economy"
        },

        # Gemma (open-source) models
        "gemma-3": {
            "name": "Gemma 3",
            "description": "Open-source multimodal LLM (1B–27B params, long context)",
            "cost_tier": "standard"
        },
        "gemma-3n": {
            "name": "Gemma 3n",
            "description": "Gemma optimized for on-device (mobile) execution",
            "cost_tier": "standard"
        },
    }



    
    # Default models (can be overridden by environment variables)
    DEFAULT_ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
    DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5")
    DEFAULT_GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-2.5-pro")
    
    # Analysis settings (Note: OpenAI GPT-5 models don't support max_tokens/temperature)
    # These are kept for Anthropic compatibility only
    MAX_TOKENS = int(os.getenv("BENCHMARK_MAX_TOKENS", "4000"))
    TEMPERATURE = float(os.getenv("BENCHMARK_TEMPERATURE", "0.1"))
    
    # Timeout settings
    REQUEST_TIMEOUT = int(os.getenv("BENCHMARK_TIMEOUT", "60"))
    
    @classmethod
    def get_available_services(cls):
        """Get list of available services based on API keys"""
        services = []
        
        if cls.ANTHROPIC_API_KEY:
            services.append("anthropic")
        
        if cls.OPENAI_API_KEY:
            services.append("openai")
        
        if cls.GOOGLE_API_KEY:
            services.append("google")
        
        return services
    
    @classmethod
    def get_available_models(cls):
        """Get all available models for each service"""
        models = {}
        
        if cls.ANTHROPIC_API_KEY:
            models["anthropic"] = cls.ANTHROPIC_MODELS
        
        if cls.OPENAI_API_KEY:
            models["openai"] = cls.OPENAI_MODELS
        
        if cls.GOOGLE_API_KEY:
            models["google"] = cls.GOOGLE_MODELS
        
        return models
    
    @classmethod
    def get_models_for_service(cls, service_name):
        """Get available models for a specific service"""
        if service_name == "anthropic" and cls.ANTHROPIC_API_KEY:
            return cls.ANTHROPIC_MODELS
        elif service_name == "openai" and cls.OPENAI_API_KEY:
            return cls.OPENAI_MODELS
        elif service_name == "google" and cls.GOOGLE_API_KEY:
            return cls.GOOGLE_MODELS
        return {}
    
    @classmethod
    def get_model_info(cls, service_name, model_id):
        """Get information about a specific model"""
        models = cls.get_models_for_service(service_name)
        return models.get(model_id, {})
    
    @classmethod
    def is_service_available(cls, service_name):
        """Check if a specific service is available"""
        if service_name == "anthropic":
            return bool(cls.ANTHROPIC_API_KEY)
        elif service_name == "openai":
            return bool(cls.OPENAI_API_KEY)
        elif service_name == "google":
            return bool(cls.GOOGLE_API_KEY)
        return False
    
    @classmethod
    def get_default_model(cls, service_name):
        """Get the default model for a service"""
        if service_name == "anthropic":
            return cls.DEFAULT_ANTHROPIC_MODEL
        elif service_name == "openai":
            return cls.DEFAULT_OPENAI_MODEL
        elif service_name == "google":
            return cls.DEFAULT_GOOGLE_MODEL
        return None
