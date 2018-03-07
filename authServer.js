require('dotenv').config();

const fs = require('fs');
const Guid = require('guid');
const express = require('express');
const bodyParser = require("body-parser");
const Mustache = require('mustache');
const Request = require('request');
const Querystring = require('querystring');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var csrf_guid = Guid.raw();
const api_version = 2.7;
const app_id = process.env.APP_ID;
const app_secret = process.env.APP_SECRET;
const me_endpoint_base_url = 'https://graph.accountkit.com/v1.0/me';
const token_exchange_base_url = 'https://graph.accountkit.com/v1.0/access_token';

function loadLogin() {
  return fs.readFileSync('index.html').toString();
}

app.get('/', function (request, response) {
  var view = {
    appId: app_id,
    csrf: csrf_guid,
    version: 'v1.0',
  };

  var html = Mustache.to_html(loadLogin(), view);
  response.send(html);
});

function loadLoginSuccess() {
  return fs.readFileSync('login_success.html').toString();
}

app.post('/sendcode', function (request, response) {
  //console.log('code: ' + request.body.code);

  // CSRF check
  if (request.body.csrf_nonce === csrf_guid) {
    var app_access_token = ['AA', app_id, app_secret].join('|');
    //console.log(app_access_token);
    var params = {
      grant_type: 'authorization_code',
      code: request.body.code,
      access_token: app_access_token
    };

    // exchange tokens

    var token_exchange_url = token_exchange_base_url + '?' + Querystring.stringify(params);
    Request.get({ url: token_exchange_url, json: true }, function (err, resp, respBody) {
      //console.log(token_exchange_url);
      console.log(respBody);
      var view = {
        user_access_token: respBody.access_token,
        user_id: respBody.id,
      };

      // get account details at /me endpoint

      var me_endpoint_url = me_endpoint_base_url + '?access_token=' + respBody.access_token;
      Request.get({ url: me_endpoint_url, json: true }, function (err, resp, respBody) {
        // send login_success.html
        if (respBody.phone) {
          view.phone_num = respBody.phone.number;
          //console.log(view);
        }
        var html = Mustache.to_html(loadLoginSuccess(), view);
        response.send(html);
      });
    });
  }
  else {
    // login failed
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end("Something went wrong. :( ");
  }
});

app.listen(3000, function () {
  console.log('Listening to port 3000...');
});
