import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { promisify } from 'util';

const execFile = promisify(require('child_process').execFile);

interface PostRequest {
  content: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

/**
 * POST /api/post/linkedin - Publish content to LinkedIn
 * 
 * DOE Framework: Orchestration layer handles auth, calls execution script for posting
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: PostRequest = await request.json();
    
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json(
        { error: 'missing_content', message: 'Content is required' },
        { status: 400 }
      );
    }

    // Get user ID
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Retrieve stored connection from database
    const supabaseScriptPath = join(process.cwd(), 'execution', 'utils', 'supabase_client.py');
    
    const { stdout: connectionStdout, stderr: connectionStderr } = await execFile('python3', [
      supabaseScriptPath,
      '--action=get',
      `--user_id=${userId}`,
      '--platform=linkedin',
    ], {
      timeout: 10000,
      env: process.env,
    });

    if (connectionStderr) {
      console.error('Get connection stderr:', connectionStderr);
    }

    const connection = JSON.parse(connectionStdout);

    if (!connection) {
      return NextResponse.json(
        { error: 'not_connected', message: 'LinkedIn account not connected' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      // Token expired - attempt refresh
      console.log('Token expired, attempting refresh...');
      
      if (!connection.refresh_token) {
        return NextResponse.json(
          { error: 'token_expired_no_refresh', message: 'Token expired and no refresh token available' },
          { status: 401 }
        );
      }

      const oauthScriptPath = join(process.cwd(), 'execution', 'oauth', 'linkedin_flow.py');
      
      const { stdout: refreshStdout, stderr: refreshStderr } = await execFile('python3', [
        oauthScriptPath,
        '--action=refresh',
        `--refresh_token=${connection.refresh_token}`,
      ], {
        timeout: 30000,
        env: {
          ...process.env,
          LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
          LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
        }
      });

      if (refreshStderr) {
        console.error('Token refresh stderr:', refreshStderr);
      }

      const refreshData = JSON.parse(refreshStdout);

      if (refreshData.error) {
        console.error('Token refresh failed:', refreshData);
        return NextResponse.json(
          { error: 'refresh_failed', message: 'Failed to refresh access token' },
          { status: 401 }
        );
      }

      // Update connection with new tokens
      const updatedConnectionData = {
        user_id: userId,
        platform: 'linkedin',
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || connection.refresh_token,
        expires_at: refreshData.expires_at,
        scopes: refreshData.scope || connection.scopes,
        platform_user_id: connection.platform_user_id,
        metadata: connection.metadata,
      };

      await execFile('python3', [
        supabaseScriptPath,
        '--action=store',
        `--data=${JSON.stringify(updatedConnectionData)}`,
      ], {
        timeout: 10000,
        env: process.env,
      });

      // Use the new access token
      connection.access_token = refreshData.access_token;
    }

    // Call execution script to post content
    const oauthScriptPath = join(process.cwd(), 'execution', 'oauth', 'linkedin_flow.py');
    
    const { stdout, stderr } = await execFile('python3', [
      oauthScriptPath,
      '--action=post',
      `--access_token=${connection.access_token}`,
      `--content=${body.content}`,
    ], {
      timeout: 30000,
      env: process.env,
    });

    if (stderr) {
      console.error('LinkedIn post stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    if (result.error) {
      // Handle specific LinkedIn API errors
      if (result.status_code === 401) {
        // Token revoked or invalid
        await execFile('python3', [
          supabaseScriptPath,
          '--action=store',
          `--data=${JSON.stringify({
            user_id: userId,
            platform: 'linkedin',
            connection_status: 'revoked',
          })}`,
        ], {
          timeout: 10000,
          env: process.env,
        });

        return NextResponse.json(
          { error: 'token_revoked', message: 'LinkedIn connection revoked. Please reconnect.' },
          { status: 401 }
        );
      }

      if (result.status_code === 429) {
        return NextResponse.json(
          { error: 'rate_limited', message: 'LinkedIn API rate limit exceeded' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'post_failed', message: result.message || 'Failed to post to LinkedIn' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post_id: result.id,
      permalink: result.permalink,
      created_at: result.created_at,
      platform: 'linkedin',
    });

  } catch (error: unknown) {
    console.error('LinkedIn post error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'post_error', message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/post/linkedin - Get LinkedIn post history/status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    // Check connection status
    const supabaseScriptPath = join(process.cwd(), 'execution', 'utils', 'supabase_client.py');
    
    const { stdout } = await execFile('python3', [
      supabaseScriptPath,
      '--action=get',
      `--user_id=${userId}`,
      '--platform=linkedin',
    ], {
      timeout: 10000,
      env: process.env,
    });

    const connection = JSON.parse(stdout);

    return NextResponse.json({
      connected: !!connection && connection.connection_status === 'connected',
      can_post: !!connection && 
        connection.connection_status === 'connected' &&
        connection.scopes?.includes('w_member_social'),
      scopes: connection?.scopes || [],
    });

  } catch (error: unknown) {
    console.error('LinkedIn status error:', error);
    return NextResponse.json(
      { error: 'status_error', connected: false },
      { status: 500 }
    );
  }
}
