import os
import subprocess
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
import anthropic
from .web_exploring_models import WebExplorerOutput
from .bizafrix_web import get_company_info_from_bizafrix, validate_bizafrix_data
from .charika_web import get_company_info_from_charika, validate_charika_data
from langchain_tavily import TavilySearch
from serpapi import GoogleSearch
import re
import json
import traceback

system_template = """You are an expert data extractor.

    Your task is to analyze text scraped from a company’s official website and extract the following structured JSON format:

    {{
    "companyOverview": {{
        "companyFoundationyear": null,
        "companyExpertise": null,
        "primary_sector": null,
        "legal_form": null,
        "companyDefinition": null
    }},
    "sectors": [
        {{"title": "...", "description": "..."}},
        ...
    ],
    "markets": [
        {{"title": "...", "description": "..."}},
        ...
    ],
    "keyPeople": [
        {{"initials": "...", "name": "...", "position": "..."}}
    ],
    "contact": {{
        "phone": null,
        "email": null,
        "address": null,
        "website": {url}
    }}
    }}

    Return a valid JSON object only. 
    IMPORTANT: If a field is not found in the scraped text, return null (not an empty string or error message).
    Extract all relevant sectors and markets found in the scraped text.
    For the description field of sectors and markets you can use your knowledge to generate a description.
    Never return error messages or explanations - only return null for missing data.

    For the companyDefinition field, follow this specific French structure:
    "[Nom de la société] est un acteur opérant dans le secteur de [secteur d'activité], avec un positionnement [généraliste / spécialisé / de niche] sur [marché ou typologie de clients].
    Son modèle repose sur [activité principale, ex : revenus récurrents, distribution directe, technologie propriétaire].
    L'entreprise se différencie par [ex : expertise sectorielle, ancrage local, innovation produit, etc.].
    L'entreprise opère dans plusieurs secteurs d'activité incluant [liste des secteurs extraits]."

    For sectors and markets, focus on SPECIFIC and DETAILED categories, not generic ones:
    - AVOID generic terms like "Commerce", "Services", "Industrie", "Technologie"
    - INSTEAD use specific categories like:
      * "Sécurité électronique" (not just "Sécurité")
      * "Facility Services" (not just "Services")
      * "Sécurité intégrée" (not just "Sécurité")
      * "Vidéo-surveillance et contrôle d'accès" (not just "Surveillance")
      * "Maintenance technique et gestion d'espaces" (not just "Maintenance")
      * "Solutions de paiement électronique" (not just "Paiement")
      * "Gestion de flotte et logistique" (not just "Logistique")
    
    Always prioritize the most specific and relevant business activities over broad categories.

    Only answer in French.
    """
human_template = """Here is the text scraped from the company website:

    {text_cleaned}
    """
location_template = """From the following text scraped from a company's website, extract only the **physical address** of the company headquarters. Exclude phone numbers, emails, or department names (e.g., support). 

IMPORTANT: 
- If you find a valid physical address, return just the clean address as plain text
- If no address is found or the text doesn't contain address information, return "null" (without quotes)
- Never return error messages or explanations

Text to analyze:
{address}"""

load_dotenv()
tavily_key = os.getenv("TAVILY_API_KEY")
anthropic_key = os.getenv("ANTHROPIC_API_KEY")
serpapi_key = os.getenv("SERPAPI_API_KEY")

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=anthropic_key)

def extract_json_from_response(response_text: str) -> str:
    """
    Extract JSON content from a response that may be wrapped in markdown code blocks.
    
    Args:
        response_text (str): The raw response text from Claude
        
    Returns:
        str: Clean JSON text ready for parsing
    """
    if not response_text:
        return ""
    
    # Remove markdown code block formatting if present
    json_text = response_text.strip()
    
    # Handle ```json ... ``` blocks
    if json_text.startswith('```json') and json_text.endswith('```'):
        json_text = json_text[7:-3].strip()
    # Handle generic ``` ... ``` blocks
    elif json_text.startswith('```') and json_text.endswith('```'):
        json_text = json_text[3:-3].strip()
    
    return json_text

def is_url(text: str) -> bool:
    """Check if the text is a valid URL"""
    import re
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return url_pattern.match(text) is not None

def debug_url_characters(url: str, label: str = "URL"):
    """Debug function to show exactly what characters are in a URL"""
    if not url:
        debug_log(f"{label} is empty or None")
        return
    
    char_details = []
    for i, char in enumerate(url):
        char_code = ord(char)
        char_name = f"U+{char_code:04X}"
        if char.isprintable():
            char_details.append(f"'{char}' ({char_name})")
        else:
            import unicodedata
            try:
                char_desc = unicodedata.name(char)
                char_details.append(f"[{char_desc}] ({char_name})")
            except ValueError:
                char_details.append(f"[UNKNOWN] ({char_name})")
    
    debug_log(f"{label} character breakdown: {' '.join(char_details)}")

def clean_url(url: str) -> str:
    """
    Clean a URL by removing invisible Unicode characters and normalizing it.
    
    Args:
        url (str): The URL to clean
        
    Returns:
        str: The cleaned URL
    """
    if not url:
        return url
    
    import unicodedata
    
    # Debug the original URL
    debug_url_characters(url, "Original URL")
    
    # More aggressive cleaning - remove all non-printable characters
    # Keep only ASCII printable characters and basic Latin characters
    cleaned_url = ''.join(char for char in url if ord(char) < 127 and char.isprintable())
    
    # Also remove Unicode format characters specifically
    cleaned_url = ''.join(char for char in cleaned_url if unicodedata.category(char) not in ['Cf', 'Cc', 'Cs'])
    
    # Strip whitespace
    cleaned_url = cleaned_url.strip()
    
    # Remove any trailing slashes that might cause issues
    if cleaned_url.endswith('/') and len(cleaned_url) > 1:
        cleaned_url = cleaned_url.rstrip('/')
    
    # Debug the cleaned URL
    debug_url_characters(cleaned_url, "Cleaned URL")
    
    return cleaned_url

# Import the new logging system
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.logger import log_web_exploring, log_debug, log_success, log_error, log_warning

