import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

    const userEmail = config.profile.email;

    // 2. Get User from Supabase
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('email', userEmail)
      .single();

    if (userError || !user || !user.stripe_customer_id) {
        return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // 3. Create Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
