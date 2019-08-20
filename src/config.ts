export const ICON_ID = 3561078226; // 3560977211;
export const PLUGIN_NAME = "roblox-ts-object-to-tree";
export const PLUGIN_DESCRIPTION =
	"A tool for converting instances to their TS tree form. Ignores all instances with name collisions.";
export const IO_SERVE_URL = "http://localhost:33333";
export const OPTIONS = ["TS types", "Rojo-eque tree", "Instantiation code", "Roact TSX code"] as const;
export type OPTIONS = typeof OPTIONS extends ReadonlyArray<infer U> ? U : never;
export const DEFAULT_SETTING = OPTIONS[3];
