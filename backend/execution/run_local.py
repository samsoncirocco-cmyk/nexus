#!/usr/bin/env python3
"""Local Telegram Bot Runner (Polling Mode)"""
import os, sys, time, requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from telegram_webhook import handle_telegram_message

def main():
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        print("Error: TELEGRAM_BOT_TOKEN not set in .env")
        sys.exit(1)
    print("Bot started! Send messages to @Killua_Codebot on Telegram...")
    print("Press Ctrl+C to stop\n")
    last_update_id = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
            response = requests.get(url, params={"offset": last_update_id + 1, "timeout": 30})
            if response.status_code == 200:
                for update in response.json().get("result", []):
                    last_update_id = update["update_id"]
                    if "message" in update and "text" in update["message"]:
                        username = update["message"]["from"].get("username", "unknown")
                        text = update["message"]["text"]
                        print(f"@{username}: {text}")
                    result = handle_telegram_message(update)
                    print(f"  -> {'OK' if result['success'] else 'ERR: ' + result['message']}\n")
            time.sleep(1)
        except KeyboardInterrupt:
            print("\nBot stopped")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
