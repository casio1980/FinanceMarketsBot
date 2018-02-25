const _ = require('lodash');
const TelegramBot = require('node-telegram-bot-api');
const yahooFinance = require('yahoo-finance');
const moment = require('moment');
const config = require('config');
const winston = require('winston');
const database = require('./js/database');

const chatId = config.get('chat');

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

//
const getQuote = async (symbol) => {
  logger.debug('Connecting to DB...');
  const db = await database.connect();
  const data = await database.load(db.collection('documents'), { symbol });
  logger.debug(`${data.length} records found for ${symbol}`);
  db.close();

  const latest = _.maxBy(data, item => item.date);
  const {
    date,
    open,
    close,
  } = latest;
  const percent = ((close / open) - 1) * 100;
  return `Date: ${moment(date).format('YYYY-MM-DD')};
Open: ${Number(open).toFixed(2)}; Close: ${Number(close).toFixed(2)} [${Number(percent).toFixed(2)}%]`;
};

// Worker func
let workerId;
const worker = () => {
  logger.debug('Worker');
  // bot.sendMessage(chatId, 'Worker');
};

const start = () => {
  workerId = setInterval(worker, config.get('workerInterval'));
  worker(); // immediate run
};

// Create bot
const bot = new TelegramBot(config.get('token'), { polling: true });
logger.info('Bot started');

// Handle /start
bot.onText(/\/start/, (message, match) => {
  const { from, chat, text } = message;

  let response;
  if (chat.id === chatId) {
    response = workerId
      ? 'Already started.'
      : 'Notifications started.\nStop at any time by typing /stop.';

    if (!workerId) start();
  } else {
    response = 'Sorry, this is a private bot.';
  }

  bot.sendMessage(chat.id, response);
  logger.info(`${chat.id} <- ${response}`);
});

// Handle /stop
bot.onText(/\/stop/, (message, match) => {
  const { from, chat, text } = message;
  if (chat.id === chatId) {
    const response = workerId
      ? 'Not started.'
      : 'Notifications stopped.';

    if (workerId) {
      clearInterval(workerId);
    }

    bot.sendMessage(chat.id, response);
    logger.info(`${chat.id} <- ${response}`);
  }
});

// Handle quote request
bot.onText(/.*/, async (message, match) => {
  const { from, chat, text } = message;
  if (chat.id === chatId) {
    // TODO
    const response = await getQuote(text);
    bot.sendMessage(chat.id, response);
    logger.info(`${chat.id} <- ${response}`);
  }
});

// Log any message
bot.on('message', async (message) => {
  logger.info(`Message -> ${JSON.stringify(message)}`);
});

// Auto-start
if (config.get('autoStart')) start();
