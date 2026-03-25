import EventEditPage, { metadata as editMetadata } from "./edit/page";

export const metadata = editMetadata;
// Dynamic rendering is required for auth checks; declare locally (re-exports are disallowed).
export const dynamic = "force-dynamic";

export default EventEditPage;
