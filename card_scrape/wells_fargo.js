'use strict';

/**
 * Module dependencies.
 * @private
 */
const https = require('https');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


const href = 'https://www.wellsfargo.com/credit-cards/find-a-credit-card/all/';
config.max = 1;
config.idleTimeoutMillis = 2000;

/**
 * Extracts rewards from card description.
 * @param {string} description - Card description.
 * @return {object} Rewards.
 * @private
 */
function getProperties(description) {
  const cashback = /(\d+\.?\d*)%.*cash/.exec(description);
  const points = /(\d+\.?\d*)x points/.exec(description);
  const gas = /(\d+\.?\d*)x points on gas/.exec(description);

  return {
    cashback: !cashback ? 0 : Math.min(
      ...cashback.map(val => parseFloat(val) || 0)
    ),
    travel: 0,
    lowinterest: 0 + !!description.match(/intro APR/),
    zeropercent: 0,
    balancetransfer: 0 + !!description.match(/balance transfer/),
    points: !points ? 0 : Math.min(
      ...points.map(val => parseFloat(val) || 0)
    ),
    gas: !gas ? 0 : Math.min(
      ...gas.map(val => parseFloat(val) || 0)
    ),
    extendedwarranty: 0,
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

  $('.c101').each((index, element) => {
    element = $(element);
    element.find('sup').remove();

    let name = element.find('.cardDetailContainer').find('h2').text()
      .replace(/(\n|\t)/g, '');

    let description = element.find('li').map((i, e) => {
      return $(e).text().replace(/(\n|\t)/g, '');
    }).get().join('|');

    let props = getProperties(description);

    let img = element.find('figure').find('img').attr('src');

    let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee) VALUES(4, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
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
