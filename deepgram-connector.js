'use strict'

//-------------

require('dotenv').config();

//--- for Neru installation ----
const neruHost = process.env.NERU_HOST;
console.log('neruHost:', neruHost);

//--
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
require('express-ws')(app);

app.use(bodyParser.json());

//--

const axios = require('axios');

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

//---

// Only if needed - For self-signed certificate in chain - In test environment
// Do not uncomment in production environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

//---- DeepGram ASR engine ----

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const fetch = require("cross-fetch");
const dgApiKey = process.env.DEEPGRAM_API_KEY;

//--- Websocket server (for WebSockets from Vonage Voice API platform)- Deepgram transcribe live streaming audio ---

app.ws('/socket', async (ws, req) => {


  const originalUuid = req.query.original_uuid;
  const webhookUrl = req.query.webhook_url;
  const user = req.query.user;
  const remoteParty = req.query.remote_party;

  //--

  console.log('>>> websocket connected with');
  console.log('original call uuid:', originalUuid);

  //--

  console.log('Creating client connection to DeepGram');

  const deepgramClient = createClient(dgApiKey);

  console.log('Listening on Deepgram connection');

  let deepgram = deepgramClient.listen.live({       
    model: "nova-2",
    smart_format: true,      
    language: "en-US",        
    encoding: "linear16",
    sample_rate: 16000
  });

  console.log('Listener on connection to DeepGram');

  deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
    console.log("deepgram: connected");

    deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
      // console.log(JSON.stringify(data));
      const transcript = data.channel.alternatives[0].transcript;

      if (transcript != '') {
        console.log('\n>>> Transcript:', transcript);
        // to do post back transcript to Voice API app

        const response = await axios.post(webhookUrl,
          {
            "user": user,
            "remoteParty": remoteParty,
            "transcript": transcript
          },
          {
          headers: {
            "Content-Type": 'application/json'
          }
        }
        );  


      }   

    });

    deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
      console.log("deepgram: disconnected");
      // clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
      console.log("deepgram: error received");
      console.error(error);
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
      console.log("deepgram: warning received");
      console.warn(warning);
    });

    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("deepgram: metadata received");
      console.log("ws: metadata sent to client");
      // ws.send(JSON.stringify({ metadata: data }));
      console.log(JSON.stringify({ metadata: data }));
    });
  
  });

  //---------------

  ws.on('message', async (msg) => {
    
    if (typeof msg === "string") {
    
      console.log("\n>>> Websocket text message:", msg);
    
    } else {

      if (deepgram.getReadyState() === 1 /* OPEN */) {
        deepgram.send(msg);
      } else if (deepgram.getReadyState() >= 2 /* 2 = CLOSING, 3 = CLOSED */) {
        // console.log("ws: data couldn't be sent to deepgram");
        null
      } else {
        // console.log("ws: data couldn't be sent to deepgram");
        null
      }

    }

  });

  //--

  ws.on('close', async () => {

    deepgram.finish();
    deepgram.removeAllListeners();
    deepgram = null;
    
    console.log("WebSocket closed");
  });

});

//--- If this application is hosted on VCR (Vonage Code Runtime) serverless infrastructure (aka Neru) --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=========================================

const port = process.env.NERU_APP_PORT || process.env.PORT || 6000;

app.listen(port, () => console.log(`Voice API application listening on port ${port}!`));

//------------

