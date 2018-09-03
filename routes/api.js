/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;
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
  
  app.route('/api/stock-prices').get((req, res) => {
    const queryIP = req.ip; // we do not want to allow the same IP to send multiple likes with each query
    const queryStock = !Array.isArray(req.query.stock) ? req.query.stock.toUpperCase()
      : req.query.stock.map((stock) => stock.toUpperCase()).reduce((s1,s2) => s1+','+s2);
    const queryLike = req.query.like;
    let json;
    let noStock = false;
    request(`https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${queryStock}&apikey=${process.env.API_KEY}`, (err, resp, data) => {
      if (err) {
        console.log(err);
      }
      const stockData = parseResponse(data)['Stock Quotes'];
      if (Object.values(stockData).length === 0) {
        noStock = true;
        res.send('no stock with that index');
      }
      if (!noStock) {
        let responseData = [];
        for (let i=0; i < stockData.length; i++) {
          const stock = stockData[i];
          const stockName = stock['1. symbol'];
          const stockPrice = stock['2. price'];
          let newStock = false;
          let likes;
          Stock.findOne({ stock: stockName }, (err, data) => {
            if (err) {
              console.log('Error retrieving stock data ', err);
            }
            if (data === null) {
              newStock = true;
            } else {
              if (queryLike && data.likes.indexOf(queryIP) === -1) {
                data.likes.push(queryIP);
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
                stock: stockName,
                likes: queryLike ? [queryIP] : []
              };
              likes = queryLike ? 1 : 0;
              Stock.create(query, (err, data) => {
                if (err) {
                  console.log('Error saving new stock data ');
                }
              });
            }

            responseData.push({stock: stockName, price: stockPrice, likes: likes});
            }, 250);
          }

        setTimeout(() => {
          if (responseData.length === 1) {
            responseData = responseData[0];
          } else if (responseData.length === 2) {
            // deal with relative likes here
            if (responseData[0].likes <= responseData[1].likes) {
              const relDiff = responseData[1].likes - responseData[0].likes;
              responseData[0].rel_likes = -relDiff;
              responseData[1].rel_likes = relDiff;
            } else {
              const relDiff = responseData[0].likes - responseData[1].likes;
              responseData[0].rel_likes = relDiff;
              responseData[1].rel_likes = -relDiff;
            }
            delete responseData[0]['likes'];
            delete responseData[1]['likes'];
          }
          res.send({stockData: responseData})
        }, 300*(1+(queryStock.match(/,/g) || []).length)); // we leave 300ms for each database query
      }
    });
  });
  
};
