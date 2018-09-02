/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;
const MongoClient = require('mongodb');
const mongoose = require('mongoose');
const request = require('request');

const db = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

const Schema = mongoose.Schema;
const StockSchema = new Schema({
  stock: String,
  likes: [String]
});
const Stock = mongoose.model('Stocks', StockSchema);

module.exports = (app) => {
  
  // The response given is from our API request is a string with \n and needs to be parsed to JSON
  // Once to be a regular (non-escaped) string, then once more to return an object
  const parseResponse = (str) => {
    return JSON.parse(JSON.parse((JSON.stringify(str).replace(/(?:\\[rn])+/g, ''))))
  }
  
  // When querying a stock, we either want to look up the current data, or create a new entry if it has
  // not been searched before
  

  app.route('/api/stock-prices')
  
    .get((req, res) => {
      const queryIP = req.ip; // we do not want to allow the same IP to send multiple likes with each query
      const queryStock = req.query.stock.toUpperCase();
      const queryLike = req.query.like;
      let newStock = false;
      let json;
      let noStock = false;
      request(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${queryStock.toUpperCase()}&apikey=${process.env.API_KEY}`, (err, resp, data) => {
        if (err) {
          console.log('Error fetch stock data ', err);
        } else {
          json = parseResponse(data)['Global Quote'];
          if (Object.values(json).length === 0) {
            noStock = true;
            res.send('no stock with that index');
          }
          if (!noStock) {
            let likes;
            Stock.findOne({ stock: queryStock }, (err, data) => {
              if (err) {
                console.log('Error retrieving stock data ', err);
              }
              if (data === null) {
                newStock = true;
              } else {
                if (queryLike && data.likes.indexOf(queryIP) === -1) {
                  data.likes.push(queryIP);
                  console.log(likes);
                  data.save((err, data) => {
                    if (err) {
                      console.log('Error updating stock data ', err);
                    }
                  });
                }
                likes = data.likes.length;
              };
            });
            // need to wait for db response before knowing if the stock is new or not
            setTimeout(() => {
              if (newStock) {
                const query = {
                  stock: queryStock,
                  likes: queryLike ? [queryIP] : []
                };
                likes = queryLike ? 1 : 0;
                Stock.create(query, (err, data) => {
                  if (err) {
                    console.log('Error saving new stock data ');
                  }
                });
              }

              res.send({stockData: {stock: json['01. symbol'], price: json['05. price'], likes: likes}});
            }, 100);
          }
        };
      });
    });
};
