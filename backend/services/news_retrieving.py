import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv
from langchain_tavily import TavilySearch
import requests
import anthropic
from urllib.parse import urlencode, urlparse
from bs4 import BeautifulSoup
import time
import json
from playwright.sync_api import sync_playwright
from serpapi import GoogleSearch

# Import the new logging system
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.logger import log_news, log_success, log_error, log_warning, log_debug

load_dotenv()

# Load API keys from environment
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
BASE_URL = "https://www.leconomiste.com"

# Global session storage
_leconomiste_session = {
    'cookies': None,
    'last_login': None,
    'session_valid': False,
    'playwright_state': None
}

def login_to_leconomiste_playwright(username: str, password: str) -> bool:
    """
    Login to leconomiste.com using Playwright to handle bot protection.
    This method can solve reCAPTCHA, handle Cloudflare challenges, and bypass honeypot protection.
    """
    print(f"🔐 Attempting Playwright login to leconomiste.com with username: {username}", flush=True)
    
    try:
        with sync_playwright() as p:
            # Launch browser with realistic settings
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            )
            
            # Create context with realistic user agent and viewport
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080},
                locale='fr-FR',
                timezone_id='Europe/Paris'
            )
            
            # Create page
            page = context.new_page()
            
            # Navigate to login page with increased timeout
            login_url = f"{BASE_URL}/se-connecter/"
            print(f"🔐 Navigating to: {login_url}", flush=True)
            
            page.goto(login_url, wait_until="networkidle", timeout=60000)
            
            # Wait for the form to be ready with multiple strategies
            print("🔐 Waiting for login form to load...", flush=True)
            
            # Try multiple form selectors with increased timeout
            form_selectors = [
                'form[method="post"]',
                'form',
                'form[action*="se-connecter"]',
                'form[action*="login"]',
                '.um-form',
                '#um-login-form'
            ]
            
            form_found = False
            for selector in form_selectors:
                try:
                    page.wait_for_selector(selector, timeout=15000)
                    print(f"✅ Found form with selector: {selector}", flush=True)
                    form_found = True
                    break
                except:
                    print(f"⚠️ Form selector '{selector}' not found, trying next...", flush=True)
                    continue
            
            if not form_found:
                print("❌ No login form found with any selector", flush=True)
                browser.close()
                return False
            
            # Fill in the username field with multiple strategies
            print("🔐 Filling username...", flush=True)
            username_selectors = [
                'input[name*="username"]',
                'input[name="username-48603"]',
                'input[type="text"]',
                'input[placeholder*="nom"]',
                'input[placeholder*="email"]',
                'input[id*="username"]',
                'input[id*="user"]'
            ]
            
            username_filled = False
            for selector in username_selectors:
                try:
                    page.wait_for_selector(selector, timeout=10000)
                    page.fill(selector, username)
                    print(f"✅ Username filled with selector: {selector}", flush=True)
                    username_filled = True
                    break
                except:
                    print(f"⚠️ Username selector '{selector}' not found, trying next...", flush=True)
                    continue
            
            if not username_filled:
                print("❌ Could not fill username field", flush=True)
                browser.close()
                return False
            
            # Fill in the password field with multiple strategies
            print("🔐 Filling password...", flush=True)
            password_selectors = [
                'input[name*="password"]',
                'input[name="user_password-48603"]',
                'input[type="password"]',
                'input[placeholder*="mot"]',
                'input[id*="password"]',
                'input[id*="pass"]'
            ]
            
            password_filled = False
            for selector in password_selectors:
                try:
                    page.wait_for_selector(selector, timeout=10000)
                    page.fill(selector, password)
                    print(f"✅ Password filled with selector: {selector}", flush=True)
                    password_filled = True
                    break
                except:
                    print(f"⚠️ Password selector '{selector}' not found, trying next...", flush=True)
                    continue
            
            if not password_filled:
                print("❌ Could not fill password field", flush=True)
                browser.close()
                return False
            
            # Check remember me if present
            try:
                remember_selectors = [
                    'input[name="rememberme"]',
                    'input[type="checkbox"]',
                    'input[id*="remember"]'
                ]
                
                remember_checked = False
                for selector in remember_selectors:
                    try:
                        if page.locator(selector).count() > 0:
                            page.check(selector)
                            print(f"✅ Remember me checked with selector: {selector}", flush=True)
                            remember_checked = True
                            break
                    except:
                        continue
                
                if not remember_checked:
                    print("🔐 Remember me checkbox not found or not clickable", flush=True)
            except:
                print("🔐 Remember me checkbox not found or not clickable", flush=True)
            
            # Wait a bit for any dynamic content to load (reCAPTCHA, etc.)
            print("🔐 Waiting for dynamic content to load...", flush=True)
            page.wait_for_timeout(5000)  # Increased timeout for dynamic content
            
            # Check if there are any dynamic form fields that need to be filled
            try:
                # Look for any additional form fields that might have loaded
                additional_inputs = page.query_selector_all('input[type="hidden"]')
                print(f"🔍 Found {len(additional_inputs)} hidden inputs after waiting", flush=True)
                
                # Check for any CSRF tokens or nonce fields
                for input_elem in additional_inputs:
                    name = input_elem.get_attribute('name')
                    if name and ('nonce' in name.lower() or 'csrf' in name.lower() or 'token' in name.lower()):
                        value = input_elem.get_attribute('value')
                        print(f"🔍 Found CSRF/nonce field: {name} = {value[:50] if value else 'None'}...", flush=True)
            except Exception as e:
                print(f"⚠️ Error checking for additional form fields: {e}", flush=True)
            
            # Submit the form with multiple strategies
            print("🔐 Submitting login form...", flush=True)
            submit_selectors = [
                'input[type="submit"]',
                'button[type="submit"]',
                '.um-button',
                'button[class*="submit"]',
                'input[value*="connecter"]',
                'button[class*="login"]',
                'input[class*="submit"]'
            ]
            
            form_submitted = False
            for selector in submit_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.click(selector)
                        print(f"✅ Form submitted with selector: {selector}", flush=True)
                        form_submitted = True
                        break
                except:
                    print(f"⚠️ Submit selector '{selector}' not clickable, trying next...", flush=True)
                    continue
            
            if not form_submitted:
                print("❌ Could not submit form with any selector", flush=True)
                browser.close()
                return False
            
            # Wait for navigation or response with increased timeout
            print("🔐 Waiting for login response...", flush=True)
            try:
                # Wait for either success (redirect away from login page) or error message
                page.wait_for_load_state("networkidle", timeout=30000)
            except:
                print("🔐 Timeout waiting for response, checking current state", flush=True)
            
            # Check if login was successful
            current_url = page.url
            print(f"🔐 Current URL after login: {current_url}", flush=True)
            
            # Debug: Take a screenshot for troubleshooting
            try:
                screenshot_path = f"/tmp/leconomiste_login_debug_{int(time.time())}.png"
                page.screenshot(path=screenshot_path)
                print(f"🔍 Debug screenshot saved to: {screenshot_path}", flush=True)
            except:
                print("⚠️ Could not save debug screenshot", flush=True)
            
            # Debug: Check page title and content
            try:
                page_title = page.title()
                print(f"🔍 Page title: {page_title}", flush=True)
            except:
                print("⚠️ Could not get page title", flush=True)
            
            # Check for success indicators - more lenient approach
            success_indicators = [
                "dashboard" in current_url.lower(),
                "profile" in current_url.lower(),
                "account" in current_url.lower(),
                "mon-compte" in current_url.lower(),
                not "se-connecter" in current_url,
                current_url == "https://www.leconomiste.com/"  # Redirect to homepage is also success
            ]
            
            print(f"🔍 Success indicators: {success_indicators}", flush=True)
            
            # Check for error messages with more comprehensive selectors
            error_found = False
            try:
                # Look for error messages with multiple strategies
                error_selectors = [
                    '.um-notice',
                    '.um-error',
                    '.um-alert',
                    '.wfwaf-',
                    '[class*="error"]',
                    '[class*="alert"]',
                    '.alert-danger',
                    '.error-message',
                    '.login-error',
                    '[role="alert"]',
                    '.notice-error',
                    '.wpcf7-validation-errors'
                ]
                
                for selector in error_selectors:
                    try:
                        if page.locator(selector).count() > 0:
                            error_text = page.locator(selector).first.text_content()
                            if error_text and len(error_text.strip()) > 0:
                                print(f"❌ Error message found with '{selector}': {error_text.strip()}", flush=True)
                                error_found = True
                                break
                    except:
                        continue
                
                # Also check for error text in the page content
                if not error_found:
                    page_content = page.content()
                    error_keywords = [
                        "erreur", "error", "invalid", "incorrect", "failed", "échec",
                        "champs contiennent une erreur", "fields contain an error",
                        "nom d'utilisateur", "mot de passe", "username", "password"
                    ]
                    
                    for keyword in error_keywords:
                        if keyword.lower() in page_content.lower():
                            print(f"🔍 Found error keyword '{keyword}' in page content", flush=True)
                            # Extract surrounding text for context
                            import re
                            pattern = re.compile(f'.{{0,50}}{re.escape(keyword)}.{{0,50}}', re.IGNORECASE)
                            matches = pattern.findall(page_content)
                            if matches:
                                print(f"🔍 Error context: {matches[0].strip()}", flush=True)
                            break
                            
            except Exception as e:
                print(f"⚠️ Error checking for error messages: {e}", flush=True)
            
            # Check if we're still on the login page
            if "se-connecter" in current_url and not any(success_indicators):
                print("❌ Still on login page - login failed", flush=True)
                browser.close()
                return False
            
            # Additional check: if we have essential cookies, consider it a success even if URL check fails
            if not any(success_indicators):
                print("⚠️ URL-based success check failed, but will check cookies...", flush=True)
            
            if error_found:
                print("❌ Error messages detected - login failed", flush=True)
                browser.close()
                return False
            
            # Get cookies from the browser context
            cookies = context.cookies()
            print(f"🔐 Retrieved {len(cookies)} cookies from browser", flush=True)
            
            # Convert Playwright cookies to requests format
            session_cookies = {}
            for cookie in cookies:
                session_cookies[cookie['name']] = cookie['value']
                # print(f"🔍 Cookie: {cookie['name']} = {cookie['value'][:50]}...", flush=True)
            
            # Check for essential WordPress cookies
            essential_cookies = ['wordpress_logged_in_', 'wfwaf-authcookie-', 'cf_clearance']
            found_essential = [name for name in session_cookies.keys() if any(essential in name for essential in essential_cookies)]
            
            if not found_essential:
                print("❌ No essential WordPress cookies found", flush=True)
                browser.close()
                return False
            
            print(f"✅ Found essential cookies: {found_essential}", flush=True)
            
            # Store the session
            _leconomiste_session['cookies'] = session_cookies
            _leconomiste_session['last_login'] = datetime.now()
            _leconomiste_session['session_valid'] = True
            
            # Store Playwright state for potential reuse
            try:
                state = context.storage_state()
                _leconomiste_session['playwright_state'] = state
                print("✅ Playwright state saved for potential reuse", flush=True)
            except:
                print("⚠️ Could not save Playwright state", flush=True)
            
            browser.close()
            
            print(f"✅ Playwright login successful! Session cookies stored: {len(session_cookies)} cookies", flush=True)
            return True
            
    except Exception as e:
        print(f"❌ Error during Playwright login: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return False

def login_to_leconomiste_alternative(username: str, password: str) -> bool:
    """
    Alternative login method using a different approach.
    This method tries to handle different form structures or security measures.
    """
    print(f"🔐 Attempting alternative login to leconomiste.com with username: {username}", flush=True)
    
    try:
        # Create a session to maintain cookies
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })
        
        # First, get the main page to establish session
        main_url = f"{BASE_URL}/"
        print(f"🔐 Fetching main page: {main_url}", flush=True)
        
        response = session.get(main_url, timeout=30)
        response.raise_for_status()
        
        # Now get the login page
        login_url = f"{BASE_URL}/se-connecter/"
        print(f"🔐 Fetching login page: {login_url}", flush=True)
        
        response = session.get(login_url, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Find the login form - try different selectors
        form = soup.find("form", {"method": "post"})
        if not form:
            # Try alternative selectors
            form = soup.find("form", {"action": lambda x: x and "se-connecter" in x})
            if not form:
                form = soup.find("form", {"id": lambda x: x and "login" in x.lower()})
        
        if not form:
            print("❌ Login form not found with alternative method", flush=True)
            return False
        
        # Get form action URL
        form_action = form.get("action", "")
        if form_action:
            if form_action.startswith("/"):
                submit_url = f"{BASE_URL}{form_action}"
            elif form_action.startswith("http"):
                submit_url = form_action
            else:
                submit_url = f"{BASE_URL}/{form_action}"
        else:
            submit_url = login_url
        
        print(f"🔐 Alternative form action URL: {submit_url}", flush=True)
        
        # Extract form data more comprehensively
        form_data = {}
        
        # Get all inputs including text, password, hidden, etc.
        for input_field in form.find_all("input"):
            name = input_field.get("name")
            input_type = input_field.get("type", "text")
            value = input_field.get("value", "")
            
            if name:
                if input_type == "hidden":
                    form_data[name] = value
                elif "username" in name.lower() or "email" in name.lower():
                    form_data[name] = username
                elif "password" in name.lower():
                    form_data[name] = password
                elif "remember" in name.lower():
                    form_data[name] = "1"
                elif "honeypot" in name.lower() or "maspik" in name.lower():
                    form_data[name] = ""  # Honeypot should be empty
        
        # Ensure we have the specific fields
        form_data["username-48603"] = username
        form_data["user_password-48603"] = password
        form_data["full-name-maspik-hp"] = ""
        form_data["rememberme"] = "1"
        
        print(f"🔐 Alternative form data: {len(form_data)} fields", flush=True)
        print(f"🔍 Form data keys: {list(form_data.keys())}", flush=True)
        
        # Update headers for POST request
        session.headers.update({
            "Referer": login_url,
            "Origin": BASE_URL,
            "Content-Type": "application/x-www-form-urlencoded",
        })
        
        # Submit the login form
        login_response = session.post(submit_url, data=form_data, timeout=30, allow_redirects=True)
        
        print(f"🔐 Alternative login response status: {login_response.status_code}", flush=True)
        print(f"🔐 Alternative final URL: {login_response.url}", flush=True)
        
        # Check if login was successful
        if login_response.status_code == 200:
            # Check if we're still on the login page
            if "se-connecter" in login_response.url:
                print("❌ Alternative login still on login page", flush=True)
                return False
            
            # Check for session cookies
            session_cookies = session.cookies.get_dict()
            if not session_cookies:
                print("❌ No session cookies found after alternative login", flush=True)
                return False
            
            # Store the session
            _leconomiste_session['cookies'] = session_cookies
            _leconomiste_session['last_login'] = datetime.now()
            _leconomiste_session['session_valid'] = True
            
            print(f"✅ Alternative login successful! Session cookies stored: {len(session_cookies)} cookies", flush=True)
            print(f"✅ Session cookies: {list(session_cookies.keys())}", flush=True)
            
            return True
        else:
            print(f"❌ Alternative login failed with status code: {login_response.status_code}", flush=True)
            return False
            
    except Exception as e:
        print(f"❌ Error during alternative login: {str(e)}", flush=True)
        return False

def login_to_leconomiste(username: str, password: str) -> bool:
    """
    Login to leconomiste.com and store session cookies.
    Returns True if login successful, False otherwise.
    """
    print(f"🔐 Attempting to login to leconomiste.com with username: {username}", flush=True)
    
    try:
        # Create a session to maintain cookies
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })
        
        # First, get the login page to extract form data
        login_url = f"{BASE_URL}/se-connecter/"
        print(f"🔐 Fetching login page: {login_url}", flush=True)
        
        response = session.get(login_url, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Find the login form
        form = soup.find("form", {"method": "post"})
        if not form:
            print("❌ Login form not found", flush=True)
            # Debug: print available forms
            forms = soup.find_all("form")
            print(f"🔍 Available forms: {len(forms)}", flush=True)
            for i, f in enumerate(forms):
                print(f"  Form {i+1}: method='{f.get('method')}', action='{f.get('action')}'", flush=True)
            return False
        
        # Get form action URL
        form_action = form.get("action", "")
        if form_action:
            if form_action.startswith("/"):
                submit_url = f"{BASE_URL}{form_action}"
            elif form_action.startswith("http"):
                submit_url = form_action
            else:
                submit_url = f"{BASE_URL}/{form_action}"
        else:
            submit_url = login_url
        
        print(f"🔐 Form action URL: {submit_url}", flush=True)
        
        # Extract form data
        form_data = {}
        
        # Get all hidden inputs (including nonce tokens)
        for hidden_input in form.find_all("input", type="hidden"):
            name = hidden_input.get("name")
            value = hidden_input.get("value", "")
            if name:
                form_data[name] = value
                print(f"🔍 Hidden field: {name} = {value[:50]}...", flush=True)
        
        # Get all visible inputs to ensure we have all required fields
        for input_field in form.find_all("input"):
            name = input_field.get("name")
            input_type = input_field.get("type", "text")
            value = input_field.get("value", "")
            
            if name and input_type == "hidden":
                # Already handled above
                continue
            elif name and "username" in name.lower():
                form_data[name] = username
            elif name and "password" in name.lower():
                form_data[name] = password
            elif name and "remember" in name.lower():
                form_data[name] = "1"
            elif name and ("honeypot" in name.lower() or "maspik" in name.lower()):
                form_data[name] = ""  # Honeypot should be empty
        
        # Ensure we have the specific fields (fallback if dynamic names don't work)
        if "username-48603" not in form_data:
            form_data["username-48603"] = username
        if "user_password-48603" not in form_data:
            form_data["user_password-48603"] = password
        if "full-name-maspik-hp" not in form_data:
            form_data["full-name-maspik-hp"] = ""
        if "rememberme" not in form_data:
            form_data["rememberme"] = "1"
        
        print(f"🔐 Submitting login form with {len(form_data)} fields", flush=True)
        print(f"🔍 Form data keys: {list(form_data.keys())}", flush=True)
        
        # Update headers for POST request
        session.headers.update({
            "Referer": login_url,
            "Origin": BASE_URL,
            "Content-Type": "application/x-www-form-urlencoded",
        })
        
        # Submit the login form
        login_response = session.post(submit_url, data=form_data, timeout=30, allow_redirects=True)
        
        print(f"🔐 Login response status: {login_response.status_code}", flush=True)
        print(f"🔐 Final URL after login: {login_response.url}", flush=True)
        
        # Check if login was successful
        if login_response.status_code == 200:
            # Check if we're redirected to a different page or if there are error messages
            soup_response = BeautifulSoup(login_response.text, "html.parser")
            
            # Look for error messages
            error_messages = soup_response.find_all("div", class_="um-notice")
            if error_messages:
                for error in error_messages:
                    error_text = error.get_text(strip=True)
                    if error_text and "erreur" in error_text.lower():
                        print(f"❌ Login error: {error_text}", flush=True)
                        return False
            
            # Look for other error indicators
            error_indicators = soup_response.find_all(text=lambda text: text and "erreur" in text.lower())
            if error_indicators:
                for error in error_indicators:
                    error_text = error.strip()
                    if error_text and len(error_text) < 200:  # Avoid very long text
                        print(f"🔍 Potential error text: {error_text}", flush=True)
            
            # Check if we're still on the login page (indicates failed login)
            if "se-connecter" in login_response.url:
                print("❌ Still on login page, login likely failed", flush=True)
                
                # Debug: Check if there are any success indicators
                success_indicators = soup_response.find_all(text=lambda text: text and "bienvenue" in text.lower())
                if success_indicators:
                    print(f"🔍 Found welcome text: {success_indicators[0].strip()}", flush=True)
                
                return False
            
            # Check for session cookies
            session_cookies = session.cookies.get_dict()
            if not session_cookies:
                print("❌ No session cookies found after login", flush=True)
                return False
            
            # Store the session
            _leconomiste_session['cookies'] = session_cookies
            _leconomiste_session['last_login'] = datetime.now()
            _leconomiste_session['session_valid'] = True
            
            print(f"✅ Login successful! Session cookies stored: {len(session_cookies)} cookies", flush=True)
            print(f"✅ Session cookies: {list(session_cookies.keys())}", flush=True)
            
            return True
        else:
            print(f"❌ Login failed with status code: {login_response.status_code}", flush=True)
            return False
            
    except Exception as e:
        print(f"❌ Error during login: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return False

def is_session_valid() -> bool:
    """
    Check if the current session is still valid.
    Sessions are considered valid for 24 hours.
    """
    if not _leconomiste_session['session_valid'] or not _leconomiste_session['cookies']:
        return False
    
    if not _leconomiste_session['last_login']:
        return False
    
    # Check if session is older than 24 hours
    time_diff = datetime.now() - _leconomiste_session['last_login']
    if time_diff > timedelta(hours=24):
        print("⏰ Session expired (older than 24 hours)", flush=True)
        _leconomiste_session['session_valid'] = False
        return False
    
    return True

def ensure_leconomiste_session() -> bool:
    """
    Ensure we have a valid leconomiste session.
    If not, attempt to login using credentials from environment.
    Returns True if session is valid, False otherwise.
    """
    if is_session_valid():
        print("✅ Leconomiste session is valid", flush=True)
        return True
    
    print("🔄 Leconomiste session invalid or expired, attempting to login...", flush=True)
    
    # Get credentials from environment
    username = os.getenv("LECONOMISTE_USERNAME")
    password = os.getenv("LECONOMISTE_PASSWORD")
    
    if not username or not password:
        print("❌ Leconomiste credentials not found in environment variables", flush=True)
        print("❌ Please set LECONOMISTE_USERNAME and LECONOMISTE_PASSWORD in your .env file", flush=True)
        return False
    
    # Attempt to login with retry mechanism and exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        print(f"🔄 Login attempt {attempt + 1}/{max_retries}", flush=True)
        
        # Add exponential backoff delay
        if attempt > 0:
            delay = min(30, 5 * (2 ** attempt))  # 5s, 10s, 20s, max 30s
            print(f"⏳ Waiting {delay} seconds before retry...", flush=True)
            time.sleep(delay)
        else:
            print("⏳ Waiting 3 seconds before first attempt...", flush=True)
            time.sleep(3)
        
        # Try Playwright login first (handles bot protection)
        print("🔄 Trying Playwright login (handles reCAPTCHA, Cloudflare, etc.)...", flush=True)
        if login_to_leconomiste_playwright(username, password):
            print("✅ Successfully established new leconomiste session with Playwright", flush=True)
            return True
        else:
            print(f"❌ Playwright login attempt {attempt + 1} failed", flush=True)
            
            # Try traditional requests method as fallback
            print("🔄 Trying traditional requests method as fallback...", flush=True)
            if login_to_leconomiste(username, password):
                print("✅ Successfully established new leconomiste session with requests", flush=True)
                return True
            else:
                print(f"❌ Requests login attempt {attempt + 1} failed", flush=True)
                
                # Try alternative requests method
                print("🔄 Trying alternative requests method...", flush=True)
                if login_to_leconomiste_alternative(username, password):
                    print("✅ Successfully established new leconomiste session with alternative method", flush=True)
                    return True
                else:
                    print(f"❌ Alternative requests login attempt {attempt + 1} failed", flush=True)
    
    print("❌ All login attempts failed", flush=True)
    return False

def get_article_content(article_url: str) -> tuple[str, str]:
    """
    Fetch the full content and title of a Leconomiste article.
    Extracts text from <div class="field field-name-body ..."> and title from <h1> in content_leconomiste.
    Returns tuple of (content, title).
    """
    print(f"🔍 Fetching article content from: {article_url}", flush=True)
    try:
        # Ensure we have a valid session before making the request
        if not ensure_leconomiste_session():
            print("❌ Cannot fetch article content - no valid leconomiste session", flush=True)
            return "❌ Cannot access article - authentication required", ""
        
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(article_url, headers=headers, timeout=30, cookies=_leconomiste_session['cookies'])
        response.raise_for_status()
        print(f"✅ Article fetched successfully, status: {response.status_code}", flush=True)
        soup = BeautifulSoup(response.text, "html.parser")

        # Extract title from the specific structure you showed
        title = ""
        
        # Try the specific structure from your example
        title_h1 = soup.select_one("div.title-article-bloc h1")
        if title_h1:
            title = title_h1.get_text(strip=True)
            print(f"✅ Article title extracted: {title}", flush=True)
        else:
            # Fallback to other title selectors
            title_selectors = [
                "h1",
                "div.title-article-bloc h1",
                "div.post-details h1",
                "div.article-title h1",
                "h1.entry-title"
            ]
            
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    print(f"✅ Article title extracted with {selector}: {title}", flush=True)
                    break
            
            if not title:
                print(f"⚠️ No title found for: {article_url}", flush=True)

        # Find the main article content - try the specific structure you showed
        content_div = soup.select_one("div.bloc-article-description")
        
        if not content_div:
            # Try alternative content selectors
            content_selectors = [
                "div.bloc-article-description",
                "div.article-content",
                "div.entry-content",
                "div.post-content",
                "div.field.field-name-body.field-type-text-with-summary.field-label-hidden",
                "div.content",
                "article .content"
            ]
            
            for selector in content_selectors:
                content_div = soup.select_one(selector)
                if content_div:
                    print(f"✅ Found content with selector: {selector}", flush=True)
                    break

        if not content_div:
            print(f"⚠️ No article content found for: {article_url}", flush=True)
            return "⚠️ No article content found (maybe paywalled or different structure).", title

        # Extract text content from the article
        # Remove script and style elements
        for script in content_div(["script", "style"]):
            script.decompose()
        
        # Get text content
        content_text = content_div.get_text(separator=" ", strip=True)
        
        # Clean up the text
        content_text = " ".join(content_text.split())  # Remove extra whitespace
        
        if not content_text:
            print(f"⚠️ Article content found but no text inside: {article_url}", flush=True)
            return "⚠️ Article content found but no text inside.", title

        content_length = len(content_text)
        print(f"✅ Article content extracted: {content_length} characters", flush=True)
        return content_text, title

    except Exception as e:
        print(f"❌ Error fetching article content from {article_url}: {str(e)}", flush=True)
        return f"❌ Error fetching article content: {str(e)}", ""

def get_leconomiste_news(query: str, max_results: int = 5):
    """
    Search Leconomiste.com and fetch full text for each article.
    """
    print(f"🔍 Starting Leconomiste search for: '{query}' (max: {max_results})", flush=True)
    
    # Ensure we have a valid session before searching
    if not ensure_leconomiste_session():
        print("❌ Cannot search leconomiste - no valid session", flush=True)
        return []
    
    base_url = "https://www.leconomiste.com/recherche-leconomiste"
    
    # Ajoute des guillemets autour du query si plusieurs mots et ajoute le contexte Maroc
    if " " in query:
        safe_query = f"\"{query}\" Maroc"
    else:
        safe_query = f"{query} Maroc" 
    
    params = {
        "search_api_views_fulltext": safe_query,
        "type": "post",
        "field_author": "",
        "field_edition_nid": "",
        "created": "All",
        "created_3[min][date]": "",
        "created_3[max][date]": ""
    }

    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        print(f"🔍 Searching URL: {base_url} with params: {params}", flush=True)
        response = requests.get(base_url, params=params, headers=headers, cookies=_leconomiste_session['cookies'], timeout=30)
        response.raise_for_status()
        print(f"✅ Leconomiste search response: {response.status_code}", flush=True)
        
        # Debug: Save HTML content to see what we're getting
        print(f"🔍 Response content length: {len(response.text)} characters", flush=True)
        
        # Debug: Save a sample of the HTML for inspection
        try:
            with open('/tmp/leconomiste_search_debug.html', 'w', encoding='utf-8') as f:
                f.write(response.text[:50000])  # First 50k characters
        except:
            pass
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Look for search result indicators
        search_indicators = [
            "Aucun résultat trouvé",
            "No results found", 
            "Résultats de recherche",
            "Search results",
            "articles trouvés",
            "articles found"
        ]
        
        page_text = soup.get_text().lower()
        found_indicators = [indicator for indicator in search_indicators if indicator.lower() in page_text]
        if found_indicators:
            print(f"🔍 Search indicators found: {found_indicators}", flush=True)
        
        # Check if we got a "no results" page
        no_results_indicators = [
            "aucun résultat",
            "no results",
            "aucun article",
            "no articles",
            "votre recherche n'a pas donné de résultats",
            "your search did not return any results"
        ]
        
        no_results_found = [indicator for indicator in no_results_indicators if indicator.lower() in page_text]
        if no_results_found:
            print(f"⚠️ No results indicators found: {no_results_found}", flush=True)
            print(f"⚠️ Search may have returned no results for query: {safe_query}", flush=True)
        
        # Check for common search result containers
        result_containers = [
            "div.view-content",
            "div.search-results", 
            "div.results",
            "div.articles",
            "div.news-list",
            "main",
            "div.content"
        ]
        
        for container in result_containers:
            elements = soup.select(container)
            if elements:
                print(f"🔍 Found {len(elements)} elements with selector '{container}'", flush=True)

        # Debug: Show what selector finds - target the specific structure you showed
        articles_found = soup.select("div.featured-articles-wrapper article.featured-articles a[href]")
        print(f"🔍 Articles found with primary selector (featured-articles): {len(articles_found)}", flush=True)
        
        # Debug: Show first few articles found
        if articles_found:
            print(f"🔍 First 3 articles found:", flush=True)
            for i, a_tag in enumerate(articles_found[:3]):
                href = a_tag.get('href', 'No href')
                title = a_tag.get_text(strip=True)[:100]
                print(f"  {i+1}. href: {href}, title: {title}", flush=True)
        else:
            print(f"❌ No articles found with primary selector", flush=True)
            
            # Try alternative selectors for search results
            print(f"🔍 Trying alternative selectors for search results...", flush=True)
            
            # Try different search result selectors - prioritize the specific structure you showed
            alt_selectors = [
                "div.featured-articles-wrapper article.featured-articles a[href]",  # Your exact structure
                "article.featured-articles a[href]",  # Featured articles
                "div.featured-articles-wrapper a[href]",  # Featured articles wrapper
                "article a[href]",  # Any article element
                "div.featured-content a[href]",  # Featured content links
                "div.featured-title a[href]",  # Featured title links
                "h2 a[href], h3 a[href]",  # Headline links
                "a[href*='/flash-infos/']",  # Flash news URLs
                "a[href*='/article/']",  # Article URLs
                "a[href*='/actualite/']",  # News URLs
                "div.view-content div.views-row a[href]",  # General search results
                "div.views-row a[href]",  # Any views-row link
                "div.node a[href]",  # Node links
                "div.content a[href]",  # Content links
                "div.search-results a[href]",  # Search results container
                "div.results a[href]",  # Results container
                "div.articles a[href]",  # Articles container
                "main a[href]",  # Main content links
                "div[class*='featured'] a[href]",  # Any div with 'featured' in class
                "div[class*='search'] a[href]",  # Any div with 'search' in class
                "div[class*='result'] a[href]",  # Any div with 'result' in class
                "div[class*='article'] a[href]",  # Any div with 'article' in class
                "div[class*='news'] a[href]",  # Any div with 'news' in class
                "div[class*='item'] a[href]",  # Any div with 'item' in class
                "div[class*='post'] a[href]",  # Any div with 'post' in class
            ]
            
            for i, selector in enumerate(alt_selectors):
                alt_results = soup.select(selector)
                print(f"  Alternative {i+1} ({selector}): {len(alt_results)}", flush=True)
                
                if alt_results:
                    # Filter out navigation and non-article links
                    filtered_results = []
                    for link in alt_results:
                        href = link.get('href', '')
                        title = link.get_text(strip=True)
                        
                        # Skip navigation and non-article links
                        navigation_patterns = [
                            '/se-connecter/', '/abonnement/', '/archive/', '/edition/', 
                            '/mon-compte/', '/contact/', '/about/', '/mentions-legales/',
                            '/se-deconnecter/', '/le-club/', '/editorials/',
                            '/user/', '/wp-admin/', '/wp-content/', '/wp-includes/',
                            '/category/', '/tag/', '/author/', '/date/',
                            '/search/', '/recherche/', '/recherche-leconomiste/',
                            'javascript:', 'mailto:', 'tel:', '#'
                        ]
                        
                        if any(nav in href.lower() for nav in navigation_patterns):
                            continue
                        
                        # Skip empty titles or navigation text
                        navigation_text = [
                            'se connecter', 's\'abonner', 'lire le journal', 'accueil', 
                            'contact', 'mentions légales', 'connexion', 'abonnement',
                            'se déconnecter', 'à la une', 'flash info', 'l\'édito', 
                            'le club', 'recherche', 'archives', 'éditions'
                        ]
                        
                        if not title or any(nav in title.lower() for nav in navigation_text):
                            continue
                        
                        # Must be a valid article URL
                        if href and (href.startswith('/') or 'leconomiste.com' in href):
                            # Additional check: must look like an article URL
                            article_indicators = [
                                '/flash-infos/', '/article/', '/actualite/', '/news/',
                                '/flash/', '/breaking/', '/story/', '/post/'
                            ]
                            
                            # If it's a leconomiste.com URL, it should have article indicators
                            if 'leconomiste.com' in href:
                                if not any(indicator in href.lower() for indicator in article_indicators):
                                    # Allow if it's a relative URL (starts with /)
                                    if not href.startswith('/'):
                                        continue
                            
                            filtered_results.append(link)
                    
                    if filtered_results:
                        articles_found = filtered_results
                        print(f"✅ Using alternative selector {i+1} with {len(filtered_results)} filtered results", flush=True)
                        break
            
            # If still no results, try the old fallback but with better filtering
            if not articles_found:
                print(f"🔍 Trying fallback with all links...", flush=True)
                all_links = soup.find_all("a", href=True)
                print(f"  All links found: {len(all_links)}", flush=True)
                
                # Filter all links more aggressively
                filtered_links = []
                for link in all_links:
                    href = link.get('href', '')
                    title = link.get_text(strip=True)
                    
                    # Must have a title and href
                    if not title or not href:
                        continue
                    
                    # Skip navigation and non-article links
                    navigation_patterns = [
                        '/se-connecter/', '/abonnement/', '/archive/', '/edition/', 
                        '/mon-compte/', '/contact/', '/about/', '/mentions-legales/',
                        '/se-deconnecter/', '/le-club/', '/editorials/',
                        '/user/', '/wp-admin/', '/wp-content/', '/wp-includes/',
                        '/category/', '/tag/', '/author/', '/date/',
                        '/search/', '/recherche/', '/recherche-leconomiste/',
                        'javascript:', 'mailto:', 'tel:', '#'
                    ]
                    
                    if any(nav in href.lower() for nav in navigation_patterns):
                        continue
                    
                    # Skip navigation text
                    navigation_text = [
                        'se connecter', 's\'abonner', 'lire le journal', 'accueil', 
                        'contact', 'mentions légales', 'connexion', 'abonnement',
                        'se déconnecter', 'à la une', 'flash info', 'l\'édito', 
                        'le club', 'recherche', 'archives', 'éditions'
                    ]
                    
                    if any(nav in title.lower() for nav in navigation_text):
                        continue
                    
                    # Must be a valid article URL
                    if href and (href.startswith('/') or 'leconomiste.com' in href):
                        # Additional check: must look like an article URL
                        article_indicators = [
                            '/flash-infos/', '/article/', '/actualite/', '/news/',
                            '/flash/', '/breaking/', '/story/', '/post/'
                        ]
                        
                        # If it's a leconomiste.com URL, it should have article indicators
                        if 'leconomiste.com' in href:
                            if not any(indicator in href.lower() for indicator in article_indicators):
                                # Allow if it's a relative URL (starts with /)
                                if not href.startswith('/'):
                                    continue
                        
                        filtered_links.append(link)
                
                if filtered_links:
                    articles_found = filtered_links
                    print(f"✅ Using filtered fallback with {len(filtered_links)} results", flush=True)
                else:
                    print(f"❌ No valid articles found after filtering", flush=True)
        
        articles = []
        # Limit to max_results
        for i, a_tag in enumerate(articles_found[:max_results]):
            if a_tag.has_attr("href"):
                full_url = "https://www.leconomiste.com" + a_tag["href"] if a_tag["href"].startswith("/") else a_tag["href"]
                search_title = a_tag.get_text(strip=True)
                print(f"📥 Fetching article {i+1}/{min(len(articles_found), max_results)}: {search_title}", flush=True)
                full_text, article_title = get_article_content(full_url)
                
                # Use the extracted article title if available, otherwise fall back to search title
                final_title = article_title if article_title else search_title
                
                articles.append({
                    "title": final_title,
                    "url": full_url,
                    "full_text": full_text,
                    "date": "",  # Leconomiste doesn't provide easy date extraction
                    "source": "Leconomiste"
                })

        print(f"📰 Leconomiste search completed: {len(articles)} articles processed", flush=True)
        return articles
    except Exception as e:
        print(f"❌ Error fetching Leconomiste news: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return []

def get_tavily_news(company_name: str, max_per_query: int = 1):
    """Retrieve news from Tavily search for the given company."""
    if not TAVILY_API_KEY:
        print("⚠️ Tavily API key not found, skipping Tavily search", flush=True)
        return []
    
    try:
        tavily = TavilySearch(
            max_results=max_per_query,
            start_date=datetime.today() - timedelta(days=365),
            end_date=datetime.today()
        )

        queries = [
            f"\"{company_name}\" Morocco News",
            f"site:lavieeco.com \"{company_name}\" Maroc",
            f"site:ledesk.ma \"{company_name}\"",
            f"site:hespress.com \"{company_name}\" Maroc",
            f"site:linkedin.com \"{company_name}\" Morocco",
            f"site:medias24.com \"{company_name}\"",
            f"site:challenge.ma \"{company_name}\"",
            f"site:aujourdhui.ma \"{company_name}\"",
            f"site:telquel.ma \"{company_name}\"",
            f"site:lematin.ma \"{company_name}\"",
            f"site:afrique.le360.ma \"{company_name}\"",
            f"site:leseco.ma \"{company_name}\"",
        ]

        all_results = []

        for query in queries:
            # print(f"🔍 Tavily searching: {query}", flush=True)
            try:
                response = tavily.invoke(query)
                
                if isinstance(response, dict) and "results" in response:
                    for r in response["results"]:
                        if isinstance(r, dict):
                            all_results.append({
                                "title": r.get("title", ""),
                                "summary": r.get("content"),
                                "url": r.get("url")
                            })
                elif isinstance(response, list):
                    # Handle case where response is directly a list
                    for r in response:
                        if isinstance(r, dict):
                            all_results.append({
                                "title": r.get("title", ""),
                                "summary": r.get("content"),
                                "url": r.get("url")
                            })

            except Exception as e:
                print(f"❌ Error while querying '{query}': {e}", flush=True)

        print(f"📰 Found {len(all_results)} articles from Tavily", flush=True)
        return all_results
    except Exception as e:
        print(f"❌ Error with Tavily search: {str(e)}", flush=True)
        return []

def get_serpapi_news(company_name: str, max_results: int = 5):
    """Retrieve news from SerpAPI Google search for the given company."""
    if not SERPAPI_API_KEY:
        print("⚠️ SerpAPI key not found, skipping SerpAPI search", flush=True)
        return []
    
    try:
        print(f"🔍 Starting SerpAPI search for: {company_name}", flush=True)
        
        # Use a single, simple query as you suggested
        query = f'"{company_name}" Morocco news'
        print(f"🔍 SerpAPI searching: {query}", flush=True)
        
        try:
            # Try news search first
            search = GoogleSearch({
                "q": query,
                "api_key": SERPAPI_API_KEY,
                "num": max_results,
                "tbm": "nws",  # News search
                "hl": "en",    # Language
                "gl": "ma",    # Country: Morocco
                "safe": "off"
                # Removed "as_qdr": "y" as it might be too restrictive
            })
            
            results = search.get_dict()
            
            # Debug: Print the raw response structure
            print(f"🔍 SerpAPI response keys: {list(results.keys())}", flush=True)
            if "error" in results:
                error_msg = results['error']
                print(f"❌ SerpAPI error: {error_msg}", flush=True)
                
                # Handle specific error cases gracefully
                if "hasn't returned any results" in error_msg.lower():
                    print(f"ℹ️ No Google results found for '{company_name}' - this is normal for smaller companies", flush=True)
                    return []  # Return empty list instead of continuing with fallback
                elif "quota" in error_msg.lower() or "limit" in error_msg.lower():
                    print(f"⚠️ SerpAPI quota/limit reached - skipping SerpAPI search", flush=True)
                    return []
                else:
                    print(f"⚠️ SerpAPI error occurred, trying fallback search...", flush=True)
            
            all_results = []
            
            # Extract news results
            if "news_results" in results and results["news_results"]:
                print(f"🔍 Found {len(results['news_results'])} news results", flush=True)
                for news_item in results["news_results"]:
                    if isinstance(news_item, dict):
                        # Extract relevant information
                        title = news_item.get("title", "")
                        snippet = news_item.get("snippet", "")
                        url = news_item.get("link", "")
                        date = news_item.get("date", "")
                        source = news_item.get("source", "")
                        
                        # Only add if we have meaningful content
                        if title and snippet and url:
                            all_results.append({
                                "title": title,
                                "summary": snippet,
                                "url": url,
                                "date": date,
                                "source": source or "SerpAPI"
                            })
                            print(f"✅ Added SerpAPI article: {title[:50]}...", flush=True)
            else:
                print(f"⚠️ No news_results found in SerpAPI response", flush=True)
                # Debug: Check if there are other result types
                if "organic_results" in results and results["organic_results"]:
                    print(f"🔍 Found {len(results['organic_results'])} organic results instead", flush=True)
                if "search_information" in results:
                    search_info = results["search_information"]
                
                # Only try fallback if there was no error (to avoid infinite loops)
                if "error" not in results:
                    print(f"🔍 Trying fallback organic search...", flush=True)
                    # Fallback: Try organic search if news search fails
                    fallback_search = GoogleSearch({
                        "q": query,
                        "api_key": SERPAPI_API_KEY,
                        "num": max_results
                    })
                    
                    fallback_results = fallback_search.get_dict()
                    print(f"🔍 Fallback response keys: {list(fallback_results.keys())}", flush=True)
                    
                    # Process fallback results if available
                    if "organic_results" in fallback_results and fallback_results["organic_results"]:
                        print(f"🔍 Fallback found {len(fallback_results['organic_results'])} organic results", flush=True)
                        for item in fallback_results["organic_results"]:
                            if isinstance(item, dict):
                                title = item.get("title", "")
                                snippet = item.get("snippet", "")
                                url = item.get("link", "")
                                
                                # Filter for news-like content
                                if title and snippet and url and any(keyword in snippet.lower() for keyword in ["news", "actualités", "article", "report", "business", "company"]):
                                    all_results.append({
                                        "title": title,
                                        "summary": snippet,
                                        "url": url,
                                        "date": "",
                                        "source": "SerpAPI (Organic)"
                                    })
                                    print(f"✅ Added fallback article: {title[:50]}...", flush=True)
            
            # Remove duplicates based on URL
            unique_results = []
            seen_urls = set()
            for result in all_results:
                url = result.get('url', '')
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_results.append(result)
            
            print(f"📰 Found {len(unique_results)} unique articles from SerpAPI", flush=True)
            return unique_results[:max_results]  # Ensure we don't exceed max_results
            
        except Exception as e:
            print(f"❌ Error with SerpAPI query '{query}': {str(e)}", flush=True)
            return []
        
    except Exception as e:
        print(f"❌ Error with SerpAPI search: {str(e)}", flush=True)
        return []

def llm_analyze_news(tavily_news: list, leconomiste_news: list, serpapi_news: list, company_name: str, anthropic_api_key: str):
    """Use LLM to analyze and summarize the collected news."""
    try:
        # Prepare news text for LLM analysis with dates
        tavily_text = ""
        if tavily_news:
            tavily_text = "\n".join([
                f"• [{article.get('date', 'Date inconnue')}] {article.get('summary', '')[:200]}..." if len(article.get('summary', '')) > 200 
                else f"• [{article.get('date', 'Date inconnue')}] {article.get('summary', 'No summary')}"
                for article in tavily_news
                if article.get('summary')
            ])
        
        leconomiste_text = ""
        if leconomiste_news:
            leconomiste_text = "\n".join([
                f"• [{article.get('date', 'Date inconnue')}] {article.get('full_text', '')[:200]}..." if len(article.get('full_text', '')) > 200 
                else f"• [{article.get('date', 'Date inconnue')}] {article.get('full_text', 'No content')}"
                for article in leconomiste_news
                if article.get('full_text')
            ])
        
        serpapi_text = ""
        if serpapi_news:
            serpapi_text = "\n".join([
                f"• [{article.get('date', 'Date inconnue')}] {article.get('summary', '')[:200]}..." if len(article.get('summary', '')) > 200 
                else f"• [{article.get('date', 'Date inconnue')}] {article.get('summary', 'No summary')}"
                for article in serpapi_news
                if article.get('summary')
            ])
        
        # If no news found, return a default message
        if not tavily_text and not leconomiste_text and not serpapi_text:
            return f"Aucune actualité récente trouvée pour {company_name}. Une veille concurrentielle plus approfondie pourrait révéler des informations sectorielles pertinentes."
        
        system_template = f"""You are a financial news analyst specialized in extracting investment-relevant information from company-related news.

        You will receive a set of recent news articles about the company "{company_name}" operating in Morocco. Your task is to extract the most relevant financial and strategic insights from these articles. These may include but are not limited to indications of growth, decline, risks, partnerships, acquisitions, legal issues, public contracts, leadership changes, or operational expansions.

        You will be provided with News from multiple sources:
        - Tavily: Deep search tool for small or local companies
        - Leconomiste: Moroccan financial newspaper
        - SerpAPI: Google News search results

        IMPORTANT: Each news article includes its publication date in brackets [YYYY-MM-DD]. Pay close attention to these dates as they are crucial for understanding the timeline of events and providing accurate temporal context.

        Please:
        - Analyze the content for financial signals.
        - Focus specifically on news about the company in Morocco (not companies with the same name in other countries).
        - Ignore irrelevant marketing or HR-related announcements.
        - Summarize clearly and concisely.
        - Focus on information that would be relevant to investors or business analysts.
        - Ensure the analysis is specifically about the Moroccan operations of the company.
        - ALWAYS mention the specific year when referencing news articles to provide accurate temporal context and relevancy.
        - When multiple events are mentioned, clearly distinguish their different years to avoid confusion.

        === Tavily News ===
        {tavily_text}

        === Leconomiste News ===
        {leconomiste_text}

        === SerpAPI News ===
        {serpapi_text}

        Return your findings in 1 paragraph with no line breaks in French. If no relevant financial information is found, provide a brief statement about the lack of recent public information."""

        # Create Anthropic client using the provided API key
        if not anthropic_api_key:
            print("⚠️ Anthropic API key not available for news analysis", flush=True)
            return f"Analyse des actualités pour {company_name} temporairement indisponible - clé API manquante."
        
        client = anthropic.Anthropic(api_key=anthropic_api_key)
        
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1000,
            temperature=0.1,
            messages=[{"role": "user", "content": system_template}]
        )
        
        # Extract content from response
        return response.content[0].text.strip()
            
    except Exception as e:
        print(f"❌ Error analyzing news with LLM: {str(e)}", flush=True)
        return f"Analyse des actualités pour {company_name} temporairement indisponible. Une veille manuelle est recommandée pour obtenir les dernières informations sur l'entreprise."

def normalize_url(url: str) -> str:
    """
    Normalize a URL for comparison by removing trailing slashes, 
    query parameters, and other variations that don't affect the actual content.
    """
    if not url:
        return url
    
    from urllib.parse import urlparse, urlunparse
    
    try:
        # Parse the URL
        parsed = urlparse(url)
        
        # Remove trailing slash from path
        path = parsed.path.rstrip('/')
        if not path:
            path = '/'
        
        # Reconstruct URL without query parameters and fragments
        normalized = urlunparse((
            parsed.scheme,
            parsed.netloc.lower(),  # Normalize domain to lowercase
            path,
            '',  # Remove params
            '',  # Remove query
            ''   # Remove fragment
        ))
        
        return normalized
    except Exception:
        # If parsing fails, return original URL
        return url

def remove_duplicate_articles(articles: list) -> list:
    """
    Remove duplicate articles based on normalized URLs.
    Keeps the first occurrence of each unique URL.
    """
    if not articles:
        return articles
    
    seen_urls = set()
    unique_articles = []
    duplicates_found = 0
    
    for article in articles:
        url = article.get('url', '')
        normalized_url = normalize_url(url)
        
        if normalized_url and normalized_url not in seen_urls:
            seen_urls.add(normalized_url)
            unique_articles.append(article)
        else:
            duplicates_found += 1
            print(f"🔍 Duplicate article removed: '{article.get('title', 'NO TITLE')}' (URL: {url})", flush=True)
    
    if duplicates_found > 0:
        print(f"🔍 Removed {duplicates_found} duplicate articles based on URL", flush=True)
    
    return unique_articles

def llm_filter_relevant_news(all_articles: list, company_name: str, anthropic_api_key: str):
    """Use LLM to filter news articles and keep only the most relevant ones to the company."""
    try:
        if not all_articles:
            return []
        
        if not anthropic_api_key:
            print("⚠️ Anthropic API key not available for news filtering", flush=True)
            return all_articles  # Return all articles if no API key
        
        # Prepare articles text for LLM filtering
        articles_text = ""
        for i, article in enumerate(all_articles):
            title = article.get('title', '')
            summary = article.get('summary', '')
            source = article.get('source', '')
            articles_text += f"{i+1}. Title: {title}\n   Summary: {summary}\n   Source: {source}\n\n"
        
        system_template = f"""You are an expert news analyst specialized in identifying company-relevant news articles.

            Your task is to analyze a list of news articles about the company "{company_name}" and identify which ones are MOST RELEVANT and DIRECTLY RELATED to the company.

            CRITERIA FOR RELEVANT NEWS:
            - MUST mention the company name "{company_name}" or its variations (including abbreviations, subsidiaries, or common misspellings)
            - CRITICAL: If the company name contains multiple words (e.g., "COMANER DISTRIBUTION"), articles mentioning any significant part of the name (e.g., "Comaner") should be considered relevant if they appear to be about the same company
            - MUST be specifically about the company in Morocco (not companies with the same name in other countries

            CRITERIA FOR IRRELEVANT NEWS:
            - Does NOT mention the company name or any significant part of it at all
            - Generic industry news without company specifics
            - News about companies with the same name but operating in other countries (e.g., Malaysia, Indonesia, etc.)

            SMART COMPANY NAME MATCHING:
            - For "COMANER DISTRIBUTION": Accept articles about "Comaner" if they appear to be about the same company
            - For "ABC COMPANY LTD": Accept articles about "ABC" or "ABC Company" if context suggests it's the same entity
            - For multi-word company names, consider partial matches when the context clearly indicates it's about the same company

            You will receive a list of numbered articles. For each article, carefully analyze the title and summary to determine relevance.

            Return ONLY a JSON array with the INDICES (1-based) of the articles you consider RELEVANT and DIRECTLY RELATED to the company.

            Example response format:
            [1, 3, 7]

            This means articles 1, 3, and 7 are relevant, and articles 2, 4, 5, 6, 8, 9, 10 should be filtered out.

            IMPORTANT: 
            - Be smart about partial company name matches - don't be overly strict
            - If only 2-3 articles are relevant, that's perfectly fine
            - Quality over quantity - it's better to have 2 highly relevant articles than 10 mediocre ones
            - Focus on articles that would be valuable for business intelligence

            === ARTICLES TO ANALYZE ===
            {articles_text}

            Return only the JSON array of relevant article indices:"""

        # Create Anthropic client
        client = anthropic.Anthropic(api_key=anthropic_api_key)
        
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            temperature=0.1,
            messages=[{"role": "user", "content": system_template}]
        )
        
        # Extract content and parse JSON
        response_text = response.content[0].text.strip()
        print(f"🔍 LLM filtering response: {response_text}", flush=True)
        
        try:
            # Try to extract JSON from the response
            import json
            import re
            
            # Look for JSON array in the response
            json_match = re.search(r'\[.*?\]', response_text)
            if json_match:
                relevant_indices = json.loads(json_match.group())
            else:
                # If no JSON found, try to parse the entire response
                relevant_indices = json.loads(response_text)
            
            # Validate indices are within range
            valid_indices = [idx for idx in relevant_indices if 1 <= idx <= len(all_articles)]
            if len(valid_indices) != len(relevant_indices):
                print(f"⚠️ Some indices were out of range, using only valid ones: {valid_indices}", flush=True)
            
            # Convert to 0-based indices and filter articles
            filtered_articles = []
            for idx in valid_indices:
                filtered_articles.append(all_articles[idx - 1])
            
            # If LLM filtered all articles to empty list, respect that decision
            if len(filtered_articles) == 0:
                print(f"ℹ️ LLM determined no articles are relevant to {company_name} - displaying 0 news articles", flush=True)
            
            return filtered_articles
            
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse LLM filtering response as JSON: {e}", flush=True)
            print(f"⚠️ Raw response: {response_text}", flush=True)
            # Fallback: return all articles if parsing fails
            print(f"⚠️ Falling back to all articles due to JSON parsing error", flush=True)
            return all_articles
            
    except Exception as e:
        print(f"❌ Error in LLM news filtering: {str(e)}", flush=True)
        # Fallback: return all articles if filtering fails
        return all_articles

def news_retriever_agent(company_name: str, anthropic_api_key: str = None):
    """Retrieves and analyzes news articles related to a given company."""
    print(f"📰 Starting news retrieval for {company_name}...", flush=True)
    
    try:
        leconomiste_news = get_leconomiste_news(company_name, 5)
        print(f"📰 Leconomiste returned {len(leconomiste_news)} articles", flush=True)
    
        tavily_news = get_tavily_news(company_name, 5)  # Ensure Tavily also gets max 5
        print(f"📰 Tavily returned {len(tavily_news)} articles", flush=True)
        
        serpapi_news = get_serpapi_news(company_name, 5)  # SerpAPI also gets max 5
        print(f"📰 SerpAPI returned {len(serpapi_news)} articles", flush=True)
        
        # Analyze news with LLM
        print(f"🔍 Starting LLM analysis with {len(leconomiste_news)} Leconomiste + {len(tavily_news)} Tavily + {len(serpapi_news)} SerpAPI articles", flush=True)
        news_analysis = llm_analyze_news(tavily_news, leconomiste_news, serpapi_news, company_name, anthropic_api_key)
        
        # Combine articles to get exactly 10 total, prioritizing 3-4 from each source
        all_articles = []
        target_total = 10
        
        # First, add up to 3-4 from Leconomiste
        leconomiste_count = min(4, len(leconomiste_news))
        for i in range(leconomiste_count):
            article = leconomiste_news[i]
            title = article.get('title', '')
            print(f"🔍 Leconomiste article {i+1} title: '{title}'", flush=True)
            all_articles.append({
                'title': title,
                'summary': article.get('full_text', '')[:200] + "..." if len(article.get('full_text', '')) > 200 else article.get('full_text', ''),
                'url': article.get('url', ''),
                'date': article.get('date', ''),
                'source': 'Leconomiste'
            })
        
        # Then, add up to 3-4 from Tavily
        tavily_count = min(4, len(tavily_news))
        for i in range(tavily_count):
            article = tavily_news[i]
            title = article.get('title', '')
            print(f"🔍 Tavily article {i+1} title: '{title}'", flush=True)
            all_articles.append({
                'title': title,
                'summary': article.get('summary', ''),
                'url': article.get('url', ''),
                'date': article.get('date', ''),
                'source': 'Tavily'
            })
        
        # Then, add up to 3-4 from SerpAPI
        serpapi_count = min(4, len(serpapi_news))
        for i in range(serpapi_count):
            article = serpapi_news[i]
            title = article.get('title', '')
            print(f"🔍 SerpAPI article {i+1} title: '{title}'", flush=True)
            all_articles.append({
                'title': title,
                'summary': article.get('summary', ''),
                'url': article.get('url', ''),
                'date': article.get('date', ''),
                'source': 'SerpAPI'
            })
        
        # If we still need more articles to reach 10, fill from the source that has more
        remaining_slots = target_total - len(all_articles)
        if remaining_slots > 0:
            print(f"🔍 Need {remaining_slots} more articles to reach target of 10", flush=True)
            
            # Check which source has more unused articles
            leconomiste_unused = len(leconomiste_news) - leconomiste_count
            tavily_unused = len(tavily_news) - tavily_count
            serpapi_unused = len(serpapi_news) - serpapi_count
            
            # Add from the source with the most unused articles
            sources = [
                ('Leconomiste', leconomiste_unused, leconomiste_news, leconomiste_count),
                ('Tavily', tavily_unused, tavily_news, tavily_count),
                ('SerpAPI', serpapi_unused, serpapi_news, serpapi_count)
            ]
            
            # Sort by unused count (descending)
            sources.sort(key=lambda x: x[1], reverse=True)
            
            for source_name, unused_count, source_news, source_count in sources:
                if remaining_slots <= 0:
                    break
                    
                if unused_count > 0:
                    articles_to_add = min(remaining_slots, unused_count)
                    print(f"🔍 Adding {articles_to_add} more articles from {source_name}", flush=True)
                    
                    for i in range(source_count, min(source_count + articles_to_add, len(source_news))):
                        article = source_news[i]
                        
                        # Handle different source structures
                        if source_name == 'Leconomiste':
                            summary = article.get('full_text', '')[:200] + "..." if len(article.get('full_text', '')) > 200 else article.get('full_text', '')
                        else:
                            summary = article.get('summary', '')
                        
                        all_articles.append({
                            'title': article.get('title', ''),
                            'summary': summary,
                            'url': article.get('url', ''),
                            'date': article.get('date', ''),
                            'source': source_name
                        })
                        
                        if len(all_articles) >= target_total:
                            break
                    
                    remaining_slots = target_total - len(all_articles)
        
        # Ensure we don't exceed 10 articles
        all_articles = all_articles[:target_total]
        
        # Remove duplicate URLs before LLM filtering
        unique_articles = remove_duplicate_articles(all_articles)
        print(f"🔍 After deduplication: {len(unique_articles)} unique articles", flush=True)
        
        # Filter articles using LLM
        print(f"🔍 Starting LLM filtering for {company_name} with {len(unique_articles)} unique articles", flush=True)
        filtered_articles = llm_filter_relevant_news(unique_articles, company_name, anthropic_api_key)
        
        # Log filtering results
        if len(filtered_articles) < len(unique_articles):
            print(f"🔍 LLM filtered out {len(unique_articles) - len(filtered_articles)} irrelevant articles", flush=True)
            print(f"🔍 Kept {len(filtered_articles)} highly relevant articles", flush=True)
            
            # Log which articles were kept for debugging
            kept_sources = [article.get('source', 'Unknown') for article in filtered_articles]
            print(f"🔍 Kept articles from sources: {', '.join(kept_sources)}", flush=True)
        else:
            print(f"🔍 All {len(unique_articles)} articles were considered relevant", flush=True)
        
        # Return both the analysis and the articles with links
        result = {
            'analysis': news_analysis,
            'urls': filtered_articles
        }
        
        print(f"📰 News analysis completed for {company_name} with {len(filtered_articles)} relevant articles", flush=True)
        print(f"📰 Sources: {len(leconomiste_news)} Leconomiste + {len(tavily_news)} Tavily + {len(serpapi_news)} SerpAPI = {len(all_articles)} total, After deduplication: {len(unique_articles)} unique, Filtered to: {len(filtered_articles)} relevant", flush=True)

        # Debug: Log the final articles being returned
        for i, article in enumerate(filtered_articles):
            print(f"📰 Final article {i+1}: title='{article.get('title', 'NO TITLE')}', url='{article.get('url', 'NO URL')}', source='{article.get('source', 'NO SOURCE')}'", flush=True)
        
        return result
        
    except Exception as e:
        print(f"❌ Error in news retrieval agent: {str(e)}", flush=True)
        return {
            'analysis': f"Analyse des actualités pour {company_name} temporairement indisponible en raison d'une erreur technique.",
            'urls': []
        }
