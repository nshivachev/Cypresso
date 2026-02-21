Project Name: Cypresso
Default Installation Path: ./Cypresso
Mode: Generate Only / Dry-Run

Goal:
Bootstrap the complete Cypresso project from scratch in the current directory with all folders, agents, skills, instructions, templates, package.json, database schema, and Web UI workflow. Populate all agents and skills with minimal functional prompts so the project is immediately usable for generating Cypress tests, exporting, QA validation, user feedback, and test management with persistent database storage.

Technologies:

- Frontend: React + Next.js + TailwindCSS + TypeScript
- Backend: Node.js API routes (Next.js) to invoke Plan + Agents
- Database: Prisma ORM + PostgreSQL/SQLite for test persistence
- Agents: TestGeneratorAgent, ExportAgent, QAValidationAgent, UIFeedbackAgent, TestManagerAgent
- Skills: validate-test, export-test, ui-feedback, filter-tests
- Templates: base-test-template.ts
- Self-validation and retry loops

Workflow Steps:

1. **Bootstrap Project Structure**
   - Create ./Cypresso folder
   - Create folders: agents/, skills/, instructions/, plans/, templates/, prisma/
   - Self-validate folder creation
   - Retry up to 2 times if failed

2. **Generate Database Configuration**
   - Create `prisma/schema.prisma` with GeneratedTest, ValidationIssue, ExportLog models
   - Create `.env.local` template with DATABASE_URL placeholder
   - Create `src/lib/db.ts` Prisma client initialization
   - Self-validation: ensure database files exist and schema is valid
   - Log: "Database schema and client configured"

3. **Generate Agents with Minimal Prompts**
   - TestGeneratorAgent.md → generate Cypress test code from user story (TypeScript, describe/it, at least one assertion) + save to database with testId
   - ExportAgent.md → export generated test code to {targetProject}/cypress/e2e/ and log export to database
   - QAValidationAgent.md → validate generated test (syntax, idempotence, optional run) and store validation issues
   - UIFeedbackAgent.md → provide user feedback and logs, with database tracking
   - TestManagerAgent.md → manage test lifecycle (filter, search, update, delete) and ensure CRUD operations maintain data integrity
   - Populate each agent with functional placeholder prompts including DB operations
   - Self-validation: ensure agent files exist and contain prompt content with database logic

4. **Generate Skills with Minimal Prompts**
   - validate-test.md → rules for test validation with database persistence
   - export-test.md → rules for export with database logging
   - ui-feedback.md → rules for feedback display with test history from database
   - filter-tests.md → rules for filtering and searching tests by text, status, and date range
   - Self-validation: ensure skill files exist and contain content

5. **Generate Instructions**
   - instructions.md → global coding rules, TypeScript standards, self-validation, retry logic, and database operation guidelines

6. **Generate Templates**
   - templates/base-test-template.ts → basic Cypress TypeScript test skeleton

7. **Generate Plan for Web UI Workflow**
   - plans/cypresso-full-workflow.md → workflow:
     1. Take user story from Web UI input
     2. Invoke TestGeneratorAgent (with DB save) → ExportAgent (with DB logging) → QAValidationAgent (with DB validation storage) → UIFeedbackAgent (with DB history)
     3. Provide self-validation and retry loops
     4. Display real-time status and logs in Web UI
     5. Load and display saved tests from database

8. **Web UI Setup**
   - React + Next.js + TailwindCSS + TypeScript frontend
   - Dashboard components:
     - User story input field
     - Buttons: Generate Test, Retry, Export
     - Logs/status panel with real-time updates
     - Saved Tests section displaying database records
     - Test detail view with validation issues and export history
     - Filter controls: search input, status dropdown, date range pickers, clear filters button
     - Edit modal: full-screen overlay with userStory and testCode textareas, save/cancel buttons
     - Test card actions: Load, Edit, Delete
   - API routes to backend:
     - POST `/api/generate` → invoke TestGeneratorAgent, save to database
     - POST `/api/validate` → invoke QAValidationAgent, store issues
     - POST `/api/export` → invoke ExportAgent, log export
     - GET `/api/tests` → retrieve saved tests with filter/search support
     - GET `/api/tests?search=&status=&dateFrom=&dateTo=` → filtered test retrieval
     - PUT `/api/tests/{testId}` → update test userStory and/or testCode
     - DELETE `/api/tests/{testId}` → remove test from database
     - GET `/api/tests/{testId}` → retrieve test details with history
   - Self-validation for frontend components and API connectivity
   - Database migration check on app startup

9. **Package.json Setup**
   - Include dependencies: next, react, typescript, tailwindcss, prisma, @prisma/client
   - Include dev dependencies: prettier, eslint, ts-node
   - Include scripts: dev, build, start, prisma migrate dev, prisma generate
   - Self-validation: ensure package.json contains all required dependencies

10. **Database Migration Setup**
    - Create migration directory: `prisma/migrations/`
    - Generate initial migration from schema
    - Create `.env.local` instructions for users
    - Self-validation: ensure migrations can be applied
    - Log: "Database migrations ready for execution"

11. **Self-Validation**
    - Confirm all folders exist (agents/, skills/, instructions/, plans/, templates/, prisma/)
    - Confirm all agent files exist and include database logic
    - Confirm all skill files exist
    - Confirm instructions.md exists
    - Confirm templates exist
    - Confirm package.json includes database dependencies
    - Confirm Prisma schema is valid
    - Confirm API routes include database operations
    - Retry missing or failed files up to 3 times
    - Log success/failure for each step

Global Rules:

- Use fixed project name: Cypresso
- Use current directory (./Cypresso) as installation path
- All files must follow TypeScript standards
- Agents and Skills must be modular and reusable
- Generated tests must be idempotent
- All test data must be persisted to database with appropriate metadata
- Database operations must include error handling and retry logic
- Web UI must display real-time workflow status, logs, and database-backed test history
- Retry failed steps automatically according to defined limits
- Plan does NOT execute agents or workflow in Dry-Run mode
- Plan does NOT run database migrations in Dry-Run mode (only validates schema)

Database Integration Checklist:

- Prisma schema with GeneratedTest, ValidationIssue, ExportLog models
- Database client initialization (db.ts)
- Environment configuration template (.env.local)
- Migration files ready for execution
- All agents include database save/log operations
- All API routes include database queries
- Web UI displays saved tests from database
- Error handling for all database operations
- Retry logic for failed database saves
- Filter/search API with query parameters (search, status, dateFrom, dateTo)
- Case-insensitive text search (JavaScript-level for SQLite compatibility)
- Date range filtering with proper UTC day boundaries
- PUT endpoint for updating test userStory and testCode
- Edit modal in Web UI with save/cancel functionality
- Filter controls with auto-reload on state change
- QA validation rules for filter and update functionality
