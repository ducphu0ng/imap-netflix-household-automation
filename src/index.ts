import Imap from 'imap';
import Errorlogger, { logInfo } from './Errorlogger';
import playwrightAutomation from './playwrightAutomation';

const imap = new Imap({
  user: process.env.IMAP_USER ?? '',
  password: process.env.IMAP_PASSWORD ?? '',
  host: process.env.IMAP_HOST ?? '',
  port: Number(process.env.IMAP_PORT) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED !== 'false' },
  connTimeout: 3_600_000, // set to 1 Hour to reconnect, if Connection is lost
  keepalive: {
    interval: 10000, // Send NOOP commands every 10 seconds
    idleInterval: 300000, // Re-send IDLE command every 5 minutes
  },
});

interface MailboxPath {
  path: string;
  segments: string[];
}

function flattenBoxes(boxes: Imap.MailBoxes, parentSegments: string[] = []): MailboxPath[] {
  return Object.entries(boxes).flatMap(([name, box]) => {
    const segments = [...parentSegments, name];
    const current: MailboxPath = { path: segments.join(box.delimiter ?? '/'), segments };
    return [current, ...(box.children ? flattenBoxes(box.children, segments) : [])];
  });
}

const sameSegments = (a: string[], b: string[]) => a.length === b.length
  && a.every((segment, i) => segment.toLowerCase() === b[i].toLowerCase());

function resolveMailbox(configured: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imap.getBoxes((err, boxes) => {
      if (err) {
        reject(err);
        return;
      }

      const available = flattenBoxes(boxes);
      const wanted = configured.split(/[\/.\\]/).filter(Boolean);
      const withoutInbox = wanted[0]?.toUpperCase() === 'INBOX' ? wanted.slice(1) : wanted;
      const candidates = [wanted, withoutInbox, ['INBOX', ...withoutInbox]];

      const exact = candidates
        .map((candidate) => available.find((box) => sameSegments(box.segments, candidate)))
        .find(Boolean);
      if (exact) {
        resolve(exact.path);
        return;
      }

      const lastSegment = wanted[wanted.length - 1]?.toLowerCase();
      const byName = available.filter((box) => box.segments[box.segments.length - 1].toLowerCase() === lastSegment);
      if (byName.length === 1) {
        resolve(byName[0].path);
        return;
      }

      reject(new Error(`Mailbox "${configured}" not found. Available mailboxes: ${available.map((box) => box.path).join(', ')}`));
    });
  });
}

let isProcessing = false;
let checkAgain = false;

function extractUpdatePrimaryLink(body: string): string | undefined {
  // we're removing all new line before (quoted-printable)
  const quotedPrintable = body.replace(/=(\r?\n|$)/g, '').replace(/=([a-f0-9]{2})/ig, (m, code) => String.fromCharCode(parseInt(code, 16)));
  // Search specific link, open and click
  const regex = /"(https:\/\/www\.netflix\.com\/account\/update-primary-location[^"]*)"/;
  const match = quotedPrintable.match(regex);
  return match?.[1]?.replace(/&amp;/g, '&');
}

async function openLinks(links: string[]) {
  for (const link of links) {
    try {
      const updatePrimaryLink = new URL(link);
      await playwrightAutomation(updatePrimaryLink.toString());
      logInfo('Netflix household location confirmed successfully');
    } catch (e) {
      new Errorlogger(e);
    }
  }
}

function finishProcessing() {
  isProcessing = false;
  if (checkAgain) {
    checkAgain = false;
    handleEmails();
  }
}

function handleEmails() {
  if (isProcessing) {
    checkAgain = true;
    return;
  }
  isProcessing = true;

  imap.search([
    'UNSEEN',
    ['HEADER', 'FROM', process.env.TARGET_EMAIL_ADDRESS],
    ['HEADER', 'SUBJECT', process.env.TARGET_EMAIL_SUBJECT],
  ], (err, results) => {
    if (err) {
      new Errorlogger(err);
    }

    // No E-Mails found => skip
    if (!results || !results.length) {
      finishProcessing();
      return;
    }

    logInfo(`received ${results.length} new Netflix email(s), confirming household location`);
    const links: string[] = [];

    // https://github.com/mscdex/node-imap#:~:text=currently%20open%20mailbox.-,Valid%20options%20properties%20are%3A,-*%20**markSeen**%20%2D%20_boolean_%20%2D%20Mark
    const fetchingData = imap.fetch(results, { bodies: 'TEXT', markSeen: true });
    fetchingData.on('message', (msg) => {
      let body = '';
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          body += chunk.toString('utf-8');
        });

        stream.on('end', () => {
          const link = extractUpdatePrimaryLink(body);
          if (link) {
            links.push(link);
          } else {
            new Errorlogger('no specific Netflix link in E-Mail found');
          }
        });
      });
    });

    fetchingData.on('error', (fetchingError) => {
      new Errorlogger(`Fetching Error: ${fetchingError}`);
    });

    fetchingData.once('end', () => {
      openLinks(links).finally(finishProcessing);
    });
  });
}

const EXIT_DELAY_MS = 60_000;
let isExiting = false;

function exitDelayed(error: string) {
  if (isExiting) {
    return;
  }
  isExiting = true;
  new Errorlogger(`${error} => exiting in ${EXIT_DELAY_MS / 1000} seconds`);
  setTimeout(() => process.exit(1), EXIT_DELAY_MS);
}

const REQUIRED_ENV = ['IMAP_USER', 'IMAP_PASSWORD', 'IMAP_HOST', 'TARGET_EMAIL_ADDRESS', 'TARGET_EMAIL_SUBJECT'];

(function main() {
  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missingEnv.length) {
    throw new Errorlogger(`missing environment variables in .env: ${missingEnv.join(', ')}`);
  }

  // Connect to the IMAP server
  imap.connect();

  // start listening to the configured mailbox
  imap.once('ready', async () => {
    let mailbox: string;
    try {
      mailbox = await resolveMailbox(process.env.IMAP_MAILBOX || 'INBOX');
    } catch (err) {
      exitDelayed(`resolve Mailbox Error => ${err}`);
      return;
    }

    imap.openBox(mailbox, false, (err) => {
      if (err) {
        exitDelayed(`open ${mailbox} Error => ${err}`);
        return;
      }

      console.log(`IMAP connection is ready, start listening Emails on ${mailbox}`);
      imap.on('mail', () => handleEmails());
    });
  });

  // Handle Imap errors
  imap.on('error', (err: Error) => {
    exitDelayed(`make sure you E-Mail Provider enabled IMAP and you IMAP Username and Password are correct: ${err}`);
  });

  // End connection on close
  imap.once('end', () => {
    console.log('IMAP connection ended');
  });
}());