def debug_log(message: str, data=None):
    """Helper function for consistent debug logging - now uses centralized logger"""
    log_web_exploring(message, data)

def get_first_organic_link(company_name: str, api_key: str) -> str:
    """
    Use SerpAPI to find the first organic search result for a company.
    
    Args:
        company_name (str): Name of the company to search for
        api_key (str): SerpAPI API key
        
    Returns:
        str: The first organic search result URL, or None if not found
    """
    debug_log(f"Searching for official website using SerpAPI: {company_name}")
    
    try:
        params = {
            "engine": "google",
            "q": f"{company_name}",
            "gl": "ma",   # country code for Morocco
            "api_key": api_key,
        }

        search = GoogleSearch(params)
        results = search.get_dict()
        
        debug_log("SerpAPI search completed")
        debug_log("Search results structure", list(results.keys()) if results else "No results")

        # Ensure organic_results exist
        if "organic_results" in results and len(results["organic_results"]) > 0:
            first_result = results["organic_results"][0]
            url = first_result.get("link")
            debug_log(f"Found first organic result: {url}")
            
            # Clean the URL by removing invisible Unicode characters
            if url:
                cleaned_url = clean_url(url)
                
                if cleaned_url != url:
                    debug_log(f"Cleaned URL: '{url}' -> '{cleaned_url}'")
                
                return cleaned_url
            
            return url
        else:
            debug_log("No organic results found in SerpAPI response")
            return None

    except Exception as e:
        debug_log(f"Error in SerpAPI search: {str(e)}")
        return None

def web_explorer_agent_with_hints(company_input: str, primary_sector: str = None, address: str = None):
    """
    Creates a web explorer agent that can find the url of a company and scrape it.
    Uses user hints (sector, address) to improve company identification.
    Returns basic company data only (no analysis sections).
    """
    debug_log(f"Starting web exploration for company: {company_input}")
    debug_log(f"User hints - Sector: {primary_sector}, Address: {address}")
    
    official_url = None
    basic_response = None
    
    try:
        # find url with hints
        debug_log("Step 1: Finding official URL with user hints")
        official_url = find_official_url_with_hints(company_input, primary_sector, address)
        debug_log(f"Found official URL: {official_url}")

        # scrape website
        debug_log("Step 2: Scraping website")
        text_cleaned = scrape_website(official_url)
        debug_log("Sample of scraped text", text_cleaned)
        # print(f"[WEB_DEBUG] scraping returned: {text_cleaned}", flush=True)
        
        # parse basic company info with LLM
        debug_log("Step 3: Calling LLM for basic company info")
        basic_response = llm_call(text_cleaned, official_url, system_template, human_template)
        debug_log("LLM response received", basic_response)
        print(f"[WEB_DEBUG] LLM response: {basic_response}", flush=True)

        # postprocessing basic info
        debug_log("Step 4: Post-processing basic info")
        result = postprocess(basic_response, official_url=official_url, location_template=location_template)
        
    except Exception as e:
        debug_log(f"ERROR during web scraping or LLM processing: {str(e)}")
        debug_log("Full traceback", traceback.format_exc())
        
        # Create minimal info but preserve the URL if we found one
        debug_log("Creating minimal company info due to scraping/LLM error")
        result = create_minimal_company_info(company_input)
        
        # If we found a URL, make sure to include it
        if official_url:
            debug_log(f"Preserving found URL in minimal info: {official_url}")
            result['contact']['website'] = official_url
    
    # Always try to enhance with Bizafrix data at the end
    try:
        debug_log("Step 5: Enhancing with Bizafrix data")
        enhanced_result = enhance_with_bizafrix_data(result, company_input)
    except Exception as bizafrix_error:
        debug_log(f"ERROR in Bizafrix enhancement: {str(bizafrix_error)}")
        debug_log("Continuing without Bizafrix enhancement")
        enhanced_result = result
    
    # Combine all data (only basic info, no analysis sections)
    final_result = {
        'basic_info': enhanced_result
    }
    
    debug_log("Final result structure", final_result)
    
    # Verify data integrity
    try:
        debug_log("Step 6: Verifying data integrity")
        verify_data_integrity(final_result)
    except Exception as verify_error:
        debug_log(f"ERROR in data integrity verification: {str(verify_error)}")
    
    # Log completion
    if official_url:
        log_success(f"Web exploration completed for: {company_input} (URL: {official_url})")
    else:
        log_warning(f"Web exploration completed with limited data for: {company_input}")
    
    return final_result

def find_official_url_with_hints(company_input: str, primary_sector: str = None, address: str = None):
    """Find the official website URL for a company using SerpAPI with user hints."""
    debug_log(f"Searching for official website of: {company_input}")
    debug_log(f"Using hints - Sector: {primary_sector}, Address: {address}")
    
    # If it's already a URL, return it as is
    if is_url(company_input):
        debug_log(f"Input is already a URL: {company_input}")
        return company_input
    
    try:
        # Check if SerpAPI key is available
        if not serpapi_key:
            debug_log("ERROR: SERPAPI_API_KEY not found in environment variables")
            raise ValueError("SERPAPI_API_KEY environment variable is required")
        
        debug_log(f"Using SerpAPI with API key: {serpapi_key[:8]}...")
        
        # Build search query with hints
        search_query = company_input
        if primary_sector:
            search_query += f" {primary_sector}"
        if address:
            search_query += f" {address}"
        
        debug_log(f"Enhanced search query: {search_query}")
        
        # Use SerpAPI to find the first organic result with enhanced query
        url = get_first_organic_link(search_query, serpapi_key)
        
        if url is None:
            debug_log("ERROR: Could not find a reliable official website using SerpAPI with hints")
            # Fallback to original company name only
            debug_log("Falling back to original company name search")
            url = get_first_organic_link(company_input, serpapi_key)
        
        if url is None:
            raise ValueError("Could not find a reliable official website using SerpAPI.")
        
        # Clean the URL one more time to ensure it's properly formatted
        url = clean_url(url)
        debug_log(f"Final cleaned URL: {url}")
        
        # Filter out directory/aggregator sites
        skip_domains = [
            "zoominfo.com", "dnb.com", "linkedin.com", "societeinfo.com", 
            "companycheck.co.uk", "info-clipper.com", "tradeatlas.com", 
            "bloomberg.com", "crunchbase.com", "rocketreach.co", "owler.com", 
            "glassdoor.com", "indeed.com", "kompass.com", "europages.com", 
            "yellowpages", "corporationwiki.com", "pitchbook.com", "hoovers.com", 
            "reuters.com", "businesswire.com", "marketscreener.com", 
            "globaldatabase.com", "marocannuaire.org", "pagesjaunes.ma", 
            "annuaire-maroc.ma", "marocannonces.com", "kompass.ma", 
            "sociétésmaroc.com", "made-in-morocco.net", "lematin.ma", 
            "challenge.ma", "lnt.ma", "telquel.ma"
        ]
        
        if any(domain in url for domain in skip_domains):
            debug_log(f"Skipping aggregator site: {url}")
            # Try fallback method if the first result is an aggregator
            debug_log("First result is aggregator, trying fallback method")
            return _fallback_url_search(company_input)
        
        debug_log(f"Selected URL: {url}")
        return url
        
    except Exception as e:
        debug_log(f"Error in find_official_url_with_hints: {str(e)}")
        # Try fallback method
        debug_log("Trying fallback search method")
        try:
            return _fallback_url_search(company_input)
        except Exception as fallback_error:
            debug_log(f"Fallback search also failed: {str(fallback_error)}")
            # Return a default URL to prevent complete failure
            debug_log("Using emergency fallback URL")
            return "https://example.com"  # Emergency fallback

