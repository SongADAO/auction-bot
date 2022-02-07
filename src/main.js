const { contractAuction, options, getBlockHeight } = require('./contract.js');
const { tweetCreation, tweetBid, tweetEnd } = require('./twitter.js');

const logger = require('loglevel');
const fs = require('fs');

const cacheFile = './cache.json';
const CACHE = {};

function abort(err) {
    logger.error(err);
    process.exit(1);
}

async function main() {
    logger.setLevel("debug");

    logger.info("Loading cache...");
    if (fs.existsSync(cacheFile)) {
        const json = JSON.parse(fs.readFileSync(cacheFile).toString());
        CACHE.tweet = new Map(json.tweet); // Auction tweet map
        CACHE.blockLast = json.blockLast; // Last block height that had logs searched
    } else {
        CACHE.tweet = new Map();
        CACHE.blockLast = await getBlockHeight().catch(abort);
    }
    options.fromBlock = CACHE.blockLast; // Search from new blocks
    // Save current block height now so we don't miss any event
    // If we fail to get block height, abort without saving anything, wait for the next cycle
    options.toBlock = await getBlockHeight().catch(abort); 

    logger.info(`Search from block ${CACHE.blockLast} to block ${options.toBlock} for auction logs!`);

    const creations = await contractAuction.getPastEvents('AuctionCreated', options).catch((err) => {
        
    });
    if (creations != undefined) {
        logger.info(`Found ${creations.length} creations!`);
        for (let i = 0; i < creations.length; i++) {
            const id = creations[i].returnValues.tokenId; // Song ID
            if (!CACHE.tweet.has(id)) {
                const { data: createdTweet } = await tweetCreation(id);
                CACHE.tweet.set(id, createdTweet.id);
                logger.info(`Auction creation tweet for song ${id}: ${createdTweet.id}`);
            }
        }
    }

    const bids = await contractAuction.getPastEvents('AuctionBid', options).catch((err) => {
        
    });
    if (bids != undefined) {
        logger.info(`Found ${bids.length} bids!`);
        for (let i = 0; i < bids.length; i++) {
            const { data: createdTweet } = await tweetBid(bids[i], CACHE.tweet);
            const id = bids[i].returnValues.tokenId; // Song ID
            logger.info(`Auction bid tweet for song ${id}: ${createdTweet.id}`);
        }
    }

    const ends = await contractAuction.getPastEvents('AuctionEnded', options).catch((err) => {
        
    });
    if (ends != undefined) {
        logger.info(`Found ${ends.length} ends!`);
        for (let i = 0; i < ends.length; i++) {
            const { data: createdTweet } = await tweetEnd(ends[i], CACHE.tweet);
            const id = ends[i].returnValues.tokenId; // Song ID
            if (CACHE.tweet.has(id)) {
                CACHE.tweet.delete(id);
            }
            logger.info(`Auction end tweet for song ${id}: ${createdTweet.id}`);
        }
    }

    logger.info("Saving cache...");
    CACHE.blockLast = options.toBlock;
    const json = {};
    json.tokenLatest = CACHE.tokenLatest;
    json.blockLast = CACHE.blockLast;
    json.tweet = [...CACHE.tweet];
    fs.writeFileSync(cacheFile, JSON.stringify(json), 'utf-8');
}

main().then(() => process.exit(0));