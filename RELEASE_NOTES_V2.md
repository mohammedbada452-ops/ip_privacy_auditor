# Privacy & Browser Intelligence Auditor — Improved v2

## Changes
- Fixed the Browser Intelligence graphics wiring so Canvas and WebGL cards consume their own collector payloads from the composite GRAPHICS group.
- Prevented WebGL UI from displaying stale/undefined vendor data.
- Tightened WebGL classification so only explicit unmasked identifiable renderer evidence is scored.
- Kept localhost/127.0.0.1 semantics as LOCAL_DEVELOPMENT rather than treating loopback as a public IP.
- Preserved the existing project structure, APIs, routes, and feature layout.

## Validation
- TypeScript/TSX syntax transpilation check: 246/246 files passed.
- Targeted graphics data-flow consistency checks passed.
- Full npm build/test execution could not be completed in the execution environment because package dependencies were not available locally and registry installation timed out / offline cache was incomplete.

## Deployment note
For a real public-IP/Geo/ASN observation, deploy the Node.js server behind a trusted public endpoint and configure the trusted-proxy settings according to the ingress provider. Localhost can only report its local socket peer (typically 127.0.0.1/::1).
