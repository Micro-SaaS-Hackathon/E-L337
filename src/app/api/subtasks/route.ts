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
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify user has access to the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', taskId)
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

    // Get subtasks for the task
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position');

    if (subtasksError) {
      throw subtasksError;
    }

    return NextResponse.json({ subtasks: subtasks || [] });
  } catch (error: any) {
    console.error('Error fetching subtasks:', error);
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
    const { task_id, title, description, position } = body;

    if (!task_id || !title) {
      return NextResponse.json(
        { error: 'Task ID and title are required' },
        { status: 400 }
      );
    }

    // Verify user has access to the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('team_id')
      .eq('id', task_id)
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

    // Create the subtask
    const { data: subtask, error: subtaskError } = await supabase
      .from('subtasks')
      .insert({
        task_id,
        title,
        description,
        position: position || 0
      })
      .select()
      .single();

    if (subtaskError) {
      throw subtaskError;
    }

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating subtask:', error);
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
    const { id, title, description, is_completed, position } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subtask ID is required' }, { status: 400 });
    }

    // Get the subtask and verify access
    const { data: subtask, error: subtaskError } = await supabase
      .from('subtasks')
      .select(`
        task_id,
        tasks!inner (
          team_id
        )
      `)
      .eq('id', id)
      .single();

    if (subtaskError || !subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', (subtask as any).tasks.team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the subtask
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (position !== undefined) updateData.position = position;

    const { data: updatedSubtask, error: updateError } = await supabase
      .from('subtasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ subtask: updatedSubtask });
  } catch (error: any) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: 'Subtask ID is required' }, { status: 400 });
    }

    // Get the subtask and verify access
    const { data: subtask, error: subtaskError } = await supabase
      .from('subtasks')
      .select(`
        task_id,
        tasks!inner (
          team_id
        )
      `)
      .eq('id', id)
      .single();

    if (subtaskError || !subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', (subtask as any).tasks.team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the subtask
    const { error: deleteError } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
