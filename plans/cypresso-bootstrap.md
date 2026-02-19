Project Name: Cypresso
Default Installation Path: ./Cypresso
Mode: Generate Only / Dry-Run

Goal:
Bootstrap the complete Cypresso project from scratch in the current directory with all folders, agents, skills, instructions, templates, package.json, and Web UI workflow. Populate all agents and skills with minimal functional prompts so the project is immediately usable for generating Cypress tests, exporting, QA validation, and user feedback. Allow the user to make final edits before actual workflow execution. Include self-validation and retry loops for all steps.

Technologies:

- Frontend: React + Next.js + TailwindCSS + TypeScript
- Backend: Node.js API routes (Next.js) to invoke Plan + Agents
- Agents: TestGeneratorAgent, ExportAgent, QAValidationAgent, UIFeedbackAgent
- Skills: validate-test, export-test, ui-feedback
- Templates: base-test-template.ts
- Self-validation and retry loops

Workflow Steps:

1. **Bootstrap Project Structure**
   - Create ./Cypresso folder
   - Create folders: agents/, skills/, instructions/, plans/, templates/
   - Self-validate folder creation
   - Retry up to 2 times if failed

2. **Generate Agents with Minimal Prompts**
   - TestGeneratorAgent.md → generate Cypress test code from user story (TypeScript, describe/it, at least one assertion)
   - ExportAgent.md → export generated test code to {targetProject}/cypress/e2e/
   - QAValidationAgent.md → validate generated test (syntax, idempotence, optional run)
   - UIFeedbackAgent.md → provide user feedback and logs
   - Populate each agent with functional placeholder prompts
   - Self-validation: ensure agent files exist and contain prompt content

3. **Generate Skills with Minimal Prompts**
   - validate-test.md → rules for test validation
   - export-test.md → rules for export
   - ui-feedback.md → rules for feedback display
   - Self-validation: ensure skill files exist and contain content

4. **Generate Instructions**
   - instructions.md → global coding rules, TypeScript standards, self-validation, and retry logic

5. **Generate Templates**
   - templates/base-test-template.ts → basic Cypress TypeScript test skeleton

6. **Generate Plan for Web UI Workflow**
   - plans/cypresso-full-workflow.md → workflow:
     1. Take user story from Web UI input
     2. Invoke TestGeneratorAgent → ExportAgent → QAValidationAgent → UIFeedbackAgent
     3. Provide self-validation and retry loops
     4. Display real-time status and logs in Web UI

7. **Web UI Setup**
   - React + Next.js + TailwindCSS + TypeScript frontend
   - Dashboard: user story input field, buttons (Generate Test, Retry, Export), logs/status panel
   - API routes to backend to trigger Plan + Agents
   - Self-validation for frontend components and API connectivity

8. **Self-Validation**
   - Confirm all folders, agents, skills, instructions, templates, and plans exist with content
   - Retry missing or failed files up to 3 times
   - Log success/failure for each step

Global Rules:

- Use fixed project name: Cypresso
- Use current directory (./Cypresso) as installation path
- All files must follow TypeScript standards
- Agents and Skills must be modular and reusable
- Generated tests must be idempotent
- Web UI must display real-time workflow status and logs
- Retry failed steps automatically according to defined limits
- Plan does NOT execute agents or workflow in Dry-Run mode
