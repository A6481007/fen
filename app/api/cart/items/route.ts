import { POST as addPost } from "../add/route";

// Route settings need to be declared locally (re-exports are disallowed).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const POST = addPost;
