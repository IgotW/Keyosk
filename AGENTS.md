# ORDERING SYSTEM - PROJECT RULES

## 1. Project Overview

Build a simple Product Ordering System just like kiosk on the fast food restaurant.

## 2. Technology Stack

Backend:

- Laravel REST API
- PHP
- PostgreSQL
- Laravel Sanctum

Frontend:

- React
- Vite
- Tailwind CSS
- Axios
- React Router

Testing:

- Pest or PHPUnit
- Vitest

## 3. Project Architecture

- Backend and frontend must remain separate.
- Laravel handles all business logic.
- PostgreSQL stores persistent data.
- React consumes Laravel REST APIs.
- Never connect React directly to PostgreSQL.
- Never place database credentials in frontend code.

## 4. Backend Conventions

- Follow Laravel conventions.
- Use Eloquent ORM.
- Use migrations for database changes.
- Use Form Requests for validation.
- Use API Resources for responses.
- Use policies or middleware for authorization.
- Use transactions for order creation.
- Follow RESTful API conventions.

## 5. Frontend Conventions

- Use reusable React components.
- Use React Router for navigation.
- Use Axios for API requests.
- Centralize API configuration.
- Handle loading and error states.
- Implement responsive layouts.
- Do not hardcode backend records.

## 6. Database Rules

- Use PostgreSQL.
- Define appropriate foreign keys.
- Use proper relationships.
- Prevent negative stock.
- Preserve product price at checkout.
- Validate quantities and stock.
- Never reset or drop an existing database
  without explicit approval.

## 7. Security

- Never expose passwords or secrets.
- Validate all incoming requests.
- Enforce server-side authorization.
- Customers must only access their own orders.
- Admin endpoints must require admin authorization.
- Never trust frontend validation alone.

## 8. Agentic Coding Workflow

For every significant task:

1. Inspect the existing project.
2. Read relevant documentation.
3. Identify the affected modules.
4. Create an implementation plan.
5. Delegate specialized tasks when useful.
6. Implement in small increments.
7. Run relevant tests.
8. Fix identified issues.
9. Review changes.
10. Report completion accurately.

## 9. Agent Responsibilities

Backend Developer:

- Laravel implementation and API testing.

Frontend Developer:

- React UI and API integration.

Database Engineer:

- Schema, migrations, relationships, integrity.

QA Engineer:

- Testing, debugging, and code review.

## 10. Important Restrictions

- Do not invent requirements.
- Ask questions when critical requirements are missing.
- Avoid unnecessary packages.
- Avoid unnecessary architecture complexity.
- Never claim tests passed without executing them.
- Do not commit or push without approval.
- Do not perform destructive operations without approval.

## 11. Documentation

Keep these files updated:

- docs/REQUIREMENTS.md
- docs/DATABASE_DESIGN.md
- docs/API_DOCUMENTATION.md
- docs/IMPLEMENTATION_PLAN.md
- docs/QA_REPORT.md
