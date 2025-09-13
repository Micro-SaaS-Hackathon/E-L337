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

    // Get team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId);

    if (membersError) {
      throw membersError;
    }

    // Get user profiles for team members
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    const membersWithProfiles = teamMembers.map(member => {
      const userProfile = users.users.find(u => u.id === member.user_id);
      return {
        id: member.user_id,
        email: userProfile?.email || 'Unknown',
        name: userProfile?.user_metadata?.full_name || userProfile?.email?.split('@')[0] || 'Unknown',
        field: userProfile?.user_metadata?.field || 'Not specified',
        role: member.role,
        joined_at: member.joined_at
      };
    });

    return NextResponse.json({ members: membersWithProfiles });

  } catch (error: any) {
    console.error('Error fetching team members:', error);
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { team_id, email, role = 'member' } = body;

    if (!team_id || !email) {
      return NextResponse.json(
        { error: 'Team ID and email are required' },
        { status: 400 }
      );
    }

    // Verify user is an admin or owner of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Find the user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    const targetUser = users.users.find(u => u.email === email);
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User with this email not found. They need to create an account first.' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team_id)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 }
      );
    }

    // Add user to team
    const { data: newMember, error: addError } = await supabase
      .from('team_members')
      .insert({
        team_id,
        user_id: targetUser.id,
        role
      })
      .select()
      .single();

    if (addError) {
      throw addError;
    }

    return NextResponse.json({ 
      message: 'User added to team successfully',
      member: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.user_metadata?.full_name || targetUser.email?.split('@')[0] || 'Unknown',
        field: targetUser.user_metadata?.field || 'Not specified',
        role: newMember.role,
        joined_at: newMember.joined_at
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
