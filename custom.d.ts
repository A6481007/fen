declare module "*.css" {
  interface CSSModule {
    [className: string]: string;
  }
  const cssModule: CSSModule;
  export default cssModule;
}

declare module "draftjs-utils" {
  import { EditorState } from "draft-js";

  export function getSelectionCustomInlineStyle(
    editorState: EditorState,
    styles: string[],
  ): Record<string, string | undefined>;
}
