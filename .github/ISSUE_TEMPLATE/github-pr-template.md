# NCS B2B E-Commerce Platform - Pull Request Template

## Overview
**Brief Description**: <!-- One-line summary of what this PR accomplishes -->

**Type of Change**: <!-- Check one that applies -->
- [ ] **Feature** - New functionality or enhancement (REQ-XXX)
- [ ] **Fix** - Bug fix or technical issue resolution
- [ ] **Chore** - Maintenance, refactoring, or build/CI changes
- [ ] **Docs** - Documentation updates or API specifications
- [ ] **Test** - Test additions or modifications

## Requirements Traceability
**Related Issues**: <!-- Link GitHub issues this PR addresses -->
- Closes #XXX
- Addresses #XXX
- Related to #XXX

**REQ Coverage**: <!-- List applicable requirement IDs from project board -->
- [ ] REQ-RFQ-001: Customer RFQ submission
- [ ] REQ-RFQ-002: Admin quote management interface
- [ ] REQ-RFQ-003: Customer quote approval workflow
- [ ] REQ-ORD-001: Order creation from approved quotes
- [ ] REQ-ORD-002: Multi-level approval system
- [ ] REQ-PAY-003: Automated Thai tax invoice generation
- [ ] REQ-PTY-001: Partner registration and portal setup
- [ ] REQ-CAT-001: Product catalog with technical specifications
- [ ] REQ-INV-001: Real-time inventory management
- [ ] REQ-REP-001: Sales analytics and reporting dashboard
- [ ] REQ-FE-001: Initial Frontend Build and Local Server Verification

## Technical Details

### Architecture Impact
**Layer Changes**: <!-- Check all that apply -->
- [ ] **Frontend** (Next.js/React components)
- [ ] **Backend** (NestJS modules/controllers/services)
- [ ] **Database** (Prisma schema/migrations)
- [ ] **Infrastructure** (Docker/CI/CD/Environment)
- [ ] **API Contracts** (OpenAPI/DTOs)

### Database Changes
- [ ] **Prisma Schema Update**: <!-- Describe schema changes -->
- [ ] **Migration Required**: <!-- Migration name and description -->
- [ ] **Data Seeding**: <!-- New seed data or changes -->

### Dependencies
**New Dependencies**: <!-- List any new npm packages added -->
- Package: `package-name@version` - Purpose: Brief explanation

**Environment Variables**: <!-- List any new .env variables -->
- `VARIABLE_NAME`: Description and default value

## Implementation Details

### Backend Changes
<!-- Describe NestJS modules, controllers, services modified -->
- **Modules**: 
- **Controllers**: 
- **Services**: 
- **DTOs**: 

### Frontend Changes
<!-- Describe React components, pages, hooks modified -->
- **Pages**: 
- **Components**: 
- **Hooks/Utils**: 
- **Styling**: 

### API Changes
<!-- List new or modified endpoints -->
- `GET /api/endpoint` - Description
- `POST /api/endpoint` - Description
- `PUT /api/endpoint` - Description
- `DELETE /api/endpoint` - Description

## Testing Strategy

### Manual Testing Completed
- [ ] **Local Development**: All changes tested locally
- [ ] **Docker Compose**: Full stack verified in containers
- [ ] **Database Integration**: Prisma client and migrations tested
- [ ] **API Endpoints**: All endpoints tested with proper request/response
- [ ] **Frontend Integration**: UI components render and function correctly

### Automated Testing
- [ ] **Unit Tests**: New/updated tests for business logic
- [ ] **Integration Tests**: API endpoint tests
- [ ] **E2E Tests**: Critical user flows validated
- [ ] **CI Pipeline**: All GitHub Actions checks pass

### Thai Business Context Testing
- [ ] **PromptPay Integration**: QR code generation tested
- [ ] **Thai Tax Invoices**: PDF generation with proper VAT formatting
- [ ] **Localization**: Thai/English language support verified

## Quality Assurance

### Code Quality
- [ ] **ESLint**: No linting errors
- [ ] **TypeScript**: Strict type checking passes
- [ ] **Prettier**: Code formatting consistent
- [ ] **Build**: Production build successful

### Security Considerations
- [ ] **Environment Variables**: No secrets committed
- [ ] **Input Validation**: Proper sanitization implemented
- [ ] **Authentication**: JWT tokens handled securely
- [ ] **Authorization**: Role-based access controls verified

### Performance Impact
- [ ] **Database Queries**: Optimized and indexed appropriately
- [ ] **API Response Times**: Maintained <500ms target
- [ ] **Frontend Bundle**: No significant size increase
- [ ] **Memory Usage**: No memory leaks introduced

## Deployment Readiness

### Infrastructure
- [ ] **Docker Containers**: All services start and communicate properly
- [ ] **Health Checks**: Endpoint returns 200 OK
- [ ] **Environment Config**: All required variables documented

### Rollback Plan
**Rollback Steps**: <!-- Describe how to undo changes if needed -->
1. Revert commit: `git revert <commit-hash>`
2. Database rollback: `npx prisma migrate reset` (if applicable)
3. Environment cleanup: Remove new environment variables

## Documentation Updates
- [ ] **README**: Updated with new setup instructions
- [ ] **API Documentation**: OpenAPI spec updated
- [ ] **Environment Templates**: .env.example files updated
- [ ] **Deployment Guide**: Docker/infrastructure changes documented

## Project Board Updates
**Issues to Move**: <!-- List issues that should be moved to "Done" -->
- Move issue #XXX to "Done" column
- Update issue #XXX status to "In Review"

**Next Steps**: <!-- What should be worked on next -->
- [ ] Follow-up issue for: Description
- [ ] Integration with: Component/System
- [ ] Documentation for: Feature/Process

## Commit Message Format
This PR follows conventional commit format:
```
type(scope): description

- feat(auth): implement JWT authentication endpoints
- fix(prisma): resolve database connection timeout
- chore(ci): update GitHub Actions workflow
- docs(api): add OpenAPI specification for RFQ endpoints
```

## Review Checklist (For Reviewers)
- [ ] **Code Review**: Logic is sound and follows project patterns
- [ ] **Architecture**: Changes align with modular monolith design
- [ ] **Database**: Schema changes are backward compatible
- [ ] **Security**: No vulnerabilities introduced
- [ ] **Testing**: Adequate test coverage provided
- [ ] **Documentation**: Changes are properly documented
- [ ] **Performance**: No performance regressions

## Post-Merge Actions
- [ ] Update project board status
- [ ] Deploy to staging environment
- [ ] Notify stakeholders of changes
- [ ] Schedule user acceptance testing (if applicable)

---

**Confidence Level**: <!-- High/Medium/Low --> confidence in this implementation
**Risk Assessment**: <!-- Low/Medium/High --> risk of introducing issues
**Timeline Impact**: This PR <!-- does not impact / delays / accelerates --> the January 11, 2026 launch target

**Additional Notes**: 
<!-- Any additional context, concerns, or future considerations -->