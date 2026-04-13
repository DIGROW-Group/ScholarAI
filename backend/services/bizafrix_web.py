import requests
from bs4 import BeautifulSoup
import json
import os
import subprocess
from playwright.sync_api import sync_playwright
import traceback
from typing import Dict, List, Optional, Any
import time
from anthropic import Anthropic
from config import config
import re

BASE_URL = "https://bizafrix.com"

def clean_html_tags(text: str) -> str:
    """
    Remove HTML tags from text while preserving the content.
    
    Args:
        text (str): Text that may contain HTML tags
        
    Returns:
        str: Clean text without HTML tags
    """
    if not text:
        return text
    
    # Use BeautifulSoup to remove HTML tags
    soup = BeautifulSoup(text, 'html.parser')
    return soup.get_text().strip()

# Initialize Anthropic client for LLM verification
def get_anthropic_client():
    """Get Anthropic client instance."""
    api_key = config['default'].ANTHROPIC_API_KEY
    if not api_key:
        print("⚠️ Warning: ANTHROPIC_API_KEY not configured. LLM verification will be disabled.")
        return None
    return Anthropic(api_key=api_key)

def find_best_company_match(original_query: str, search_results: List[Dict]) -> Optional[Dict]:
    """
    Find the best company match from search results using intelligent matching.
    
    Args:
        original_query (str): The original company name query
        search_results (List[Dict]): List of company search results
        
    Returns:
        Optional[Dict]: Best matching company or None
    """
    if not search_results:
        return None
    
    print(f"🔍 Analyzing {len(search_results)} search results for best match...")
    
    # Normalize the original query for comparison
    original_upper = original_query.upper().strip()
    original_words = set(original_upper.split())
    
    best_match = None
    best_score = 0
    
    for company in search_results:
        # Clean HTML tags from company name before processing
        raw_company_name = company.get('name', '')
        company_name = clean_html_tags(raw_company_name).upper().strip()
        
        # Also check shortname field which often contains highlighted search terms
        raw_shortname = company.get('shortname', '')
        shortname = clean_html_tags(raw_shortname).upper().strip()
        
        if not company_name and not shortname:
            continue
        
        # Calculate similarity score for both name and shortname, take the best one
        name_score = calculate_company_similarity(original_upper, company_name, original_words) if company_name else 0.0
        shortname_score = calculate_company_similarity(original_upper, shortname, original_words) if shortname else 0.0
        
        # Use the higher score between name and shortname
        score = max(name_score, shortname_score)
        
        print(f"🔍 Company: '{company_name}' (shortname: '{shortname}') - Score: {score}")
        
        if score > best_score:
            best_score = score
            best_match = company
    
    if best_match:
        print(f"🔍 Best match: '{best_match['name']}' with score {best_score}")
    
    # If there's only one result, be more lenient with the threshold
    if len(search_results) == 1:
        print(f"🔍 Only 1 result found, using more lenient threshold (0.3 instead of 0.6)")
        return best_match if best_score > 0.3 else None
    
    # Only return if we have a reasonable match (score > 0.6)
    return best_match if best_score > 0.6 else None

