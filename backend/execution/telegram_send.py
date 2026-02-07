#!/usr/bin/env python3
"""Telegram Send Message"""
import os, sys, json, requests

def send_message(chat_id, text, parse_mode=None):
    try:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not bot_token:
            return {"success": False, "error": "TELEGRAM_BOT_TOKEN not set"}
        max_length = 4096
        if len(text) > max_length:
            chunks = [text[i:i+max_length] for i in range(0, len(text), max_length)]
            for chunk in chunks:
                result = _send(bot_token, chat_id, chunk, parse_mode)
                if not result["success"]:
                    return result
            return {"success": True, "error": None}
        return _send(bot_token, chat_id, text, parse_mode)
    except Exception as e:
        return {"success": False, "error": str(e)}

def _send(bot_token, chat_id, text, parse_mode):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return {"success": True, "error": None}
    return {"success": False, "error": f"Telegram API error: {response.text}"}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python telegram_send.py <chat_id> <message>")
        sys.exit(1)
    result = send_message(sys.argv[1], sys.argv[2])
    print(json.dumps(result, indent=2))
