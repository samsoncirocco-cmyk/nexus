/**
 * OAuth Callback Route Handler
 * 
 * Handles the OAuth callback from the platform's authorization server.
 * Exchanges the authorization code for an access token.
 * 
 * URL: /api/auth/[platform]/callback?code=XXX&state=YYY
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const OAUTH_SCRIPT = path.join(process.cwd(), 'execution/oauth/oauth_flow.py');

async function runOAuthFlow(
  platform: string,
  action: string,
  args: Record<string, string>
): Promise<any> {
  const argString = Object.entries(args)
    .map(([key, value]) => `--${key} "${value}"`)
    .join(' ');
  
  const command = `python3 "${OAUTH_SCRIPT}" --platform ${platform} --action ${action} ${argString}`;
  
  const { stdout, stderr } = await execAsync(command, {
    env: {
      ...process.env,
      [`${platform.toUpperCase()}_CLIENT_ID`]: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
      [`${platform.toUpperCase()}_CLIENT_SECRET`]: process.env[`${platform.toUpperCase()}_CLIENT_SECRET`],
      [`${platform.toUpperCase()}_REDIRECT_URI`]: process.env[`${platform.toUpperCase()}_REDIRECT_URI`],
    }
  });
  
  if (stderr && !stdout) {
    throw new Error(stderr);
  }
  
  return JSON.parse(stdout);
}

/**
 * GET /api/auth/[platform]/callback
 * Handle OAuth callback and exchange code for token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform.toLowerCase();
    const searchParams = request.nextUrl.searchParams;
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Handle OAuth error from provider
    if (error) {
      return NextResponse.json(
        { 
          error: 'OAuth authorization failed',
          provider_error: error,
          description: errorDescription 
        },
        { status: 400 }
      );
    }
    
    // Validate required params
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: code and state' },
        { status: 400 }
      );
    }
    
    // In production: retrieve PKCE verifier from secure storage (Redis/DB)
    // For this example, we'll need the client to provide it
    // This would typically be stored server-side keyed by state
    
    // TEMPORARY: Get verifier from a cookie or session
    // In production: const verifier = await getVerifierFromState(state);
    const verifier = searchParams.get('verifier'); // Temporary - use secure storage in prod
    
    if (!verifier) {
      return NextResponse.json(
        { 
          error: 'PKCE verifier not found',
          message: 'Verifier must be retrieved from secure storage keyed by state'
        },
        { status: 400 }
      );
    }
    
    // Exchange code for token
    const tokenData = await runOAuthFlow(platform, 'callback', {
      code,
      state,
      verifier
    });
    
    // In production:
    // 1. Store tokens securely in database
    // 2. Link to user account
    // 3. Redirect to success page or return tokens
    
    // Redirect to success page with tokens (or return JSON for SPA)
    const redirectUrl = new URL('/auth/success', request.url);
    redirectUrl.searchParams.set('platform', platform);
    
    // Don't include tokens in URL for production - use secure cookies/session
    // This is for demo purposes:
    // redirectUrl.searchParams.set('access_token', tokenData.access_token);
    
    return NextResponse.redirect(redirectUrl);
    
    // For API-only response (SPA):
    // return NextResponse.json({
    //   success: true,
    //   platform: tokenData.platform,
    //   access_token: tokenData.access_token,
    //   refresh_token: tokenData.refresh_token,
    //   expires_at: tokenData.expires_at,
    //   scope: tokenData.scope
    // });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect to error page
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', 'token_exchange_failed');
    errorUrl.searchParams.set('message', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.redirect(errorUrl);
  }
}