def calculate_company_similarity(original: str, company_name: str, original_words: set) -> float:
    """
    Calculate similarity score between original query and company name.
    
    Args:
        original (str): Original query (uppercase)
        company_name (str): Company name from search results (uppercase)
        original_words (set): Set of words from original query
        
    Returns:
        float: Similarity score between 0 and 1
    """
    if not company_name:
        return 0.0
    
    # Exact match gets highest score
    if original == company_name:
        return 1.0
    
    # Check for spelling variations (ASCENSSEURS -> ASCENSEURS)
    if "ASCENSSEURS" in original and "ASCENSEURS" in company_name:
        return 0.9
    
    # Check for partial matches
    company_words = set(company_name.split())
    
    # Calculate word overlap - require at least 70% of words to match
    common_words = original_words.intersection(company_words)
    if common_words:
        word_overlap_score = len(common_words) / max(len(original_words), len(company_words))
        if word_overlap_score < 0.7:
            return 0.0
    else:
        word_overlap_score = 0.0
    
    # Check for substring matches
    substring_score = 0.0
    if original in company_name:
        substring_score = 0.8
    elif company_name in original:
        substring_score = 0.8
    else:
        if len(common_words) >= len(original_words) * 0.7:
            substring_score = 0.6
    
    # Check for key word matches
    key_word_score = 0.0
    if "ENNASR" in original and "ENNASR" in company_name:
        key_word_score = 0.6
    
    # Combine scores with weights
    final_score = (word_overlap_score * 0.5 + 
                   substring_score * 0.4 + 
                   key_word_score * 0.1)
    
    return final_score if final_score >= 0.6 else 0.0

