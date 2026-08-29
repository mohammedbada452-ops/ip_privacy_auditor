declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}

declare module 'cloudflare:node' {
  export function httpServerHandler(opts: any): any;
  const _default: typeof httpServerHandler;
  export default _default;
}
