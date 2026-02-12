import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) throw new Error('Missing signature or secret');
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Determine script path
  let scriptPath = path.resolve(process.cwd(), 'execution/payments/stripe_webhook.py');
  if (!fs.existsSync(scriptPath)) {
    // Try relative path from execution/web
    scriptPath = path.resolve(process.cwd(), '../payments/stripe_webhook.py');
  }
  
  if (!fs.existsSync(scriptPath)) {
      console.error(`Script not found at: ${scriptPath}`);
      return new NextResponse('Internal Server Error: Script not found', { status: 500 });
  }

  console.log(`Executing payment handler: ${scriptPath}`);

  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [scriptPath]);
    
    let scriptOutput = '';
    let scriptError = '';

    pythonProcess.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      scriptError += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Python Output: ${scriptOutput}`);
        resolve(NextResponse.json({ received: true }));
      } else {
        console.error(`Python Error (Exit Code ${code}): ${scriptError}`);
        // Still return 200 to Stripe if it's a logic error in our script so they don't retry forever?
        // Or 500 to retry? Usually 500 if we want retry.
        // If the script fails, it might be transient.
        resolve(new NextResponse('Webhook handler failed', { status: 500 }));
      }
    });

    // Write event to stdin
    pythonProcess.stdin.write(JSON.stringify(event));
    pythonProcess.stdin.end();
  });
}
