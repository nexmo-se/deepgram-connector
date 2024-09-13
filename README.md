# Deepgram ASR Connector

You can use this Connector code to connect a voice call managed by a Vonage Voice API application to Deepgram Automatic Speech Recognition (ASR) engine. Transcripts are posted back to the Vonage Voice API application.

## About this Connector code

This connector makes use of the [WebSockets feature](https://developer.vonage.com/en/voice/voice-api/concepts/websockets) of Vonage Voice API.</br>
When a voice call is established, the peer Voice API application triggers a WebSocket connection to this Connector then streams the audio from the voice call in real time. 

See https://github.com/nexmo-se/voice-app-websockets for a **sample Voice API application** using this Connector code to stream audio from voice calls to Deepgram ASR engine.

## Transcripts

This connector code will send user's speech transcripts to the Voice API application via webhook calls.

## Set up

### Get your credentials from Deepgram

Sign up with or log in to [Deepgram](https://deepgram.com/).</br>

Create or use an existing Deepgram API key,
take note of it (as it will be needed as **`DEEPGRAM_API_KEY`** in the next section).</br>

### Local deployment

For a `local deployment`, you may use ngrok (an Internet tunneling service) for both this Connector application and the [Voice API application](https://github.com/nexmo-se/voice-app-websockets) with [multiple ngrok tunnels](https://ngrok.com/docs#multiple-tunnels).

To do that, [download and install ngrok](https://ngrok.com/download).</br>
Sign in or sign up with [ngrok](https://ngrok.com/), from the ngrok web UI menu, follow the **Setup and Installation** guide.

Set up two domains, one to forward to the local port 6000 (as this Connector application will be listening on port 6000), the other one to the local port 8000 for the [Voice API application](https://github.com/nexmo-se/voice-app-websockets).

Start ngrok to start both tunnels that forward to local ports 6000 and 8000,</br>
please take note of the ngrok **Enpoint URL** that forwards to local port 6000 as it will be needed when setting the [Voice API application](https://github.com/nexmo-se/voice-app-websockets),
that URL looks like:</br>
`xxxxxxxx.ngrok.io`, `xxxxxxxx.herokuapp.com`, `myserver.mycompany.com:32000`  (as **`PROCESSOR_SERVER`** in the .env file of the [Voice API application](https://github.com/nexmo-se/voice-app-websockets)),</br>
no `port` is necessary with ngrok or heroku as public hostname,</br>
that host name to specify must not have leading protocol text such as https://, wss://, nor trailing /.

Copy the `.env.example` file over to a new file called `.env`:
```bash
cp .env.example .env
```

Update the value of parameter **`DEEPGRAM_API_KEY`** in .env file<br>

Have Node.js installed on your system, this application has been tested with Node.js version 18.19<br>

Install node modules with the command:<br>
 ```bash
npm install
```

Launch the application:<br>
```bash
node deepgram-connector
```

Default local (not public!) of this application server `port` is: 8000.

### Voice API application

Set up the peer Voice API application per the instructions in its [repository](https://github.com/nexmo-se/voice-app-websockets).








