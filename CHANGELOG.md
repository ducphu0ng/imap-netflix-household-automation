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