def web_explorer_agent(company_input: str):
    """
    Creates a web explorer agent that can find the url of a company and scrape it.
    Returns basic company data only (no analysis sections).
    Analysis sections are now handled by financial_reporting.py.
    """
    debug_log(f"Starting web exploration for company: {company_input}")
    
    official_url = None
    basic_response = None
    
    try:
        # find url
        debug_log("Step 1: Finding official URL")
        official_url = find_official_url(company_input)
        debug_log(f"Found official URL: {official_url}")

        # scrape website
        debug_log("Step 2: Scraping website")
        text_cleaned = scrape_website(official_url)
        # debug_log(f"Scraped text length: {len(text_cleaned)} characters")
        # debug_log("Sample of scraped text", text_cleaned[:500] + "..." if len(text_cleaned) > 500 else text_cleaned)
        debug_log("Sample of scraped text", text_cleaned)
        # print(f"[WEB_DEBUG] scraping returned: {text_cleaned}", flush=True)
        
        # parse basic company info with LLM
        debug_log("Step 3: Calling LLM for basic company info")
        basic_response = llm_call(text_cleaned, official_url, system_template, human_template)
        debug_log("LLM response received", basic_response)
        print(f"[WEB_DEBUG] LLM response: {basic_response}", flush=True)

        # postprocessing basic info
        debug_log("Step 4: Post-processing basic info")
        result = postprocess(basic_response, official_url=official_url, location_template=location_template)
        # debug_log("Post-processed result", result)
        
    except Exception as e:
        debug_log(f"ERROR during web scraping or LLM processing: {str(e)}")
        debug_log("Full traceback", traceback.format_exc())
        
        # Create minimal info but preserve the URL if we found one
        debug_log("Creating minimal company info due to scraping/LLM error")
        result = create_minimal_company_info(company_input)
        
        # If we found a URL, make sure to include it
        if official_url:
            debug_log(f"Preserving found URL in minimal info: {official_url}")
            result['contact']['website'] = official_url
    
    # Always try to enhance with Bizafrix data at the end
    try:
        debug_log("Step 5: Enhancing with Bizafrix data")
        enhanced_result = enhance_with_bizafrix_data(result, company_input)
    except Exception as bizafrix_error:
        debug_log(f"ERROR in Bizafrix enhancement: {str(bizafrix_error)}")
        debug_log("Continuing without Bizafrix enhancement")
        enhanced_result = result
    
    # Combine all data (only basic info, no analysis sections)
    final_result = {
        'basic_info': enhanced_result
    }
    
    debug_log("Final result structure", final_result)
    
    # Verify data integrity
    try:
        debug_log("Step 6: Verifying data integrity")
        verify_data_integrity(final_result)
    except Exception as verify_error:
        debug_log(f"ERROR in data integrity verification: {str(verify_error)}")
    
    # Log completion
    if official_url:
        log_success(f"Web exploration completed for: {company_input} (URL: {official_url})")
    else:
        log_warning(f"Web exploration completed with limited data for: {company_input}")
    
    return final_result

def verify_data_integrity(final_result):
    """Verify that all required data is present in the final result"""
    debug_log("Starting data integrity verification")
    
    required_keys = ['basic_info']
    missing_keys = [key for key in required_keys if key not in final_result]
    
    if missing_keys:
        debug_log(f"WARNING: Missing required keys: {missing_keys}")
    else:
        debug_log("All required keys present")
    
    # Check basic_info structure
    if 'basic_info' in final_result:
        basic_info = final_result['basic_info']
        basic_required = ['companyOverview', 'sectors', 'markets', 'keyPeople', 'contact']
        basic_missing = [key for key in basic_required if key not in basic_info]
        
        if basic_missing:
            debug_log(f"WARNING: Missing basic_info keys: {basic_missing}")
        else:
            debug_log("All basic_info keys present")
            
        # Check companyOverview
        if 'companyOverview' in basic_info:
            overview = basic_info['companyOverview']
            overview_required = ['companyFoundationyear', 'companyExpertise', 'primary_sector', 'legal_form', 'companyDefinition']
            overview_missing = [key for key in overview_required if key not in overview]
            
            if overview_missing:
                debug_log(f"WARNING: Missing companyOverview keys: {overview_missing}")
            else:
                debug_log("All companyOverview keys present")
    
    # Log data summary
    debug_log("Data integrity verification summary:")
    for key in required_keys:
        if key in final_result:
            value = final_result[key]
            if isinstance(value, str):
                debug_log(f"  {key}: {len(value)} characters")
            elif isinstance(value, dict):
                debug_log(f"  {key}: {len(value)} keys")
            elif isinstance(value, list):
                debug_log(f"  {key}: {len(value)} items")
            else:
                debug_log(f"  {key}: {type(value)}")
        else:
            debug_log(f"  {key}: MISSING")
    
    debug_log("Data integrity verification completed")

