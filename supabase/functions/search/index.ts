import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    const type = url.searchParams.get('type')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')))
    const offset = (page - 1) * limit

    if (!q) {
      return new Response(
        JSON.stringify({ success: false, error: 'VALIDATION_ERROR', message: 'Query parameter q is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: Record<string, any> = {}
    const searches: Promise<void>[] = []

    if (!type || type === 'users') {
      searches.push(
        supabaseAdmin
          .from('profiles')
          .select('id, username, full_name, bio, avatar_url, location', { count: 'exact' })
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,bio.ilike.%${q}%`)
          .range(offset, offset + limit - 1)
          .then(r => { results.users = { data: r.data || [], total: r.count || 0 } })
      )
    }

    if (!type || type === 'events') {
      searches.push(
        supabaseAdmin
          .from('events')
          .select('id, title, description, event_date, location, category, cover_image_url', { count: 'exact' })
          .eq('is_public', true)
          .or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`)
          .range(offset, offset + limit - 1)
          .then(r => { results.events = { data: r.data || [], total: r.count || 0 } })
      )
    }

    if (!type || type === 'posts') {
      searches.push(
        supabaseAdmin
          .from('posts')
          .select('id, title, content, type, cover_image_url, created_at', { count: 'exact' })
          .eq('is_published', true)
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .range(offset, offset + limit - 1)
          .then(r => { results.posts = { data: r.data || [], total: r.count || 0 } })
      )
    }

    await Promise.all(searches)

    return new Response(
      JSON.stringify({
        success: true,
        data: { query: q, type: type || 'all', results },
        pagination: { page, limit }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_SERVER_ERROR', message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
