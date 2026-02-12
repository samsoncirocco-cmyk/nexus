import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(spawn);

/**
 * POST /api/platforms/linkedin/connect
 * 
 * Initiates LinkedIn OAuth flow for the authenticated user.
 * Generates PKCE codes and returns the LinkedIn authorization URL.
 * 
 * Request Body:
 * - None (uses session user)
 * 
 * Response:
 * {
 *   "auth_url": "https://www.linkedin.com/oauth/v2/authorization?...",
 *   "state": "random_state_string"
 * }
 * 
 * Error Responses:
 * - 401: User not authenticated
 * - 500: Failed to initiate OAuth flow
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get session from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Call Python script to initiate OAuth
    const scriptPath = path.join(process.cwd(), 'execution', 'oauth', 'linkedin_flow.py');
    
    const pythonProcess = spawn('python3', [
      scriptPath,
      'initiate_auth',
      userId
    ]);
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      pythonProcess.on('close', resolve);
    });
    
    if (exitCode !== 0) {
      console.error('LinkedIn OAuth initiation failed:', stderr);
      return NextResponse.json(
        { error: 'Failed to initiate LinkedIn OAuth flow', details: stderr },
        { status: 500 }
      );
    }
    
    // Parse Python script output
    const result = JSON.parse(stdout);
    
    // Store state and PKCE verifier in temporary storage (Redis/DB)
    // These must be retrieved during callback
    const { error: storeError } = await supabase
      .from('oauth_states')
      .upsert({
        state: result.state,
        user_id: userId,
        pkce_verifier: result.pkce_verifier,
        platform: 'linkedin',
        expires_at: result.expires_at,
        created_at: new Date().toISOString()
      });
    
    if (storeError) {
      console.error('Failed to store OAuth state:', storeError);
      return NextResponse.json(
        { error: 'Failed to store OAuth state' },
        { status: 500 }
      );
    }
    
    // Return auth URL to client
    return NextResponse.json({
      auth_url: result.auth_url,
      state: result.state
    });
    
  } catch (error) {
    console.error('LinkedIn connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/platforms/linkedin/connect
 * 
 * Health check endpoint for the connect route.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/platforms/linkedin/connect',
    method: 'POST',
    description: 'Initiates LinkedIn OAuth flow'
  });
}
