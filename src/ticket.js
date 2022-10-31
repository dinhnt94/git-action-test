const debug = require('debug')('slash-command-template:ticket');
const api = require('./api');
const payloads = require('./payloads');

// interface IWatching {
//   address: String;
//   channel_id: Number;
// }

/*
 *  Send ticket creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = async (ticket) => {
  // open a DM channel for that user
  console.log('ticket', ticket)
  // let channel = await api.callAPIMethod('im.open', {
  //   user: ticket.userId
  // })

  let message = payloads.confirmation({
    channel_id: ticket.channel_id,
    title: ticket.title,
    description: ticket.description,
    urgency: ticket.urgency
  });

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendConfirmation: %o', result);
};

// Create helpdesk ticket. Call users.find to get the user's email address
// from their user ID
const create = async (userId, view, channel_id) => {
  let values = view.state.values;

  let result = await api.callAPIMethod('users.info', {
    user: userId
  });

  await sendConfirmation({
    userId,
    userEmail: result.user.profile.email,
    title: values.title_block.title.value,
    description: values.description_block.description.value || '_empty_',
    urgency: values.urgency_block.urgency.selected_option && values.urgency_block.urgency.selected_option.text.text || 'not assigned',
    channel_id: channel_id
  });
};

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

  // TODO: verify some thing here
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
/* @param {IWatching} ticket */
const sendWatching = async (ticket) => {
  // open a DM channel for that user
  console.log('sendWatching: ', ticket)

  let message = payloads.alert({
    channel_id: ticket.channel_id,
    pool: ticket.pool,
    url: ticket.url,
    minAmount: ticket.minAmount
  });

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendWatching: %o', result);
};

// msg info reply owner setting.
const sendConfirm = async (ticket) => {
  // open a DM channel for that user
  console.log('sendConfirm: ', ticket)

  let message = payloads.confirm(ticket);

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendConfirm: %o', result);
};

// msg info reply owner setting.
const sendReject = async (ticket) => {
  // open a DM channel for that user
  console.log('sendReject: ', ticket)

  let message = payloads.ignore(ticket);

  let result = await api.callAPIMethod('chat.postMessage', message)
  debug('sendConfirm: %o', result);
};


module.exports = { create, sendConfirmation, gotMsgAndCreateReponse };