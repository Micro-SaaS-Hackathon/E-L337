export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get the task and verify access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', task.team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
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

    // Get tasks for the team
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('team_id', teamId)
      .order('position');

    if (tasksError) {
      throw tasksError;
    }

    // Get user information for assigned tasks
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue without user info rather than failing completely
    }

    // Add user information to tasks
    const tasksWithUsers = tasks.map(task => {
      if (!task.assigned_to || !users) {
        return task;
      }
      
      const assignedUser = users.users.find(u => u.id === task.assigned_to);
      return {
        ...task,
        assigned_user: assignedUser ? {
          id: assignedUser.id,
          email: assignedUser.email,
          raw_user_meta_data: assignedUser.user_metadata
        } : null
      };
    });

    return NextResponse.json({ tasks: tasksWithUsers });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
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
    const { team_id, title, description, status = 'todo', assigned_to, deadline } = body;

    if (!team_id || !title) {
      return NextResponse.json(
        { error: 'Team ID and title are required' },
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

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        team_id,
        title,
        description,
        status,
        assigned_to,
        deadline: deadline ? new Date(deadline).toISOString() : null
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, title, description, status, assigned_to, deadline } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get the task and verify access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', task.team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the task
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline).toISOString() : null;

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
