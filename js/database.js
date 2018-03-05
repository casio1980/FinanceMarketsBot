const mongo = require('mongodb').MongoClient; // TODO Upgrade to 3.0

function connect(url) {
  return new Promise((resolve, reject) => {
    mongo.connect(url, (err, db) => {
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
