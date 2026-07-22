# n8n-nodes-picnode

This is an n8n community node. It lets you upload, list, and delete files on a Picnode server from your n8n workflows.

Picnode is a lightweight service for temporarily hosting generated images and videos behind an API key. Uploaded files receive a public HTTPS URL and expire automatically according to the server configuration.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Upload**: Upload an image or video from an n8n binary field.
- **List**: Return one n8n item for every active Picnode file.
- **Delete**: Remove a hosted file before it expires.

## Credentials

Create a **Picnode API** credential with:

- **Base URL**: The root URL of your Picnode server. It defaults to `https://picnode.nodstrike.com`.
- **API Key**: A key configured in the Picnode server's `API_KEYS` environment variable.

The credential sends the key in the `X-API-Key` request header.

## Compatibility

Tested locally with n8n 2.31.4 and prepared for installation on n8n 2.30.8. The package uses the current n8n community-node API and requires a self-hosted n8n version that supports community packages.

## Usage

The Upload operation reads file bytes from `$binary`, not `$json`. Set **Input Binary Field** to the field produced by the previous node; `data` is the usual default.

The upstream binary must include a MIME type. Picnode validates the MIME type, file extension, binary signature, configured upload-size limit, and rate limit. The Upload output includes `direct_url` and `expires_at`.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Picnode source and API documentation](https://github.com/Nodstriker/picnode)

## Version history

- **0.1.0**: Initial release with Upload, List, and Delete operations.
