/**
 * Generic OAuth API Route Handler for Next.js App Router
 * 
 * This single route template handles OAuth flows for ANY configured platform.
 * Platform is determined from the URL path: /api/auth/[platform]/route
 * 
 * Supports:
 *   POST /api/auth/[platform]        - Initiate OAuth flow
 *   GET  /api/auth/[platform]/callback - Handle OAuth callback
 *   POST /api/auth/[platform]/refresh  - Refresh access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Path to the generic OAuth flow handler
const OAUTH_SCRIPT = path.join(process.cwd(), 'execution/oauth/oauth_flow.py');

interface OAuthInitiateRequest {
  user_id: string;
  redirect_after?: string;
}

interface OAuthRefreshRequest {
  refresh_token: string;
}

/**
 * Helper to execute the Python OAuth flow handler
 */
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
      // Ensure platform-specific env vars are available
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
 * POST /api/auth/[platform]
 * Initiate OAuth flow - returns authorization URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform.toLowerCase();
    const body: OAuthInitiateRequest = await request.json();
    
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }
    
    // Call the generic OAuth flow handler
    const result = await runOAuthFlow(platform, 'initiate', {
      user_id: body.user_id
    });
    
    // Store state/verifier temporarily (in production: Redis/DB)
    // For now, return them to the client for callback
    return NextResponse.json({
      success: true,
      auth_url: result.auth_url,
      state: result.state,
      pkce_verifier: result.pkce_verifier,
      expires_at: result.expires_at,
      platform: result.platform
    });
    
  } catch (error) {
    console.error('OAuth initiate error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
