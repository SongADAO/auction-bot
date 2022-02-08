## Development Setup
1. Clone the repository and install the dependencies:
```
git clone https://github.com/SongADAO/auction-bot.git
cd auction-bot
npm install
```
2. Create a `.env` file and add the following environment variables:
```
APP_KEY=Twitter Consumer Key
APP_SECRET=Twitter Consumer Key Secret
ACCESS_TOKEN=Twitter Access Token
ACCESS_SECRET=Twitter Access Token Secret

WS_ENDPOINT=Infura Mainnet Websocket endpoint (the part after wss://mainnet.infura.io/ws/v3/)
```

Note that this part may be different if you're running on linux, but as long as you can set all these environment variables you're good to go.