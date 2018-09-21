'use strict';

/**
 * Module dependencies.
 * @private
 */
var webpage = require('webpage');
var fs = require('fs');


var href = 'https://www.citi.com/credit-cards/compare-credit-cards/citi.action?ID=view-all-credit-cards';
var currAjaxStep = 0;
var totalAjaxSteps = 1;

var page = webpage.create();
page.viewportSize = {
  width: 1440,
  height: 900
};

function dumpHtml() {
  fs.write('html_dumps/citi.html', page.content, 'w');
  phantom.exit(0);
}

page.onLoadFinished = function() {
  ++currAjaxStep === totalAjaxSteps && dumpHtml();
};

page.open(href, function(status) {
  status !== 'success' && phantom.exit(1);
});

setTimeout(function() {
  console.log('Citi timeout.');
  phantom.exit(1);
}, 60000);
