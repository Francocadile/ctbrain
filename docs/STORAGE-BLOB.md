# Vercel Blob storage for tactical diagrams

Tactical diagram thumbnails generated from the session editor are stored in Vercel Blob via the `/api/uploads/diagram` endpoint.

Configure the following environment variable in your deployment:

- `BLOB_READ_WRITE_TOKEN` – read/write token for the Blob store used when uploading `exercise` diagram PNG previews.

Do **not** commit this token to the repository or share it publicly.
