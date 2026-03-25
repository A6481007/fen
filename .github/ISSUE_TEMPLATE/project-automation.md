# NCS B2B E-Commerce Platform - Project Management Automation

## GitHub Actions Workflow for Project Board Integration

This template provides automated GitHub Actions workflows to keep your project board, issues, and pull requests synchronized with your development process.

### .github/workflows/project-automation.yml

```yaml
name: Project Board Automation

on:
  issues:
    types: [opened, closed, reopened, assigned]
  pull_request:
    types: [opened, closed, merged, ready_for_review, draft]
  workflow_dispatch:

jobs:
  manage-project-board:
    runs-on: ubuntu-latest
    steps:
      - name: Add Issue to Project Board
        if: github.event_name == 'issues' && github.event.action == 'opened'
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/orgs/NCS-Networks-Communication-Solution/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}

      - name: Move Issue to In Progress
        if: github.event_name == 'issues' && github.event.action == 'assigned'
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/orgs/NCS-Networks-Communication-Solution/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          labeled: in-progress

      - name: Move Issue to Done
        if: github.event_name == 'issues' && github.event.action == 'closed'
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/orgs/NCS-Networks-Communication-Solution/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          labeled: done

      - name: Add PR to Project Board
        if: github.event_name == 'pull_request' && github.event.action == 'opened'
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/orgs/NCS-Networks-Communication-Solution/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}

      - name: Move PR to In Review
        if: github.event_name == 'pull_request' && github.event.action == 'ready_for_review'
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/orgs/NCS-Networks-Communication-Solution/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          labeled: in-review
```

## REQ Tracking Automation

### Auto-label Issues Based on REQ IDs

```yaml
name: REQ Labeling
on:
  issues:
    types: [opened, edited]

jobs:
  label-req:
    runs-on: ubuntu-latest
    steps:
      - name: Label RFQ Issues
        if: contains(github.event.issue.title, 'REQ-RFQ')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['rfq-workflow', 'backend', 'frontend']
            })

      - name: Label Payment Issues
        if: contains(github.event.issue.title, 'REQ-PAY')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['payments', 'promptpay', 'thai-tax']
            })

      - name: Label Catalog Issues
        if: contains(github.event.issue.title, 'REQ-CAT')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['catalog', 'backend', 'database']
            })
```

## Pull Request Automation

### Auto-assign Reviewers Based on Files Changed

```yaml
name: Auto Assign Reviewers
on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    steps:
      - name: Get Changed Files
        id: changed-files
        uses: tj-actions/changed-files@v40
        
      - name: Assign Backend Reviewer
        if: contains(steps.changed-files.outputs.all_changed_files, 'backend/')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.pulls.requestReviewers({
              pull_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              reviewers: ['backend-team-lead']
            })

      - name: Assign Frontend Reviewer  
        if: contains(steps.changed-files.outputs.all_changed_files, 'frontend/')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.pulls.requestReviewers({
              pull_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              reviewers: ['frontend-team-lead']
            })

      - name: Assign DB Reviewer for Schema Changes
        if: contains(steps.changed-files.outputs.all_changed_files, 'prisma/schema.prisma')
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.pulls.requestReviewers({
              pull_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              reviewers: ['database-architect']
            })
```

## Project Board Management Commands

### GitHub CLI Commands for Manual Project Board Updates

