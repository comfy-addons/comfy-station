# Comfy Station Project Overview

## Project Architecture

This is a modern web application built with Next.js 15+ (App Router), TypeScript, and a microservices architecture. The project appears to be a workflow management system with client monitoring capabilities.

### Key Technologies

- **Frontend**: Next.js with TypeScript
- **Backend**: tRPC for type-safe API communication
- **Database**: MikroORM for database management
- **UI**: Custom components with Tailwind CSS
- **Containerization**: Docker with multi-stage builds
- **Internationalization**: Built-in i18n support for multiple languages (en, vi, zh)
- **Search**: Fast-fuzzy search implementation

## Directory Structure

### Core Directories

```
app/                  - Next.js app directory (App Router)
├── [locale]/        - Internationalized routes
├── api/             - API routes
└── manifest.ts      - PWA manifest configuration

components/          - React components
├── ui/             - Core UI components
├── ui-ext/         - Extended UI components
├── dialogs/        - Modal/dialog components
└── svg/            - SVG assets

server/             - Backend server implementation
├── routers/        - tRPC route handlers
├── services/       - Business logic services
├── migrations/     - Database migrations
└── workers/        - Background workers

entities/           - Database entity definitions
├── repositories/   - Custom repository implementations
└── *.ts           - Entity definitions (user, workflow, etc.)

states/            - Application state management
hooks/             - Custom React hooks
utils/             - Utility functions
types/             - TypeScript type definitions
```

### Key Features

1. **FastSwitch System**
   - Command palette-style workflow switcher (Ctrl+K)
   - Fuzzy search functionality
   - Quick number shortcuts (Ctrl+1 to Ctrl+5)
   - Workflow preview with avatars
   - Real-time workflow filtering
   - Keyboard-first navigation

2. **Workflow Management**
   - Workflow visualization
   - Task management
   - Event tracking
   - API snippet generation

3. **Client Monitoring**
   - Resource monitoring
   - GPU monitoring
   - Status events
   - Action events

4. **User System**
   - Authentication
   - Notifications
   - Token-based permissions
   - Client associations

5. **Asset Management**
   - Attachment handling
   - Image galleries
   - Tag management
   - File uploading

## Key Components

### FastSwitch Implementation

The FastSwitch component (`components/FastSwitch.tsx`) provides a powerful command palette for quick workflow switching:

```typescript
Features:
- Global access via Ctrl+K shortcut
- Fuzzy search using fast-fuzzy library
- Quick selection via Ctrl+1 to Ctrl+5
- Rich workflow previews with avatars and descriptions
- Integrated with tRPC for real-time workflow data
- Responsive keyboard navigation
```

State Management:
```typescript
interface IWorkflowState {
  fastSwitchOpen: boolean
  setFastSwitchOpen: (open: boolean) => void
  // ... other workflow state
}
```

### Other Key Frontend Components

- `WorkflowVisualize/` - Workflow visualization components
- `ClientInfoMonitoring.tsx` - Client monitoring interface
- `GenerativeTextarea.tsx` - AI-assisted text input
- `UserNotificationCenter.tsx` - User notification management

### Backend Services

The server implements several key services:

1. **Authentication & Authorization**
   - Token-based authentication
   - Permission management
   - User session handling

2. **Workflow Engine**
   - Task scheduling
   - Event processing
   - Status tracking

3. **Monitoring System**
   - Resource usage tracking
   - GPU monitoring
   - Event logging

### Database Structure

Key entities include:

- `user.ts` - User accounts
- `workflow.ts` - Workflow definitions
- `workflow_task.ts` - Individual workflow tasks
- `client.ts` - Client information
- `client_monitor_event.ts` - Monitoring events
- `attachment.ts` - File attachments
- `token.ts` - Authentication tokens

## Development Setup

The project uses several configuration files:

- `docker-compose.yml` - Container orchestration
- `nginx.conf` - Nginx configuration
- `mikro-orm.config.ts` - Database configuration
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template

### Container Setup

The project includes two Dockerfile configurations:
- `server.dockerfile` - Backend service container
- `webapp.dockerfile` - Frontend application container

## International Support

Supports multiple languages through the `languages/` directory:
- English (en)
- Vietnamese (vi)
- Chinese (zh)

## State Management

The application uses custom state management through the `states/` directory:
- `app.ts` - Core application state
- `workflow.ts` - Workflow-specific state
- `engine.ts` - Engine state management
- `connection.ts` - Connection state
- `search.ts` - Search functionality state

## Development Guidelines

1. Follow TypeScript strict mode guidelines
2. Use provided UI components from `components/ui`
3. Implement translations for all user-facing strings
4. Follow the established entity structure for database changes
5. Use tRPC procedures for API endpoints
6. Implement proper error handling using the provided utilities
7. Follow the established workflow patterns for new features

## Notes for LLM Agents

When working with this project:

1. Check `types/` directory for TypeScript definitions
2. Review `entities/` for database structure
3. Use existing hooks in `hooks/` directory
4. Follow established patterns in `components/`
5. Maintain i18n support for new features
6. Use the existing state management system
7. Follow the error handling patterns established
8. Leverage the FastSwitch system for workflow navigation
9. Consider keyboard shortcuts and accessibility

## Performance Considerations

1. Use memo and callback hooks appropriately
2. Implement proper loading states
3. Handle error boundaries
4. Consider debouncing for search inputs
5. Use proper image optimization with Next.js
6. Follow the established patterns for data fetching
7. Consider mobile responsiveness