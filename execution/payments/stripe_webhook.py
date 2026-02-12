import os
import sys
import json
import stripe
from supabase import create_client, Client

# Initialize Supabase
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key) if url and key else None

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# Tier Mapping: Update these with your actual Stripe Price IDs
PRICE_TIER_MAP = {
    "price_starter": "starter",
    "price_pro": "pro",
    "price_business": "business"
}

def get_tier_from_price(price_id):
    return PRICE_TIER_MAP.get(price_id, "starter") # Default fallback

def handle_checkout_completed(session):
    """
    Handle checkout.session.completed event.
    Updates user profile with subscription details and tier.
    """
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    client_reference_id = session.get("client_reference_id")
    
    if not client_reference_id:
        print("Error: No client_reference_id found in session.")
        return

    try:
        # Fetch subscription details to get the price ID
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = subscription['items']['data'][0]['price']['id']
        tier = get_tier_from_price(price_id)
        
        # Update user profile
        data = {
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "tier": tier,
            "subscription_status": "active"
        }
        
        response = supabase.table("profiles").update(data).eq("id", client_reference_id).execute()
        
        if response.data:
            print(f"Successfully updated user {client_reference_id} to {tier}")
        else:
            print(f"Failed to update user {client_reference_id}: {response}")
            
    except Exception as e:
        print(f"Error handling checkout completed: {e}")

def handle_invoice_paid(invoice):
    """
    Handle invoice.payment_succeeded event.
    Updates subscription status to active.
    """
    subscription_id = invoice.get("subscription")
    customer_id = invoice.get("customer")
    
    if not subscription_id:
        return

    try:
        # Update subscription status
        data = {"subscription_status": "active"}
        
        # Find user by subscription ID
        response = supabase.table("profiles").update(data).eq("stripe_subscription_id", subscription_id).execute()
        
        if response.data:
            print(f"Updated subscription status for {subscription_id}")
        else:
            # Maybe look up by customer ID if subscription ID isn't set yet (rare)
            print(f"Could not find user for subscription {subscription_id}")
            
    except Exception as e:
        print(f"Error handling invoice paid: {e}")

def handle_subscription_deleted(subscription):
    """
    Handle customer.subscription.deleted event.
    Downgrades user to free tier.
    """
    subscription_id = subscription.get("id")
    
    try:
        # Downgrade user
        data = {
            "tier": "free",
            "subscription_status": "canceled",
            "stripe_subscription_id": None
        }
        
        response = supabase.table("profiles").update(data).eq("stripe_subscription_id", subscription_id).execute()
        
        if response.data:
            print(f"Downgraded user with subscription {subscription_id}")
        else:
            print(f"Could not find user to downgrade for subscription {subscription_id}")
            
    except Exception as e:
        print(f"Error handling subscription deleted: {e}")

if __name__ == "__main__":
    # Read event JSON from stdin
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print("No input data provided.")
            sys.exit(1)
            
        event = json.loads(input_data)
        event_type = event.get('type')
        data = event.get('data', {}).get('object', {})
        
        print(f"Processing event: {event_type}")
        
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(data)
        elif event_type == 'invoice.payment_succeeded':
            handle_invoice_paid(data)
        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(data)
        else:
            print(f"Unhandled event type: {event_type}")
            
    except json.JSONDecodeError:
        print("Invalid JSON input.")
        sys.exit(1)
    except Exception as e:
        print(f"Error processing webhook: {e}")
        sys.exit(1)
