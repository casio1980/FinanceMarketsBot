const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const winston = require('winston');

// Init log
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(record => (
            `${record.timestamp} | ${record.level}: ${record.message}`
        )),
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: config.get('logfile') }),
    ]
});

// Create bot
const bot = new TelegramBot(config.get('token'), { polling: true });
logger.info('Bot started');

// Handle /start
bot.onText(/\/start/, (message, match) => {
    const { from, chat, text } = message;
    const response = "Hello world!";

    bot.sendMessage(chat.id, response);
    logger.info(`${chat.id} <- ${response}`);
});

// Listen for any message
bot.on('message', message => {
    logger.info(`Message -> ${JSON.stringify(message)}`);
});
