#!/usr/bin/env python3
"""OpenAI Chat Integration"""
import os, json, sys
from pathlib import Path
from openai import OpenAI

def load_history(chat_id):
    history_file = Path(f".tmp/telegram_history_{chat_id}.json")
    if history_file.exists():
        with open(history_file, 'r') as f:
            return json.load(f)
    return []

def save_history(chat_id, history):
    history_file = Path(f".tmp/telegram_history_{chat_id}.json")
    history_file.parent.mkdir(exist_ok=True)
    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)

def get_openai_client():
    """Get OpenAI client using OAuth token (ChatGPT Plus) or API key"""
    auth_file = Path.home() / ".codex" / "auth.json"
    if auth_file.exists():
        with open(auth_file, 'r') as f:
            auth = json.load(f)
        token = auth.get("tokens", {}).get("access_token")
        if token:
            return OpenAI(api_key=token)
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key != "sk-your-key-here":
        return OpenAI(api_key=api_key)
    return None

def chat(message, chat_id, model="gpt-4o-mini", system_prompt=None):
    try:
        client = get_openai_client()
        if not client:
            return {"response": None, "error": "No OpenAI auth found. Run 'codex login' or set OPENAI_API_KEY"}
        history = load_history(chat_id)
        messages = [{"role": "system", "content": system_prompt or "You are a helpful AI assistant."}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})
        response = client.chat.completions.create(model=model, messages=messages, max_tokens=1000, temperature=0.7)
        assistant_message = response.choices[0].message.content
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": assistant_message})
        if len(history) > 20:
            history = history[-20:]
        save_history(chat_id, history)
        return {"response": assistant_message, "error": None}
    except Exception as e:
        return {"response": None, "error": str(e)}

def reset_history(chat_id):
    history_file = Path(f".tmp/telegram_history_{chat_id}.json")
    if history_file.exists():
        history_file.unlink()
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python openai_chat.py <message> <chat_id> [model]")
        sys.exit(1)
    result = chat(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "gpt-4o-mini")
    print(json.dumps(result, indent=2))
