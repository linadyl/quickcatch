#!/usr/bin/env python3
"""
Perplexity API Test Script

This script tests if your Perplexity API key is working correctly.
"""

import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key
API_KEY = os.getenv('PERPLEXITY_API_KEY')

if not API_KEY:
    print("❌ ERROR: PERPLEXITY_API_KEY not found in environment variables")
    print("Please make sure you have a .env file with your API key")
    print("Example .env file content:")
    print("PERPLEXITY_API_KEY=your_api_key_here")
    sys.exit(1)

print("🔑 Found Perplexity API key in environment variables")
print(f"Key starts with: {API_KEY[:5]}{'*' * 10}")

# Test the API with a simple query
print("\n🧪 Testing API with a simple query...")
api_url = "https://api.perplexity.ai/chat/completions"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "model": "llama-3-sonar-small-32k-online",  # Using a simpler model for testing
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful assistant."
        },
        {
            "role": "user",
            "content": "Hello, can you tell me about the NHL?"
        }
    ],
    "max_tokens": 100
}

try:
    response = requests.post(api_url, headers=headers, json=data)
    response.raise_for_status()  # Raise exception for 4XX/5XX status codes
    
    result = response.json()
    print("✅ API request successful!")
    
    # Extract and display response
    if "choices" in result and len(result["choices"]) > 0:
        text = result["choices"][0]["message"]["content"]
        print("\n📝 API Response:")
        print(f"{text[:200]}..." if len(text) > 200 else text)
    else:
        print("⚠️ Unexpected response format")
        print(result)
    
except requests.exceptions.HTTPError as http_err:
    print(f"❌ HTTP Error: {http_err}")
    if response.status_code == 401:
        print("This usually means your API key is invalid or expired")
    print("\nResponse details:")
    try:
        print(response.json())
    except:
        print(response.text)
        
except requests.exceptions.ConnectionError:
    print("❌ Connection Error: Could not connect to Perplexity API")
    print("Please check your internet connection")
    
except Exception as err:
    print(f"❌ Error: {err}")
    
print("\n📋 Summary:")
if 'response' in locals() and response.status_code == 200:
    print("✅ Your Perplexity API setup is working correctly")
    print("✅ You should be able to use the NHL highlights analyzer now")
else:
    print("❌ There was a problem with your Perplexity API setup")
    print("Please fix the issues above and try again")