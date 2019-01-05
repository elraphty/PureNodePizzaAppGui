/**
 * Helpers file
 */
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const fs = require('fs');
const path = require('path');
const queryString = require('querystring');

let helpers = {};

helpers.parseJsonToObject = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch(e) {
    return {};
  }
};

helpers.generateToken = (strLength) => {
  strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;
  if(strLength) {
    randomString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let token = '';
    for(i = 0; i < strLength; i++) {
      let randString = randomString.charAt(Math.floor(Math.random() * randomString.length));
      token += randString;
    }
    return token;
  }
}

helpers.hashPassword = (pass) => {
  let hash = crypto.createHmac('sha256', config.secretKey)
    .update(pass).digest('hex');

  return hash;
}

// Send payment with stripe
helpers.payViaStripe = (amount, callback) => {
  // validate parameters
    amount = typeof(amount) === 'number' && amount > 0 ? amount  : false;
  if(amount) {
    
    // Configure the request payload
    const payload = {
      amount,
      'currency' : 'usd',
      'source' : 'tok_visa'
    };

    // Stringify the payload
    const stringPayload = queryString.stringify(payload);

    //Configure the request details
    const requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.stripe.com',
      'method' : 'POST',
      'path' : '/v1/charges',
      'headers' : {
        'Authorization' : `Bearer ${config.stripeKey}`,
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      res.setEncoding('utf8');
      const status = res.statusCode;
      // Callback successful if the request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });
    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => {
      console.log('\x1b[33m%s\x1b[0m','there is error');
      callback(e);
    });
 
    // Add the payload
    req.write(stringPayload);

    // End request
    req.end();

  } else {
    callback('Given parameters were missing of invalid');
  }
};


// Send mail with mailgun
helpers.sendMail = (email, msg, callback) => {
  // validate parameters
  msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  email = typeof(email) === 'string' && email.trim().length > 0 && email.trim().indexOf('@') > -1 ? email.trim() : false;
  if(msg && email) {
    
    // Configure the request payload
    const payload = {
      'from' : 'Elraphty Pizza <transaction@elraphtypizza.com>',
      'to' : email,
      'subject' : 'Order details',
      'text' : msg
    };

    // Stringify the payload
    const stringPayload = queryString.stringify(payload);

    //Configure the request details
    const requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.mailgun.net',
      'method' : 'POST',
      'path' : '/v3/sandbox6609d73ecb2e4248bcb27c5ac7afbc5b.mailgun.org/messages',
      'auth' : config.mailgunKey,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successful if the request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });
    // Bind to the error event so it doesn't get thrown
    req.on('error', (e) => {
      console.log('there is error');
      callback(e);
    });
 
    // Add the payload
    req.write(stringPayload);

    // End request
    req.end();

  } else {
    callback('Given parameters were missing of invalid');
  }
};

helpers.templatesBaseDir  = path.join(__dirname, '/../templates/');

helpers.getTemplates = (templateName, data, callback) => {
  templateName = typeof(templateName) === 'string' && templateName.length > 0 ? templateName : false;
  data = typeof(data) === 'object' && data !== null ? data : {};

  if(templateName) {
    fs.readFile(helpers.templatesBaseDir+templateName+'.html', 'utf8',(err, str) => {
      if(!err && str && str.length > 0) {
        let finalString = helpers.interpolateData(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('Enter a valid template name');
  }
  
};

helpers.interpolateData = (str, data) => {
  str = typeof(str) === 'string' && str.length > 0 ? str : '';
  data = typeof(data) === 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global."
  for(keyData in config.templateGlobals) {
    if(config.templateGlobals.hasOwnProperty(keyData)) {
      data['global.'+keyData] = config.templateGlobals[keyData];
    }
  }

  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for(key in data) {
    if(data.hasOwnProperty(key)) {
      let find = '{'+key+'}';
      str = str.replace(find, data[key]);
    }
  }
  
  return str;
}

module.exports = helpers;