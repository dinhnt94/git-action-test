
const express = require('express');
const bodyParser = require('body-parser');
const ticket = require('./src/ticket');
const signature = require('./src/verifySignature');
const api = require('./src/api');
const payloads = require('./src/payloads');
const debug = require('debug')('slash-command-template:index');

require('dotenv').config();

const app = express();
let conversationId = '';

const configWatching = {
  sen: {
    network: "bsc",
  },
  bcoin: {
    network: "bsc",

  },
  bomb: {
    network: "polygon",
  }
};

const nwExplorer = {
  bsc: process.env.isProduct ? "https://bscscan.com/address/" : "https://testnet.bscscan.com/address/",
  polygon: process.env.isProduct ? "https://polygonscan.com/address/" : "https://mumbai.polygonscan.com/address/"
}



/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.get('/', (req, res) => {
  res.send('<h2>Slack Ping Pong....</h2>');
});

/*
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/command', async (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    debug('Verification token mismatch');
    return res.status(404).send();
  }

  // extract the slash command text, and trigger ID from payload
  const { trigger_id, channel_id } = req.body;
  if (!conversationId) conversationId = channel_id;
  const { text } = req.body;
  console.log(req.body)

  // create the modal payload - includes the dialog structure, Slack API token,
  // and trigger ID
  let view = payloads.modal({
    trigger_id
  });

  let result = await api.callAPIMethod('views.open', view);

  debug('views.open: %o', result);
  return res.send(`Ok, your cmd: \`${text}\``);
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a Helpdesk ticket
 */
app.post('/interactive', (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    debug('Verification token mismatch');
    return res.status(404).send();
  }

  const body = JSON.parse(req.body.payload);
  console.log('body: ', body)
  res.send('');
  console.log("view: ", body.view.state.values)
  // ticket.create(body.user.id, body.view, conversationId);
  ticket.gotMsgAndCreateReponse(Object.assign(configWatching, nwExplorer), body.view, conversationId);
});

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});