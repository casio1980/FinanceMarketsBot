const _ = require('lodash');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const config = require('config');
const winston = require('winston');
const database = require('./js/database');
const c = require('./js/constants');
const { fmtNumber, requestYahooQuote } = require('./js/helpers');

const chatId = config.get('chat');
const dbUrl = config.get('dbUrl');
const trackSymbols = config.get('trackSymbols');

// Init log
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(record => (
      `${record.timestamp} | ${record.level}: ${record.message}`
    )),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.get('logfile') }),
  ],
});

// TODO
// const getQuote = async (symbol) => {
//   logger.debug('Connecting to DB...');
//   const db = await database.connect(dbUrl);
//   const data = await database.load(db.collection('documents'), { symbol });
//   logger.debug(`${data.length} records found for ${symbol}`);
//   db.close();

//   const latest = _.maxBy(data, item => item.date);
//   const {
//     date,
//     open,
//     close,
//   } = latest;
//   const percent = ((close / open) - 1) * 100;
//   return `Date: ${moment(date).format(c.DATE_FORMAT)};
//     Open: ${fmtNumber(open)}; Close: ${fmtNumber(close)} [${fmtNumber(percent)}%]`;
// };

// Create bot
const bot = new TelegramBot(config.get('token'), { polling: true });
logger.info('Bot started');

// sendMessage func
const sendMessage = (chat, response) => {
  bot.sendMessage(chat.id, response);
  logger.info(`${chat.id} <- ${response}`);
};

// Worker func
const worker = async () => {
  logger.debug('Worker');
  const data = await requestYahooQuote({ symbols: trackSymbols, modules: ['price'] });

  let response;
  Object.keys(data).forEach((key) => {
    const { price } = data[key];
    const {
      marketState,
      symbol,
      preMarketTime,
      regularMarketTime,
      // preMarketSource,
      preMarketPrice,
      preMarketChange,
      preMarketChangePercent,
      regularMarketChangePercent,
      regularMarketChange,
      regularMarketPrice,
      // regularMarketDayHigh,
      // regularMarketDayLow,
      // regularMarketVolume,
      // regularMarketPreviousClose,
      // regularMarketSource,
      // regularMarketOpen,
    } = price;

    console.log(price); // eslint-disable-line no-console

    if (!response) response = '';
    // if (response && response.length > 0) response += '\n';
    if (marketState === c.PREMARKET) {
      if (preMarketPrice) {
        const priceStr = `${fmtNumber(preMarketPrice)} | ${fmtNumber(preMarketChange)} [${fmtNumber(preMarketChangePercent * 100)}%]`;
        response += `\n${symbol} ${c.PREMARKET}: ${priceStr}`;
      }
    } else if (marketState === c.REGULAR) {
      const priceStr = `${fmtNumber(regularMarketPrice)} | ${fmtNumber(regularMarketChange)} [${fmtNumber(regularMarketChangePercent * 100)}%]`;
      response += `\n${symbol}: ${priceStr}`;
    } else {
      response += `\n${symbol}: Unknown marketState = ${marketState}`;
    }
  });

  if (response) {
    bot.sendMessage(chatId, response);
  }
};

let workerId;
const start = () => {
  workerId = setInterval(worker, config.get('workerInterval'));
  worker(); // immediate run
};

// Handle /start
bot.onText(/\/start/, (message) => {
  const { chat } = message;

  let response;
  if (chat.id === chatId) {
    response = workerId
      ? 'Already started.'
      : 'Notifications started.\nStop at any time by typing /stop.';

    if (!workerId) start();
  } else {
    response = 'Sorry, this is a private bot.';
  }

  sendMessage(chat, response);
});

// Handle /stop
bot.onText(/\/stop/, (message) => {
  const { chat } = message;
  if (chat.id === chatId) {
    const response = workerId
      ? 'Not started.'
      : 'Notifications stopped.';

    if (workerId) {
      clearInterval(workerId);
    }

    sendMessage(chat, response);
  }
});

// Handle /track
bot.onText(/\/track/, (message) => {
  const { chat } = message;
  if (chat.id === chatId) {
    sendMessage(chat, trackSymbols.toString());
  }
});

// Handle quote request
// bot.onText(/.*/, async (message) => {
//   const { chat, text } = message;
//   if (chat.id === chatId) {
//     sendMessage(chat, await getQuote(text));
//   }
// });

// Handle Yahoo quote request
bot.onText(/\/q (.*)/, async (message, match) => { // TODO quote
  // TODO UnhandledPromiseRejectionWarning
  const { chat } = message;
  const [, sym] = match;
  if (chat.id === chatId) {
    const { price } = await requestYahooQuote({ symbol: sym, modules: ['price'] });
    const {
      marketState,
      symbol,
      // preMarketSource,
      preMarketPrice,
      preMarketChange,
      preMarketChangePercent,
      regularMarketChangePercent,
      regularMarketChange,
      regularMarketPrice,
      // regularMarketDayHigh,
      // regularMarketDayLow,
      // regularMarketVolume,
      // regularMarketPreviousClose,
      // regularMarketSource,
      // regularMarketOpen,
    } = price;

    console.log(price); // eslint-disable-line no-console

    let response = '';
    if (marketState === c.PREMARKET) {
      const priceStr = preMarketPrice
        ? `${fmtNumber(preMarketPrice)} | ${fmtNumber(preMarketChange)} [${fmtNumber(preMarketChangePercent * 100)}%]`
        : c.NOT_AVAILABLE;
      response = `${symbol} ${c.PREMARKET}\n${priceStr}`;
    } else if (marketState === c.REGULAR) {
      const priceStr = `${fmtNumber(regularMarketPrice)} | ${fmtNumber(regularMarketChange)} [${fmtNumber(regularMarketChangePercent * 100)}%]`;
      response = `${symbol}\n${priceStr}`;
    } else {
      response = `${symbol}: Unknown marketState = ${marketState}`;
    }

    sendMessage(chat, response);
  }
});

// Log any message
bot.on('message', async (message) => {
  logger.info(`Message -> ${JSON.stringify(message)}`);
});

// Auto-start
if (config.get('autoStart')) start();
