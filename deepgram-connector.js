'use strict'

//-------------

require('dotenv').config();

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

// ONLY if needed - For self-signed certificate in chain - In test environment
// Must leave next line as a comment in production environment
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

//---- DeepGram STT engine ----

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
// const fetch = require("cross-fetch");
const dgApiKey = process.env.DEEPGRAM_API_KEY;

//--- Websocket server (for WebSockets from Vonage Voice API platform)- Deepgram transcribe live streaming audio ---

app.ws('/socket', async (ws, req) => {

  const peerUuid = req.query.peer_uuid;
  const user = req.query.user;
  const remoteParty = req.query.remote_party;
  const callee = req.query.callee;
  const webhookUrl = req.query.webhook_url;

  //--

  if (peerUuid) {
    console.log('>>> websocket connected with');
    console.log('peer call uuid:', peerUuid);
  }  

  console.log('>>> webhook URL to post back results');
  console.log(webhookUrl);

  //--

  console.log('Creating client connection to DeepGram');

  const deepgramClient = createClient(dgApiKey);

  console.log('Listening on Deepgram connection');

  let deepgram = deepgramClient.listen.live({       
    model: process.env.DEEPGRAM_STT_MODEL,
    smart_format: process.env.DEEPGRAM_STT_SMART_FORMAT,   
    language: process.env.DEEPGRAM_STT_LANGUAGE,        
    encoding: "linear16", // do not change
    sample_rate: 16000, // do not change
    punctuate: process.env.DEEPGRAM_STT_PUNCTUATE,
    diarize: process.env.DEEPGRAM_STT_DIARIZE,
    diarize_speaker_count: process.env.DEEPGRAM_STT_DIARIZE_SPEAKER_COUNT,
    endpointing: process.env.DEEPGRAM_STT_ENDPOINTING,
    // diarize: "v2",
    // vad_turnoff: 0.1,
    // utt_split: 0.3
  });


  console.log('Listener on connection to DeepGram');

  deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
    console.log("deepgram: connected");

    deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
      
      // console.log('\n');
      // console.log(JSON.stringify(data));
      
      const transcript = data.channel.alternatives[0].transcript;

      if (transcript != '') {
        // console.log('\n>>> Data:', data);
        console.log('\n>>> Data:', data.channel.alternatives[0]);
        // console.log('\n>>> Transcript:', transcript);
        
        // post back transcript to Voice API app
        const response = await axios.post(webhookUrl,
          {
            "user": user,
            "remoteParty": remoteParty,
            "call_uuid": peerUuid, 
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

//--- If this application is hosted on VCR (Vonage Cloud Runtime) serverless infrastructure --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=========================================

const port = process.env.VCR_PORT || process.env.PORT || 6000;

app.listen(port, () => console.log(`Connector application listening on port ${port}!`));

//------------

