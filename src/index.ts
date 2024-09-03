import Imap from 'imap';
import Errorlogger from './Errorlogger';
import playwrightAutomation from './playwrightAutomation';

const imap = new Imap({
  user: process.env.IMAP_USER ?? '',
  password: process.env.IMAP_PASSWORD ?? '',
  host: process.env.IMAP_HOST ?? '',
  port: Number(process.env.IMAP_PORT) ?? 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  connTimeout: 3_600_000, // set to 1 Hour to reconnect, if Connection is lost
  keepalive: {
    interval: 10000, // Send NOOP commands every 10 seconds
    idleInterval: 840_000, // Re-send IDLE command every 14 minutes
  },
});

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
    const fetchingData = imap.fetch(results, { 
      bodies: 'TEXT', 
      markSeen: true,
    });
    fetchingData.on('message', (msg) => {
      let body = '';
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          body += chunk.toString('utf-8');
        });

        stream.on('end', async () => {
          console.time('replace Duration');
          // we're removing all new line before (quoted-printable)
          const quotedPrintable = body.replace(/=(\r?\n|$)/g, '').replace(/=([a-f0-9]{2})/ig, (m, code) => String.fromCharCode(parseInt(code, 16)));
          // Search specific link that beginning with quoted or brackets, open and click
          const regex = /\[(https:\/\/www\.netflix\.com\/account\/update-primary-location[^\]]*)]|"(https:\/\/www\.netflix\.com\/account\/update-primary-location[^"]*)"/;
          const match = quotedPrintable.match(regex);
          console.timeEnd("replace Duration");

          if (match && (match[1] || match[2])) {
            try {
              const updatePrimaryLink = new URL(match[1] || match[2]);
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

  // start listening to Inbox
  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err) => {
      if (err) {
        throw new Errorlogger(`open INBOX Error => ${err}`);
      }

      console.log('IMAP connection is ready, start listening Emails on INBOX');
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
