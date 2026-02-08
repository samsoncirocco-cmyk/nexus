import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { promisify } from 'util';

const execFile = promisify(require('child_process').execFile);

/**
 * GET /api/auth/linkedin/callback - Handle LinkedIn OAuth callback
 * 
 * LinkedIn redirects here after user authorization
 * DOE Framework: Orchestration layer processes callback and calls execution script
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Handle OAuth errors from LinkedIn
    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=missing_params`
      );
    }

    // Retrieve state and verifier from cookie
    const oauthCookie = request.cookies.get('linkedin_oauth_state')?.value;
    
    if (!oauthCookie) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=session_expired`
      );
    }

    let oauthData: { state: string; verifier: string; user_id: string };
    try {
      oauthData = JSON.parse(oauthCookie);
    } catch {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=invalid_session`
      );
    }

    // Verify state matches (CSRF protection)
    if (oauthData.state !== state) {
      console.error('State mismatch:', { expected: oauthData.state, received: state });
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=invalid_state`
      );
    }

    // Call execution script to exchange code for tokens
    const scriptPath = join(process.cwd(), 'execution', 'oauth', 'linkedin_flow.py');
    
    const { stdout, stderr } = await execFile('python3', [
      scriptPath,
      '--action=callback',
      `--code=${code}`,
      `--state=${state}`,
      `--verifier=${oauthData.verifier}`,
    ], {
      timeout: 30000,
      env: {
        ...process.env,
        LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
        LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
        LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || 
          `${request.nextUrl.origin}/api/auth/linkedin/callback`,
      }
    });

    if (stderr) {
      console.error('LinkedIn callback stderr:', stderr);
    }

    const tokenData = JSON.parse(stdout);

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=token_exchange_failed`
      );
    }

    // Get profile info to store with connection
    const { stdout: profileStdout } = await execFile('python3', [
      scriptPath,
      '--action=profile',
      `--access_token=${tokenData.access_token}`,
    ], {
      timeout: 10000,
      env: process.env,
    });

    const profile = JSON.parse(profileStdout);

    // Store connection in database via execution script
    const supabaseScriptPath = join(process.cwd(), 'execution', 'utils', 'supabase_client.py');
    
    const connectionData = {
      user_id: oauthData.user_id,
      platform: 'linkedin',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      scopes: tokenData.scope,
      platform_user_id: profile.id,
      metadata: {
        profile: {
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profilePicture: profile.profilePicture,
        }
      }
    };

    const { stdout: storeStdout, stderr: storeStderr } = await execFile('python3', [
      supabaseScriptPath,
      '--action=store',
      `--data=${JSON.stringify(connectionData)}`,
    ], {
      timeout: 10000,
      env: process.env,
    });

    if (storeStderr) {
      console.error('Store connection stderr:', storeStderr);
    }

    const storeResult = JSON.parse(storeStdout);

    if (!storeResult.success) {
      console.error('Failed to store connection:', storeResult);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?linkedin_error=storage_failed`
      );
    }

    // Clear the temporary OAuth cookie
    const response = NextResponse.redirect(
      `${request.nextUrl.origin}/settings?linkedin_connected=true`
    );
    
    response.cookies.set('linkedin_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/linkedin',
    });

    return response;

  } catch (error: unknown) {
    console.error('LinkedIn callback error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?linkedin_error=${encodeURIComponent(message)}`
    );
  }
}
