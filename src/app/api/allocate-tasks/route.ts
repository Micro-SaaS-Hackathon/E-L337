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
    const { team_id } = body;

    if (!team_id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
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

    // Get all unassigned tasks for the team
    const { data: unassignedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('team_id', team_id)
      .is('assigned_to', null)
      .order('position');

    if (tasksError) {
      throw tasksError;
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
    const userIds = teamMembers.map(member => member.user_id);
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

    if (unassignedTasks.length === 0) {
      return NextResponse.json({ message: 'No unassigned tasks found' });
    }

    if (teamMembersWithProfiles.length === 0) {
      return NextResponse.json({ error: 'No team members found' }, { status: 400 });
    }

    // Simple round-robin allocation algorithm
    const allocatedTasks = [];
    const memberTaskCounts = teamMembersWithProfiles.map(() => 0);

    for (let i = 0; i < unassignedTasks.length; i++) {
      const task = unassignedTasks[i];
      
      // Find the member with the least tasks assigned
      const minTaskCount = Math.min(...memberTaskCounts);
      const assigneeIndex = memberTaskCounts.findIndex(count => count === minTaskCount);
      const assignee = teamMembersWithProfiles[assigneeIndex];

      // Calculate deadline (7-14 days from now based on task complexity)
      const baseDeadlineDays = 7;
      const maxDeadlineDays = 14;
      const deadlineDays = Math.min(baseDeadlineDays + Math.floor(i / 2), maxDeadlineDays);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);

      // Update the task with assignment
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({
          assigned_to: assignee.user_id,
          deadline: deadline.toISOString()
        })
        .eq('id', task.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating task:', updateError);
        continue;
      }

      // Add user information to the task
      const assignedUser = teamMembersWithProfiles.find(m => m.user_id === assignee.user_id);
      const taskWithUser = {
        ...updatedTask,
        assigned_user: assignedUser?.profile ? {
          id: assignedUser.profile.id,
          email: assignedUser.profile.email,
          raw_user_meta_data: assignedUser.profile.user_metadata
        } : null
      };

      // Create task assignment record
      await supabase
        .from('task_assignments')
        .insert({
          task_id: task.id,
          assigned_to: assignee.user_id,
          assigned_by: user.id
        });

      allocatedTasks.push(taskWithUser);
      memberTaskCounts[assigneeIndex]++;
    }

    return NextResponse.json({ 
      message: `Successfully allocated ${allocatedTasks.length} tasks`,
      allocatedTasks 
    });

  } catch (error: any) {
    console.error('Error allocating tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
