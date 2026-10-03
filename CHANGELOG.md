## Unreleased

### Features

- New `IMAP_MAILBOX` variable to listen on any folder (e.g. `INBOX/vertraege/netflix`) instead of only INBOX. The folder path is resolved automatically regardless of the server's delimiter.
- New `IMAP_TLS_REJECT_UNAUTHORIZED` variable (default `true`) to only disable the TLS certificate validation for self-signed certificates.
- Missing required environment variables are reported at startup.
- Own Docker image (`Dockerfile`) with all dependencies and Chromium preinstalled, so the container starts instantly without `yarn install` on every start. The process runs as non-root user `node`.

### Bugfixes

- `IMAP_PORT` fallback to 993 never applied.
- `&amp;` in the extracted Netflix link is decoded, so all URL parameters are passed correctly.
- Emails are processed one at a time, so the same email can't trigger the automation twice and parallel runs don't overwrite the stored session.
- Playwright errors are no longer logged twice.
- On IMAP errors the process waits 60 seconds before exiting, so the Docker restart loop doesn't trigger fail2ban or rate limits on the mail server with failed logins.

### Breaking Changes

- The TLS certificate of the IMAP server is now validated by default. Set `IMAP_TLS_REJECT_UNAUTHORIZED='false'` if your server uses a self-signed certificate.
- `compose.yml` builds the own image instead of mounting the project into the Playwright image. After an update the image must be rebuilt with `docker compose up -d --build`. Only `./tmp` (stored Netflix session) is mounted, `network_mode: host` was removed.

### Internal Changes

- `/tmp` (stored Netflix session) added to `.gitignore`, so the session can't be committed by accident.

## 1.2.0 (2025-03-31)

### Bugfixes

- Retry confirmation for up to 30 seconds to ensure the DOM is fully hydrated before failing the process.

### Internal Changes

- Packages update 31.03.2025

## 1.1.1 (2024-12-01)

### Features

- We now save Cookies/Session to prevent repeated email notifications when a new device is added.
- Minor performance improvements

## 1.0.1 (2024-08-24)

### Bugfixes

- Added reconnect to the IMAP server if the internet connection is lost.
- Added Docker's "restart unless-stopped" option to restart the script if it exits due to an error or connection termination. 
  This is necessary because Gmail IMAP sessions can stop after 24 hours.

## 1.0.0 (2024-08-21)

### Features

- Trigger fetch on new emails from INBOX
- Added functionality to fetch emails with IMAP and listen for emails from Netflix
- Find button and automate clicks with Playwright
- Custom error logger to display errors with timestamps in the console