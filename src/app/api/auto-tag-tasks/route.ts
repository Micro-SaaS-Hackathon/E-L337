import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

const TECHNICAL_TAGS = [
  'Frontend',
  'Backend', 
  'Database',
  'Authentication',
  'DevOps',
  'Mobile',
  'Testing',
  'Design',
  'Security',
  'Data Science',
  'Machine Learning',
  'Infrastructure',
  'API',
  'UI/UX'
];

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
    const { task_id, title, description, team_id } = body;

    if (!task_id || !title) {
      return NextResponse.json(
        { error: 'Task ID and title are required' },
        { status: 400 }
      );
    }

    // Verify user has access to the team
    if (team_id) {
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', team_id)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get tags for the task
    const tags = await generateTaskTags(title, description || '');

    // Update the task with tags in the database
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ tags })
      .eq('id', task_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task tags:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task_id,
      tags,
      updated_task: updatedTask
    });

  } catch (error: any) {
    console.error('Error in auto-tag-tasks API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// New endpoint to re-tag all tasks for a team
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
    const { team_id } = body;

    if (!team_id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all tasks for the team
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description')
      .eq('team_id', team_id);

    if (tasksError) {
      throw tasksError;
    }

    const updatedTasks = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each task
    for (const task of tasks) {
      try {
        const tags = await generateTaskTags(task.title, task.description || '');
        
        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update({ tags })
          .eq('id', task.id)
          .select()
          .single();

        if (!updateError && updatedTask) {
          updatedTasks.push(updatedTask);
          successCount++;
        } else {
          errorCount++;
          console.error(`Error updating task ${task.id}:`, updateError);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing task ${task.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: tasks.length,
      successful: successCount,
      errors: errorCount,
      updated_tasks: updatedTasks
    });

  } catch (error: any) {
    console.error('Error in bulk auto-tag-tasks API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Extract tag generation logic to reusable function
async function generateTaskTags(title: string, description: string): Promise<string[]> {
  try {
    // Get codebase context for better tagging
    const codebaseContext = `
Our application is a Next.js project with the following technical stack and areas:

FRONTEND:
- Next.js 15 with React
- TypeScript
- Tailwind CSS
- Components: Authentication forms, Kanban boards, Task modals, Team management, User profiles, Onboarding forms
- UI/UX features: Drag and drop, responsive design, dark mode support

BACKEND:
- Next.js API routes
- Server-side rendering and server components
- API endpoints: tasks, teams, team members, subtasks, authentication callbacks
- Business logic for task management, team collaboration

DATABASE:
- Supabase (PostgreSQL)
- Tables: tasks, teams, team_members, subtasks, team_goals
- Features: Real-time subscriptions, row-level security, indexing
- Schema management and migrations

AUTHENTICATION:
- Supabase Auth with JWT tokens
- OAuth providers: Google, GitHub
- Email/password authentication
- User metadata and profile management
- Protected routes and API endpoints

DEVOPS & INFRASTRUCTURE:
- Deployment configuration
- Environment variables management
- Build and development processes
- Package management with npm

INTEGRATIONS:
- Google Gemini AI for task generation
- Real-time features with Supabase

TESTING & QUALITY:
- Code linting and formatting
- Type checking with TypeScript
- Error handling and validation

Based on this context, categorize technical tasks appropriately.
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an expert technical project manager analyzing a task to automatically assign relevant technical tags.

TASK TO ANALYZE:
Title: "${title}"
Description: "${description || 'No description provided'}"

AVAILABLE TAGS: ${TECHNICAL_TAGS.join(', ')}

CODEBASE CONTEXT:
${codebaseContext}

INSTRUCTIONS:
1. Analyze the task title and description
2. Determine which technical areas this task belongs to based on the codebase context
3. Assign 1-3 most relevant tags from the available tags list
4. Consider the technical implementation required, not just keywords

EXAMPLES:
- "Implement user login API" → ["Backend", "Authentication", "API"]
- "Create task card component" → ["Frontend", "UI/UX"]
- "Set up database tables for teams" → ["Database", "Backend"]
- "Add OAuth Google integration" → ["Authentication", "Backend", "API"]
- "Style the dashboard with responsive design" → ["Frontend", "Design", "UI/UX"]
- "Deploy application to production" → ["DevOps", "Infrastructure"]
- "Write unit tests for API endpoints" → ["Testing", "Backend"]
- "Implement real-time task updates" → ["Backend", "Database", "Frontend"]

Return ONLY a JSON array of tags, no additional text:
["tag1", "tag2", "tag3"]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response to get tags
    let tags: string[] = [];
    try {
      // Clean the response text
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      
      tags = JSON.parse(cleanText);
      
      // Validate tags are from our allowed list
      tags = tags.filter(tag => TECHNICAL_TAGS.includes(tag));
      
      // Ensure we have at least one tag, default to "Backend" if none match
      if (tags.length === 0) {
        tags = ['Backend'];
      }
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback: basic keyword matching
      tags = autoTagByKeywords(title, description || '');
    }

    return tags;

  } catch (error) {
    console.error('Error generating tags with AI:', error);
    // Fallback to keyword matching
    return autoTagByKeywords(title, description);
  }
}

// Fallback function for basic keyword matching
function autoTagByKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];

  // Frontend keywords
  if (text.match(/\b(component|react|ui|ux|frontend|client|interface|design|style|css|tailwind|responsive|form|modal|page|layout)\b/)) {
    tags.push('Frontend');
  }

  // Backend keywords  
  if (text.match(/\b(api|endpoint|server|backend|route|middleware|logic|service|controller)\b/)) {
    tags.push('Backend');
  }

  // Database keywords
  if (text.match(/\b(database|db|table|schema|query|migration|supabase|postgres|sql|index)\b/)) {
    tags.push('Database');
  }

  // Authentication keywords
  if (text.match(/\b(auth|login|register|oauth|token|session|user|sign|password|google|github)\b/)) {
    tags.push('Authentication');
  }

  // DevOps keywords
  if (text.match(/\b(deploy|deployment|infrastructure|docker|ci|cd|build|environment|config|setup)\b/)) {
    tags.push('DevOps');
  }

  // Testing keywords
  if (text.match(/\b(test|testing|unit|integration|spec|jest|cypress|qa|quality)\b/)) {
    tags.push('Testing');
  }

  // Security keywords
  if (text.match(/\b(security|secure|encryption|validation|sanitize|xss|csrf|vulnerability)\b/)) {
    tags.push('Security');
  }

  // Design keywords
  if (text.match(/\b(design|ui|ux|mockup|prototype|wireframe|visual|graphic|theme)\b/)) {
    tags.push('Design');
  }

  // API keywords
  if (text.match(/\b(api|rest|graphql|endpoint|request|response|webhook|integration)\b/)) {
    tags.push('API');
  }

  // Default to Backend if no tags found
  if (tags.length === 0) {
    tags.push('Backend');
  }

  return tags.slice(0, 3); // Limit to 3 tags maximum
}