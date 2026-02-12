import os
import sys
from supabase import create_client, Client
from datetime import datetime

# Initialize Supabase
# Ensure these environment variables are set in your execution environment
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    # Fallback for local testing or if env vars are named differently
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key) if url and key else None

TIER_LIMITS = {
    "starter": 100,
    "pro": 500,
    "business": float('inf')
}

def get_user_usage(user_id: str):
    """
    Fetch or create usage record for a user.
    Assumes a table 'user_usage' exists with columns: user_id, post_count.
    """
    if not supabase:
        print("Supabase client not initialized.")
        return {"post_count": 0}

    try:
        response = supabase.table("user_usage").select("*").eq("user_id", user_id).execute()
        if not response.data:
            # Create default if not exists
            data = {"user_id": user_id, "post_count": 0}
            supabase.table("user_usage").insert(data).execute()
            return data
        return response.data[0]
    except Exception as e:
        print(f"Error fetching usage: {e}")
        return {"post_count": 0}

def check_post_limit(user_id: str, tier: str) -> bool:
    """
    Check if user has reached their post limit based on tier.
    Returns True if user can post (count < limit), False otherwise.
    """
    limit = TIER_LIMITS.get(tier.lower(), 0) # Default to 0 if unknown tier
    
    if limit == float('inf'):
        return True
        
    usage = get_user_usage(user_id)
    return usage["post_count"] < limit

def increment_post_count(user_id: str) -> None:
    """
    Increment the post count for a user.
    """
    if not supabase:
        return

    usage = get_user_usage(user_id)
    new_count = usage["post_count"] + 1
    
    try:
        supabase.table("user_usage").update({"post_count": new_count}).eq("user_id", user_id).execute()
    except Exception as e:
        print(f"Error incrementing post count: {e}")

def get_remaining_posts(user_id: str) -> int:
    """
    Get the number of remaining posts for a user.
    Returns -1 for unlimited.
    """
    if not supabase:
        return 0

    # Fetch user tier from profiles
    try:
        user_response = supabase.table("profiles").select("tier").eq("id", user_id).execute()
        if not user_response.data:
            return 0
        tier = user_response.data[0].get("tier", "starter") # Default to starter
    except Exception as e:
        print(f"Error fetching user tier: {e}")
        tier = "starter"
    
    limit = TIER_LIMITS.get(tier.lower(), 100)
    
    if limit == float('inf'):
        return -1 
        
    usage = get_user_usage(user_id)
    return max(0, limit - usage["post_count"])

def reset_monthly_usage() -> None:
    """
    Reset post counts for all users.
    Intended to be run by a cron job at the start of the billing cycle.
    """
    if not supabase:
        return

    print(f"[{datetime.now()}] Starting monthly usage reset...")
    try:
        # Update all rows in user_usage table
        # Note: Depending on Supabase settings, mass updates might need a WHERE clause.
        # We use a dummy condition that is always true if needed, or rely on table permissions.
        # Assuming 'post_count' is the field to reset.
        
        # Fetch all users first (pagination might be needed for large datasets)
        # For simplicity in this script, we'll try a direct update.
        # If RLS is enabled, the service role key is required.
        
        # Standard approach:
        # supabase.table("user_usage").update({"post_count": 0}).neq("post_count", 0).execute()
        
        # Since supabase-py might not support neq easily without filters, let's just use a broad filter
        # or iterate if necessary. For now, we assume a direct update works with service role.
        
        result = supabase.table("user_usage").update({"post_count": 0}).gt("post_count", 0).execute()
        print(f"Reset complete. Rows affected: {len(result.data) if result.data else 'Unknown'}")
        
    except Exception as e:
        print(f"Error resetting usage: {e}")

if __name__ == "__main__":
    # Simple CLI for testing/cron usage
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "reset":
            reset_monthly_usage()
        elif cmd == "check" and len(sys.argv) > 3:
            print(check_post_limit(sys.argv[2], sys.argv[3]))
        elif cmd == "increment" and len(sys.argv) > 2:
            increment_post_count(sys.argv[2])
        elif cmd == "remaining" and len(sys.argv) > 2:
            print(get_remaining_posts(sys.argv[2]))
        else:
            print("Usage: python usage_tracker.py [reset|check <uid> <tier>|increment <uid>|remaining <uid>]")
