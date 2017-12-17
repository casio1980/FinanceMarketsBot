const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const winston = require('winston');

const chatId = config.get("chat");

// Worker func
let workerId;
const worker = () => {
    logger.debug('Worker');
    // bot.sendMessage(chatId, 'Worker');
};

const start = () => {
    workerId = setInterval(worker, config.get("workerInterval"));
    worker(); // immediate run
};

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
    ]
});

// Create bot
const bot = new TelegramBot(config.get('token'), { polling: true });
logger.info('Bot started');

// Handle /start
bot.onText(/\/start/, (message, match) => {
    const { from, chat, text } = message;

    let response;
    if (chat.id === chatId) {
        response = workerId
            ? "Already started."
            : "Notifications started.\nStop at any time by typing /stop.";
        
        if (!workerId) start();
    } else {
        response = "Sorry, this is a private bot.";
    }

    bot.sendMessage(chat.id, response);
    logger.info(`${chat.id} <- ${response}`);
});

// Handle /stop
bot.onText(/\/stop/, (message, match) => {
    const { from, chat, text } = message;
    if (chat.id === chatId) {
        const response = workerId
            ? "Not started."
            : "Notifications stopped.";
        
        if (workerId) {
            clearInterval(workerId);
        }

        bot.sendMessage(chat.id, response);
        logger.info(`${chat.id} <- ${response}`);
    }
});

// Listen to any message
bot.on('message', message => {
    logger.info(`Message -> ${JSON.stringify(message)}`);
});

// Auto-start
if (config.get("autoStart")) start();