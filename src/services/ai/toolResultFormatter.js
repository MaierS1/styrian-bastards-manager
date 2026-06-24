export function formatToolResult({ tool, success = false, data = null, metadata = {} } = {}) {
  return {
    tool,
    success: Boolean(success),
    data,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    timestamp: new Date().toISOString(),
  }
}
