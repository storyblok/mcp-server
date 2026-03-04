/**
 * Canonical error response shape returned by all tool handlers.
 * Every error across execute, execute-readonly, execute-destructive,
 * and upload-asset uses this structure so LLMs can reliably detect and
 * handle failures with a single pattern.
 */
export interface ToolError {
  success: false;
  /** Short error code or title (e.g. "API error: 422 Unprocessable Entity") */
  error: string;
  /** Human-readable explanation of what went wrong and how to fix it */
  message: string;
  /** Optional structured context (validation errors, HTTP status, step name, …) */
  details?: Record<string, unknown>;
}
