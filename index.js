
const express = require('express');
const bodyParser = require('body-parser');
const ticket = require('./src/ticket');
const signature = require('./src/verifySignature');
const api = require('./src/api');
const payloads = require('./src/payloads');
const debug = require('debug')('slash-command-template:index');
const ethers = require('ethers');
const { json } = require('body-parser');

require('dotenv').config();

const app = express();

/**
 * Use as refer data for watching
 * @param {ITicket} config_handler
 */
const config_handler = {}
let conversationId = '';


///////////// Config const
const configWatching = {
  sen: {
    network: "bsc",
    address: process.env.isProduct ? "0x23383e18dEedF460EbB918545C8b0588038B7998" : "0x4B5828F31550aFe15C61D7a765D9597ad4282325"
  },
  bcoin: {
    network: "bsc",
    address: process.env.isProduct ? "0x00e1656e45f18ec6747F5a8496Fd39B50b38396D" : "0x648a9CF8E95c73110D28E7e2329b2D0910Bd36B8"
  },
  bomb: {
    network: "polygon",
    address: process.env.isProduct ? "0xec9588Cca99C431a500C55d029c0E28D7c225e83" : "0xec9588Cca99C431a500C55d029c0E28D7c225e83"
  }
};

const nwExplorer = {
  bsc: process.env.isProduct ? "https://bscscan.com/address/" : "https://testnet.bscscan.com/address/",
  polygon: process.env.isProduct ? "https://polygonscan.com/address/" : "https://mumbai.polygonscan.com/address/"
}

const RPC = {
  bsc: process.env.isProduct ? "" : "",
  polygon: process.env.isProduct ? "" : ""
}
/////////////

/** @param {string} address */
function isAddress(address) {
  return ethers.utils.isAddress(address);
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
 * Endpoint to receive /cmd slash command from Slack.
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

  // check text first
  if (text.toLowerCase() === 'list') {
    res.send(`==== LIST WATCHING====\n`);
    return ticket.sendReplyList({
      channel_id: conversationId,
      config_handler: config_handler
    })
  }

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
  // ticket.gotMsgAndCreateReponse(Object.assign(configWatching, nwExplorer), body.view, conversationId);

  // check condition first
  const { pool, minAmount, token } = getInputSetting(body.view)

  // build object input
  const inputDraft = {
    channel_id: conversationId,
    pool: pool,
    token: token,
    minAmount: minAmount,
    url: nwExplorer[configWatching[token]["network"]]
  }

  let amount = 0
  try {
    // check valid pool address via web3
    if (!isAddress(pool)) throw Error('Address invalid')
    // check token in list watching
    if (Object.keys(configWatching).indexOf(token) == -1) throw Error('Token invalid')
    // check amount is integer and positive
    amount = parseInt(minAmount)
    if (!amount || amount <= 0) throw Error('Amount invalid')
    // call accept input
    rs = handle_interval(inputDraft)
    if (!rs) throw Error('Handle failed')
    ticket.sendConfirm(inputDraft)
  } catch (e) {
    console.error(e.message)
    ticket.sendReject(inputDraft)
  }
});

// check exist setting -> cancel -> restart new interval
// otherwise start new obj same interval
/**
 * @param {ITicket} inputInteract 
 */
function handle_interval(inputInteract) {
  const { pool, minAmount, token } = inputInteract
  const nw = configWatching[token]["network"]

  if (config_handler.hasOwnProperty(pool.toLowerCase())) {
    console.log("UPDATE")
    if (nw != config_handler[pool.toLowerCase()].network) {
      return false
    }
    let tokens = [...config_handler[pool.toLowerCase()].followingToken]
    if (tokens.indexOf(token) == -1) {
      tokens.push(token)
    }
    config_handler[pool.toLowerCase()] = {
      ...config_handler[pool.toLowerCase()],
      minAmount: minAmount,
      followingToken: tokens
    }
    // clear Interval and start new one
    clearInterval(config_handler[pool.toLowerCase()].interval_id)
    const interval_id = setInterval(() => execute_interval(config_handler[pool.toLowerCase()], pool.toLowerCase()), 1 * 60 * 1000)
    config_handler[pool.toLowerCase()] = {
      ...config_handler[pool.toLowerCase()],
      interval_id: interval_id
    }
  } else {
    console.log("CREATE")
    config_handler[pool.toLowerCase()] = {
      network: nw,
      minAmount: minAmount,
      followingToken: [token],
      rpc: RPC[nw],
      explorer: nwExplorer[nw],
      web3: Object()
    }
    // create new interval
    const interval_id = setInterval(() => execute_interval(config_handler[pool.toLowerCase()], pool.toLowerCase()), 1 * 60 * 1000)
    config_handler[pool.toLowerCase()] = {
      ...config_handler[pool.toLowerCase()],
      interval_id: interval_id
    }
  }
  console.log("config_handler: ", config_handler[pool.toLowerCase()])
  return true
}
/**
 * 
 * @param {*} config_pool 
 * @param {string} pool 
 */
const execute_interval = async (config_pool, pool) => {
  console.log("config_pool: ", config_pool)
  let tokens = [...config_pool.followingToken]
  tokens.forEach(async (token) => {
    // TODO: call web3 balanceOf()
    const currentBalance = 0;
    if (currentBalance <= config_pool.minAmount) {
      const inputDraft = {
        channel_id: conversationId,
        pool: pool,
        token: token,
        minAmount: config_pool.minAmount,
        url: config_pool.explorer
      }
      await ticket.sendWatching(inputDraft);
    }
  })
  // await ticket.gotMsgAndCreateReponse(Object.assign(configWatching, nwExplorer), view, conversationId);
}

function getInputSetting(view) {
  const values = view.state.values;
  const tokenPick = values.token_block.token.selected_option && values.token_block.token.selected_option.value || 'sen';
  const pool = values.pool_block.pool.value;
  const minAmount = values.min_amount_block.min_amount.value || '100';
  return { pool, minAmount, token: tokenPick }
}

// Main
const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});