def find_official_url(company_input):
    """Find the official website URL for a company using SerpAPI."""
    debug_log(f"Searching for official website of: {company_input}")
    
    # If it's already a URL, return it as is
    if is_url(company_input):
        debug_log(f"Input is already a URL: {company_input}")
        return company_input
    
    try:
        # Check if SerpAPI key is available
        if not serpapi_key:
            debug_log("ERROR: SERPAPI_API_KEY not found in environment variables")
            raise ValueError("SERPAPI_API_KEY environment variable is required")
        
        debug_log(f"Using SerpAPI with API key: {serpapi_key[:8]}...")
        
        # Use SerpAPI to find the first organic result
        url = get_first_organic_link(company_input, serpapi_key)
        
        if url is None:
            debug_log("ERROR: Could not find a reliable official website using SerpAPI")
            raise ValueError("Could not find a reliable official website using SerpAPI.")
        
        # Clean the URL one more time to ensure it's properly formatted
        url = clean_url(url)
        debug_log(f"Final cleaned URL: {url}")
        
        # Filter out directory/aggregator sites
        skip_domains = [
            "zoominfo.com", "dnb.com", "linkedin.com", "societeinfo.com", 
            "companycheck.co.uk", "info-clipper.com", "tradeatlas.com", 
            "bloomberg.com", "crunchbase.com", "rocketreach.co", "owler.com", 
            "glassdoor.com", "indeed.com", "kompass.com", "europages.com", 
            "yellowpages", "corporationwiki.com", "pitchbook.com", "hoovers.com", 
            "reuters.com", "businesswire.com", "marketscreener.com", 
            "globaldatabase.com", "marocannuaire.org", "pagesjaunes.ma", 
            "annuaire-maroc.ma", "marocannonces.com", "kompass.ma", 
            "sociétésmaroc.com", "made-in-morocco.net", "lematin.ma", 
            "challenge.ma", "lnt.ma", "telquel.ma"
        ]
        
        if any(domain in url for domain in skip_domains):
            debug_log(f"Skipping aggregator site: {url}")
            # Try fallback method if the first result is an aggregator
            debug_log("First result is aggregator, trying fallback method")
            return _fallback_url_search(company_input)
        
        debug_log(f"Selected URL: {url}")
        return url
        
    except Exception as e:
        debug_log(f"Error in find_official_url: {str(e)}")
        # Try fallback method
        debug_log("Trying fallback search method")
        try:
            return _fallback_url_search(company_input)
        except Exception as fallback_error:
            debug_log(f"Fallback search also failed: {str(fallback_error)}")
            # Return a default URL to prevent complete failure
            debug_log("Using emergency fallback URL")
            return "https://example.com"  # Emergency fallback

def _fallback_url_search(company_input: str) -> str:
    """Fallback method for finding company URLs when Tavily fails."""
    debug_log(f"Using fallback URL search for: {company_input}")
    
    # Try to construct a simple URL based on company name
    # This is a basic fallback that might work for some companies
    
    # Remove common suffixes and clean company name
    clean_name = company_input.upper()
    for suffix in [' S.A.', ' SARL', ' LTD', ' LLC', ' INC', ' CORP', ' CORPORATION']:
        if clean_name.endswith(suffix):
            clean_name = clean_name[:-len(suffix)]
    
    # Remove special characters and spaces
    clean_name = clean_name.replace(' ', '').replace('-', '').replace('.', '')
    
    # Try common Moroccan domain patterns
    possible_domains = [
        f"www.{clean_name.lower()}.ma",
        f"www.{clean_name.lower()}.com",
        f"www.{clean_name.lower()}.net",
        f"{clean_name.lower()}.ma",
        f"{clean_name.lower()}.com"
    ]
    
    debug_log(f"Generated possible domains: {possible_domains}")
    
    # For now, return the first one as a placeholder
    # In a real implementation, you might want to test these URLs
    fallback_url = possible_domains[0]
    debug_log(f"Using fallback URL: {fallback_url}")
    
    return fallback_url

def scrape_website(url: str) -> str:
    debug_log(f"Starting website scraping for: {url}")
    
    try:
        # Clean the URL before using it
        cleaned_url = clean_url(url)
        if cleaned_url != url:
            debug_log(f"URL cleaned before scraping: '{url}' -> '{cleaned_url}'")
            url = cleaned_url
        
        ensure_playwright_installed()
        debug_log("Playwright installation verified")
        
        with sync_playwright() as p:
            # debug_log("Launching browser")
            browser = p.chromium.launch(headless=True)
            debug_log("Browser launched successfully")
            
            page = browser.new_page()
            debug_log("New page created")
            
            debug_log(f"Navigating to: {url}")
            # Set a timeout for navigation and wait for network to be idle
            try:
                page.goto(url, timeout=30000, wait_until="networkidle")
                debug_log("Page loaded successfully")
            except Exception as nav_error:
                debug_log(f"Navigation timeout or error, trying with domcontentloaded: {str(nav_error)}")
                # Try with a simpler wait condition
                page.goto(url, timeout=15000, wait_until="domcontentloaded")
                debug_log("Page loaded with domcontentloaded")
            
            html = page.content()
            debug_log(f"HTML content extracted: {len(html)} characters")
            
            browser.close()
            debug_log("Browser closed")
        
        debug_log("Extracting clean text from HTML")
        clean_text = extract_clean_text(html)
        debug_log(f"Clean text extracted: {len(clean_text)} characters")
        
        return clean_text
        
    except Exception as e:
        debug_log(f"Error in scrape_website: {str(e)}")
        raise

