/**
 * OAuth Token Refresh Route Handler
 * 
 * Refreshes an expired access token using a refresh token.
 * 
 * POST /api/auth/[platform]/refresh
 * Body: { refresh_token: string }
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
    }
  });
  
  if (stderr && !stdout) {
    throw new Error(stderr);
  }
  
  return JSON.parse(stdout);
}

/**
 * POST /api/auth/[platform]/refresh
 * Refresh access token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform.toLowerCase();
    const body = await request.json();
    
    if (!body.refresh_token) {
      return NextResponse.json(
        { error: 'refresh_token is required' },
        { status: 400 }
      );
    }
    
    const tokenData = await runOAuthFlow(platform, 'refresh', {
      refresh_token: body.refresh_token
    });
    
    return NextResponse.json({
      success: true,
      platform: tokenData.platform,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
