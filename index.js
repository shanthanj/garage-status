"use strict";

var http = require("http");
setInterval(function() {
   // console.log("pinging my app...");
   http.get("http://garage-status.herokuapp.com");
}, 300000); // every 2 minutes (300000)

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const sa = require("superagent");

const restService = express();
const authHeader = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIyZDkyZjI0YTU4MjQ0MzllYjI1ZGU2MTNkNTM4YmMyZCIsImlhdCI6MTU3Nzk2OTIyMiwiZXhwIjoxODkzMzI5MjIyfQ.DkqhGJD2GjLGV3jAPuWow_iRNOw-jBE5Sn05xqX3lqQ';

restService.use(
  bodyParser.urlencoded({
    extended: true
  })
);

restService.use(bodyParser.json());

restService.post("/OnLights", function(req, res) {
	var onLightsUrl = 'https://pjhass.duckdns.org/api/services/switch/turn_on';
	onOffLights(onLightsUrl, req, function(response) {
		if (response) {
			return res.json(getJsonResp("Turning On " + req, "OnLights"));
		} else {
			return res.json(getJsonResp("Sorry I could'nt turn on " + req + ". Please try again", "OnLights"));
		}
	});
});

restService.post("/OffLights", function(req, res) {
	var offLightsUrl = 'https://pjhass.duckdns.org/api/services/switch/turn_off';
	onOffLights(offLightsUrl, req, function(response) {
		if (response) {
			return res.json(getJsonResp("Turning Off " + req, "OffLights"));
		} else {
			return res.json(getJsonResp("Sorry I could'nt turn off " + req + ". Please try again", "OffLights"));
		}
	});
});

restService.post("/changeChannel", function(req, res) {
   var requestedChannel = getRequestedChannelIFTTT(req);
   var changeChannelUrl = 'https://pjhass.duckdns.org/api/services/script/turn_on';
   changeChannel(changeChannelUrl, requestedChannel, function(response) {
          if (response) {
             return res.json(getJsonResp("Changing Channel to " + requestedChannel, "changeChannel"));
          } else {
             return res.json(getJsonResp("Sorry I could'nt recognize the channel " + requestedChannel + ". Try a valid channel", "changeChannel"));
          }
       });
});

restService.post("/garageStatus", function(req, res) {
  var requestedIntent = getRequestedIntent(req);
  var statusUrl = 'https://pjhass.duckdns.org/api/states/cover.garage_door';
  var openMainGarageUrl = 'https://pjhass.duckdns.org/api/services/cover/open_cover';
  var closeMainGarageUrl = 'https://pjhass.duckdns.org/api/services/cover/close_cover';
  var changeChannelUrl = 'https://pjhass.duckdns.org/api/services/script/turn_on';
  var onLightsUrl = 'https://pjhass.duckdns.org/api/services/switch/turn_on';
  var offLightsUrl = 'https://pjhass.duckdns.org/api/services/switch/turn_off';
  var status;

 switch(requestedIntent) {
 
   case "OnLights":
	  var requestedLight = getRequestedLight(req);
	  onOffLights (onLightsUrl, requestedLight, function (response) {
		if (response) {
             return res.json(getJsonResp("Turning On " + requestedLight, "OnLights"));
          } else {
             return res.json(getJsonResp("Sorry I could'nt turn on " + requestedLight + ". Try again", "OnLights"));
          }
	  });
	  break;
	  
	case "OffLights":
	  var requestedLight = getRequestedLight(req);
	  onOffLights (offLightsUrl, requestedLight, function (response) {
		if (response) {
             return res.json(getJsonResp("Turning Off " + requestedLight, "OffLights"));
          } else {
             return res.json(getJsonResp("Sorry I could'nt turn off " + requestedLight + ". Try again", "OffLights"));
          }
	  });
	  break;
 
   case "changeChannel":
       var requestedChannel = getRequestedChannel(req);
       changeChannel(changeChannelUrl, requestedChannel, function(response) {
          if (response) {
             return res.json(getJsonResp("Changing Channel to " + requestedChannel, "changeChannel"));
          } else {
             return res.json(getJsonResp("Sorry I could'nt recognize the channel " + requestedChannel + ". Try a valid channel", "changeChannel"));
          }
       });
       break;
   case "getStatus":
       getGarageStatus(statusUrl, function(response) {
         if (response == 'unknown') {
            return res.json(getJsonResp("Sorry I couldn't detect the main garage status. Status is " + response, "garage-status"));
         } else {
            return res.json(getJsonResp("Main Garage is " + response, "garage-status"));
         }
       });
       break;

   case "openMainGarage":
       //first we need to check the status of the garage, if already open do nothing else open
       getGarageStatus(statusUrl, function(response) {
          if (response == 'unknown') {
             return res.json(getJsonResp("Sorry, I cannot open since the garage is in uknown state at the moment", "openGarage"));
          }
          if (response == 'open') {
            return res.json(getJsonResp("Nice try. Main Garage is already Open.", "openGarage"));
          } else {
            openOrCloseMainGarage(openMainGarageUrl, function(response) {
              return res.json(getJsonResp("Ok Opening Main Garage.", "openGarage"));
            });
          }
       });
      break;

   case "closeMainGarage":
       //first we need to check the status of the garage, if already open do nothing else open
       getGarageStatus(statusUrl, function(response) {
          if (response == 'unknown') {
             return res.json(getJsonResp("Sorry, I cannot open since the garage is in uknown state at the moment", "openGarage"));
          }
          if (response == 'closed') {
            return res.json(getJsonResp("I can't do that. Main Garage is already Closed.", "closeGarage"));
          } else {
            openOrCloseMainGarage(closeMainGarageUrl, function(response) {
              return res.json(getJsonResp("Ok Closing Main Garage.", "closeGarage"));
            });
          }
       });
      break;


   default:
        console.log("Do nothing");
 }

});


