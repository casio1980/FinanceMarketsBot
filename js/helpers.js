const yahooFinance = require('yahoo-finance'); // TODO https://github.com/pilwon/node-google-finance

exports.fmtNumber = number => Number(number).toFixed(2);

exports.requestYahooQuote = async options =>
  new Promise((resolve, reject) => {
    yahooFinance.quote(options, (err, quotes) => {
      if (err) reject(err);
      else resolve(quotes);
    });
  });
