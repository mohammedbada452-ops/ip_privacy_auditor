# PrivaSec Real Browser Matrix

The release matrix covers current stable Chrome, Firefox, Safari, Android Chrome, and iOS Safari.

Required scenarios per browser:
- clean baseline
- GPC/DNT toggles
- WebRTC blocked / local candidates / public candidate
- Canvas/WebGL availability
- private/incognito-like restrictions
- automation flags
- provider timeout and malformed provider response
- direct connection and known trusted reverse proxy chain

A scan may report SAFE only when the relevant evidence state is `CONFIRMED` or `NOT_DETECTED`; `UNKNOWN` and `UNAVAILABLE` are never collapsed into SAFE.

The CI environment must provide the actual browsers before this document can be considered a runtime pass. Linux CI alone cannot truthfully certify Safari/iOS behavior.
