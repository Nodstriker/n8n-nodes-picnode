# Changelog

## 0.1.2 - 2026-07-21

### Fixed

- Remove runtime imports from the node class so Docker community-package loading does not depend on the container's module layout.

## 0.1.1 - 2026-07-21

### Fixed

- Avoid a runtime connection-enum dependency when n8n loads the node class in isolation.

## 0.1.0 - 2026-07-21

### Added

- Picnode API credential with configurable base URL and API-key authentication.
- Upload operation for n8n binary images and videos.
- List operation with one output item per active file.
- Delete operation for removing files before expiration.
