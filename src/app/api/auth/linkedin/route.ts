import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const execFile = promisify(require('child_process').execFile);

/**
 * POST /api/auth/linkedin - Initiate LinkedIn OAuth flow
 * 
 * DOE Framework: Orchestration layer calls execution script
 * Execution: execution/oauth/linkedin_flow.py --action=initiate
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user from session/cookie
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Path to execution script
    const scriptPath = join(process.cwd(), 'execution', 'oauth', 'linkedin_flow.py');
    
    // Call execution script to initiate OAuth
    const { stdout, stderr } = await execFile('python3', [
      scriptPath,
      '--action=initiate',
      `--user_id=${userId}`,
    ], {
      timeout: 30000,
      env: {
        ...process.env,
        // Ensure environment variables are available to the script
        LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
        LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
        LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || 
          `${request.nextUrl.origin}/api/auth/linkedin/callback`,
      }
    });

    if (stderr) {
      console.error('LinkedIn OAuth initiate stderr:', stderr);
    }

    // Parse the OAuth initiation response
    const result = JSON.parse(stdout);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 500 }
      );
    }

    // Store state and verifier temporarily (in production, use Redis/DB)
    // For POC, we'll include them in a temporary cookie
    const response = NextResponse.json({
      success: true,
      auth_url: result.auth_url,
      state: result.state,
    });

    // Set temporary cookie with PKCE verifier (expires in 10 minutes)
    response.cookies.set('linkedin_oauth_state', JSON.stringify({
      state: result.state,
      verifier: result.pkce_verifier,
      user_id: userId,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/api/auth/linkedin',
    });

    return response;

  } catch (error: unknown) {
    console.error('LinkedIn OAuth initiate error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'oauth_initiate_failed', message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/linkedin - Check connection status
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header/cookie
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Call execution utility to check connection status
    const scriptPath = join(process.cwd(), 'execution', 'utils', 'supabase_client.py');
    
    const { stdout, stderr } = await execFile('python3', [
      scriptPath,
      '--action=get',
      `--user_id=${userId}`,
      '--platform=linkedin',
    ], {
      timeout: 10000,
      env: process.env,
    });

    if (stderr) {
      console.error('Supabase client stderr:', stderr);
    }

    const connection = JSON.parse(stdout);
    
    if (!connection) {
      return NextResponse.json({
        connected: false,
        platform: 'linkedin',
      });
    }

    // Check if token is expired
    const isExpired = connection.token_expires_at && 
      new Date(connection.token_expires_at) < new Date();

    return NextResponse.json({
      connected: connection.connection_status === 'connected' && !isExpired,
      platform: 'linkedin',
      status: isExpired ? 'expired' : connection.connection_status,
      scopes: connection.scopes,
      expires_at: connection.token_expires_at,
      profile: connection.metadata?.profile,
    });

  } catch (error: unknown) {
    console.error('LinkedIn status check error:', error);
    // Return disconnected state on error
    return NextResponse.json({
      connected: false,
      platform: 'linkedin',
      error: 'status_check_failed',
    });
  }
}

/**
 * DELETE /api/auth/linkedin - Disconnect LinkedIn
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const scriptPath = join(process.cwd(), 'execution', 'utils', 'supabase_client.py');
    
    const { stdout, stderr } = await execFile('python3', [
      scriptPath,
      '--action=delete',
      `--user_id=${userId}`,
      '--platform=linkedin',
    ], {
      timeout: 10000,
      env: process.env,
    });

    if (stderr) {
      console.error('Supabase client stderr:', stderr);
    }

    const result = JSON.parse(stdout);
    
    return NextResponse.json({
      success: result.success,
      disconnected: result.deleted > 0,
    });

  } catch (error: unknown) {
    console.error('LinkedIn disconnect error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'disconnect_failed', message },
      { status: 500 }
    );
  }
}