def llm_call(text_cleaned: str, official_url: str, system_template: str, human_template: str):
    debug_log("Starting LLM call for company info extraction")
    # debug_log(f"Text length: {len(text_cleaned)} characters")
    debug_log(f"Official URL: {official_url}")
    
    if not anthropic_key:
        debug_log("ERROR: ANTHROPIC_API_KEY not found in environment variables")
        return create_minimal_company_info("Company")
    
    try:
        system_content = system_template.format(url=official_url)
        human_content = human_template.format(text_cleaned=text_cleaned)
        
        
        # Create the prompt for Anthropic
        prompt = f"{system_content}\n\n{human_content}"
        # debug_log(f"Full prompt length: {len(prompt)} characters")
        
        debug_log("Calling Anthropic API...")
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000,
            temperature=0.1,
            system=system_content,
            messages=[{"role": "user", "content": human_content}]
        )
        
        debug_log("Anthropic API response received")
        # debug_log(f"Response content type: {type(response.content)}")
        # debug_log(f"Response content length: {len(response.content)}")
        
        # Parse the response to extract JSON
        response_text = response.content[0].text
        # debug_log(f"Response text length: {len(response_text)} characters")
        # debug_log("Response text sample", response_text[:500] + "..." if len(response_text) > 500 else response_text)
        
        parsed_response = _parse_web_explorer_response(response_text)
        # debug_log("Response parsed successfully", parsed_response)
        
        return parsed_response
        
    except Exception as e:
        debug_log(f"Error in LLM call: {str(e)}")
        import traceback
        debug_log("Full traceback", traceback.format_exc())
        # Return a default structure if LLM fails
        return create_minimal_company_info("Company")

def postprocess(response, official_url: str, location_template: str):
    """Post-process the web explorer response"""
    debug_log("Starting post-processing of web explorer response")
    # debug_log("Input response", response)
    debug_log(f"Official URL: {official_url}")
    
    try:
        # Update website
        debug_log("Updating contact website")
        if 'contact' not in response:
            debug_log("WARNING: 'contact' key missing from response")
            response['contact'] = {}
        
        response['contact']['website'] = official_url
        debug_log("Website updated successfully")
        
        # Handle missing legal form
        debug_log("Checking legal form")
        if 'companyOverview' not in response:
            debug_log("WARNING: 'companyOverview' key missing from response")
            response['companyOverview'] = {}
        
        if response['companyOverview'].get('legal_form') is None:
            debug_log("Setting default legal form to SARL")
            response['companyOverview']['legal_form'] = "SARL"
        else:
            debug_log(f"Legal form already set: {response['companyOverview']['legal_form']}")
        
        # Handle missing staff count
        if response['companyOverview'].get('staff_count') is None:
            debug_log("Setting default staff count to 'À préciser'")
            response['companyOverview']['staff_count'] = "À préciser"
        else:
            debug_log(f"Staff count already set: {response['companyOverview']['staff_count']}")
        
        # Clean up the address using the LLM
        debug_log("Processing address")
        if 'address' not in response['contact']:
            debug_log("WARNING: 'address' key missing from contact")
            response['contact']['address'] = "Adresse à préciser"
        
        # Only process address if it exists and is not already None/null
        if response['contact']['address'] and response['contact']['address'].strip():
            unprocessed_address = location_template.format(address=response['contact']['address'])
            debug_log(f"Address template prepared: {unprocessed_address}")
            
            try:
                debug_log("Calling LLM for address cleaning")
                address_response = client.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=500,
                    temperature=0.1,
                    messages=[{"role": "user", "content": unprocessed_address}]
                )
                
                cleaned_address = address_response.content[0].text.strip()
                debug_log(f"Address cleaned: '{response['contact']['address']}' -> '{cleaned_address}'")
                
                # Check if the cleaned address is an error message or null and set to None if so
                if (cleaned_address and 
                    not cleaned_address.startswith("I don't see") and 
                    not cleaned_address.startswith("None") and
                    cleaned_address.lower() != "null" and
                    cleaned_address.strip() != ""):
                    response['contact']['address'] = cleaned_address
                else:
                    debug_log("Address cleaning returned error message, null, or empty string, setting to None")
                    response['contact']['address'] = None
                    
            except Exception as e:
                debug_log(f"Error cleaning address: {str(e)}")
                debug_log("Setting address to None due to error")
                response['contact']['address'] = None
        else:
            debug_log("Address is empty or None, setting to None")
            response['contact']['address'] = None
        
        debug_log("Post-processing completed successfully")
        # debug_log("Final response", response)
        
        return response
        
    except Exception as e:
        debug_log(f"Error in postprocess: {str(e)}")
        import traceback
        debug_log("Full traceback", traceback.format_exc())
        return response

def _parse_web_explorer_response(response_text: str):
    """Parse the LLM response and convert it to dictionary structure"""
    debug_log("Starting to parse LLM response")
    debug_log(f"Response text length: {len(response_text)} characters")
    debug_log("Response text", response_text)
    
    try:
        # Try to extract JSON from the response
        debug_log("Looking for JSON pattern in response")
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        
        if json_match:
            json_str = json_match.group(0)
            # debug_log("JSON pattern found", json_str)
            
            try:
                # First try direct parse
                data = json.loads(json_str)
                # debug_log("JSON parsed successfully", data)
                
                # Validate the parsed data structure
                required_keys = ['companyOverview', 'sectors', 'markets', 'keyPeople', 'contact']
                missing_keys = [key for key in required_keys if key not in data]
                
                if missing_keys:
                    debug_log(f"WARNING: Missing required keys: {missing_keys}")
                else:
                    debug_log("All required keys present in parsed data")
                
                # Return the parsed data directly
                return data
                
            except json.JSONDecodeError as json_err:
                debug_log(f"JSON decode error: {json_err}")
                debug_log("Attempting to extract from markdown and retry...")
                
                # Try to extract JSON from markdown code blocks if present
                json_text = extract_json_from_response(json_str)
                if json_text != json_str:
                    try:
                        data = json.loads(json_text)
                        debug_log("JSON parsed successfully from markdown", data)
                        
                        # Validate the parsed data structure
                        required_keys = ['companyOverview', 'sectors', 'markets', 'keyPeople', 'contact']
                        missing_keys = [key for key in required_keys if key not in data]
                        
                        if missing_keys:
                            debug_log(f"WARNING: Missing required keys: {missing_keys}")
                        else:
                            debug_log("All required keys present in parsed data")
                        
                        return data
                    except json.JSONDecodeError:
                        debug_log("JSON parsing from markdown failed")
                
                debug_log("Attempting to clean and retry...")
                
                # Try to clean the JSON string
                cleaned_json = re.sub(r'[^\x20-\x7E]', '', json_str)  # Remove non-printable chars
                try:
                    data = json.loads(cleaned_json)
                    debug_log("JSON parsed successfully after cleaning", data)
                    return data
                except:
                    debug_log("JSON parsing failed even after cleaning")
                    return create_minimal_company_info("Company")
        else:
            debug_log("No JSON pattern found in response")
            debug_log("Response content analysis:")
            debug_log(f"- Contains '{{': {'{' in response_text}")
            debug_log(f"- Contains '}}': {'}' in response_text}")
            debug_log(f"- Contains 'companyOverview': {'companyOverview' in response_text}")
            
            # If no JSON found, create minimal structure
            return create_minimal_company_info("Company")
            
    except Exception as e:
        debug_log(f"Error parsing web explorer response: {str(e)}")
        import traceback
        debug_log("Full traceback", traceback.format_exc())
        return create_minimal_company_info("Company")

