import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get teams where user is a member
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        role,
        teams (
          id,
          name,
          description,
          created_by,
          created_at,
          tech_stack
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    // Get member count for each team
    const teamsWithCounts = await Promise.all(
      (data || []).map(async (item: any) => {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', item.teams.id);

        return {
          id: item.teams.id,
          name: item.teams.name,
          description: item.teams.description,
          created_by: item.teams.created_by,
          created_at: item.teams.created_at,
          tech_stack: item.teams.tech_stack,
          role: item.role,
          member_count: count || 0
        };
      })
    );

    return NextResponse.json({ teams: teamsWithCounts });
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, tech_stack } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Create the team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        tech_stack: tech_stack || null,
        created_by: user.id
      })
      .select()
      .single();

    if (teamError) {
      if (teamError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Team name already exists. Please choose a different name.' },
          { status: 409 }
        );
      }
      throw teamError;
    }

    return NextResponse.json({ team: teamData }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
