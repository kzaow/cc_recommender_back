'use strict';

/**
 * Module dependencies.
 * @private
 */
const https = require('https');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


const href = 'https://creditcards.chase.com/credit-cards/browse-all';
config.max = 1;
config.idleTimeoutMillis = 2000;

/**
 * Removes extraneous characters from `text`.
 * @param {string} text - Unclean text.
 * @return {string} Clean text.
 * @private
 */
function formatText(text) {
  return text.trim().replace(/(\r\n)/g, '').split(/\s+/).join(' ');
}

/**
 * Extracts rewards from card description.
 * @param {string} description - Card description.
 * @return {object} Rewards.
 * @private
 */
function getProperties(description) {
  const cashback = description.match(/(\d+\.?\d*).{0,5}cash/g);
  const travel = /(\d+\.?\d*)[x|X] [points on t|Points on t|miles]/
    .exec(description);
  const points = /(\d+\.?\d*)[x|X|points|Points]{1}/.exec(description);
  const gas = description.match(/(\d+\.?\d*)%.*gas/g);

  return {
    cashback: !cashback ? 0 : Math.min(
      ...cashback.map(val => parseFloat(val.replace(/[^\d\.]/g, '')))
    ),
    travel: !travel ? 0 : Math.max(
      ...travel.map(val => parseFloat(val) || 0)
    ),
    lowinterest: 0,
    zeropercent: 0 + !!description.match(/0% (intro|Intro) APR/),
    balancetransfer: 0 + !!description.match(/balance transfer/),
    points: !points ? 0 : Math.min(
      ...points.map(val => parseFloat(val) || 0)
    ),
    gas: !gas ? 0 : Math.min(
      ...gas.map(val => parseFloat(val.replace(/[^\d\.]/g, '')))
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

  $('.card-box').each((index, element) => {
    element = $(element);
    element.find('sup').remove();

    let name = element.find('.name-link').text();
    name = name.substring(0, name.length / 2);

    let offer = formatText(element.find('.cardmember-offer').text());
    let benefits = formatText(element.find('.glance').text());
    let apr = formatText(element.find('.purchase-apr').text());
    let annualFee = formatText(element.find('.annual-fee').text());
    let description = `${offer}|${benefits}|${apr}|${annualFee}`;

    let img = element.find('img').attr('src');

    let props = getProperties(description);

    let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee) VALUES(3, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
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