def ensure_playwright_installed():
    if not os.path.exists(os.path.expanduser("~/.cache/ms-playwright")):
        subprocess.run(["playwright", "install"], check=True)

def extract_clean_text(html):
    debug_log("Starting HTML text extraction")
    debug_log(f"HTML length: {len(html)} characters")
    
    try:
        soup = BeautifulSoup(html, 'html.parser')
        debug_log("BeautifulSoup parser initialized")

        # Remove scripts, styles, navs, footers, modals
        tags_to_remove = ["script", "style", "nav", "header", "iframe", "noscript", "svg"]
        debug_log(f"Removing tags: {tags_to_remove}")
        
        for tag in soup(tags_to_remove):
            tag.decompose()
        
        debug_log("Tags removed successfully")

        # Extract visible text
        text = soup.get_text(separator="\n")
        debug_log(f"Raw text extracted: {len(text)} characters")
        
        # Clean it up
        lines = [line.strip() for line in text.splitlines()]
        debug_log(f"Text split into {len(lines)} lines")
        
        text_cleaned = "\n".join(line for line in lines if line)
        debug_log(f"Final cleaned text: {len(text_cleaned)} characters")
        
        # Log sample of cleaned text
        if text_cleaned:
            sample = text_cleaned[:300] + "..." if len(text_cleaned) > 300 else text_cleaned
            debug_log("Sample of cleaned text", sample)
        else:
            debug_log("WARNING: Cleaned text is empty!")
        
        return text_cleaned
        
    except Exception as e:
        debug_log(f"Error in extract_clean_text: {str(e)}")
        import traceback
        debug_log("Full traceback", traceback.format_exc())
        return "Error extracting text from HTML"

def create_minimal_company_info(company_name: str):
    """Create minimal company info structure when web exploration fails."""
    debug_log(f"Creating minimal company info for: {company_name}")
    
    minimal_info = {
        'companyOverview': {
            'companyFoundationyear': "Non spécifié",
            'companyExpertise': "À déterminer",
            'primary_sector': "Secteur général",
            'legal_form': "SARL",
            'companyDefinition': f"Entreprise {company_name} - informations à compléter",
            'staff_count': "À préciser"
        },
        'sectors': [],
        'markets': [],
        'keyPeople': [],
        'contact': {
            'phone': "Non disponible",
            'email': "Non disponible",
            'address': "Adresse à préciser",
            'website': "Non disponible"
        }
    }
    
    debug_log("Minimal company info created", minimal_info)
    return minimal_info

