const mongo = require('mongodb').MongoClient; // TODO Upgrade to 3.0

// const DB_URL = 'mongodb://localhost:27017/rates';
const DB_URL = 'mongodb://92.246.139.189:27017/rates';


function connect(url) {
  return new Promise((resolve, reject) => {
    mongo.connect(url || DB_URL, (err, db) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}
exports.connect = connect;

function load(collection, filter) {
  return new Promise((resolve, reject) => {
    collection.find(filter).sort({ date: 1 }).toArray((err, docs) => {
      if (err) reject(err);
      else resolve(docs);
    });
  });
}
exports.load = load;
