# NCS B2B E-Commerce Platform - Issue Template

## Issue Type
**Select one that best describes this issue:**
- [ ] **Feature Request** (REQ-XXX) - New functionality or enhancement
- [ ] **Bug Report** - Something isn't working as expected
- [ ] **Technical Task** - Infrastructure, refactoring, or technical debt
- [ ] **Documentation** - Missing or unclear documentation
- [ ] **Question** - Need clarification or discussion

## Issue Summary
**Title Format**: `[TYPE] Brief description (REQ-XXX if applicable)`

**Description**: 
<!-- Provide a clear and concise description of the issue -->

## Requirements Traceability (if applicable)
**Requirement ID**: <!-- e.g., REQ-RFQ-001, REQ-PAY-003 -->
**Epic/Feature**: <!-- High-level feature this belongs to -->
**Priority**: <!-- High/Medium/Low -->

## For Feature Requests

### User Story
**As a** [type of user]
**I want** [goal/functionality]
**So that** [benefit/value]

### Acceptance Criteria
<!-- Define specific, testable criteria for completion -->
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]

### Technical Requirements
**Backend Changes Required:**
- [ ] Prisma schema updates
- [ ] New API endpoints
- [ ] Business logic implementation
- [ ] Database migrations
- [ ] Authentication/authorization

**Frontend Changes Required:**
- [ ] New pages/components
- [ ] Form handling
- [ ] State management
- [ ] API integration
- [ ] UI/UX updates

**Infrastructure Changes:**
- [ ] Environment variables
- [ ] Docker configuration  
- [ ] CI/CD pipeline updates
- [ ] Third-party integrations

## For Bug Reports

### Current Behavior
<!-- Describe what is happening now -->

### Expected Behavior
<!-- Describe what should happen instead -->

### Steps to Reproduce
1. Step one
2. Step two
3. Step three
4. See error

### Environment Information
**Environment**: <!-- Development/Staging/Production -->
**Browser**: <!-- Chrome/Firefox/Safari/Edge + version -->
**Operating System**: <!-- Windows/macOS/Linux -->
**Node.js Version**: <!-- if applicable -->
**Docker Version**: <!-- if applicable -->

### Error Information
**Error Message**: 
```
Paste any error messages here
```

**Stack Trace**:
```
Paste stack trace if available
```

**Console Logs**:
```
Paste relevant console output
```

### Screenshots/Videos
<!-- Attach screenshots or videos if helpful -->

## Technical Specification

### Database Impact
- [ ] **Schema Changes**: Describe any database model changes
- [ ] **Migration Required**: Migration name and purpose
- [ ] **Data Seeding**: Any sample/test data needed
- [ ] **Performance Impact**: Indexing or query optimization needs

### API Impact
- [ ] **New Endpoints**: List new API endpoints needed
- [ ] **Modified Endpoints**: List existing endpoints that need changes
- [ ] **Breaking Changes**: Any changes that affect existing clients
- [ ] **Authentication**: JWT or role-based access requirements

### Dependencies
**New Dependencies**: 
- Package: `package-name@version` - Purpose: Brief explanation

**External Services**:
- Service: Purpose and integration points

## Implementation Notes

### Architecture Considerations
<!-- How does this fit into the modular monolith design? -->

### Thai Business Context
- [ ] **PromptPay Integration**: QR code generation or payment processing
- [ ] **Thai Tax Compliance**: VAT calculation or invoice generation
- [ ] **Localization**: Thai/English language support
- [ ] **Local Regulations**: Compliance with Thai business rules

### Security Considerations
- [ ] **Input Validation**: Form validation and sanitization
- [ ] **Authorization**: Role-based access control
- [ ] **Data Privacy**: PII protection and GDPR compliance
- [ ] **Audit Logging**: Track sensitive operations

### Performance Requirements
- [ ] **Response Time**: API endpoints must respond within 500ms
- [ ] **Database Queries**: Optimize for large datasets
- [ ] **Frontend Performance**: Page load times and bundle size
- [ ] **Caching Strategy**: Redis or browser caching needs

## Testing Strategy

### Manual Testing
- [ ] **Unit Testing**: Component/service level tests needed
- [ ] **Integration Testing**: API endpoint testing
- [ ] **E2E Testing**: Complete user workflow testing
- [ ] **Browser Testing**: Cross-browser compatibility

### Test Cases
<!-- Define key test scenarios -->
1. **Happy Path**: Normal successful flow
2. **Error Handling**: Invalid input or system errors
3. **Edge Cases**: Boundary conditions and unusual scenarios
4. **Security Testing**: Authorization and data validation

## Definition of Done
- [ ] **Code Complete**: All functionality implemented
- [ ] **Code Review**: PR approved by team member
- [ ] **Tests Passing**: All automated tests pass
- [ ] **Documentation Updated**: README, API docs, comments
- [ ] **Manual Testing**: Manually verified in development
- [ ] **CI/CD Passing**: All pipeline checks pass
- [ ] **Database Migration**: Applied and tested (if applicable)
- [ ] **Environment Config**: Updated .env.example files

## Related Issues
**Dependencies**: 
- Blocked by: #XXX
- Blocks: #XXX
- Related to: #XXX

**Parent/Child Issues**:
- Parent Epic: #XXX
- Child Tasks: #XXX, #XXX

## Additional Context

### Business Impact
<!-- How does this affect users or business operations? -->

### Timeline Considerations
**Estimated Effort**: <!-- Hours/Days -->
**Target Completion**: <!-- Date or milestone -->
**Launch Impact**: <!-- Does this affect the January 11, 2026 launch? -->

### Future Considerations
<!-- Any technical debt or future improvements to consider -->

---

## For Internal Use (Team Members)

### Project Board
**Column**: <!-- Backlog/Ready/In Progress/In Review/Done -->
**Sprint**: <!-- Current sprint if applicable -->
**Assignee**: <!-- Team member responsible -->

### Technical Review
**Complexity**: <!-- Low/Medium/High -->
**Risk Level**: <!-- Low/Medium/High -->
**Architecture Review Needed**: <!-- Yes/No -->

### REQ Mapping
**Requirements Covered**:
- [ ] REQ-RFQ-001: Customer RFQ submission (cart → quote request)
- [ ] REQ-RFQ-002: Admin quote management interface
- [ ] REQ-RFQ-003: Customer quote approval workflow
- [ ] REQ-ORD-001: Order creation from approved quotes
- [ ] REQ-ORD-002: Multi-level approval system for large orders
- [ ] REQ-PAY-003: Automated Thai tax invoice generation
- [ ] REQ-PTY-001: Partner registration and portal setup
- [ ] REQ-CAT-001: Product catalog with technical specifications
- [ ] REQ-INV-001: Real-time inventory management
- [ ] REQ-REP-001: Sales analytics and reporting dashboard
- [ ] REQ-FE-001: Initial Frontend Build and Local Server Verification

---

**Issue Created**: [Date]
**Last Updated**: [Date]
**Status**: <!-- Open/In Progress/Review/Closed -->