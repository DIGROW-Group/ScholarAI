import re
from urllib.parse import urljoin, urlencode
import requests
from bs4 import BeautifulSoup
from typing import Dict, Optional
import traceback

BASE = "https://www.charika.ma"
SEARCH_URL = f"{BASE}/societe-rechercher"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

def _clean_text(s: str | None) -> str | None:
    """Clean text by removing zero-width characters and normalizing whitespace."""
    if not s:
        return None
    s = re.sub(r"[\u200B-\u200D\u2060\uFEFF]", "", s)  # remove zero-widths
    s = re.sub(r"\s+", " ", s).strip()
    return s or None

def _first_result_href_from_results_html(html: str) -> str | None:
    """Extract the first result href from search results HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # 1) Scope to the middle column if present
    container = soup.select_one("div.col-md-7.col-sm-7.middle-side") or soup

    # 2) First result card with the requested classes
    card = container.select_one(
        "div.panel.panel-default.ligne-resultat.BlocInfoJ.panel-bluex"
    )

    # Fallback: if exact card not found, look for any 'a.goto-fiche' under container
    a = None
    if card:
        a = card.select_one("a.goto-fiche")
    if not a:
        a = container.select_one("a.goto-fiche")

    if not a:
        return None

    href = a.get("href") or ""
    href = _clean_text(href)
    return href or None

def _extract_contact_from_fiche_html(html: str) -> dict:
    """Extract contact information from company fiche HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # Name (optional)
    name = None
    h1_a = soup.select_one("h1.nom.society-name a.goto-fiche")
    if h1_a:
        name = _clean_text(h1_a.get_text())

    # Email - collect all mailto links and filter out provider emails
    email = None
    mail_links = soup.select('a[href^="mailto:"]')
    for mail_a in mail_links:
        href_mail = mail_a.get("href") or ""
        extracted_email = _clean_text(href_mail.replace("mailto:", ""))
        # Skip provider emails (contact@charika.ma or any @charika.ma domain)
        if extracted_email and not extracted_email.lower().endswith("@charika.ma"):
            email = extracted_email
            break  # Use the first valid company email found

    # Phone (Tél)
    phone = None
    tel_b = soup.find("b", string=lambda s: s and "Tél" in s)
    if tel_b:
        try:
            row = tel_b.find_parent("span").find_parent("div")
            tel_span = row.select_one(".marketingInfoTelFax")
            if tel_span:
                phone = _clean_text(tel_span.get_text())
        except Exception:
            pass

    # Address
    address = None
    addr_b = soup.find("b", string=lambda s: s and "Adresse" in s)
    if addr_b:
        try:
            row = addr_b.find_parent("span").find_parent("div")
            label = row.find("label")
            if label:
                address = _clean_text(label.get_text())
        except Exception:
            pass

    # Activity (Secteur / Activité)
    activity = None
    try:
        # Look for the bold label "Activité :" then capture the inline h2 text next to it
        act_b = soup.find("b", string=lambda s: s and "Activité" in s)
        if act_b:
            # typical structure is <span><b>Activité :</b><h2 ...> text </h2></span>
            span_container = act_b.find_parent("span") or act_b.parent
            if span_container:
                h2 = span_container.find("h2")
                if not h2:
                    # fallback: next h2 after the label
                    h2 = act_b.find_next("h2")
                if h2:
                    activity = _clean_text(h2.get_text())
    except Exception:
        # be permissive - activity is optional
        pass

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "address": address,
        "activity": activity,
    }

def charika_lookup(company_name: str, timeout=30) -> dict:
    """
    Look up company information from charika.ma.
    
    Returns:
        dict: Company information with contact details
    """
    print(f"🔍 Searching charika.ma for: {company_name}")
    
    try:
        with requests.Session() as s:
            s.headers.update(HEADERS)

            # 1) Load results page with sDenomination
            params = {"sDenomination": company_name}
            r = s.get(SEARCH_URL, params=params, timeout=timeout)
            r.raise_for_status()

            href = _first_result_href_from_results_html(r.text)
            if not href:
                print(f"❌ No results found on charika.ma for: {company_name}")
                return {
                    "company_name": company_name,
                    "results_url": f"{SEARCH_URL}?{urlencode(params)}",
                    "fiche_url": None,
                    "name": None,
                    "email": None,
                    "phone": None,
                    "address": None,
                }

            fiche_url = urljoin(BASE + "/", href)
            print(f"✅ Found company page: {fiche_url}")

            # 2) Open fiche and extract contact details
            r2 = s.get(fiche_url, timeout=timeout)
            r2.raise_for_status()
            details = _extract_contact_from_fiche_html(r2.text)

            result = {
                "company_name": company_name,
                "results_url": f"{SEARCH_URL}?{urlencode(params)}",
                "fiche_url": fiche_url,
                **details,
            }
            
            print(f"✅ Charika lookup successful: {details}")
            return result
            
    except Exception as e:
        print(f"❌ Error in charika lookup: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "company_name": company_name,
            "results_url": f"{SEARCH_URL}?{urlencode(params)}",
            "fiche_url": None,
            "name": None,
            "email": None,
            "phone": None,
            "address": None,
        }

