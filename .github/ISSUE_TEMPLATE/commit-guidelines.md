# NCS B2B E-Commerce Platform - Commit Message Guidelines

## Conventional Commit Format
Follow this format for all commits to maintain consistency and enable automated changelog generation:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Commit Types

### Primary Types
- **feat**: New feature or enhancement (REQ-XXX implementation)
- **fix**: Bug fix or issue resolution
- **chore**: Maintenance, refactoring, dependencies, build system
- **docs**: Documentation updates, API specs, README changes
- **test**: Adding or modifying tests
- **ci**: CI/CD pipeline changes, GitHub Actions updates
- **perf**: Performance improvements
- **refactor**: Code refactoring without feature changes
- **style**: Code formatting, linting fixes (no logic changes)

### Special Types
- **db**: Database schema changes, migrations, seeding
- **api**: API contract changes, OpenAPI updates
- **env**: Environment configuration changes
- **docker**: Container configuration updates
- **security**: Security-related changes

## Scope Guidelines

### Backend Scopes
- **auth**: Authentication and authorization
- **prisma**: Database schema, migrations, ORM
- **api**: API endpoints, controllers, services
- **rfq**: Request for Quote workflow
- **orders**: Order management
- **payments**: Payment processing, PromptPay
- **invoices**: Thai tax invoice generation
- **catalog**: Product catalog management
- **companies**: Multi-tenant company features
- **partners**: Partner registration and management

### Frontend Scopes
- **ui**: User interface components
- **pages**: Page components and routing
- **hooks**: Custom React hooks
- **utils**: Utility functions and helpers
- **styles**: CSS, styling, design system
- **forms**: Form components and validation
- **admin**: Admin interface components

### Infrastructure Scopes
- **docker**: Docker Compose, containers
- **ci**: GitHub Actions, workflows
- **env**: Environment variables, configuration
- **build**: Build system, bundling
- **deploy**: Deployment scripts and configuration

## Description Guidelines

### Good Commit Messages
```bash
feat(auth): implement JWT authentication with refresh tokens
fix(prisma): resolve database connection timeout in production
chore(deps): upgrade NestJS to v10.0.0 for security patches
docs(api): add OpenAPI specification for RFQ endpoints
test(orders): add integration tests for order creation workflow
ci(github): add automated testing for pull requests
db(schema): add Company and User models with relationships
```

### Bad Commit Messages (Avoid These)
```bash
fix bug
update code
changes
work in progress
minor fixes
stuff
```

## Body Guidelines (Optional)
Use the body to explain **what** and **why**, not **how**:

```
feat(payments): add PromptPay QR code generation

Implements REQ-PAY-001 for Thai payment processing.
Integrates with PromptPay API to generate scannable QR codes
at checkout. Includes webhook handling for payment confirmation
and automatic order status updates.

Closes #15
```

## Footer Guidelines (Optional)

### Breaking Changes
```
feat(api): restructure authentication endpoints

BREAKING CHANGE: Authentication endpoints moved from /auth to /api/v1/auth
```

### Issue References
```
fix(orders): prevent duplicate order creation

Fixes race condition where rapid clicks could create duplicate orders.

Fixes #42
Closes #43
Related to #44
```

### REQ Traceability
```
feat(catalog): implement product search with filters

Implements REQ-CAT-001 for product catalog with technical specifications.
Adds advanced search functionality with SKU, name, and specification filters.

REQ-CAT-001
```

## Special Commit Patterns

### Database Migrations
```
db(prisma): add User and Company models with relationships

- Create User model with email, password, role fields
- Create Company model with multi-tenant structure
- Add foreign key relationships and indexes
- Migration: 20250926073411_init

Migration-Name: 20250926073411_init
REQ-001, REQ-002
```

### API Contract Changes
```
api(contracts): add RFQ workflow DTOs and endpoints

- Add CreateRFQDto, UpdateRFQDto, RFQResponseDto
- Define OpenAPI schemas for quote management
- Update API specification to v0.2

API-Version: v0.2
REQ-RFQ-001, REQ-RFQ-002
```

### CI/CD Updates
```
ci(github): add parallel backend and frontend testing

- Configure matrix builds for Node.js versions
- Add caching for npm dependencies
- Implement status checks for branch protection
- Skip backend tests when only frontend changes

Workflow: .github/workflows/ci.yml
```

### Environment Configuration
```
env(config): add PromptPay and Thai tax invoice settings

- Add PROMPTPAY_QR_KEY for payment QR generation
- Add THAI_TAX_INVOICE_TEMPLATE configuration
- Update .env.example with new variables

Config-Files: .env.example, backend/.env.example
```

## Multi-Component Commits
For changes affecting multiple areas:

```
feat(full-stack): implement complete RFQ workflow

Backend:
- Add RFQ models and migrations (Prisma)
- Implement RFQ controllers and services
- Add JWT authentication middleware

Frontend:
- Create RFQ submission form components
- Add quote status tracking pages
- Implement customer quote approval flow

Database:
- Migration: 20250926_add_rfq_tables
- Seed sample RFQ data

REQ-RFQ-001, REQ-RFQ-002, REQ-RFQ-003
Closes #25, #26, #27
```

## Release and Tagging Commits
```
chore(release): v0.1.0 - Week 1 Foundation Complete

- Docker Compose infrastructure operational
- Prisma ORM integration with database migrations  
- NestJS application structure with TypeScript
- Health endpoints and development environment
- CI/CD pipeline ahead of schedule
- Ready for Week 2 business logic development

Position: Day 3 completion, 85% timeline confidence
Launch-Target: January 11, 2026 Achievable
```

## Hotfix Commits
```
fix(critical): resolve production database connection failure

Emergency fix for connection pool exhaustion in production.
Increases max connections and adds connection retry logic.

Severity: Critical
Environment: Production
Rollback: Available via git revert
```

## Automation Integration
These commit patterns enable:
- Automated changelog generation
- Version bumping based on commit types
- REQ traceability in project board
- CI/CD pipeline optimization
- Release note generation

## Quick Reference

### Daily Development
```bash
# Feature work
git commit -m "feat(auth): add user registration endpoint"

# Bug fixes  
git commit -m "fix(prisma): handle connection timeout gracefully"

# Maintenance
git commit -m "chore(deps): update typescript to v5.1.3"

# Database changes
git commit -m "db(schema): add Product model with categories"

# API updates
git commit -m "api(rfq): add quote approval endpoints"
```

### Before Push Checklist
- [ ] Commit message follows conventional format
- [ ] Scope is appropriate and consistent
- [ ] Description is clear and actionable
- [ ] REQ IDs included when applicable
- [ ] Issue numbers referenced when closing issues
- [ ] Breaking changes noted in footer
- [ ] Migration names included for database changes