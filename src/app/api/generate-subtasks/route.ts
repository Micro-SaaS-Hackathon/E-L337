import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

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
    const { task_id } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get the task and verify access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
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

    // Generate subtasks using AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const prompt = `
You are an expert project manager. Break down this task into specific, actionable subtasks that follow a LOGICAL SEQUENTIAL ORDER:

Task Title: "${task.title}"
Task Description: "${task.description || 'No description provided'}"

CRITICAL REQUIREMENTS:

1. SEQUENTIAL ORDER: Create subtasks that follow a logical step-by-step progression where each subtask naturally leads to the next. The subtasks should be ordered so that completing them in sequence makes the most sense for project workflow.

2. JUSTIFICATION FOR EVERY SUBTASK: Every subtask you create must have a clear, logical reason and purpose. You must ensure that:
- Each subtask directly contributes to completing the main task with a specific purpose
- Every subtask is necessary and not just "nice to have" - it must be essential for the task completion
- The approach and implementation details you suggest have justified reasons for being included
- Each subtask description should briefly indicate WHY this subtask is needed to complete the main task

Create the appropriate number of specific subtasks needed to complete this main task effectively. Each subtask should be:
- Small, specific, and actionable
- Focused on one clear deliverable or action
- Something that can be completed and checked off
- More detailed than the main task
- Ordered in a logical sequence that represents the natural workflow progression
- Structured so that deadlines can be assigned sequentially (first subtask has earliest deadline, last subtask has latest deadline)

IMPORTANT: List the subtasks in the order they should logically be completed. The first subtask in your array should be the first thing that needs to be done, and the last subtask should be the final step.

Ensure subtasks are decomposed so that multiple team members can work simultaneously on different aspects of the same goal without dependencies or conflicts. Generate as many or as few subtasks as needed based on the complexity and scope of the main task.

Format your response as a JSON array of subtask objects, where each subtask has:
- title: A clear, concise subtask title (keep it under 60 characters)
- description: A brief description explaining WHAT needs to be accomplished and WHY it's necessary for the main task (1-2 sentences with reasoning)

Example format:
[
  {
    "title": "Research competitor solutions",
    "description": "Analyze 3-5 similar products to understand common features and user expectations because this knowledge is essential for creating a competitive and user-friendly solution."
  },
  {
    "title": "Create initial mockups",
    "description": "Design basic wireframes showing the main user interface layout because visual planning prevents development rework and ensures all team members understand the intended design direction."
  }
]

Return only the JSON array, no additional text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean the response to extract JSON
    if (text.startsWith('```json')) {
      text = text.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }

    try {
      const subtasks = JSON.parse(text);
      
      // Get team members for auto-assignment
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role
        `)
        .eq('team_id', task.team_id);

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
      
      // Create subtasks in the database with auto-assignment
      const createdSubtasks = [];
      const memberSubtaskCounts = teamMembersWithProfiles.map(() => 0);

      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        
        // Auto-assign to team member using round-robin if we have team members
        let assignedTo = null;
        if (teamMembersWithProfiles.length > 0) {
          const minSubtaskCount = Math.min(...memberSubtaskCounts);
          const assigneeIndex = memberSubtaskCounts.findIndex(count => count === minSubtaskCount);
          const assignee = teamMembersWithProfiles[assigneeIndex];
          assignedTo = assignee.user_id;
          memberSubtaskCounts[assigneeIndex]++;
        }

        // Calculate SEQUENTIAL deadlines: 1-2 days depending on task complexity
        // Estimate complexity based on description length and position in sequence
        const descriptionLength = subtask.description?.length || 0;
        const isComplexTask = descriptionLength > 150 || subtask.title.toLowerCase().includes('research') || 
                             subtask.title.toLowerCase().includes('design') || subtask.title.toLowerCase().includes('implement');
        
        const deadlineDate = new Date();
        const baseDays = 1; // Start 1 day from now for the first subtask
        const daysForThisTask = isComplexTask ? 2 : 1; // 2 days for complex tasks, 1 day for simple tasks
        const totalDaysFromNow = baseDays + (i * daysForThisTask);
        deadlineDate.setDate(deadlineDate.getDate() + totalDaysFromNow);

        const { data: createdSubtask, error: subtaskError } = await supabase
          .from('subtasks')
          .insert({
            task_id,
            title: subtask.title,
            description: subtask.description,
            position: i,
            assigned_to: assignedTo,
            deadline: deadlineDate.toISOString(),
            status: 'todo',
            priority: 'medium'
          })
          .select()
          .single();

        if (!subtaskError && createdSubtask) {
          // Create subtask assignment record if assigned
          if (assignedTo) {
            await supabase
              .from('subtask_assignments')
              .insert({
                subtask_id: createdSubtask.id,
                assigned_to: assignedTo,
                assigned_by: user.id
              });
          }
          
          createdSubtasks.push(createdSubtask);
        }
      }

      return NextResponse.json({ 
        subtasks: createdSubtasks,
        message: `Generated ${createdSubtasks.length} subtasks and assigned them to team members`
      });
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate subtasks' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error generating subtasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
