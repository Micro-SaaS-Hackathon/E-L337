import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    const { task_id, team_id } = body;

    if (!task_id || !team_id) {
      return NextResponse.json(
        { error: 'Task ID and Team ID are required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all unassigned subtasks for the task
    const { data: unassignedSubtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', task_id)
      .is('assigned_to', null)
      .order('position');

    if (subtasksError) {
      throw subtasksError;
    }

    // Get team members with their metadata
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role
      `)
      .eq('team_id', team_id);

    if (membersError) {
      throw membersError;
    }

    // Get user profiles for team members
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    const teamMembersWithProfiles = teamMembers.map(member => {
      const userProfile = users.users.find(u => u.id === member.user_id);
      return {
        ...member,
        profile: userProfile
      };
    });

    if (unassignedSubtasks.length === 0) {
      return NextResponse.json({ message: 'No unassigned subtasks found' });
    }

    if (teamMembersWithProfiles.length === 0) {
      return NextResponse.json({ error: 'No team members found' }, { status: 400 });
    }

    // Simple round-robin allocation algorithm for subtasks
    const allocatedSubtasks = [];
    const memberSubtaskCounts = teamMembersWithProfiles.map(() => 0);

    for (let i = 0; i < unassignedSubtasks.length; i++) {
      const subtask = unassignedSubtasks[i];
      
      // Find the member with the least subtasks assigned
      const minSubtaskCount = Math.min(...memberSubtaskCounts);
      const assigneeIndex = memberSubtaskCounts.findIndex(count => count === minSubtaskCount);
      const assignee = teamMembersWithProfiles[assigneeIndex];

      // Update the subtask with assignment
      const { data: updatedSubtask, error: updateError } = await supabase
        .from('subtasks')
        .update({
          assigned_to: assignee.user_id
        })
        .eq('id', subtask.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating subtask:', updateError);
        continue;
      }

      // Create subtask assignment record
      await supabase
        .from('subtask_assignments')
        .insert({
          subtask_id: subtask.id,
          assigned_to: assignee.user_id,
          assigned_by: user.id
        });

      allocatedSubtasks.push(updatedSubtask);
      memberSubtaskCounts[assigneeIndex]++;
    }

    return NextResponse.json({ 
      message: `Successfully allocated ${allocatedSubtasks.length} subtasks`,
      allocatedSubtasks 
    });

  } catch (error: any) {
    console.error('Error allocating subtasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
