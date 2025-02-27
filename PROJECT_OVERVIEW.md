# ComfyUI Station - LLM Agent Overview

This document provides essential information for LLM agents working with the ComfyUI Station codebase.

## Project Overview

ComfyUI Station is a comprehensive management platform for ComfyUI instances, built with modern web technologies. It provides:

- Multi-instance ComfyUI management
- Workflow execution and monitoring
- Resource tracking and optimization
- User and permission management
- AI-powered assistance
- Internationalization support

## Architecture

### Frontend (Next.js App Router)

```
app/
├── [locale]/           # Internationalized routes
│   ├── layout.tsx     # Root layout with providers
│   └── ...           # Page components
├── api/               # API routes
└── manifest.ts        # App manifest

components/
├── ui/               # Base UI components (Radix UI)
├── ui-ext/           # Extended UI components
└── ...              # Feature-specific components

hooks/                # Custom React hooks
states/               # Global state management (Zustand)
utils/                # Utility functions
```

### Backend (Bun + Elysia + tRPC)

```
server/
├── routers/          # tRPC route handlers
├── services/         # Business logic
├── handlers/         # Request handlers
├── middlewares/      # Custom middlewares
└── workers/          # Background workers

entities/
├── repositories/     # Database repositories
└── *.ts             # MikroORM entities

## Build Configuration

### Next.js Configuration

- Standalone output for optimal production deployment
- React compiler optimization in production
- Internationalization with next-intl
- Memory-optimized webpack cache configuration
```

## Key Technologies

1. Frontend

   - Next.js 15 (React 19)
   - TypeScript
   - TailwindCSS
   - Radix UI
   - next-intl
   - React Query
   - Zustand

2. Backend
   - Bun runtime
   - Elysia
   - tRPC
   - MikroORM + LibSQL
   - LangChain

## Important Patterns

### 1. Data Flow

- Client → tRPC Router → Service → Repository → Database
- Changes trigger real-time updates via state management

### 2. Component Structure

- Presentational components in `components/`
- Business logic in hooks and services
- Global state in `states/`

### 3. Database Operations

- Entities define data structure
- Repositories handle data access
- MikroORM manages relationships

### 4. Authentication & Authorization

- NextAuth.js for authentication
- Token-based API access
- Role-based permissions

## Guidelines for LLM Agents

### 1. File Modifications

- Keep locale strings in `languages/` directory
- Update entity schemas in `entities/`
- Follow component directory structure
- Place new endpoints in appropriate tRPC routers

### 2. Code Patterns

```typescript
// Component Pattern
export function ComponentName({ prop1, prop2 }: Props) {
  // Use hooks at the top
  const someState = useYourHook()

  // Business logic in the middle
  const handleSomething = () => {
    // Implementation
  }

  // Render at the bottom
  return (
    // JSX
  )
}

// Service Pattern
export class YourService {
  constructor(private repository: Repository) {}

  async performAction() {
    // Implementation with error handling
    try {
      return await this.repository.action()
    } catch (error) {
      // Error handling
    }
  }
}
```

### 3. Important Files to Consider

- `app/[locale]/layout.tsx` - Root layout with providers
- `server/trpc.ts` - tRPC configuration
- `mikro-orm.config.ts` - Database configuration
- `states/*.ts` - Global state management
- `next.config.js` - Next.js and build configuration
  - Internationalization setup
  - Production optimizations
  - Webpack configurations:
    - Memory cache settings
    - Node.js polyfills
    - ts-morph optimization
- `components/ui/*` - Base UI components

### 4. Common Tasks

1. Adding New Features

   - Create component(s) in appropriate directory
   - Add needed database entities
   - Implement tRPC endpoints
   - Update translations

2. Modifying Workflows

   - Check `entities/workflow.ts`
   - Update corresponding services
   - Consider real-time updates

3. UI Changes

   - Use Radix UI components as base
   - Follow TailwindCSS patterns
   - Consider mobile responsiveness

4. API Endpoints
   - Add to appropriate tRPC router
   - Implement service logic
   - Add input validation
   - Consider error handling

## Development Flow

1. Local Development

   ```bash
   bun dev           # Start all services
   bun dev:next      # Frontend only
   bun dev:trpc      # Backend only
   ```

2. Database Changes

   ```bash
   bun mikro migration:create   # Create migration
   bun mikro migration:up       # Apply migrations
   ```

3. Code Quality
   ```bash
   bun lint         # Run ESLint
   bun format       # Run Prettier
   ```

## Error Handling

Always use proper error handling patterns:

```typescript
try {
  await someOperation()
} catch (error) {
  if (error instanceof KnownError) {
    // Handle known error
  } else {
    // Log and handle unexpected error
  }
}
```

## Performance Considerations

1. Use React Query for data fetching
2. Implement proper data pagination
3. Optimize database queries
4. Consider caching strategies
5. Lazy load components when possible

## Security Notes

1. Always validate user input
2. Use proper authentication checks
3. Implement rate limiting
4. Follow CORS policies
5. Handle sensitive data properly

This overview should help LLM agents understand the project structure and maintain consistency while working with the codebase.