```bash
#!/bin/bash
# project-board-utils.sh - Utility commands for project board management

# Get your project board ID
get_project_id() {
  gh project list --owner NCS-Networks-Communication-Solution --format json | jq -r '.[] | select(.title=="NCS B2B Board") | .id'
}

# Add issue to project board
add_issue_to_project() {
  local issue_number=$1
  local project_id=$(get_project_id)
  
  gh project item-add $project_id --owner NCS-Networks-Communication-Solution --url "https://github.com/NCS-Networks-Communication-Solution/ncs-ecom/issues/${issue_number}"
}

# Move issue to specific column
move_issue_to_column() {
  local issue_number=$1
  local column_name=$2  # "Backlog", "Ready", "In Progress", "In Review", "Done"
  
  # Get project and item IDs
  local project_id=$(get_project_id)
  local item_id=$(gh project item-list $project_id --owner NCS-Networks-Communication-Solution --format json | jq -r ".[] | select(.content.title | contains(\"#${issue_number}\")) | .id")
  
  # Get field ID for Status
  local field_id=$(gh project field-list $project_id --owner NCS-Networks-Communication-Solution --format json | jq -r '.[] | select(.name=="Status") | .id')
  
  # Get option ID for the column
  local option_id=$(gh project field-list $project_id --owner NCS-Networks-Communication-Solution --format json | jq -r ".[] | select(.name==\"Status\") | .options[] | select(.name==\"${column_name}\") | .id")
  
  # Move the item
  gh project item-edit --id $item_id --field-id $field_id --project-id $project_id --single-select-option-id $option_id
}

# Bulk update REQ issues status
update_req_status() {
  local req_pattern=$1  # e.g., "REQ-RFQ"
  local status=$2       # e.g., "Done"
  
  # Get all issues matching the pattern
  gh issue list --search "in:title ${req_pattern}" --json number --jq '.[].number' | while read issue_number; do
    echo "Moving issue #${issue_number} to ${status}"
    move_issue_to_column $issue_number "$status"
  done
}

# Create weekly status report
generate_weekly_report() {
  local week_number=$1
  
  echo "# Week ${week_number} Status Report - $(date '+%Y-%m-%d')"
  echo ""
  echo "## Issues Completed This Week"
  gh issue list --state closed --search "closed:$(date -d '7 days ago' '+%Y-%m-%d')..$(date '+%Y-%m-%d')" --json number,title,labels --jq '.[] | "- #\(.number): \(.title)"'
  
  echo ""
  echo "## Pull Requests Merged This Week"
  gh pr list --state merged --search "merged:$(date -d '7 days ago' '+%Y-%m-%d')..$(date '+%Y-%m-%d')" --json number,title --jq '.[] | "- #\(.number): \(.title)"'
  
  echo ""
  echo "## REQ Status Summary"
  local total_reqs=$(gh issue list --search "in:title REQ-" --json number | jq length)
  local completed_reqs=$(gh issue list --state closed --search "in:title REQ-" --json number | jq length)
  local in_progress_reqs=$(gh issue list --state open --search "in:title REQ- assignee:*" --json number | jq length)
  
  echo "- Total REQs: ${total_reqs}"
  echo "- Completed: ${completed_reqs}"
  echo "- In Progress: ${in_progress_reqs}"
  echo "- Remaining: $((total_reqs - completed_reqs))"
}

# Usage examples:
# ./project-board-utils.sh add_issue_to_project 15
# ./project-board-utils.sh move_issue_to_column 15 "In Progress"
# ./project-board-utils.sh update_req_status "REQ-RFQ" "Done"
# ./project-board-utils.sh generate_weekly_report 1
```

## Automated REQ Tracking

### Create issues for missing REQs