def enhance_with_bizafrix_data(basic_info: dict, company_name: str, custom_bizafrix_url: str = None) -> dict:
    """
    Enhance web exploration results with Bizafrix data, particularly for legal form and company details.
    If Bizafrix fails to provide contact information, try charika.ma as a second fallback.
    
    Args:
        basic_info (dict): Basic company information from web exploration
        company_name (str): Company name for Bizafrix search
        custom_bizafrix_url (str, optional): Custom Bizafrix URL to use instead of searching
        
    Returns:
        dict: Enhanced company information
    """
    debug_log("Starting Bizafrix data enhancement")
    debug_log(f"Company name: {company_name}")
    
    # Check if company name is a placeholder - skip Bizafrix search if so (unless custom URL provided)
    placeholder_values = ['company name placeholder', 'COMPANY NAME PLACEHOLDER', 
                         'Company Name Not Extracted', 'COMPANY NAME NOT EXTRACTED']
    is_placeholder = company_name and company_name.strip() in placeholder_values
    
    if is_placeholder and not custom_bizafrix_url:
        debug_log("⚠️ Company name is a placeholder - skipping Bizafrix enhancement")
        debug_log("⚠️ User should provide Bizafrix URL in KPI review page")
        return basic_info  # Return original info without enhancement
    
    # Clean the company name before searching
    from .profile_verification import _normalize_company_name
    cleaned_company_name = _normalize_company_name(company_name)
    debug_log(f"Cleaned company name: {cleaned_company_name}")
    
    try:
        # Get Bizafrix data (only if not placeholder or if custom URL provided)
        if not is_placeholder or custom_bizafrix_url:
            bizafrix_data = get_company_info_from_bizafrix(cleaned_company_name, custom_bizafrix_url)
        else:
            debug_log("⚠️ Skipping Bizafrix lookup - company name is placeholder")
            bizafrix_data = None
        
        if not bizafrix_data or not validate_bizafrix_data(bizafrix_data):
            # Only try Charika fallback if not a placeholder (placeholders should not trigger searches)
            if not is_placeholder:
                debug_log("Bizafrix data validation failed, trying charika.ma fallback")
                return enhance_with_charika_fallback(basic_info, cleaned_company_name)
            else:
                debug_log("⚠️ Skipping Charika.ma fallback - company name is placeholder")
                return basic_info  # Return original info without enhancement
        
        debug_log("Bizafrix data validation passed, enhancing basic info")
        debug_log("Basic info structure before enhancement", basic_info)
        
        # Enhance the basic_info with Bizafrix data
        enhanced_info = basic_info.copy()
        
        # Store the Bizafrix URL for later use
        if 'bizafrix_url' in bizafrix_data:
            enhanced_info['bizafrix_url'] = bizafrix_data['bizafrix_url']
            debug_log(f"Stored Bizafrix URL: {enhanced_info['bizafrix_url']}")
        
        # Update company overview with Bizafrix data
        if 'companyOverview' not in enhanced_info:
            enhanced_info['companyOverview'] = {}
        
        overview = enhanced_info['companyOverview']
        bizafrix_overview = bizafrix_data.get('companyOverview', {})
        
        # Prioritize Bizafrix data for legal form and foundation year
        if bizafrix_overview.get('legal_form') and bizafrix_overview['legal_form'] != "SARL":
            overview['legal_form'] = bizafrix_overview['legal_form']
            debug_log(f"Updated legal form from Bizafrix: {overview['legal_form']}")
        
        if bizafrix_overview.get('companyFoundationyear') and bizafrix_overview['companyFoundationyear'] != "Non spécifié":
            overview['companyFoundationyear'] = bizafrix_overview['companyFoundationyear']
            debug_log(f"Updated foundation year from Bizafrix: {overview['companyFoundationyear']}")
        
        # Enhance company description if Bizafrix has better data
        current_definition = overview.get('companyDefinition')
        current_definition_str = current_definition.strip() if current_definition and isinstance(current_definition, str) else ''
        
        if (bizafrix_overview.get('companyDefinition') and 
            current_definition_str in ['', 'À déterminer', 'Non spécifié']):
            overview['companyDefinition'] = bizafrix_overview['companyDefinition']
            debug_log("Updated company description from Bizafrix")
        
        # Enhance staff count if Bizafrix has better data
        current_staff_count = overview.get('staff_count')
        current_staff_count_str = current_staff_count.strip() if current_staff_count and isinstance(current_staff_count, str) else ''
        
        if (bizafrix_overview.get('staff_count') and 
            current_staff_count_str in ['', 'À préciser', 'Non spécifié']):
            overview['staff_count'] = bizafrix_overview['staff_count']
            debug_log(f"Updated staff count from Bizafrix: {overview['staff_count']}")
        
        # Merge key people data
        bizafrix_people = bizafrix_data.get('keyPeople', [])
        if bizafrix_people:
            existing_people = enhanced_info.get('keyPeople', [])
            existing_names = {person.get('name', '').lower() for person in existing_people}
            
            for person in bizafrix_people:
                if person.get('name', '').lower() not in existing_names:
                    existing_people.append(person)
            
            enhanced_info['keyPeople'] = existing_people
            debug_log(f"Enhanced key people list with {len(bizafrix_people)} additional entries")
        
        # Merge sectors data
        bizafrix_sectors = bizafrix_data.get('sectors', [])
        if bizafrix_sectors:
            existing_sectors = enhanced_info.get('sectors', [])
            existing_sector_titles = {sector.get('title', '').lower() for sector in existing_sectors}
            
            for sector in bizafrix_sectors:
                if sector.get('title', '').lower() not in existing_sector_titles:
                    existing_sectors.append(sector)
            
            enhanced_info['sectors'] = existing_sectors
            debug_log(f"Enhanced sectors list with {len(bizafrix_sectors)} additional entries")
        
        # Enhance contact information if available
        bizafrix_contact = bizafrix_data.get('contact', {})
        debug_log("Bizafrix contact data", bizafrix_contact)
        
        if 'contact' not in enhanced_info:
            enhanced_info['contact'] = {}
        
        contact = enhanced_info['contact']
        debug_log("Current contact data before enhancement", contact)
        
        # Update contact info if Bizafrix has better data
        for field in ['phone', 'email', 'address']:
            current_value = contact.get(field)
            bizafrix_value = bizafrix_contact.get(field)
            
            debug_log(f"Processing field '{field}': current='{current_value}' (type: {type(current_value)}), bizafrix='{bizafrix_value}'")
            
            # Handle None values properly
            current_value_str = current_value.strip() if current_value and isinstance(current_value, str) else ''
            
            if (bizafrix_value and 
                current_value_str in ['', 'Non disponible', 'Adresse à préciser']):
                contact[field] = bizafrix_value
                debug_log(f"Updated {field} from Bizafrix: '{current_value}' -> '{bizafrix_value}'")
            else:
                debug_log(f"Skipped updating {field}: bizafrix_value={bool(bizafrix_value)}, current_value_str='{current_value_str}'")
        
        # Check if we still need more contact information after Bizafrix
        contact = enhanced_info.get('contact', {})
        missing_contact_fields = []
        for field in ['phone', 'email', 'address']:
            current_value = contact.get(field)
            current_value_str = current_value.strip() if current_value and isinstance(current_value, str) else ''
            if current_value_str in ['', 'Non disponible', 'Adresse à préciser', None]:
                missing_contact_fields.append(field)
        
        if missing_contact_fields:
            debug_log(f"Missing contact fields after Bizafrix: {missing_contact_fields}")
            debug_log("Trying charika.ma fallback for missing contact information")
            enhanced_info = enhance_with_charika_fallback(enhanced_info, company_name)
        
        debug_log("Bizafrix enhancement completed successfully")
        return enhanced_info
        
    except Exception as e:
        debug_log(f"Error in Bizafrix enhancement: {str(e)}")
        debug_log("Trying charika.ma fallback due to Bizafrix error")
        return enhance_with_charika_fallback(basic_info, company_name)

