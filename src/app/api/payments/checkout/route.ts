import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration (mirroring auth route logic)
const VAULT_CONFIG = path.join(process.cwd(), 'vault', 'config.json');
const COOKIE_NAME = 'sb-session';

function getConfig() {
  try {
    const raw = fs.readFileSync(VAULT_CONFIG, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read config", e);
    return null;
  }
}

function verifyToken(token: string, secret: string): object | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = getConfig();
    if (!config) {
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    const payload = verifyToken(token, config.auth.sessionSecret);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Get User Info (from config, as this is single-player by default)
    const userEmail = config.profile.email;
    const userName = config.profile.name;

    if (!userEmail) {
        return NextResponse.json({ error: 'User email not configured in vault/config.json' }, { status: 400 });
    }

    // 3. Get or Create User in Supabase
    // We use email as the unique key for this mapping
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
        // Create user if not exists
        // Assuming users table has email, name fields
        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
                email: userEmail,
                name: userName,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (createError) {
            console.error('Failed to create user in Supabase', createError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        user = newUser;
    }

    // 4. Parse Request
    const body = await req.json();
    const { plan } = body; // 'starter', 'pro', 'business'

    const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // 5. Create or Get Stripe Customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
        const customer = await stripe.customers.create({
            email: userEmail,
            name: userName,
            metadata: {
                userId: user.id
            }
        });
        customerId = customer.id;
        
        // Save customer ID to DB
        await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', user.id);
    }

    // 6. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        userId: user.id,
        plan
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