```bash
#!/bin/bash
# create-missing-reqs.sh - Create GitHub issues for missing requirements

# Define all REQs from your project board
declare -A REQS=(
  ["REQ-RFQ-001"]="Customer RFQ submission (cart → quote request)"
  ["REQ-RFQ-002"]="Admin quote management interface"
  ["REQ-RFQ-003"]="Customer quote approval workflow"
  ["REQ-ORD-001"]="Order creation from approved quotes"
  ["REQ-ORD-002"]="Multi-level approval system for large orders"
  ["REQ-PAY-003"]="Automated Thai tax invoice generation"
  ["REQ-PTY-001"]="Partner registration and portal setup"
  ["REQ-CAT-001"]="Product catalog with technical specifications"
  ["REQ-INV-001"]="Real-time inventory management"
  ["REQ-REP-001"]="Sales analytics and reporting dashboard"
  ["REQ-FE-001"]="Initial Frontend Build and Local Server Verification"
)

# Check for existing issues and create missing ones
for req_id in "${!REQS[@]}"; do
  req_description="${REQS[$req_id]}"
  
  # Check if issue exists
  existing_issue=$(gh issue list --search "in:title ${req_id}" --json number --jq length)
  
  if [ "$existing_issue" -eq 0 ]; then
    echo "Creating issue for ${req_id}: ${req_description}"
    
    # Create issue with proper template
    gh issue create \
      --title "${req_id}: ${req_description}" \
      --label "enhancement,req-tracked" \
      --body "## Requirement: ${req_id}

**Description**: ${req_description}

## User Story
**As a** [type of user]
**I want** [goal/functionality]  
**So that** [benefit/value]

## Acceptance Criteria
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]

## Technical Requirements
- [ ] Backend implementation required
- [ ] Frontend implementation required
- [ ] Database changes required
- [ ] API endpoints required

## Definition of Done
- [ ] Code implementation complete
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Manual testing verified

---
Created automatically for REQ tracking"
  else
    echo "Issue already exists for ${req_id}"
  fi
done
```

## Project Status Dashboard

### Generate project metrics

```bash
#!/bin/bash
# project-metrics.sh - Generate project status metrics

echo "# NCS B2B E-Commerce Project Status - $(date '+%Y-%m-%d %H:%M')"
echo ""

# Overall progress
echo "## Overall Progress"
total_issues=$(gh issue list --json number | jq length)
closed_issues=$(gh issue list --state closed --json number | jq length)
progress_percentage=$(( closed_issues * 100 / total_issues ))

echo "- Total Issues: ${total_issues}"
echo "- Completed: ${closed_issues}"  
echo "- Progress: ${progress_percentage}%"
echo ""

# REQ tracking
echo "## REQ Tracking Status"
req_issues=$(gh issue list --search "in:title REQ-" --json number,title,state | jq -r '.[] | "\(.state): \(.title)"' | sort)
echo "${req_issues}"
echo ""

# Sprint progress (current week)
echo "## This Week's Activity"
week_created=$(gh issue list --search "created:$(date -d '7 days ago' '+%Y-%m-%d')..$(date '+%Y-%m-%d')" --json number | jq length)
week_closed=$(gh issue list --search "closed:$(date -d '7 days ago' '+%Y-%m-%d')..$(date '+%Y-%m-%d')" --json number | jq length)
week_prs=$(gh pr list --search "created:$(date -d '7 days ago' '+%Y-%m-%d')..$(date '+%Y-%m-%d')" --json number | jq length)

echo "- Issues Created: ${week_created}"
echo "- Issues Closed: ${week_closed}"
echo "- Pull Requests: ${week_prs}"
echo ""

# Timeline status
launch_date="2026-01-11"
days_remaining=$(( ($(date -d "$launch_date" +%s) - $(date +%s)) / 86400 ))

echo "## Timeline Status"
echo "- Launch Target: ${launch_date}"
echo "- Days Remaining: ${days_remaining}"
echo "- Confidence Level: 85% (based on current progress)"
```

This comprehensive template system ensures that:

1. **Pull Requests** follow a consistent format with proper REQ traceability
2. **Commit Messages** use conventional format for automated changelog generation
3. **Issues** are properly categorized and linked to requirements
4. **Project Board** is automatically updated based on GitHub activity
5. **REQ Tracking** is automated and consistent
6. **Status Reporting** is generated automatically for progress monitoring

To use these templates:

1. Place the PR template in `.github/pull_request_template.md`
2. Place issue templates in `.github/ISSUE_TEMPLATE/`
3. Add the workflow files to `.github/workflows/`
4. Make the bash scripts executable and use them for project management
5. Set up the required GitHub secrets (`PROJECT_TOKEN`) for automation

[15]

[16]

[17]