function getGarageStatus(urlToCall, callback) {
	
  var options = {
    url: urlToCall,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
    }
};
	
  request(options, function(error, response, body) {
    var parsedStatus = JSON.parse(body);
    return callback(parsedStatus.state);
  });
}

function openOrCloseMainGarage(urlToCall, callback) {
  sa.post(urlToCall)
    .set('Authorization', authHeader)
    .send('{"entity_id":"cover.garage_door"}')
    .end(function(err, resp) {
      return callback(true);
    });
}

function onOffLights(urlToCall, requestedLight, callback) {
	var entityToChange = "";
	var reqLight = requestedLight.toUpperCase();
	switch(reqLight) {
		case "LIVINGROOM":
			entityToChange = "switch.living_lights";
			break;
		case "PORCH":
			entityToChange = "switch.outside_lights";
			break;
	}
	if (entityToChange != ""){
		console.log("In: onOffLights()" + entityToChange + "URL: " + urlToCall);
      sa.post(urlToCall)
       .set('Authorization', authHeader)
       .send('{"entity_id":"' + entityToChange + '"}')
       .end(function(err, resp) {
         return callback(true);
       });
   } else {
      return callback(false);
   }
}

function changeChannel(urlToCall, requestedChannel, callback) {
   var entityToChange = "";
   var reqChannel = requestedChannel.toUpperCase();
   switch(reqChannel) {
      case "CBC":
         entityToChange = "script.tv_channel_cbc";
         break;
      case "CP24":
         entityToChange = "script.tv_channel_cp24";
         break;
      case "VIJAY TV":
         entityToChange = "script.tv_channel_vijay";
         break;
      case "SUN TV":
         entityToChange = "script.tv_channel_suntv";
         break;
      case "KTV":
         entityToChange = "script.tv_channel_ktv";
         break;
      case "SUN MUSIC":
         entityToChange = "script.tv_channel_sun_music";
         break;
      case "TVI":
         entityToChange = "script.tv_channel_tvi";
         break;
      case "HALLMARK":
         entityToChange = "script.tv_channel_hallmark";
         break;
   }
   if (entityToChange != ""){
      sa.post(urlToCall)
       .set('Authorization', authHeader)
       .send('{"entity_id":"' + entityToChange + '"}')
       .end(function(err, resp) {
         return callback(true);
       });
   } else {
      return callback(false);
   }
}
   

function getRequestedIntent(req) {
   return req.body.queryResult.intent.displayName;
}

function getRequestedChannel(req) {
   return req.body.queryResult.parameters.Channel;
}

function getRequestedLight(req) {
	return req.body.queryResult.parameters.Light;
}

function getRequestedChannelIFTTT(req) {
   return req.body.channel;
}

function getJsonResp(status, source) {
  let respObj = {
    "fulfillmentText": status
    ,"fulfillmentMessages": [
      {
      "text": {
        "text": [
          status
        ]
      }
    }
    ]
    ,"source": source
  }

  return respObj;
}

restService.listen(process.env.PORT || 8000, function() {
  console.log("Server up and listening");
});
