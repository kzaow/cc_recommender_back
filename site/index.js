'use strict';

/**
 * Module dependencies.
 * @private
 */
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');


const port = 80;
const app = express();
const apiOpts = {
  hostname: '34.207.205.128',
  port: 80,
  method: 'GET',
};

app.use(express.static(`${__dirname}/cc_recommender_front`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.post('/results', (req, res) => {
  const maxScores = {
    excellent: 850,
    good: 719,
    average: 689,
    poor: 629
  };
  const maxScore = maxScores[req.body.score] || 0;
  const cashback = req.body.cashback === 'true' ? 1 : 0;
  const travel = req.body.travel === 'true' ? 1 : 0;
  const lowinterest = req.body.lowinterest === 'true' ? 1 : 0;
  const zeropercent = req.body.zeropercent === 'true' ? 1 : 0;
  const balancetransfer = req.body.balancetransfer === 'true' ? 1 : 0;
  const points = req.body.points === 'true' ? 1 : 0;
  const gas = req.body.gas === 'true' ? 1 : 0;
  const extendedwarranty = req.body.extendedwarranty === 'true' ? 1 : 0;
  const priceguarantee = req.body.priceguarantee === 'true' ? 1 : 0;
  const customerservice = req.body.customerservice === 'true' ? 50 : 0;
  const redemption = req.body.redemption === 'true' ? 50 : 0;
  const creditbuilding = req.body.creditbuilding === 'true' ? 50 : 0;
  const security = req.body.security === 'true' ? 50 : 0;
  const technology = req.body.technology === 'true' ? 50 : 0;

  apiOpts.path = `/testkey/score=${maxScore}&cashback=${cashback}&travel=${travel}&lowinterest=${lowinterest}&zeropercent=${zeropercent}&balancetransfer=${balancetransfer}&points=${points}&gas=${gas}&extendedwarranty=${extendedwarranty}&priceguarantee=${priceguarantee}&customerservice=${customerservice}&redemption=${redemption}&creditbuilding=${creditbuilding}&security=${security}&technology=${technology}`;

  http.get(apiOpts, apiRes => {
    let apiJSON = '';
    apiRes.on('data', data => {
      apiJSON += data.toString();
    });
    apiRes.on('end', () => {
      res.json(JSON.parse(apiJSON));
      res.end();
    });
  });
});

app.post('/review', (req, res) => {
  const remoteAddress = req.connection.remoteAddress || '';
  const cardId = parseInt(req.body.id) || 0;
  const customerService = parseFloat(req.body.customerservice) || 0;
  const redemption = parseFloat(req.body.redemption) || 0;
  const building = parseFloat(req.body.building) || 0;
  const security = parseFloat(req.body.security) || 0;
  const technology = parseFloat(req.body.technology) || 0;
  const txt = (req.body.text || '').replace(/\s/g, '%20');

  apiOpts.path = `/review/testkey/remoteaddress=${remoteAddress}&cardid=${cardId}&customerservice=${customerService}&redemption=${redemption}&building=${building}&security=${security}&technology=${technology}&text=${txt}`;

  http.get(apiOpts, apiRes => {
    let apiJSON = '';
    apiRes.on('data', data => {
      apiJSON += data.toString();
    });
    apiRes.on('end', () => {
      res.json(JSON.parse(apiJSON));
      res.end();
    });
  });
});

app.get(/card\/\d+/, (req, res) => {
  res.sendFile(`${__dirname}/cc_recommender_front/card.html`);
});

app.post(/card\/\d+/, (req, res) => {
  const id = parseInt(req.path.split('/')[2]);
  apiOpts.path = `/card/testkey/${id}`;

  http.get(apiOpts, apiRes => {
    let apiJSON = '';
    apiRes.on('data', data => {
      apiJSON += data.toString();
    });
    apiRes.on('end', () => {
      res.json(JSON.parse(apiJSON));
      res.end();
    });
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
