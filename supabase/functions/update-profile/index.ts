import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check active subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!subscription) {
      return new Response(
        JSON.stringify({ success: false, error: 'SUBSCRIPTION_REQUIRED', message: 'Please subscribe to access this feature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const allowedFields = ['username', 'full_name', 'bio', 'phone', 'location', 'website']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    // Check profile completeness
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name, bio')
      .eq('id', userData.user.id)
      .maybeSingle()

    const merged = { ...existing, ...updates }
    const isComplete = ['username', 'full_name', 'bio'].every(f => merged[f] && merged[f].trim() !== '')
    if (isComplete) updates.is_profile_complete = true

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userData.user.id)
      .select()
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'UPDATE_FAILED', message: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: { profile: data } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_SERVER_ERROR', message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
