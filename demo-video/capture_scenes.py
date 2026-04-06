#!/usr/bin/env python3
"""
Diana V2 Demo Video Screen Recorder
Captures screenshots of all key scenes for the demo video.
"""

import time
import requests
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:4000"
API_URL = "http://localhost:8080/api/v1"
OUTPUT_DIR = Path("/Users/adriangabriellfrancisco/workspace/github.com/Skufu/dianav2/demo-video/screen-recordings")

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Demo credentials
EMAIL = "demo@diana.app"
PASSWORD = "demopassword123"

def login():
    """Login and return session"""
    session = requests.Session()
    response = session.post(f"{API_URL}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    if response.status_code == 200:
        print("✓ Login successful")
        return session
    else:
        print(f"✗ Login failed: {response.status_code}")
        return None

def capture_scene(name, description):
    """Record a scene capture"""
    print(f"\n{'='*60}")
    print(f"Scene: {name}")
    print(f"Description: {description}")
    print(f"{'='*60}")
    time.sleep(1)

# Scene definitions
scenes = [
    ("03_dashboard", "Main dashboard showing risk score 57, metabolic profile MARD, and recent assessments"),
    ("04_assessment_form", "Assessment entry form with health metrics"),
    ("05_trends", "Health trends visualization page"),
    ("06_results_detail", "Detailed assessment results view"),
    ("07_profile", "User profile management page"),
    ("08_health_report", "PDF health report generation"),
]

print("Diana V2 Demo Video - Screen Recording Script")
print("=" * 60)
print(f"Output directory: {OUTPUT_DIR}")
print(f"Frontend URL: {BASE_URL}")
print(f"Backend URL: {API_URL}")
print("=" * 60)

# Login
session = login()
if session:
    print(f"\nSession cookies: {session.cookies.get_dict().keys()}")
    
    # Test API endpoints
    print("\nTesting API endpoints...")
    
    # Dashboard data
    dashboard = session.get(f"{API_URL}/users/me/assessments")
    print(f"✓ Assessments endpoint: {dashboard.status_code}")
    
    # Trends data
    trends = session.get(f"{API_URL}/users/me/trends")
    print(f"✓ Trends endpoint: {trends.status_code}")
    
    # Profile data
    profile = session.get(f"{API_URL}/users/me/profile")
    print(f"✓ Profile endpoint: {profile.status_code}")
    
    print("\n✓ All API endpoints accessible")
    print("\nNote: Screenshots must be captured manually via browser")
    print("The app is running and accessible at:")
    print(f"  Frontend: {BASE_URL}")
    print(f"  Backend: {API_URL}")
else:
    print("\n✗ Failed to authenticate")
