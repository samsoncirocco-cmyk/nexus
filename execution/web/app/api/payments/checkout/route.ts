import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // Use latest or your specific version
});

export async function POST(req: Request) {
  try {
    const { priceId, userId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !userId) {
      return new NextResponse('Missing priceId or userId', { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
