#!/usr/bin/env python3
"""
Test script to verify company name cleaning functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.profile_verification import _normalize_company_name

def test_company_name_cleaning():
    """Test various company name cleaning scenarios"""
    
    test_cases = [
        # Original case from the user
        ("MAGHREB COLOR SARLAU", "MAGHREB COLOR"),
        
        # Other Moroccan company types
        ("COMPANY NAME SARL", "COMPANY NAME"),
        ("COMPANY NAME SA", "COMPANY NAME"),
        ("COMPANY NAME S.A.", "COMPANY NAME"),
        ("COMPANY NAME S.A", "COMPANY NAME"),
        
        # Mixed cases
        ("Maghreb Color sarlau", "MAGHREB COLOR"),
        ("Company Name SARL", "COMPANY NAME"),
        
        # Multiple suffixes (should only remove the last one)
        ("COMPANY NAME SARL SA", "COMPANY NAME SARL"),
        
        # No suffix
        ("MAGHREB COLOR", "MAGHREB COLOR"),
        
        # Edge cases
        ("", ""),
        ("   ", ""),
        ("SARL", ""),
        ("COMPANY", "COMPANY"),
    ]
    
    print("Testing company name cleaning functionality:")
    print("=" * 50)
    
    all_passed = True
    
    for input_name, expected_output in test_cases:
        result = _normalize_company_name(input_name)
        passed = result == expected_output
        all_passed = all_passed and passed
        
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} | Input: '{input_name}' -> Output: '{result}' (Expected: '{expected_output}')")
    
    print("=" * 50)
    if all_passed:
        print("✓ All tests passed!")
    else:
        print("✗ Some tests failed!")
    
    return all_passed

if __name__ == "__main__":
    test_company_name_cleaning()
