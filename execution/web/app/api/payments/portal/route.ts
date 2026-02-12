import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

// Use service role key for backend operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, returnUrl } = await req.json();

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    // Get customer ID from Supabase
    const { data: user, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !user?.stripe_customer_id) {
      console.error('Error fetching user or no customer ID:', error);
      return new NextResponse('User not found or no Stripe customer ID', { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
