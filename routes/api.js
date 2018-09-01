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
const fetch = require('node-fetch');
const request = require('request');

module.exports = function (app) {
  
  // The response given is from our API request is a string with \n and needs to be parsed to JSON
  // Once to be a regular (non-escaped) string, then once more to return an object
  const parseResponse = (str) => {
    return JSON.parse(JSON.parse((JSON.stringify(str).replace(/(?:\\[rn])+/g, ''))))
  }

  app.route('/api/stock-prices')
    .get(function (req, res){
      const query = req.query.stock;
      request(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${query.toUpperCase()}&apikey=${process.env.API_KEY}`, (err, resp, data) => {
        if (err) {
          console.log('Error fetch stock data ', err);
        } else {
          const json = parseResponse(data)['Global Quote'];
          // stockData will be our db schema
          // run over all stock=... in query and request them all, then findOrCreate in db
          // likes are an array, each tied to an IP
          res.send({stockData: {stock: json['01. symbol'], price: json['05. price'], likes: 0}});
        }
      })
    });
    
};
