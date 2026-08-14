import os
import requests

API_KEY = "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"

print("Testing Groq API Connection...")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)

if response.status_code == 200:
    print("✅ Success! API Key is valid.")
    models = response.json().get("data", [])
    whisper_models = [m["id"] for m in models if "whisper" in m["id"].lower()]
    print(f"Available Whisper models on Groq: {whisper_models}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)
