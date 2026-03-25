# Admin + Employee Panel Scope Reference (Offline, No Studio)

Purpose
- Provide a complete reference of current features, data domains, and file responsibilities.
- Enable building admin/employee UI pages that manage Sanity-backed content without using Sanity Studio.
- Capture existing operational flows (orders, promotions, events, news, insights, etc.) and the files that implement them.

How to use this doc set
- Read `docs/admin_panel_scope/01_feature_capabilities.md` for feature coverage and user-facing capabilities.
- Use `docs/admin_panel_scope/02_data_domains.md` to map business domains to data sources.
- Use `docs/admin_panel_scope/03_sanity_schema_inventory.md` to build forms and validation logic for each Sanity type.
- Use `docs/admin_panel_scope/04_firestore_collections.md` for Firestore collections used by analytics and messaging.
- Use `docs/admin_panel_scope/05_api_routes.md` to wire admin UI pages to server routes.
- Use `docs/admin_panel_scope/06_actions_and_libs.md` to locate server actions, helpers, and business logic.
- Use `docs/admin_panel_scope/07_admin_employee_pages.md` for existing admin/employee UI coverage.
- Use `docs/admin_panel_scope/08_client_content_pages.md` to see how content is surfaced to customers.
- Use `docs/admin_panel_scope/09_components_inventory.md` to locate UI building blocks by domain.
- Use `docs/admin_panel_scope/10_file_inventory.txt` and appendix source dumps for deep file-level responsibility tracing.

Important constraints
- This is documentation only; no admin UI implementation is performed here.
- All content should remain ASCII for easy diffs and tooling compatibility.
- Treat Sanity Studio as the source of truth for schema definitions; the admin UI should mirror these fields and validations.

