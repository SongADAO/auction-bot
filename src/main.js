const { contractAuction, options, getBlockHeight } = require('./contract.js');
const { tweetCreation, tweetBid, tweetEnd } = require('./twitter.js');

const logger = require('loglevel');
const fs = require('fs');

const cacheFile = './cache.json';
const CACHE = {};

async function main() {
    logger.setLevel("debug");

    logger.info("Loading cache...");
    var creations, bids, ends;
    try {
        if (fs.existsSync(cacheFile)) {
            const json = JSON.parse(fs.readFileSync(cacheFile).toString());
            CACHE.tweet = new Map(json.tweet); // Auction tweet map
            CACHE.blockLast = json.blockLast; // Last block height that had logs searched
            CACHE.unsent = json.unsent; // Unsent events
        } else {
            CACHE.tweet = new Map();
            CACHE.blockLast = await getBlockHeight();
            CACHE.unsent = {};
            CACHE.unsent.creations = CACHE.unsent.bids = CACHE.unsent.ends = [];
        }
        options.fromBlock = CACHE.blockLast; // Search from new blocks
        // Save current block height now so we don't miss any event
        // If we fail to get block height, abort and wait for the next cycle
        options.toBlock = await getBlockHeight();
        logger.info(`Search from block ${CACHE.blockLast} to block ${options.toBlock} for auction logs!`);

        creations = await contractAuction.getPastEvents('AuctionCreated', options);
        bids = await contractAuction.getPastEvents('AuctionBid', options);
        ends = await contractAuction.getPastEvents('AuctionEnded', options);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }

    creations.forEach(creation => CACHE.unsent.creations.push(creation.returnValues.tokenId));
    bids.forEach(bid => {
        CACHE.unsent.bids.push({
            id: bid.returnValues.tokenId,
            bidder: bid.returnValues.sender,
            value: bid.returnValues.value / 1e18
        });
    });
    ends.forEach(end => {
        CACHE.unsent.ends.push({
            id: end.returnValues.tokenId,
            winner: end.returnValues.winner,
            amount: end.returnValues.amount / 1e18
        });
    });

    const unsentCreation = [];
    for (var i = 0; i < CACHE.unsent.creations.length; i++) {
        const id = CACHE.unsent.creations[i];
        if (!CACHE.tweet.has(id)) {
            try {
                const { data: createdTweet } = await tweetCreation(id);
                CACHE.tweet.set(id, createdTweet.id);
                logger.info(`Auction creation tweet for song ${id}: ${createdTweet.id}`);
            } catch (err) {
                logger.error(err);
                unsentCreation.push(id);
            }
        }
    }
    CACHE.unsent.creations = unsentCreation;

    const unsentBids = [];
    for (var i = 0; i < CACHE.unsent.bids.length; i++) {
        const bid = CACHE.unsent.bids[i];
        try {
            const { data: createdTweet } = await tweetBid(bid.id, bid.bidder, bid.value, CACHE.tweet);
            logger.info(`Auction bid tweet for song ${bid.id}: ${createdTweet.id}`);
        } catch (err) {
            logger.error(err);
            unsentBids.push(bid);
        }
    }
    CACHE.unsent.bids = unsentBids;

    const unsentEnds = [];
    for (var i = 0; i < CACHE.unsent.ends.length; i++) {
        const end = CACHE.unsent.ends[i];
        try {
            const { data: createdTweet } = await tweetEnd(end.id, end.winner, end.amount, CACHE.tweet);
            if (CACHE.tweet.has(id)) {
                CACHE.tweet.delete(id);
            }
            logger.info(`Auction end tweet for song ${end.id}: ${createdTweet.id}`);
        }
        catch (err) {
            logger.error(err);
            unsentEnds.push(end);
        }
    }
    CACHE.unsent.ends = unsentEnds;


    logger.info("Saving cache...");
    CACHE.blockLast = options.toBlock;
    const json = {};
    json.tokenLatest = CACHE.tokenLatest;
    json.blockLast = CACHE.blockLast;
    json.tweet = [...CACHE.tweet];
    json.unsent = CACHE.unsent;
    fs.writeFileSync(cacheFile, JSON.stringify(json), 'utf-8');
}

main().then(() => process.exit(0));