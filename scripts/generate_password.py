#!/usr/bin/env python3
"""
Script to generate password hashes for the application.
Usage: python generate_password.py <password>
"""

import sys
from werkzeug.security import generate_password_hash


    
password = sys.argv[1] if len(sys.argv) > 1 else "Admin123"
hash_value = generate_password_hash(password)
print(f"Hash: {hash_value}")
print(f"\nFor SQL insertion:")
print(f"'{hash_value}'")


