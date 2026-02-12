import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic'; // Webhooks are dynamic

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'execution', 'payments', 'stripe_webhook.py');

    console.log(`Forwarding webhook to Python script: ${scriptPath}`);

    // Spawn python process
    const python = spawn('python3', [scriptPath], {
      env: {
        ...process.env,
        STRIPE_SIGNATURE: sig,
        PYTHONPATH: process.cwd(), // Ensure root is in python path for imports
      },
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', chunk => {
        stdout += chunk.toString();
    });

    python.stderr.on('data', chunk => {
        stderr += chunk.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      python.on('close', resolve);
      
      // Write body to stdin
      python.stdin.write(rawBody);
      python.stdin.end();
    });

    if (exitCode !== 0) {
      console.error(`Python script failed (code ${exitCode}):`, stderr);
      return NextResponse.json({ error: 'Webhook processing failed', details: stderr }, { status: 500 });
    }

    console.log('Webhook processed successfully:', stdout);
    
    try {
        // Try to parse JSON output from script if any
        const result = JSON.parse(stdout);
        return NextResponse.json(result);
    } catch {
        // Fallback
        return NextResponse.json({ received: true });
    }

  } catch (e: any) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
