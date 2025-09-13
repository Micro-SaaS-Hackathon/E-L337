import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all subtasks with deadlines for tasks in this team
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select(`
        *,
        tasks!inner (
          id,
          title,
          team_id
        )
      `)
      .eq('tasks.team_id', teamId)
      .not('deadline', 'is', null)
      .order('deadline');

    if (subtasksError) {
      throw subtasksError;
    }

    // Get user profiles for assigned team members
    let subtasksWithUsers = subtasks || [];
    
    if (subtasks && subtasks.length > 0) {
      const assignedUserIds = subtasks
        .filter(s => s.assigned_to)
        .map(s => s.assigned_to);

      if (assignedUserIds.length > 0) {
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (!usersError && users) {
          subtasksWithUsers = subtasks.map(subtask => {
            if (subtask.assigned_to) {
              const userProfile = users.users.find(u => u.id === subtask.assigned_to);
              return {
                ...subtask,
                assigned_user: userProfile ? {
                  id: userProfile.id,
                  email: userProfile.email || 'Unknown',
                  raw_user_meta_data: userProfile.user_metadata || {}
                } : null
              };
            }
            return subtask;
          });
        }
      }
    }

    return NextResponse.json({ subtasks: subtasksWithUsers });
  } catch (error: any) {
    console.error('Error fetching team subtasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
