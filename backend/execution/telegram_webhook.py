#!/usr/bin/env python3
"""Telegram Webhook Handler - Orchestrates between Telegram and OpenAI"""
import json, sys
from openai_chat import chat, reset_history
from telegram_send import send_message

def handle_telegram_message(payload):
    try:
        if "message" not in payload:
            return {"success": False, "message": "No message in payload"}
        message = payload["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        if text.startswith("/"):
            return handle_command(text, chat_id)
        result = chat(text, chat_id)
        if result["error"]:
            send_message(chat_id, f"Error: {result['error']}")
            return {"success": False, "message": result["error"]}
        send_result = send_message(chat_id, result["response"])
        if send_result["success"]:
            return {"success": True, "message": "Response sent"}
        return {"success": False, "message": send_result["error"]}
    except Exception as e:
        return {"success": False, "message": str(e)}

def handle_command(text, chat_id):
    command = text.split()[0].lower()
    if command == "/start":
        send_message(chat_id, "Hello! I'm Killua, your AI assistant powered by OpenAI.\n\nSend me any message and I'll respond.\n\nCommands:\n/help - Show commands\n/reset - Clear history\n/model - Switch models")
    elif command == "/help":
        send_message(chat_id, "Commands:\n/start - Welcome\n/help - Show commands\n/reset - Clear history\n/model <name> - Switch model (gpt-4o-mini or gpt-4o)")
    elif command == "/reset":
        reset_history(chat_id)
        send_message(chat_id, "Conversation history cleared!")
    else:
        send_message(chat_id, "Unknown command. Try /help")
    return {"success": True, "message": f"Command {command} handled"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python telegram_webhook.py '<json_payload>'")
        sys.exit(1)
    result = handle_telegram_message(json.loads(sys.argv[1]))
    print(json.dumps(result, indent=2))
