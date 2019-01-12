/**
 * Main Server File
 * Created On Dec 18 2018
 * By Rapahel Osaze Eyerin
 */

const http = require('http');
const https = require('https');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const url = require('url');
const path = require('path');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;

// Declare and initialize server
const server = {};

// httpServer
server.httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

server.httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsOptions, (req, res) => {
  unifiedServer(req, res);
});

// This function intercepts both http and https request
function unifiedServer(req, res) {
  // headers from the incoming request
  let headers = req.headers;
  // incoming request method
  let method = req.method.toLowerCase();
  // Parse url
  let parseUrl = url.parse(req.url, true);
  // path request by the visitor
  let path = parseUrl.pathname;
  // Trim the path and remove slashes
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');
  // Get the query string as an object
  let queryStringObject = parseUrl.query;

  // Get incoming data
  const decoder = new StringDecoder('utf-8');
  let buffer = "";

  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // console.log('Path', trimmedPath);
    // console.log('query', queryStringObject);
    // console.log('headers', headers);
    console.log('path', path);
    console.log('Incoming data', buffer);

    let data = {
      headers,
      trimmedPath,
      queryStringObject,
      method,
      path,
      'payload': helpers.parseJsonToObject(buffer)
    };

    let chooseHandler = typeof(server.routes[trimmedPath]) !== 'undefined' ? server.routes[trimmedPath]: handlers.notfound;

    // If the request is within the public directory use to the public handler instead
    chooseHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chooseHandler;

    chooseHandler(data, (statusCode, payload, contentType) => {
      // Check for status code if not defined return 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
   
      contentType = typeof(contentType) === 'string' ? contentType : 'json';
      let payloadString = '';
      if(contentType === 'json') {
        res.setHeader('Content-Type', 'application/json');
        // use the payload called back or default to empty
        payload = typeof(payload) === 'object' ? payload : {};
        payloadString = JSON.stringify(payload);
      } 
      
      if(contentType === 'html') {
        res.setHeader('Content-Type', 'text/html');
        payloadString = typeof(payload) === 'string' ? payload : '';
      }

      if(contentType == 'favicon'){
        res.setHeader('Content-Type', 'image/x-icon');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if(contentType == 'plain'){
        res.setHeader('Content-Type', 'text/plain');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if(contentType == 'css'){
        res.setHeader('Content-Type', 'text/css');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if(contentType == 'png'){
        res.setHeader('Content-Type', 'image/png');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      if(contentType == 'jpg'){
        res.setHeader('Content-Type', 'image/jpeg');
        payloadString = typeof(payload) !== 'undefined' ? payload : '';
      }

      // Return the response
      res.writeHead(statusCode);
      res.end(payloadString);
    });

  });
}

server.init = () => {
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `Server listening of PORT ${config.httpPort}`);
  });

  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `Https Server listening of PORT ${config.httpsPort}`);
  });
};

server.routes = {
  'favicon.ico' : handlers.favicon,
  'public': handlers.public,
  'index': handlers.index,
  '': handlers.index,
  'account/create' : handlers.accountCreate,
  'account/edit' : handlers.accountEdit,
  'account/deleted' : handlers.accountDeleted,
  'session/create' : handlers.sessionCreate,
  'session/deleted' : handlers.sessionDeleted,
  'items' : handlers.itemsList,
  'cart/cleared' : handlers.cartCleared,
  'order/placed' : handlers.orderPlaced,
  'register': handlers.register,
  'login': handlers.login,
  'api/users': handlers.users,
  'api/carts': handlers.carts,
  'api/items': handlers.items,
  'api/orders': handlers.order,
  'api/tokens': handlers.tokens
}

module.exports = server;