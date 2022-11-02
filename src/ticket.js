const debug = require('debug')('slash-command-template:ticket');
const api = require('./api');
const payloads = require('./payloads');

class ITicket {
  get channel_id() { }
  get pool() { }
  get token() { }
  get minAmount() { }
  get url() { }
}

// module setup watching(user-call via command).
const gotMsgAndCreateReponse = async (cf, view, channel_id) => {
  let values = view.state.values;

  // let result = await api.callAPIMethod('users.info', {
  //   user: userId
  // });

  // return alert
  console.log(values.token_block.token.selected_option)
  const tokenPick = values.token_block.token.selected_option && values.token_block.token.selected_option.value || 'sen';
  console.log(cf, tokenPick, cf[tokenPick])
  const nw = cf[tokenPick]["network"]
  const info2 = {
    channel_id: channel_id,
    pool: values.pool_block.pool.value,
    token: tokenPick,
    minAmount: values.min_amount_block.min_amount.value || '100',
    url: cf[nw]
  }
  return await sendWatching(info2)

  // verify some thing here
  const isValid = true;
  const info = {
    channel_id: channel_id,
    pool: values.pool_block.pool.value,
    token: values.token_block.token.selected_option && values.token_block.token.selected_option.value || 'sen',
    minAmount: values.min_amount_block.min_amount.value || '100',
  }
  if (isValid) {
    await sendConfirm(info);
  } else {
    await sendReject(info);
  }
};

// msg warning pool got min-amount.
/**
 * 
 * @param {ITicket} ticket 
 */
const sendWatching = async (ticket) => {
  // open a DM channel for that user
  console.log('sendWatching: ', ticket)

  let message = payloads.alert({
    channel_id: ticket.channel_id,
    pool: ticket.pool,
    url: ticket.url,
    token: ticket.token,
    minAmount: ticket.minAmount
  });

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendWatching: %o', result);
};

// msg info reply owner setting.
/**
 * 
 * @param {ITicket} ticket 
 */
const sendConfirm = async (ticket) => {
  // open a DM channel for that user
  console.log('sendConfirm: ', ticket)

  let message = payloads.confirm(ticket);

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendConfirm: %o', result);
};

// msg info reply owner setting.
/**
 * 
 * @param {ITicket} ticket 
 */
const sendReject = async (ticket) => {
  // open a DM channel for that user
  console.log('sendReject: ', ticket)

  let message = payloads.ignore(ticket);

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendConfirm: %o', result);
};

// msg info reply owner setting.
/**
 * 
 * @param {*} ticket 
 */
const sendReplyList = async (ticket) => {
  // open a DM channel for that user
  console.log('sendReplyList: ', ticket)

  let message = payloads.replyList(ticket);

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendReplyList: %o', result);
};


module.exports = { sendWatching, sendReplyList, sendConfirm, sendReject, gotMsgAndCreateReponse };