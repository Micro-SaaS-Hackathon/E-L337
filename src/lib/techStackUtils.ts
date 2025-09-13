export const TECH_STACK_NAMES: Record<string, string> = {
  // Frontend Frameworks
  'react': 'React',
  'nextjs': 'Next.js',
  'vue': 'Vue.js',
  'angular': 'Angular',
  'svelte': 'Svelte',
  'gatsby': 'Gatsby',

  // Frontend Styling
  'tailwind': 'Tailwind CSS',
  'shadcn': 'shadcn/ui',
  'mui': 'Material-UI',
  'chakra': 'Chakra UI',
  'styled-components': 'Styled Components',
  'sass': 'Sass/SCSS',
  'emotion': 'Emotion',

  // State Management
  'redux': 'Redux Toolkit',
  'zustand': 'Zustand',
  'context': 'React Context',
  'recoil': 'Recoil',
  'jotai': 'Jotai',

  // Build Tools
  'vite': 'Vite',
  'webpack': 'Webpack',
  'parcel': 'Parcel',
  'rollup': 'Rollup',

  // Backend Languages
  'typescript': 'TypeScript/Node.js',
  'python': 'Python',
  'java': 'Java',
  'csharp': 'C#/.NET',
  'go': 'Go',
  'rust': 'Rust',

  // Backend Frameworks
  'express': 'Express.js',
  'fastify': 'Fastify',
  'nestjs': 'NestJS',
  'koa': 'Koa.js',
  'hapi': 'Hapi.js',
  'django': 'Django',
  'fastapi': 'FastAPI',
  'flask': 'Flask',
  'tornado': 'Tornado',
  'pyramid': 'Pyramid',
  'spring': 'Spring Boot',
  'quarkus': 'Quarkus',
  'micronaut': 'Micronaut',
  'aspnet': 'ASP.NET Core',
  'minimal-api': 'Minimal APIs',
  'gin': 'Gin',
  'echo': 'Echo',
  'fiber': 'Fiber',
  'actix': 'Actix Web',
  'warp': 'Warp',
  'rocket': 'Rocket',

  // Databases
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'supabase': 'Supabase',
  'firebase': 'Firebase Firestore',
  'dynamodb': 'DynamoDB',

  // Authentication
  'supabase-auth': 'Supabase Auth',
  'firebase-auth': 'Firebase Auth',
  'auth0': 'Auth0',
  'jwt': 'JWT + Custom',
  'passport': 'Passport.js',

  // Cloud Providers
  'vercel': 'Vercel',
  'netlify': 'Netlify',
  'aws': 'Amazon Web Services',
  'gcp': 'Google Cloud Platform',
  'azure': 'Microsoft Azure',
  'railway': 'Railway',
  'render': 'Render',

  // Hosting Types
  'static': 'Static Hosting',
  'serverless': 'Serverless Functions',
  'containers': 'Container Hosting',
  'vps': 'VPS/Dedicated',

  // CDN
  'cloudflare': 'Cloudflare',
  'aws-cloudfront': 'AWS CloudFront',
  'vercel-edge': 'Vercel Edge Network',

  // Payment
  'stripe': 'Stripe',
  'paypal': 'PayPal',
  'square': 'Square',
  'razorpay': 'Razorpay',

  // Message Queue
  'redis-queue': 'Redis Queue',
  'rabbitmq': 'RabbitMQ',
  'aws-sqs': 'AWS SQS',
  'kafka': 'Apache Kafka',

  // Analytics
  'google-analytics': 'Google Analytics',
  'mixpanel': 'Mixpanel',
  'amplitude': 'Amplitude',

  // Testing
  'jest': 'Jest',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  'vitest': 'Vitest',
};

export function getTechStackDisplayName(key: string): string {
  // Return predefined display name if it exists
  if (TECH_STACK_NAMES[key]) {
    return TECH_STACK_NAMES[key];
  }
  
  // For AI-generated tech stack items that aren't in our predefined list,
  // format them nicely by capitalizing and handling common separators
  return key
    .split(/[-_\s]+/) // Split on hyphens, underscores, and spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
