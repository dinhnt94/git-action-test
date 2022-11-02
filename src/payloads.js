const date = require('date-and-time')

// @param {channel_id: Number, url: String, pool: String, minAmount: Number}: context
/**
 * 
 * @param {ITicket} context 
 * @returns
 */
const infoWatching = (context) => {
    return {
        channel: context.channel_id,
        text: 'Alerting!',
        blocks: JSON.stringify([
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🔔🔔🔔 Alo alo 🔔🔔🔔"
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Please check pool: ${context.token}*\n <${context.url}${context.pool}/|${context.pool}>`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Seem like pool less than ${context.minAmount} tokens.\nTime: ${date.format(new Date(), 'YYYY/MM/DD HH:mm:ss')}`
                    }
                ]
            }
        ])
    }
}

// @param {channel_id: Number, pool: String, token: String, minAmount: Number}: context
/**
 * 
 * @param {ITicket} context 
 * @returns
 */
const confirmedWatching = (context) => {
    return {
        channel: context.channel_id,
        text: 'Confirmed!',
        blocks: JSON.stringify([
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "⏰ WatchDog Confirmed!!!"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Pool:*\t ${context.pool} \n*Check:*\t ${context.token}\n *Min Amount:*\t ${context.minAmount}\nTime Request:\t ${date.format(new Date(), 'YYYY/MM/DD HH:mm:ss')}`
                    }
                ]
            }
        ])
    }
}

// @param  { channel_id: String, pool: String, token: String, minAmount: Number }: context
/**
 * 
 * @param {ITicket} context 
 * @returns
 */
const ignoreWatching = (context) => {
    return {
        channel: context.channel_id,
        text: 'Ignore!',
        blocks: JSON.stringify([
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🕓 WatchDog Rejected!!!"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Pool:*\t ${context.pool} \n*Check:*\t ${context.token}\n *Min Amount:*\t ${context.minAmount}\nTime Request:\t ${date.format(new Date(), 'YYYY/MM/DD HH:mm:ss')}`
                    }
                ]
            }
        ])
    }
}

// @param  { trigger_id: String }: context
/**
 * 
 * @param { trigger_id: string } context
 * @returns
 */
const modal = (context) => {
    return {
        trigger_id: context.trigger_id,
        view: JSON.stringify({
            type: 'modal',
            title: {
                type: 'plain_text',
                text: 'Submit a pool to watch'
            },
            callback_id: 'submit-ticket',
            submit: {
                type: 'plain_text',
                text: 'Submit'
            },
            blocks: [
                {
                    block_id: 'pool_block',
                    type: 'input',
                    label: {
                        type: 'plain_text',
                        text: 'Address pool'
                    },
                    element: {
                        action_id: 'pool',
                        type: 'plain_text_input'
                    },
                    hint: {
                        type: 'plain_text',
                        text: 'The pool to pay-reward for claimer.'
                    }
                },
                {
                    block_id: 'min_amount_block',
                    type: 'input',
                    label: {
                        type: 'plain_text',
                        text: 'Min amount to alert'
                    },
                    element: {
                        action_id: 'min_amount',
                        type: 'plain_text_input'
                    },
                    hint: {
                        type: 'plain_text',
                        text: 'i.e: 100, the pool hold < 100 BOMB will be alerting for admin.'
                    }
                },
                {
                    block_id: 'token_block',
                    type: 'input',
                    label: {
                        type: 'plain_text',
                        text: 'Token Watching'
                    },
                    element: {
                        action_id: 'token',
                        type: 'static_select',
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "BCOIN"
                                },
                                value: "bcoin"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "SEN"
                                },
                                value: "sen"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "BOMB"
                                },
                                value: "bomb"
                            }
                        ]
                    }
                }
            ]
        })
    }
}

const replyList = (context) => {
    const header = [{
        "type": "header",
        "text": {
            "type": "plain_text",
            "text": "🧾 List Watching!!!"
        }
    }]
    const filed = (pool, tokens, minAmount) => {
        return {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": `*Pool:*\t ${pool} \n*Check:*\t ${tokens}\n *Min Amount:*\t ${minAmount}`
                }
            ]
        }
    }
    let fileds = []
    for (const [key, val] of Object.entries(context.config_handler)) {
        const rs = filed(key, val.followingToken, val.minAmount)
        fileds.push(rs)
    }
    console.log("fileds: ", fileds)
    const data = [...header, ...fileds]
    console.log("reply: ", data)
    return {
        channel: context.channel_id,
        attachments: JSON.stringify([{
            color: "#f2c744",
            blocks: data
        }])
    }
}

module.exports = {
    ignore: ignoreWatching,
    confirm: confirmedWatching,
    alert: infoWatching,
    replyList: replyList,
    modal: modal
}