def get_company_info_from_charika(company_name: str) -> Optional[Dict]:
    """
    Get company information from charika.ma and format it for the system.
    
    Args:
        company_name (str): Name of the company to search for
        
    Returns:
        Optional[Dict]: Formatted company information or None if not found
    """
    print(f"🔍 Starting charika.ma lookup for: {company_name}")
    
    try:
        charika_data = charika_lookup(company_name)
        
        # Check if we found any useful data
        if not charika_data.get('fiche_url'):
            print(f"❌ No company found on charika.ma for: {company_name}")
            return None
        
        # Format the data to match our system structure
        formatted_data = {
            'companyOverview': {
                'companyFoundationyear': None,
                'companyExpertise': None,
                'primary_sector': charika_data.get('activity'),
                'legal_form': None,
                'companyDefinition': None,
                'staff_count': None
            },
            'sectors': [],
            'markets': [],
            'keyPeople': [],
            'contact': {
                'phone': charika_data.get('phone'),
                'email': charika_data.get('email'),
                'address': charika_data.get('address'),
                'website': None
            }
        }
        
        print(f"✅ Charika data formatted successfully for: {company_name}")
        return formatted_data
        
    except Exception as e:
        print(f"❌ Error getting charika data: {str(e)}")
        return None

def get_company_info_from_charika_url(charika_url: str) -> Optional[Dict]:
    """
    Get company information from a direct Charika URL.
    
    Args:
        charika_url (str): Direct URL to charika.ma company page
        
    Returns:
        Optional[Dict]: Formatted company information or None if extraction fails
    """
    print(f"🔍 Extracting information from Charika URL: {charika_url}")
    
    try:
        # Extract contact information from the URL
        with requests.Session() as s:
            s.headers.update(HEADERS)
            r = s.get(charika_url, timeout=30)
            r.raise_for_status()
            
            details = _extract_contact_from_fiche_html(r.text)
            
            # Format the data to match our system structure
            formatted_data = {
                'companyOverview': {
                    'companyFoundationyear': None,
                    'companyExpertise': None,
                    'primary_sector': details.get('activity'),
                    'legal_form': None,
                    'companyDefinition': None,
                    'staff_count': None
                },
                'sectors': [],
                'markets': [],
                'keyPeople': [],
                'contact': {
                    'phone': details.get('phone'),
                    'email': details.get('email'),
                    'address': details.get('address'),
                    'website': None
                },
                'charika_url': charika_url  # Store the URL for reference
            }
            
            print(f"✅ Charika URL data extracted successfully")
            return formatted_data
            
    except Exception as e:
        print(f"❌ Error extracting information from Charika URL: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None

def validate_charika_data(data: Dict) -> bool:
    """
    Validate that charika data contains useful information.
    
    Args:
        data (Dict): Company data from charika
        
    Returns:
        bool: True if data is valid and useful
    """
    if not data:
        return False
    
    contact = data.get('contact', {})
    
    # Check if we have at least one useful contact field
    useful_fields = ['phone', 'email', 'address']
    has_useful_data = any(contact.get(field) for field in useful_fields)
    
    print(f"🔍 Charika data validation: {has_useful_data}")
    if has_useful_data:
        print(f"✅ Found useful contact data: {[k for k, v in contact.items() if v]}")
    else:
        print("❌ No useful contact data found in charika response")
    
    return has_useful_data

if __name__ == "__main__":
    # Test the charika lookup
    data = charika_lookup("Cadilhac")
    for k, v in data.items():
        print(f"{k}: {v}")