def get_bizafrix_company_info(query: str) -> Dict[str, str]:
    """
    Search Bizafrix for a company and return its name + URL.
    
    Args:
        query (str): Company name to search for
        
    Returns:
        Dict[str, str]: Dictionary with 'company_url' and 'name' keys
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    search_url = f"{BASE_URL}/ma/search/companies"

    print(f"🔍 DEBUG: Starting Bizafrix search for query: '{query}'")

    try:
        resp = requests.get(search_url, params={"query": query}, headers=headers, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract JSON inside <div id="app" data-page="...">
        app_div = soup.select_one("div#app")
        
        if app_div:
            data_page_attr = app_div.get("data-page")
        
        data_page = json.loads(app_div["data-page"]) if app_div else {}
        companies_data = data_page.get("props", {}).get("companies", {}).get("data", {})
        
        # Handle the structure where companies are stored as {"0": {...}, "1": {...}}
        companies = []
        if isinstance(companies_data, dict):
            # Convert numeric key dict to list
            for key in sorted(companies_data.keys(), key=lambda x: int(x) if x.isdigit() else 0):
                company = companies_data[key]
                if isinstance(company, dict) and company.get('name'):
                    companies.append(company)
        elif isinstance(companies_data, list):
            # If it's already a list, use it directly
            companies = companies_data
        
        print(f"🔍 DEBUG: Companies found: {len(companies)}")
        
        if companies:
            print(f"🔍 DEBUG: All company names found:")
            for i, company in enumerate(companies):
                company_name = clean_html_tags(company.get('name', 'No name'))
                print(f"   {i+1}. {company_name} (slug: {company.get('slug', 'No slug')})")

        if not companies:
            print(f"❌ No companies found in Bizafrix search for: {query}")
            return {}

        # Find the best match using similarity scoring
        print(f"🔍 DEBUG: Found {len(companies)} companies, looking for best match...")
        best_match = find_best_company_match(query, companies)
        
        if best_match:
            company_url = f"{BASE_URL}/ma/company/{best_match.get('slug')}"
            print(f"✅ Bizafrix company found: {best_match.get('name')} - {company_url}")
            
            return {
                "company_url": company_url,
                "name": best_match.get("name")
            }
        else:
            print(f"❌ No suitable company match found for: {query}")
            return {}
    except Exception as e:
        print(f"❌ Error in get_bizafrix_company_info: {e}")
        print(traceback.format_exc())
        return {}

def ensure_playwright_installed():
    """Ensure Playwright browsers are installed."""
    if not os.path.exists(os.path.expanduser("~/.cache/ms-playwright")):
        print("Installing Playwright browsers...")
        subprocess.run(["playwright", "install"], check=True)

def get_bizafrix_company_details(url: str) -> Dict[str, Any]:
    """
    Extract detailed company information from Bizafrix company page.
    
    Args:
        url (str): Bizafrix company URL
        
    Returns:
        Dict[str, Any]: Dictionary containing extracted company details
    """
    try:
        ensure_playwright_installed()
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            print(f"🌐 Loading Bizafrix page: {url}")
            page.goto(url, timeout=60000)

            # Wait for the dynamic content to load
            page.wait_for_selector("#company-legal", timeout=20000)

            html = page.content()
            browser.close()

        # Parse with BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        details = {}
        
        # === Company name extraction
        company_name = None
        print("🏢 Extracting company name...")
        # Try common selectors for company name on Bizafrix pages
        name_selectors = [
            "h1.company-name",
            "h1",
            ".company-header h1",
            "#company-header h1",
            "header h1"
        ]
        for selector in name_selectors:
            name_elem = soup.select_one(selector)
            if name_elem:
                company_name = clean_html_tags(name_elem.get_text(strip=True))
                if company_name and len(company_name) > 0:
                    print(f"   Company name found: {company_name}")
                    break
        
        if not company_name:
            print("   ⚠️ Company name not found, will use fallback")
        
        # === Legal info extraction
        print("📋 Extracting legal information...")
        for row in soup.select("#company-legal table.bx-horizontal-table tr"):
            label = row.select_one("th.label")
            value = row.select_one("td.value")
            if label and value:
                key = label.get_text(strip=True)
                val = value.get_text(strip=True)
                details[key] = val
                print(f"   {key}: {val}")

        # === Staff/Key People extraction
        print("👥 Extracting staff information...")
        staff = []
        for p in soup.select("#company-employees p.category__employee"):
            staff_text = p.get_text(" ", strip=True)
            staff.append(staff_text)
            print(f"   Staff: {staff_text}")

        # === Company description/expertise - THIS IS THE KEY PART FOR PRIMARY SECTOR
        print("📝 Extracting company description...")
        # Try info__description first (concise sector info)
        description_elem = soup.select_one(".info__description")
        if not description_elem:
            # Fallback to company-description if info__description not found
            description_elem = soup.select_one("#company-description")
        company_description = description_elem.get_text(strip=True) if description_elem else None
        
        if company_description:
            print(f"   Company description found: {company_description}")
        
        # === Company sectors/activities
        sectors = []
        sectors_section = soup.select_one("#company-activities")
        if sectors_section:
            for activity in sectors_section.select(".activity-item"):
                sector_title = activity.get_text(strip=True)
                if sector_title:
                    sectors.append({
                        "title": sector_title,
                        "description": f"Activité principale: {sector_title}"
                    })
        
        # === Contact information
        contact_info = {}
        
        # Look for contact information in the contact widget
        contact_section = soup.select_one("#company-contact-widget")
        if contact_section:
            # Extract address from company-address div
            address_elem = contact_section.select_one("#company-address")
            if address_elem:
                address_text = address_elem.get_text(strip=True)
                # Remove the flag icon text and clean up
                import re
                address_text = re.sub(r'🇲🇦\s*', '', address_text)  # Remove flag emoji
                address_text = re.sub(r'\s+', ' ', address_text)  # Normalize spaces
                address_text = address_text.strip()
                contact_info["address"] = address_text
            
            # Extract website from the website link
            website_elem = contact_section.select_one("#company-website")
            if website_elem:
                website_url = website_elem.get("href", "")
                if website_url:
                    contact_info["website"] = website_url
            
            # Extract phone information
            phones_elem = contact_section.select_one("#company-phones")
            if phones_elem:
                phone_attr = phones_elem.get("data-phones") or phones_elem.get("data-phone")
                if phone_attr:
                    contact_info["phone"] = phone_attr

        result = {
            "company_name": company_name,  # Extracted company name from page
            "date_de_creation": details.get("Date de création"),
            "forme_juridique": details.get("Forme juridique"),
            "staff": staff,
            "company_description": company_description,  # This is crucial for primary sector
            "sectors": sectors,
            "contact_info": contact_info,
            "staff_count": details.get("Effectif")
        }
        
        print("✅ Bizafrix data extraction completed")
        return result

    except Exception as e:
        print(f"❌ Error in get_bizafrix_company_details: {e}")
        print(traceback.format_exc())
        return {}

def bizafrix_to_web_explorer_format(bizafrix_data: Dict[str, Any], company_name: str, website_url: str) -> Dict[str, Any]:
    """
    Convert Bizafrix extracted data to web explorer format.
    
    Args:
        bizafrix_data (Dict[str, Any]): Raw data from Bizafrix
        company_name (str): Company name
        website_url (str): Official website URL
        
    Returns:
        Dict[str, Any]: Data formatted according to WebExplorerOutput structure
    """
    try:
        print("🔄 Converting Bizafrix data to web explorer format...")
        
        # Extract legal form with validation
        legal_form = bizafrix_data.get("forme_juridique")
        if not legal_form or legal_form.strip() == "":
            legal_form = "SARL"  # Default for Moroccan companies
        print(f"   Legal form: {legal_form}")
        
        # Extract foundation year
        foundation_year = bizafrix_data.get("date_de_creation")
        if foundation_year:
            # Try to extract just the year if it's in a longer format
            import re
            year_match = re.search(r'\b(19|20)\d{2}\b', foundation_year)
            if year_match:
                foundation_year = year_match.group(0)
            else:
                if foundation_year.isdigit() and len(foundation_year) == 4:
                    foundation_year = foundation_year
                else:
                    number_match = re.search(r'\b\d{4}\b', foundation_year)
                    if number_match:
                        foundation_year = number_match.group(0)
                    else:
                        print(f"   ⚠️ Could not extract year from: {foundation_year}")
                        foundation_year = "Non spécifié"
        else:
            foundation_year = "Non spécifié"
        print(f"   Foundation year: {foundation_year}")
        
        # === PRIMARY SECTOR EXTRACTION - USE RAW COMPANY DESCRIPTION ===
        primary_sector = "Secteur général"  # Default fallback
        
        # FIRST PRIORITY: Use the raw company description text as primary sector
        company_description = bizafrix_data.get("company_description", "")
        if company_description and company_description.strip():
            primary_sector = company_description.strip()
            print(f"   ✅ Using company description as primary sector: '{primary_sector}'")
        else:
            print(f"   ⚠️ No company description found, keeping default sector")
        
        # SECOND PRIORITY: Use sectors from activities section if description extraction failed
        if primary_sector == "Secteur général" and bizafrix_data.get("sectors"):
            primary_sector = bizafrix_data["sectors"][0].get("title", "Secteur général")
            print(f"   ✅ Using first sector from activities: {primary_sector}")
        
        # THIRD PRIORITY: Extract from company name if still no sector found
        if primary_sector == "Secteur général":
            sector_keywords = [
                "emballage", "conditionnement", "pharmaceutique", "cosmétique",
                "construction", "bâtiment", "immobilier", "transport", "logistique",
                "informatique", "technologie", "électronique", "mécanique",
                "alimentaire", "agriculture", "textile", "métallurgie", "banque",
                "assurance", "télécom", "énergie", "pétrole", "mines"
            ]
            
            for keyword in sector_keywords:
                if keyword.lower() in company_name.lower():
                    primary_sector = keyword.capitalize()
                    print(f"   ✅ Primary sector extracted from company name: {primary_sector}")
                    break
        
        company_overview = {
            "companyFoundationyear": foundation_year,
            "companyExpertise": bizafrix_data.get("company_description", "Expertise à déterminer"),
            "primary_sector": primary_sector,
            "legal_form": legal_form,
            "companyDefinition": bizafrix_data.get("company_description", f"Entreprise {company_name}"),
            "staff_count": bizafrix_data.get("staff_count", "À préciser")
        }
        
        # Convert staff to key people format
        key_people = []
        for staff_member in bizafrix_data.get("staff", []):
            if staff_member.strip():
                # Try to extract name and position
                parts = staff_member.split("-", 1)
                if len(parts) >= 2:
                    name_part = parts[0].strip()
                    position_part = parts[1].strip()
                else:
                    name_part = staff_member.strip()
                    position_part = "Dirigeant"
                
                # Extract initials
                initials = " ".join([name[0].upper() for name in name_part.split() if name])
                
                key_people.append({
                    "initials": initials,
                    "name": name_part,
                    "position": position_part
                })
        
        # Convert sectors
        sectors = []
        for sector in bizafrix_data.get("sectors", []):
            sectors.append({
                "title": sector.get("title", "Secteur"),
                "description": sector.get("description", "Description du secteur")
            })
        
        # Add some default sectors if none found
        if not sectors:
            sectors = [
                {"title": "Commerce", "description": "Activité commerciale"},
                {"title": "Services", "description": "Prestation de services"}
            ]
        
        # Create markets (derived from sectors or default)
        markets = [
            {"title": "Marché local", "description": "Marché national marocain"},
            {"title": "Marché régional", "description": "Marché d'Afrique du Nord"}
        ]
        
        # Create contact information
        contact_info = bizafrix_data.get("contact_info", {})
        contact = {
            "phone": contact_info.get("phone", "Non disponible"),
            "email": contact_info.get("email", "Non disponible"),
            "address": contact_info.get("address", "Adresse à préciser"),
            "website": contact_info.get("website", website_url)  # Use Bizafrix website if available
        }
        
        result = {
            "companyOverview": company_overview,
            "sectors": sectors,
            "markets": markets,
            "keyPeople": key_people,
            "contact": contact
        }
        
        print("✅ Data conversion completed successfully")
        return result
        
    except Exception as e:
        print(f"❌ Error converting Bizafrix data: {e}")
        print(traceback.format_exc())
        # Return minimal structure if conversion fails
        return create_minimal_company_info(company_name)

def create_minimal_company_info(company_name: str) -> Dict[str, Any]:
    """Create minimal company info structure when Bizafrix extraction fails."""
    print(f"📝 Creating minimal company info for: {company_name}")
    
    return {
        'companyOverview': {
            'companyFoundationyear': "Non spécifié",
            'companyExpertise': "À déterminer",
            'primary_sector': "Secteur général",
            'legal_form': "SARL",
            'companyDefinition': f"Entreprise {company_name} - informations à compléter",
            'staff_count': "À préciser"
        },
        'sectors': [
            {"title": "Commerce", "description": "Activité commerciale"},
            {"title": "Services", "description": "Prestation de services"}
        ],
        'markets': [
            {"title": "Marché local", "description": "Marché national marocain"},
            {"title": "Marché régional", "description": "Marché d'Afrique du Nord"}
        ],
        'keyPeople': [],
        'contact': {
            'phone': "Non disponible",
            'email': "Non disponible",
            'address': "Adresse à préciser",
            'website': "Non disponible"
        }
    }

def get_company_info_from_bizafrix(company_name: str, custom_bizafrix_url: str = None) -> Dict[str, Any]:
    """
    Main function to get company information from Bizafrix.
    
    Args:
        company_name (str): Name of the company to search for
        custom_bizafrix_url (str): Optional custom Bizafrix URL to use instead of searching
        
    Returns:
        Dict[str, Any]: Company information in web explorer format with bizafrix_url included
    """
    # When a custom URL is provided, skip all search/matching and extract everything from the page
    if custom_bizafrix_url:
        print(f"🔗 CUSTOM URL PROVIDED - SKIPPING ALL SEARCH AND COMPANY NAME MATCHING")
        print(f"🔗 Using direct URL: {custom_bizafrix_url}")
        print(f"🔗 Ignoring company_name parameter ('{company_name}') - will extract from page instead")
    else:
        print(f"🔍 Starting Bizafrix search for: {company_name}")
    
    try:
        if custom_bizafrix_url:
            # When a direct URL is provided, we skip ALL search/matching
            # Extract everything directly from the page, including company name
            company_url = custom_bizafrix_url
            print(f"🔗 DIRECT SCRAPING MODE - NO SEARCH OR MATCHING")
        else:
            print(f"🔍 NO CUSTOM URL - SEARCHING FOR COMPANY")
            # Step 1: Search for the company on Bizafrix
            company_info = get_bizafrix_company_info(company_name)
            
            if not company_info:
                print(f"❌ No company found on Bizafrix for: {company_name}")
                return None
            
            # Step 2: Get the company URL from search results
            company_url = company_info["company_url"]
            company_display_name = company_info["name"]
        
        # Get detailed information from the company page
        print(f"🔗 About to scrape company details from URL: {company_url}")
        bizafrix_data = get_bizafrix_company_details(company_url)
        
        if not bizafrix_data:
            print(f"❌ Could not extract detailed data from Bizafrix for: {company_url}")
            return None
        
        # Extract or update company name from the page
        if custom_bizafrix_url:
            # For custom URLs, ALWAYS extract company name from page (this is the authoritative source)
            # Do NOT use the company_name parameter when URL is provided
            company_display_name = bizafrix_data.get("company_name")
            
            if not company_display_name:
                # Fallback: try to extract from URL slug if page extraction failed
                print(f"⚠️ Company name not found in page, trying URL slug fallback...")
                try:
                    url_parts = company_url.rstrip('/').split('/')
                    if 'company' in url_parts:
                        company_index = url_parts.index('company')
                        if company_index + 1 < len(url_parts):
                            url_slug = url_parts[company_index + 1]
                            company_display_name = url_slug.replace('-', ' ').title()
                            print(f"   Using company name from URL slug: {company_display_name}")
                except Exception as e:
                    print(f"   ⚠️ Could not extract from URL slug: {e}")
            
            if not company_display_name:
                raise Exception(f"Could not extract company name from Bizafrix URL page: {company_url}")
            
            print(f"✅ Using company name extracted from Bizafrix page: '{company_display_name}'")
            print(f"   (Ignored placeholder company_name parameter: '{company_name}')")
        else:
            # For search results, update company name if extracted from page is different/better
            if bizafrix_data.get("company_name"):
                extracted_name = bizafrix_data.get("company_name")
                if extracted_name and extracted_name != company_display_name:
                    print(f"📝 Updating company name from page: '{company_display_name}' -> '{extracted_name}'")
                    company_display_name = extracted_name
        
        # Step 3 (for custom URL) or Step 4 (for search): Convert to web explorer format
        result = bizafrix_to_web_explorer_format(bizafrix_data, company_display_name, company_url)
        
        # Step 5: Add the Bizafrix URL to the result for storage
        result['bizafrix_url'] = company_url
        
        print(f"✅ Successfully extracted Bizafrix data for: {company_name}")
        return result
        
    except Exception as e:
        print(f"❌ Error in get_company_info_from_bizafrix: {e}")
        print(traceback.format_exc())
        return None

def validate_bizafrix_data(data: Dict[str, Any]) -> bool:
    """
    Validate that Bizafrix data contains essential information.
    
    Args:
        data (Dict[str, Any]): Data to validate
        
    Returns:
        bool: True if data is valid, False otherwise
    """
    try:
        # Check for essential fields
        if not data:
            print("❌ Data is empty")
            return False
            
        if 'companyOverview' not in data:
            print("❌ Missing companyOverview")
            return False
            
        overview = data['companyOverview']
        if 'legal_form' not in overview or not overview['legal_form']:
            print("❌ Missing legal form")
            return False
            
        print("✅ Bizafrix data validation passed")
        return True
        
    except Exception as e:
        print(f"❌ Error in data validation: {e}")
        return False


