const IP_V4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IP_V6 = /\b(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\b/g;
export function redactSensitiveText(value: string): string {
  return value.replace(IP_V4, '[REDACTED_IP]').replace(IP_V6, '[REDACTED_IP]').replace(/(authorization|cookie|set-cookie|x-admin-token|x-csrf-token)=?[^&\s]*/gi, '$1=[REDACTED]');
}
export function redactUrl(url: string): string { return redactSensitiveText(url.split('?')[0]); }