def enhance_with_charika_fallback(basic_info: dict, company_name: str) -> dict:
    """
    Enhance company information with charika.ma data as a fallback.
    
    Args:
        basic_info (dict): Basic company information from web exploration
        company_name (str): Company name for charika.ma search
        
    Returns:
        dict: Enhanced company information
    """
    debug_log("Starting charika.ma fallback enhancement")
    debug_log(f"Company name: {company_name}")
    
    try:
        # Get charika.ma data
        charika_data = get_company_info_from_charika(company_name)
        
        if not charika_data or not validate_charika_data(charika_data):
            debug_log("Charika.ma data validation failed, returning original data")
            return basic_info
        
        debug_log("Charika.ma data validation passed, enhancing contact info")
        debug_log("Basic info structure before charika enhancement", basic_info)
        
        # Enhance the basic_info with charika.ma data
        enhanced_info = basic_info.copy()
        
        # Ensure contact section exists
        if 'contact' not in enhanced_info:
            enhanced_info['contact'] = {}
        
        contact = enhanced_info['contact']
        charika_contact = charika_data.get('contact', {})
        debug_log("Charika contact data", charika_contact)
        debug_log("Current contact data before charika enhancement", contact)
        
        # Update contact info if charika.ma has better data
        for field in ['phone', 'email', 'address']:
            current_value = contact.get(field)
            charika_value = charika_contact.get(field)
            
            debug_log(f"Processing field '{field}': current='{current_value}', charika='{charika_value}'")
            
            # Handle None values properly
            current_value_str = current_value.strip() if current_value and isinstance(current_value, str) else ''
            
            if (charika_value and 
                current_value_str in ['', 'Non disponible', 'Adresse à préciser', None]):
                contact[field] = charika_value
                debug_log(f"Updated {field} from charika.ma: '{current_value}' -> '{charika_value}'")
            else:
                debug_log(f"Skipped updating {field}: charika_value={bool(charika_value)}, current_value_str='{current_value_str}'")
        
        debug_log("Charika.ma enhancement completed successfully")
        return enhanced_info
        
    except Exception as e:
        debug_log(f"Error in charika.ma enhancement: {str(e)}")
        debug_log("Returning original data due to charika.ma error")
        return basic_info

def get_company_data_with_priority_flow(company_name: str, primary_sector: str = None, address: str = None, custom_bizafrix_url: str = None) -> dict:
    """
    Get company data using the priority flow: Bizafrix -> Charika.ma -> SerpAPI web exploration.
    
    Args:
        company_name (str): Name of the company to search for
        primary_sector (str, optional): Primary sector hint for better search results
        address (str, optional): Address hint for better search results
        custom_bizafrix_url (str, optional): Custom Bizafrix URL to use instead of searching
        
    Returns:
        dict: Company information in the standard format
    """
    debug_log(f"Starting priority flow search for company: {company_name}")
    debug_log(f"User hints - Sector: {primary_sector}, Address: {address}")
    debug_log(f"Custom Bizafrix URL: {custom_bizafrix_url}")
    
    # Check if company name is a placeholder - skip Bizafrix/Charika search if so
    # Only use direct URL if provided, otherwise skip to minimal info
    placeholder_values = ['company name placeholder', 'COMPANY NAME PLACEHOLDER', 
                         'Company Name Not Extracted', 'COMPANY NAME NOT EXTRACTED']
    is_placeholder = company_name and company_name.strip() in placeholder_values
    
    if is_placeholder and not custom_bizafrix_url:
        debug_log("⚠️ Company name is a placeholder - skipping Bizafrix/Charika search")
        debug_log("⚠️ User should provide Bizafrix/Charika URL in KPI review page")
        debug_log("⚠️ Returning minimal info structure - financial data extraction will proceed")
        # Return minimal structure so financial extraction can proceed
        minimal_info = create_minimal_company_info(company_name)
        log_warning(f"Company name is placeholder - skipping search, returning minimal info for: {company_name}")
        return {'basic_info': minimal_info}
    
    # Clean the company name before searching
    from .profile_verification import _normalize_company_name
    cleaned_company_name = _normalize_company_name(company_name)
    debug_log(f"Cleaned company name: {cleaned_company_name}")
    
    # Step 1: Try Bizafrix first (only if not placeholder or if custom URL provided)
    if not is_placeholder or custom_bizafrix_url:
        debug_log("Step 1: Trying Bizafrix")
        try:
            bizafrix_data = get_company_info_from_bizafrix(cleaned_company_name, custom_bizafrix_url)
            
            if bizafrix_data and validate_bizafrix_data(bizafrix_data):
                debug_log("✅ Bizafrix data found and validated successfully")
                log_success(f"Company data retrieved from Bizafrix for: {company_name}")
                return {'basic_info': bizafrix_data}
            else:
                debug_log("❌ Bizafrix data not found or validation failed")
        except Exception as e:
            debug_log(f"❌ Error with Bizafrix: {str(e)}")
    else:
        debug_log("⚠️ Skipping Bizafrix - company name is placeholder and no custom URL provided")
    
    # Step 2: Try Charika.ma as fallback (only if not placeholder)
    if not is_placeholder:
        debug_log("Step 2: Trying Charika.ma fallback")
        try:
            charika_data = get_company_info_from_charika(cleaned_company_name)
            
            if charika_data and validate_charika_data(charika_data):
                debug_log("✅ Charika.ma data found and validated successfully")
                log_success(f"Company data retrieved from Charika.ma for: {company_name}")
                return {'basic_info': charika_data}
            else:
                debug_log("❌ Charika.ma data not found or validation failed")
        except Exception as e:
            debug_log(f"❌ Error with Charika.ma: {str(e)}")
    else:
        debug_log("⚠️ Skipping Charika.ma - company name is placeholder")
    
    # Step 3: Use SerpAPI web exploration as final fallback (only if not placeholder)
    if not is_placeholder:
        debug_log("Step 3: Using SerpAPI web exploration as final fallback")
        try:
            if primary_sector or address:
                debug_log("Using web_explorer_agent_with_hints for enhanced search")
                web_data = web_explorer_agent_with_hints(cleaned_company_name, primary_sector, address)
            else:
                debug_log("Using standard web_explorer_agent")
                web_data = web_explorer_agent(cleaned_company_name)
            
            if web_data:
                debug_log("✅ SerpAPI web exploration completed successfully")
                log_success(f"Company data retrieved via SerpAPI web exploration for: {company_name}")
                return web_data
            else:
                debug_log("❌ SerpAPI web exploration failed")
        except Exception as e:
            debug_log(f"❌ Error with SerpAPI web exploration: {str(e)}")
    else:
        debug_log("⚠️ Skipping SerpAPI web exploration - company name is placeholder")
    
    # If all methods fail, return minimal structure
    debug_log("❌ All data sources failed, returning minimal company info")
    minimal_info = create_minimal_company_info(cleaned_company_name)
    log_warning(f"All data sources failed for: {company_name}, returning minimal info")
    return {'basic_info': minimal_info}