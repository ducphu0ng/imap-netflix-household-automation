# Automate Netflix Household Primary Location with IMAP

> Use your time for better things than manually accepting things

- ✉️ Compatible with All Email Providers That Use IMAP
- ⚡️️ Blazing-Fast Acceptance
- 🛠️ Up to Zero Configuration
- 🍃 Even Runs on Raspberry Pi

Manually updating and accepting Netflix primary location *sucks*—**especially when you have 2 or more devices**. Keeping track of verification emails and updating your primary location can be a tedious chore. This tool automates the entire process, saving you time without the hassle of looking you E-Mails manually.

## 🚀 Usage

*Start the Docker container, and you’re good to go!*

```sh
# start with docker compose up command
docker compose up   
[+] Running 1/1
 ✔ Container imap-netflix-household-automation
Attaching to imap-netflix-household-automation
imap-netflix-household-automation  | yarn install v1.22.22
imap-netflix-household-automation  | [4/4] Resolving packages...
imap-netflix-household-automation  | Done in 0.15s.
imap-netflix-household-automation  | yarn run v1.22.22
imap-netflix-household-automation  | $ tsc --noEmit && tsx --import=extensionless/register src/index.ts
imap-netflix-household-automation  | IMAP connection is ready, start listening Emails on INBOX
```
## Getting Started
> **❗️Please note that currently only the INBOX checks for new emails. If there are enough requests to check emails in other folders, this feature will be implemented in the near future.**

Lets speed it up!

### Prerequisites

No complex setup, no hassle. With just **Docker Compose**, you’re ready to run this project anywhere—even on a Raspberry Pi. That’s it, seriously!

Don't forget to enable IMAP in your email provider. For example, in Gmail, go to Settings > Forwarding and POP/IMAP > IMAP Access, and enable it:

[Gmail Forwarding POP/IMAP Settings](https://mail.google.com/mail/u/2/#settings/fwdandpop)

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/ducphu0ng/imap-netflix-household-automation.git
   ```
2. navigate to folder
   ```sh
   cd imap-netflix-household-automation
   ```
3. Copy **.env.dist** to **.env** and fill in all the environment variables. For examples, see the [Examples](#environment-examples) section
   ```sh
   cp .env.dist .env
   ```
4. starting IMAP Listener with docker compose. 💡**PRO TIP** use the -d flag to run the process in the background look up to [docker compose up reference](https://docs.docker.com/reference/cli/docker/compose/up/) 
   ```sh
   docker compose up -d
   ```
That’s it! Docker will automatically install all the necessary dependencies and start the script.

You can view the script's output — as shown in [🚀 Usage](#-usage) — by using the following command: [docker compose logs reference](https://docs.docker.com/reference/cli/docker/compose/logs/)
```sh
docker compose logs -f
```

## Environment Examples

### IMAP Configs
- **IMAP_USER**: Your IMAP Username
- **IMAP_PASSWORD**: Your IMAP Password
- **IMAP_HOST**: Your IMAP Host e.g. for *GMAIL* is imap.gmail.com
- **IMAP_PORT**: Your IMAP port connection is usually on port 993

### Email Configs
- **TARGET_EMAIL_ADDRESS**: The email address to monitor e.g. *info@netflix.com*
- **TARGET_EMAIL_SUBJECT**: The email subject to monitor e.g. *"How to update your Netflix household"*

## Docker image build
`docker buildx build     --builder armbuilder     --platform linux/arm64,linux/amd64 --push     --no-cache     -f imap-netflix-household-automation.dockerfile     -t dawidch/imap-netflix-household-automation:1.0.0     --progress=plain  --network host   .`

## ArgoCD
Application custom resource to use with argocd deployment.

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Duc Phung](https://github.com/ducphu0ng)

If you find this project interesting or helpful, I'd love your support!
Please consider giving it a star (⭐) and following me on GitHub.

I love coding and always have new ideas, so stay tuned—your support won’t be in vain!

## Acknowledgements

- [node-imap](https://github.com/mscdex/node-imap)
- [playwright](https://github.com/microsoft/playwright)