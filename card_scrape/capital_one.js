'use strict';

/**
 * Module dependencies.
 * @private
 */
const https = require('https');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


const href = 'https://www.capitalone.com/credit-cards/compare/';
config.max = 1;
config.idleTimeoutMillis = 2000;

/**
 * Extracts rewards from card description.
 * @param {string} description - Card description.
 * @return {object} Rewards.
 * @private
 */
function getProperties(description) {
  const cashback = /(\d+\.?\d*).*cash back/.exec(description);
  const travel = /(\d+\.?\d*).*mile/.exec(description);

  return {
    cashback: !cashback ? 0 : Math.max(
      ...cashback.map(val => parseFloat(val) || 0)
    ),
    travel: !travel ? 0 : Math.max(
      ...travel.map(val => parseFloat(val) || 0)
    ),
    lowinterest: 0,
    zeropercent: 0 + !!description.match(/0% intro APR/),
    balancetransfer: 0,
    points: 0,
    gas: 0,
    extendedwarranty: 1,
    priceguarantee: 0,
  };
}

new Promise((resolve, reject) => {
  https.get(href, res => {
    let html = '';
    res.on('data', data => {
      html += data.toString();
    });
    res.on('end', () => {
      resolve(html);
    });
  });
}).then(html => {
  return new Promise((resolve, reject) => {
    new pg.Pool(config).connect((err, client, done) => {
      resolve({html: html, err: err, client: client, done: done});
    });
  });
}).then(result => {
  const $ = cheerio.load(result.html);

  $('.product').each((index, element) => {
    element = $(element);
    element.find('sup').remove();

    let name = element.find('h3').text();
    let description = `${element.find('.primary').text()}|${element.find('.apr').text()}|${element.find('.transfer').text()}|${element.find('.fee').text()}`;
    let img = `https://www.capitalone.com/${element.find('img').attr('src')}`;

    let props = getProperties(description);

    let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee, img) VALUES(2, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
    let params = [
      name,
      description,
      props.cashback,
      props.travel,
      props.lowinterest,
      props.zeropercent,
      props.balancetransfer,
      props.points,
      props.gas,
      props.extendedwarranty,
      props.priceguarantee,
      img
    ];
    result.client.query(query, params);
  });
  result.done(result.err);
});
