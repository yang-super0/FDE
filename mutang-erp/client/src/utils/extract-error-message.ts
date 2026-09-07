/* ============ 统一错误消息提取：防止对象进入 toast / React 渲染 ============ */

interface ErrorLike {
  message?: unknown;
  msg?: unknown;
  code?: unknown;
  error?: unknown;
  data?: unknown;
  response?: { data?: unknown } | null;
}

const EXTRACT_MAX_DEPTH = 4;

function extractFromNode(node: unknown, depth: number): string {
  if (depth > EXTRACT_MAX_DEPTH) return '';
  if (typeof node === 'string') return node.trim() === '' ? '' : node;
  if (node === null || node === undefined || typeof node !== 'object') return '';
  const obj = node as ErrorLike;

  const response = obj.response;
  if (response !== null && typeof response === 'object') {
    const nested = extractFromNode(response.data, depth + 1);
    if (nested !== '') return nested;
  }

  const message = obj.message;
  if (typeof message === 'string' && message.trim() !== '') return message;
  const msg = obj.msg;
  if (typeof msg === 'string' && msg.trim() !== '') return msg;

  const errField = obj.error;
  if (typeof errField === 'string' && errField.trim() !== '') return errField;
  if (errField !== null && typeof errField === 'object') {
    const nested = extractFromNode(errField, depth + 1);
    if (nested !== '') return nested;
  }

  const data = obj.data;
  if (data !== null && typeof data === 'object') {
    const nested = extractFromNode(data, depth + 1);
    if (nested !== '') return nested;
  }

  const code = obj.code;
  if (typeof code === 'string' && code.trim() !== '') return code;
  if (typeof code === 'number') return String(code);

  return '';
}

export function extractErrorMessage(error: unknown): string {
  const found = extractFromNode(error, 0);
  return found !== '' ? found : '操作失败';
}
