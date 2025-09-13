import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTechStackDisplayName } from '@/lib/techStackUtils';

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
    const { team_id, goal } = body;

    if (!team_id || !goal) {
      return NextResponse.json(
        { error: 'Team ID and goal are required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the team and get team info
    const { data: teamInfo, error: teamError } = await supabase
      .from('teams')
      .select('id, name, description, tech_stack')
      .eq('id', team_id)
      .single();

    if (teamError || !teamInfo) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get team members and their roles/professions
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

    // Create the streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

          // Build tech stack context from team's selected technologies
          let techStackContext = '';
          if (teamInfo.tech_stack) {
            const stack = teamInfo.tech_stack;
            
            // Helper function to safely get display name or use the value as-is for AI-generated stacks
            const getDisplayName = (key: string): string => {
            const displayName = getTechStackDisplayName(key);
              // If getTechStackDisplayName returns the key unchanged, it means it's not in our predefined list
              // In that case, capitalize and format the key for better display
              if (displayName === key) {
                return key.split(/[-_]/).map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
              }
              return displayName;
            };

            // Build comprehensive tech stack listing
            const techStackSections = [];

            // Frontend section
            if (stack.frontend) {
              const frontendItems = [];
              if (stack.frontend.framework) {
                frontendItems.push(`Framework: ${getDisplayName(stack.frontend.framework)}`);
              }
              if (stack.frontend.styling && Array.isArray(stack.frontend.styling) && stack.frontend.styling.length > 0) {
                frontendItems.push(`Styling: ${stack.frontend.styling.map(getDisplayName).join(', ')}`);
              }
              if (stack.frontend.stateManagement) {
                frontendItems.push(`State Management: ${getDisplayName(stack.frontend.stateManagement)}`);
              }
              if (stack.frontend.buildTool) {
                frontendItems.push(`Build Tool: ${getDisplayName(stack.frontend.buildTool)}`);
              }
              
              if (frontendItems.length > 0) {
                techStackSections.push(`FRONTEND:\n${frontendItems.map(item => `- ${item}`).join('\n')}`);
              }
            }

            // Backend section
            if (stack.backend) {
              const backendItems = [];
              if (stack.backend.language) {
                backendItems.push(`Language: ${getDisplayName(stack.backend.language)}`);
              }
              if (stack.backend.framework) {
                backendItems.push(`Framework: ${getDisplayName(stack.backend.framework)}`);
              }
              if (stack.backend.database) {
                backendItems.push(`Database: ${getDisplayName(stack.backend.database)}`);
              }
              if (stack.backend.authentication) {
                backendItems.push(`Authentication: ${getDisplayName(stack.backend.authentication)}`);
              }
              
              if (backendItems.length > 0) {
                techStackSections.push(`BACKEND:\n${backendItems.map(item => `- ${item}`).join('\n')}`);
              }
            }

            // Cloud & DevOps section
            if (stack.cloud || stack.devops) {
              const cloudItems = [];
              if (stack.cloud?.provider) {
                cloudItems.push(`Provider: ${getDisplayName(stack.cloud.provider)}`);
              }
              if (stack.cloud?.hosting) {
                cloudItems.push(`Hosting: ${getDisplayName(stack.cloud.hosting)}`);
              }
              if (stack.cloud?.cdn) {
                cloudItems.push(`CDN: ${getDisplayName(stack.cloud.cdn)}`);
              }
              if (stack.devops?.ci_cd) {
                cloudItems.push(`CI/CD: ${getDisplayName(stack.devops.ci_cd)}`);
              }
              if (stack.devops?.containerization) {
                cloudItems.push(`Containerization: ${getDisplayName(stack.devops.containerization)}`);
              }
              if (stack.devops?.monitoring) {
                cloudItems.push(`Monitoring: ${getDisplayName(stack.devops.monitoring)}`);
              }
              
              if (cloudItems.length > 0) {
                techStackSections.push(`CLOUD & DEVOPS:\n${cloudItems.map(item => `- ${item}`).join('\n')}`);
              }
            }

            // Additional services section
            if (stack.optional) {
              const optionalItems = [];
              if (stack.optional.payment) {
                optionalItems.push(`Payment: ${getDisplayName(stack.optional.payment)}`);
              }
              if (stack.optional.messageQueue) {
                optionalItems.push(`Message Queue: ${getDisplayName(stack.optional.messageQueue)}`);
              }
              if (stack.optional.analytics) {
                optionalItems.push(`Analytics: ${getDisplayName(stack.optional.analytics)}`);
              }
              if (stack.optional.testing) {
                optionalItems.push(`Testing: ${getDisplayName(stack.optional.testing)}`);
              }
              
              if (optionalItems.length > 0) {
                techStackSections.push(`ADDITIONAL SERVICES:\n${optionalItems.map(item => `- ${item}`).join('\n')}`);
              }
            }

            if (techStackSections.length > 0) {
              techStackContext = `

IMPORTANT: This team is using the following technology stack:

${techStackSections.join('\n\n')}

GENERATE TASKS SPECIFICALLY FOR THIS TECH STACK. Use the exact technologies mentioned above in your task descriptions and make them highly specific to the chosen stack. Examples:
- For React: mention "React components", "React hooks", "JSX", "component state"
- For Next.js: mention "Next.js API routes", "server-side rendering", "static generation"
- For Express: mention "Express routes", "middleware", "Node.js server"
- For PostgreSQL: mention "PostgreSQL tables", "SQL queries", "database migrations"
- For MongoDB: mention "MongoDB collections", "aggregation pipelines", "document schemas"
- For cloud services: mention specific deployment patterns and service integrations

Tailor each task title and description to leverage the specific capabilities and patterns of these technologies.`;
            }
          }


const prompt = `
You are an expert technical project manager. A development team wants to achieve this goal: "${goal}"
${techStackContext}

Produce a SEQUENCED list of a reasonable number of TECHNICAL tasks (choose an appropriate count based on the goal's complexity — neither too many nor too few; typically 8–18). Do NOT force a fixed number if it would create artificial splitting or over-broad aggregation.

CRITICAL REQUIREMENT - JUSTIFICATION FOR EVERYTHING:
Every single task you create and every aspect of its description MUST have a clear, logical reason and purpose behind it. You must ensure that:
- Each task directly contributes to achieving the stated goal with a specific purpose
- Every technology choice, approach, or implementation detail you mention has a justified reason for being included
- Every task is necessary and not just "nice to have" - explain why it's essential
- The order and dependencies between tasks are logically justified based on technical requirements
- If you suggest a particular technology or pattern, it must be because it specifically serves the goal better than alternatives
- Each task description should briefly indicate WHY this task is needed to achieve the overall goal

Core requirements:

- Tasks must be technical (code, infrastructure, databases, APIs, CI/CD, tests, deployments, integrations).
- Every task must be TEAM-SCOPED and assigned to EXACTLY ONE primary team (e.g., "Backend Team", "Frontend Team", "DevOps Team", "Data Team", "QA Team"). No task should list multiple teams as co-owners.
- Tasks must be MUTUALLY EXCLUSIVE (no overlapping scopes) and collectively cover the path to the goal. Avoid duplicate or partially redundant responsibilities.
- Keep each task GENERAL at the team level: high enough to allow the team to create detailed subtasks, but not so broad that it spans multiple lifecycle phases (avoid "Build the entire platform") nor so granular that it becomes an engineer’s personal to-do list.
- Tailor titles and descriptions to the exact technologies and services mentioned in \${techStackContext}. Use the exact names from the tech stack.
- Order tasks logically from foundational setup to final deployment, respecting dependencies and natural development flow.
- Exclude non-technical items (meetings, stakeholder reviews, documentation-only tasks).
- No two tasks should claim responsibility for the same artifact boundary (e.g., do not have two tasks both owning "initial database schema").
- Favor deliverables with clear artifacts: schemas, migrations, API endpoints, service modules, infrastructure provisioning, CI/CD workflows, test suites, monitoring dashboards, deployment configurations.

Output format (must follow exactly):
Return ONLY a JSON array of task objects (no extra text). Each task object must include:
- "title": short technical title including relevant stack names and the team in parentheses
- "description": 1–2 sentence technical description that explains WHY this task is essential for the goal; mention the intended team and key stack elements; remain general so the team will derive subtasks; include purpose and reasoning
- "estimated_days": integer 1–15 representing effort (number)

Additional guidance:
- Keep descriptions concise (one or two sentences) but ensure they explain the purpose and necessity.
- Every description must answer "why is this task needed to achieve the goal?"
- Ensure strict non-overlap of scope between tasks.
- Use consistent team naming.
- Place dependent tasks strictly after their prerequisites.

Example (adapt to the provided tech stack):
[
  {
    "title": "Initialize PostgreSQL schema and Prisma models (Backend Team)",
    "description": "Backend Team defines the foundational database schema and Prisma models for core domain entities because all application data storage and relationships must be established before any API or frontend development can begin; indexing and fine-grained validations deferred to subtasks.",
    "estimated_days": 3
  },
  {
    "title": "Set up CI/CD pipeline with GitHub Actions and container build workflow (DevOps Team)",
    "description": "DevOps Team provisions GitHub Actions workflows for build, test, and image publishing because automated deployment and testing infrastructure is essential for team collaboration and reliable releases; deployment promotion logic handled in later deployment task.",
    "estimated_days": 4
  }
]

Return only the JSON array — no additional explanation or text.
`;


console.log('Generated Prompt:', prompt);


          const result = await model.generateContentStream(prompt);

          // Send initial status
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            status: 'generating',
            message: 'AI is analyzing your goal and generating tasks...' 
          })}\n\n`));

          let accumulatedText = '';
          
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            accumulatedText += chunkText;
          }

          // Send parsing status
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            status: 'parsing',
            message: 'Processing generated tasks...' 
          })}\n\n`));

          // Parse the complete response and create tasks
          try {
            // Clean the accumulated text to extract JSON
            let jsonText = accumulatedText.trim();
            if (jsonText.startsWith('```json')) {
              jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
            }
            
            const tasks = JSON.parse(jsonText);
            
            // Send task creation start status
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
              status: 'creating',
              message: `Creating ${tasks.length} tasks...`,
              totalTasks: tasks.length
            })}\n\n`));
            
            // Create tasks in the database one by one
            const createdTasks = [];
            for (let i = 0; i < tasks.length; i++) {
              const task = tasks[i];
              
              // Send status for current task being created
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                status: 'creating_task',
                message: `Creating task: ${task.title}`,
                currentTask: i + 1,
                totalTasks: tasks.length
              })}\n\n`));
              
              const { data: createdTask, error: taskError } = await supabase
                .from('tasks')
                .insert({
                  team_id,
                  title: task.title,
                  description: task.description,
                  status: 'todo',
                  position: i
                })
                .select()
                .single();

              if (!taskError && createdTask) {
                // Auto-tag the created task
                try {
                  const autoTagResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auto-tag-tasks`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authHeader.replace('Bearer ', '')}`
                    },
                    body: JSON.stringify({
                      task_id: createdTask.id,
                      title: createdTask.title,
                      description: createdTask.description,
                      team_id: team_id
                    })
                  });

                  if (autoTagResponse.ok) {
                    const tagResult = await autoTagResponse.json();
                    createdTask.tags = tagResult.tags;
                  }
                } catch (tagError) {
                  console.error('Error auto-tagging task:', tagError);
                  // Continue with task creation even if tagging fails
                }

                createdTasks.push(createdTask);

                // Send the created task to the client immediately
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                  status: 'task_created',
                  task: createdTask,
                  currentTask: i + 1,
                  totalTasks: tasks.length
                })}\n\n`));

                // Add a small delay for better UX animation
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }

            // Save the goal
            await supabase
              .from('team_goals')
              .insert({
                team_id,
                goal_text: goal,
                created_by: user.id,
                is_processed: true
              });

            // Send completion message
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
              status: 'complete',
              message: 'All tasks created successfully!',
              tasks: createdTasks 
            })}\n\n`));

          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
              status: 'error',
              error: 'Failed to parse AI response' 
            })}\n\n`));
          }

        } catch (error) {
          console.error('Error generating tasks:', error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            status: 'error',
            error: 'Failed to generate tasks' 
          })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in generate-tasks API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
