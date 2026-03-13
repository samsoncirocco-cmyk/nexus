import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

/**
 * GET /api/platforms/linkedin/callback
 * 
 * Handles LinkedIn OAuth callback after user authorization.
 * Exchanges authorization code for access token and stores credentials.
 * 
 * Query Parameters:
 * - code: Authorization code from LinkedIn
 * - state: State parameter for CSRF protection
 * - error: (optional) Error code if user denied
 * - error_description: (optional) Error description
 * 
 * Flow:
 * 1. Validate state parameter against stored value
 * 2. Retrieve PKCE verifier
 * 3. Exchange code for tokens via Python script
 * 4. Fetch user profile
 * 5. Store connection in platform_connections table
 * 6. Redirect to dashboard with success/error
 * 
 * Success Redirect:
 * /dashboard?linkedin=connected
 * 
 * Error Redirect:
 * /dashboard?linkedin=error&message=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Handle OAuth errors (user denied, etc.)
    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/dashboard?linkedin=error&message=${encodeURIComponent(errorDescription || error)}`
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?linkedin=error&message=Missing authorization code or state`
      );
    }
    
    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Retrieve stored state and PKCE verifier
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id, pkce_verifier, expires_at')
      .eq('state', state)
      .eq('platform', 'linkedin')
      .single();
    
    if (stateError || !stateData) {
      console.error('OAuth state not found:', stateError);
      return NextResponse.redirect(
        `${baseUrl}/dashboard?linkedin=error&message=Invalid or expired session`
      );
    }
    
    // Check if state has expired
    if (new Date(stateData.expires_at) < new Date()) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard?linkedin=error&message=Session expired, please try again`
      );
    }
    
    const userId = stateData.user_id;
    const pkceVerifier = stateData.pkce_verifier;
    
    // Exchange code for tokens using Python script
    const scriptPath = path.join(process.cwd(), 'execution', 'oauth', 'linkedin_flow.py');
    
    const pythonProcess = spawn('python3', [
      scriptPath,
      'handle_callback',
      code,
      state,
      pkceVerifier
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
      console.error('LinkedIn token exchange failed:', stderr);
      
      // Parse error from Python script
      let errorMessage = 'Failed to complete LinkedIn authorization';
      try {
        const errorData = JSON.parse(stderr);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Use default error message
      }
      
      return NextResponse.redirect(
        `${baseUrl}/dashboard?linkedin=error&message=${encodeURIComponent(errorMessage)}`
      );
    }
    
    // Parse token result
    const tokenResult = JSON.parse(stdout);
    
    // Fetch user profile
    const profileProcess = spawn('python3', [
      scriptPath,
      'get_profile',
      tokenResult.access_token
    ]);
    
    let profileStdout = '';
    let profileStderr = '';
    
    profileProcess.stdout.on('data', (data) => {
      profileStdout += data.toString();
    });
    
    profileProcess.stderr.on('data', (data) => {
      profileStderr += data.toString();
    });
    
    const profileExitCode = await new Promise<number>((resolve) => {
      profileProcess.on('close', resolve);
    });
    
    let profileData = null;
    if (profileExitCode === 0) {
      profileData = JSON.parse(profileStdout);
    } else {
      console.error('Failed to fetch LinkedIn profile:', profileStderr);
      // Continue without profile - not critical
    }
    
    // Store connection in database
    const { error: upsertError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'linkedin',
        platform_user_id: profileData?.id || null,
        access_token: tokenResult.access_token,
        refresh_token: tokenResult.refresh_token,
        token_expires_at: tokenResult.expires_at,
        scopes: tokenResult.scope,
        connection_status: 'connected',
        profile_data: profileData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      });
    
    if (upsertError) {
      console.error('Failed to store LinkedIn connection:', upsertError);
      return NextResponse.redirect(
        `${baseUrl}/dashboard?linkedin=error&message=Failed to save connection`
      );
    }
    
    // Clean up OAuth state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state);
    
    // Redirect to dashboard with success
    const displayName = profileData 
      ? `${profileData.first_name} ${profileData.last_name}`
      : 'LinkedIn';
    
    return NextResponse.redirect(
      `${baseUrl}/dashboard?linkedin=connected&name=${encodeURIComponent(displayName)}`
    );
    
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/dashboard?linkedin=error&message=Internal server error`
    );
  }
}

/**
 * POST /api/platforms/linkedin/callback
 * 
 * Alternative callback handler for scenarios requiring POST.
 * Accepts JSON body with code and state.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;
    
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state' },
        { status: 400 }
      );
    }
    
    // Create a new URL with query parameters for GET handler
    const callbackUrl = new URL('/api/platforms/linkedin/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);
    
    // Call GET handler logic
    const mockRequest = new NextRequest(callbackUrl);
    return GET(mockRequest);
    
  } catch (error) {
    console.error('LinkedIn callback POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
