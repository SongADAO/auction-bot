require("dotenv").config();
const { TwitterApi } = require('twitter-api-v2');
const fetch = require('node-fetch');
const { contractSAD } = require('./contract.js');

const client = new TwitterApi({
    appKey: `${process.env.APP_KEY}`,
    appSecret: `${process.env.APP_SECRET}`,
    accessToken: `${process.env.ACCESS_TOKEN}`,
    accessSecret: `${process.env.ACCESS_SECRET}`,
});
const twitter = client.v2;

function toHTTPS(ipfsLink) {
    return `https://ipfs.io/ipfs/${ipfsLink.substring(7)}`;
}

async function tweetCreation(id) {
    const ipfs = await contractSAD.methods.tokenURI(id).call(); // Token metadata uri
    var response = await fetch(toHTTPS(ipfs));
    while (!response.ok) {
        response = await fetch(toHTTPS(ipfs));
    }
    const json = await response.json();
    const title = json.name; // Song name
    const youtube = json.youtube_url; // Song youtube url
    return twitter.tweet(`🎵 Daily auction for Song ${id} "${title}" has started!\n\n👉 Place your bid here: https://songaday.world/auction/${id}/ \n▶️ Play the song on youtube: ${youtube}`, {});
}

function tweetBid(id, bidder, value, map) {
    if (map.has(id)) {
        // Tweet id found, reply to the tweet
        return twitter.reply(
            `🎵 Song ${id} has received a bid of Ξ${value} from ${bidder}!`,
            map.get(id),
        );
    }
    else {
        // Tweet id not found, tweet individually
        return twitter.tweet(`🎵 Song ${id} has received a bid of Ξ${value} from ${bidder}!\n👉 Place your bid here: https://songaday.world/auction/${id}/`, {});
    }
}

function tweetEnd(id, winner, amount, map) {
    if (map.has(id)) {
        // Tweet id found, reply to the tweet
        return twitter.reply(
            `🎉 Congratulations to ${winner} for winning Song ${id} with a bid of Ξ${amount}!`,
            map.get(id),
        );
    }
    else {
        // Tweet id not found, tweet individually
        return twitter.tweet(`🎉 Congratulations to ${winner} for winning Song ${id} with a bid of Ξ${amount}!`, {});
    }
}

module.exports = { tweetCreation, tweetBid, tweetEnd };