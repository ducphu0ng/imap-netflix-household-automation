import Imap from 'imap';
import Errorlogger from './Errorlogger';
import playwrightAutomation from './playwrightAutomation';

const imap = new Imap({
  user: process.env.IMAP_USER ?? '',
  password: process.env.IMAP_PASSWORD ?? '',
  host: process.env.IMAP_HOST ?? '',
  port: Number(process.env.IMAP_PORT) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
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

// Flatten the nested mailbox tree into full paths using the server-specific delimiter
function flattenBoxes(boxes: Imap.MailBoxes, parentSegments: string[] = []): MailboxPath[] {
  return Object.entries(boxes).flatMap(([name, box]) => {
    const segments = [...parentSegments, name];
    const current: MailboxPath = { path: segments.join(box.delimiter ?? '/'), segments };
    return [current, ...(box.children ? flattenBoxes(box.children, segments) : [])];
  });
}

const sameSegments = (a: string[], b: string[]) => a.length === b.length
  && a.every((segment, i) => segment.toLowerCase() === b[i].toLowerCase());

// Resolve the configured mailbox (e.g. "INBOX/vertraege/netflix") to the real server path,
// independent of delimiter ("/" or "."), letter case and an optional leading "INBOX"
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

      // Fallback: unique folder with the same name anywhere in the tree
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

async function handleEmails() {
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
      return;
    }

    // https://github.com/mscdex/node-imap#:~:text=currently%20open%20mailbox.-,Valid%20options%20properties%20are%3A,-*%20**markSeen**%20%2D%20_boolean_%20%2D%20Mark
    const fetchingData = imap.fetch(results, { bodies: 'TEXT', markSeen: true });
    fetchingData.on('message', (msg) => {
      let body = '';
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          body += chunk.toString('utf-8');
        });

        stream.on('end', async () => {
          // we're removing all new line before (quoted-printable)
          const quotedPrintable = body.replace(/=(\r?\n|$)/g, '').replace(/=([a-f0-9]{2})/ig, (m, code) => String.fromCharCode(parseInt(code, 16)));
          // Search specific link, open and click
          const regex = /"(https:\/\/www\.netflix\.com\/account\/update-primary-location[^"]*)"/;
          const match = quotedPrintable.match(regex);

          if (match && match[1]) {
            try {
              const updatePrimaryLink = new URL(match[1]);
              await playwrightAutomation(updatePrimaryLink.toString());
            } catch (e) {
              new Errorlogger(e);
            }
          } else {
            new Errorlogger('no specific Netflix link in E-Mail found');
          }
        });
      });
    });

    fetchingData.on('error', (fetchingError) => {
      new Errorlogger(`Fetching Error: ${fetchingError}`);
    });
  });
}

(function main() {
  // Connect to the IMAP server
  imap.connect();

  // start listening to the configured mailbox
  imap.once('ready', async () => {
    let mailbox: string;
    try {
      mailbox = await resolveMailbox(process.env.IMAP_MAILBOX || 'INBOX');
    } catch (err) {
      throw new Errorlogger(`resolve Mailbox Error => ${err}`);
    }

    imap.openBox(mailbox, false, (err) => {
      if (err) {
        throw new Errorlogger(`open ${mailbox} Error => ${err}`);
      }

      console.log(`IMAP connection is ready, start listening Emails on ${mailbox}`);
      imap.on('mail', () => handleEmails());
    });
  });

  // Handle Imap errors
  imap.once('error', (err: Error) => {
    throw new Errorlogger(`make sure you E-Mail Provider enabled IMAP and you IMAP Username and Password are correct: ${err}`);
  });

  // End connection on close
  imap.once('end', () => {
    console.log('IMAP connection ended');
  });
}());
