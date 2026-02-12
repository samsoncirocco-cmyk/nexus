# Payment Integration Directive

## Overview
This directive outlines the implementation of Stripe payments for Nexus, covering the Starter ($49), Pro ($99), and Business ($179) tiers. It includes checkout, webhooks, usage tracking, and subscription management.

## 1. Stripe Setup

### Products & Prices
| Tier      | Price  | Features (Limits) | Stripe Product ID (Env) | Stripe Price ID (Env) |
| :-------- | :----- | :---------------- | :---------------------- | :-------------------- |
| Starter   | $49/mo | 100 posts/mo      | `STRIPE_PROD_STARTER`   | `STRIPE_PRICE_STARTER`|
| Pro       | $99/mo | 500 posts/mo      | `STRIPE_PROD_PRO`       | `STRIPE_PRICE_PRO`    |
| Business  | $179/mo| Unlimited         | `STRIPE_PROD_BIZ`       | `STRIPE_PRICE_BIZ`    |

### Environment Variables
Required in `.env`:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_BASE_URL`

## 2. Checkout Flow
1.  **UI**: User selects plan on Pricing Page.
2.  **API**: Frontend calls `POST /api/payments/checkout` with `priceId`.
3.  **Backend**: Creates Stripe Checkout Session (mode: subscription).
    -   `success_url`: `{BASE_URL}/dashboard?checkout=success`
    -   `cancel_url`: `{BASE_URL}/pricing`
    -   `metadata`: `userId`
4.  **Redirect**: User redirected to Stripe hosted checkout.

## 3. Webhook Handling
Endpoint: `/api/payments/webhook`
Events to handle:
-   `checkout.session.completed`:
    -   Retrieve `userId` from metadata.
    -   Retrieve `subscriptionId` and `customerId`.
    -   Update user record in DB:
        -   `stripe_customer_id`
        -   `stripe_subscription_id`
        -   `plan_tier`
        -   `status` = 'active'
        -   `current_period_end`
-   `invoice.paid`:
    -   Extend subscription valid through date.
    -   Reset monthly usage counters.
-   `customer.subscription.deleted`:
    -   Update user status to 'canceled' or 'past_due'.
    -   Downgrade to free tier features.

## 4. Usage Tracking & Limits
Logic implemented in `execution/payments/usage_tracker.py`.

### Limits
-   **Starter**: 100 posts/month
-   **Pro**: 500 posts/month
-   **Business**: Unlimited

### Tracking
-   DB Table: `usage_records` (user_id, metric, count, period_start, period_end)
-   Check limit before action.
-   Increment count after action.

## 5. Subscription Management
-   **Portal**: User can manage sub via `POST /api/payments/portal`.
-   Redirects to Stripe Customer Portal.
