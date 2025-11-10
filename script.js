// ============================================
// FLAMINGSTAR WEBSITE - FULL STRATEGY A IMPLEMENTATION
// ============================================
// Configuration for 100,000 color scale with:
// - Incremental loading (5k initial, background remainder)
// - Live polling (only new colors)
// - Highlight feature (independent queries)
// - localStorage caching
// - Page visibility optimization
// ============================================

// ============================================
// RANDOM COLOR SELECTION (7 STAR COLORS)
// ============================================
// Select random color from 7 HSL colors on page load
const starColors = [
    { h: 214, s: 77, l: 100 },
    { h: 208, s: 68, l: 100 },
    { h: 184, s: 44, l: 97 },
    { h: 165, s: 20, l: 100 },
    { h: 76, s: 34, l: 99 },
    { h: 49, s: 80, l: 100 },
    { h: 17, s: 100, l: 99 }
];

// Pick random color and set CSS variable immediately
// TEMPORARILY DISABLED - using fixed color for testing
/*
const randomColor = starColors[Math.floor(Math.random() * starColors.length)];

// Apply lightness variation like in original grid code (reduce from 97-100% to 40-60% range for UI)
// Original code: lightnessVariation ranges from -40 to +5
// For UI theme, we'll use a fixed reduction to get consistent theme color
const lightnessReduction = 45; // Brings 100% down to 55%, 97% down to 52%
const themeL = Math.max(40, Math.min(60, randomColor.l - lightnessReduction));
const themeS = Math.max(40, Math.min(100, randomColor.s));

const hslColor = `hsl(${randomColor.h}, ${themeS}%, ${themeL}%)`;
document.documentElement.style.setProperty('--blue', hslColor);

console.log(`🎨 Random star color selected: hsl(${randomColor.h}, ${randomColor.s}%, ${randomColor.l}%) → UI theme: ${hslColor}`);
*/

// TEMPORARY: Fixed color for testing
const hslColor = '#353535ff';
document.documentElement.style.setProperty('--blue', hslColor);

// Configuration
let TOTAL_SQUARES = null; // Will be read from contract on page load
const MARGIN_HEIGHT = 30; // Fixed 30px top and bottom margins
const GRID_COLOR = '#e0e0e0'; // Thin grey for grid lines
const GRID_LINE_WIDTH = 0.25;
const SQUARES_PER_FRAME = 3; // Speed of animation (reduced for smoother effect)

// ============================================
// ⭐ DEPLOYMENT CONFIGURATION - SINGLE SOURCE OF TRUTH ⭐
// ============================================
// Change NETWORK to 'mainnet' when ready to deploy production
// All addresses, URLs, and settings will update automatically
// ============================================

const NETWORK = 'mainnet'; // ⭐ PRODUCTION - Base Mainnet ⭐

// ⭐ AMPLIFY NETWORK - Set independently for testing amplify on mainnet ⭐
// This allows testing amplify payment on mainnet while keeping minting on testnet
const AMPLIFY_NETWORK = 'mainnet'; // 'testnet' or 'mainnet'

// Complete network configurations - ALL network-specific values in ONE place
const NETWORKS = {
    testnet: {
        // Network settings
        chainId: 84532,
        rpc: 'https://base-sepolia.g.alchemy.com/v2/', // ⚠️ ALLOWLIST FOR PRODUCTION DEPLOYMENT
        name: 'Base Sepolia Testnet',
        explorer: 'https://sepolia.basescan.org',

        // Contract addresses
        flamingStarERC20: '0x1e5223634a2C877E9CC8Ad32329547a86ffb41B5',
        flamingStarNFT: '0xB62665e7Fe3ce979C0CD4e20Aa8559f8cBeb6A05',
        flamingStarAmplifier: '0x0aE9374621DcbdE5E8C6dfB34dB5a66a712cf5Aa', // Using mainnet address
        usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',

        // Subgraph endpoints - ⚠️ ALLOWLIST FOR PRODUCTION DEPLOYMENT
        mintsSubgraph: 'https://subgraph.satsuma-prod.com/ed1c329c5b3c/figure31--8074/flamingstar-mints/api',
        transfersSubgraph: 'https://subgraph.satsuma-prod.com/ed1c329c5b3c/figure31--8074/flamingstar-transfers/api', // Transfers on mainnet

        // OpenSea base URL (testnet uses testnets.opensea.io)
        openseaBase: 'https://testnets.opensea.io/assets/base-sepolia',

        // Cache identifier
        cacheVersion: 'v3_testnet'
    },
    mainnet: {
        // Network settings
        chainId: 8453,
        rpc: 'https://mainnet.base.org', // Public Base RPC (no rate limits)
        name: 'Base Mainnet',
        explorer: 'https://basescan.org',

        // Contract addresses - Base Mainnet
        flamingStarERC20: '0x727BcEDaEa3661fd31A9e03b4f59ddA6E5aA38c4',
        flamingStarNFT: '0x8cB191A3A9dce80A44E0A0776CD76473519CaB27',
        flamingStarAmplifier: '0xeF4Cfa6851BE9A2602b2039deaE3a32004c157a5',
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Official USDC on Base Mainnet

        // Subgraph endpoints - Base Mainnet
        mintsSubgraph: 'https://subgraph.satsuma-prod.com/ed1c329c5b3c/figure31--8074/flamingstar-mints/api',
        transfersSubgraph: 'https://subgraph.satsuma-prod.com/ed1c329c5b3c/figure31--8074/flamingstar-transfers/api',

        // OpenSea base URL (mainnet)
        openseaBase: 'https://opensea.io/assets/base',

        // Cache identifier
        cacheVersion: 'v3_mainnet'
    }
};

// Get current network config (derived from NETWORK setting above)
const CURRENT_NETWORK = NETWORKS[NETWORK];
const BASE_CHAIN_ID = CURRENT_NETWORK.chainId;
const BASE_RPC = CURRENT_NETWORK.rpc;

// Get amplify network config (can be different from main network for testing)
const AMPLIFY_NETWORK_CONFIG = NETWORKS[AMPLIFY_NETWORK];
const AMPLIFY_CHAIN_ID = AMPLIFY_NETWORK_CONFIG.chainId;
const AMPLIFY_USDC_ADDRESS = AMPLIFY_NETWORK_CONFIG.usdc;
const AMPLIFIER_CONTRACT_ADDRESS = AMPLIFY_NETWORK_CONFIG.flamingStarAmplifier;

// Contract addresses (all derived from CURRENT_NETWORK)
const FLAMINGSTAR_CONTRACT = CURRENT_NETWORK.flamingStarERC20;
const FLAMINGSTAR_NFT_CONTRACT = CURRENT_NETWORK.flamingStarNFT;
const USDC_CONTRACT_ADDRESS = CURRENT_NETWORK.usdc;
const USDC_ADDRESS = CURRENT_NETWORK.usdc; // Alias for x402 payment (used by main minting, not amplify)

// Subgraph URLs (all derived from CURRENT_NETWORK)
const SUBGRAPH_URL = CURRENT_NETWORK.mintsSubgraph;
const TRANSFER_SUBGRAPH_URL = CURRENT_NETWORK.transfersSubgraph;

// Cache configuration (derived from CURRENT_NETWORK)
const CACHE_VERSION = CURRENT_NETWORK.cacheVersion;
const CACHE_KEY_PREFIX = 'fstar_colors_';

// Strategy A Configuration (network-independent)
const POLL_INTERVAL = 15000; // 15 seconds
const TRANSFER_POLL_INTERVAL = 30000; // 30 seconds (slower than mints)
const SLOW_POLL_INTERVAL = 60000; // 60 seconds - for expensive RPC calls (balances, USDC)
const TRANSFER_GRID_SIZE = 3000; // Show last 3000 transfers
const INITIAL_LOAD_SIZE = 5000; // Load first 5k colors immediately
const BACKGROUND_CHUNK_SIZE = 10000; // Background loading chunk size
const BACKGROUND_DELAY = 2000; // Delay between background chunks (ms)
const CACHE_EXPIRY_HOURS = 24; // Cache validity period

// Amplify Worker Configuration (network-independent)
const AMPLIFY_WORKER_URL = 'https://flaming-star-amplifier.co-connir.workers.dev';

// Job tracking for amplify operations
let currentJobId = null;
let jobPollingInterval = null;

// BMOON Contract Address (will be read dynamically from FlamingStar contract)
let BMOON_CONTRACT = null;

// ERC20 ABI for token interactions
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
];

// FlamingStar Contract ABI (only functions we need)
const FLAMINGSTAR_ABI = [
    'function mintWithUSDC(uint256 amount)',
    'function mintWithBMOON(uint256 amount)',
    'function mintPrice() view returns (uint256)',
    'function BMOON_PER_LOT() view returns (uint256)',
    'function TOKENS_PER_LOT() view returns (uint256)',
    'function MAX_LOTS() view returns (uint256)',
    'function MAX_LOTS_PER_ADDRESS() view returns (uint256)',
    'function PUBLIC_ALLOCATION() view returns (uint256)',
    'function totalLots() view returns (uint256)',
    'function lotsByAddress(address) view returns (uint256)',
    'function usdc() view returns (address)',
    'function blueMoon() view returns (address)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function TOTAL_SUPPLY() view returns (uint256)',
    'event ColorMinted(address indexed minter, uint256 indexed lotId, uint256 hue, uint256 saturation, uint256 lightness, string color)'
];

// FlamingStar NFT Contract ABI (for viewing and minting NFTs)
const FLAMINGSTAR_NFT_ABI = [
    'function totalMinted() view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function TOTAL_SUPPLY() view returns (uint256)',
    'function ARTIST_PROOFS() view returns (uint256)',
    'function fstarToken() view returns (address)', // CORRECT: fstarToken not blueToken
    'function MINT_PRICE() view returns (uint256)', // Read price from contract
    'function mint()'
];

// FlamingStar Amplifier Contract ABI
const AMPLIFIER_ABI = [
    'function amplify()',
    'function getBalance() view returns (uint256)',
    'function getRemainingAmplifies() view returns (uint256)',
    'function flamingStarToken() view returns (address)',
    'function TRANSFER_COUNT() view returns (uint256)',
    'function AMOUNT_PER_TRANSFER() view returns (uint256)'
];

// Dynamic values read from contract (initialized on page load)
let USDC_CONTRACT = USDC_CONTRACT_ADDRESS;
let MINT_PRICE_USDC = null;
let MINT_PRICE_BMOON = null; // Price in BMOON tokens
let TOKENS_PER_LOT = null;
let MAX_MINT_LIMIT = null;
let MAX_USDC_APPROVAL = null;
let MAX_BMOON_APPROVAL = null;
let TOKEN_SYMBOL = null;
let TOTAL_SUPPLY = null;

// Wallet state
let provider = null; // MetaMask provider - ONLY for transactions requiring signatures
let signer = null;
let readProvider = null; // Public RPC provider - for ALL read operations
let userAddress = null;
let isWalletConnected = false;

// Grid state - Strategy A
let allLoadedColors = []; // All colors loaded so far
let lastKnownLotId = -1; // Track for incremental queries
let pollingIntervalId = null;
let slowPollingIntervalId = null; // For 60-second expensive RPC calls
let isBackgroundLoading = false;
let backgroundLoadingPaused = false;

// Static mints data (loaded from JSON file instead of subgraph)
let staticMintsData = null;

// Cached values for slow polling
let cachedUsdcBalance = null;

// Highlight feature state
let cachedUserColors = null;
let userLotIds = [];
let isHighlightMode = false;

// Stats
let globalStats = null;
let previousStats = null;

// View Mode State
let currentView = 'mints'; // 'mints' or 'transfers'
let transferColors = []; // Store last 3000 transfer colors
let lastTransferBlockNumber = 0; // Track for incremental queries
let transferPollingIntervalId = null;
let globalTransferStats = null; // Store global stats from subgraph (total transfers across all history)

// Show All Transfers Mode
let showAllTransfersMode = false; // Track if we're in "show all" mode
let allTransferColors = []; // Store ALL transfers when in show all mode
let isLoadingAllTransfers = false; // Track if we're currently loading all transfers

// Transfer Render Queue (Animation System)
let transferRenderQueue = [];
let isRenderingTransfers = false;
let transferRenderStartTime = null;

// ============================================
// SUBGRAPH QUERIES (STRATEGY A)
// ============================================

/**
 * Execute GraphQL query against subgraph
 */
async function querySubgraph(query, variables = {}) {
    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(result.errors[0].message);
        }

        return result.data;
    } catch (error) {
        console.error('Subgraph query failed:', error);
        return null;
    }
}

/**
 * Get global statistics
 * Now returns from static JSON instead of subgraph query
 */
async function getGlobalStats() {
    // Return from static mints data if loaded
    if (staticMintsData && staticMintsData.globalStats) {
        return staticMintsData.globalStats;
    }

    // Fallback: return null if JSON not loaded yet
    console.warn('Static mints data not loaded yet');
    return null;
}

/**
 * Query a batch of colors efficiently
 */
async function queryColorBatch(skip, limit) {
    const query = `
        query GetColorBatch($skip: Int!, $limit: Int!) {
            colors(
                first: $limit
                skip: $skip
                orderBy: lotId
                orderDirection: asc
            ) {
                lotId
                color
                hue
                saturation
                lightness
                minter
                timestamp
            }
        }
    `;

    const data = await querySubgraph(query, { skip, limit });
    return data?.colors || [];
}

/**
 * Query colors in a range (for initial and background loading)
 * Now returns from static JSON instead of subgraph queries
 */
async function loadColorRange(startId, endId) {
    // Return from static mints data if loaded
    if (staticMintsData && staticMintsData.colors) {
        // Slice the array to get colors in the range [startId, endId)
        return staticMintsData.colors.slice(startId, endId);
    }

    // Fallback: return empty array if JSON not loaded yet
    console.warn('Static mints data not loaded yet');
    return [];
}

/**
 * Query only NEW colors since lastKnownLotId (for incremental polling)
 */
async function queryNewColors(afterLotId) {
    const colors = [];
    const BATCH_SIZE = 1000;
    let hasMore = true;
    let currentAfter = afterLotId;

    while (hasMore) {
        const query = `
            query GetNewColors($afterLotId: BigInt!, $limit: Int!) {
                colors(
                    where: { lotId_gt: $afterLotId }
                    orderBy: lotId
                    orderDirection: asc
                    first: $limit
                ) {
                    lotId
                    color
                    hue
                    saturation
                    lightness
                    minter
                    timestamp
                }
            }
        `;

        const data = await querySubgraph(query, {
            afterLotId: currentAfter.toString(),
            limit: BATCH_SIZE
        });

        const batch = data?.colors || [];

        if (batch.length === 0) {
            hasMore = false;
        } else {
            colors.push(...batch);
            currentAfter = parseInt(batch[batch.length - 1].lotId);

            if (batch.length < BATCH_SIZE) {
                hasMore = false;
            }
        }
    }

    return colors;
}

/**
 * Query all colors for a specific user (for highlight feature)
 */
async function queryUserColors(address) {
    if (!address) return [];

    // Filter from static mints data if loaded
    if (staticMintsData && staticMintsData.colors) {
        const normalizedAddress = address.toLowerCase();

        // Filter colors by minter address
        const userColors = staticMintsData.colors.filter(color => {
            return color.minter.toLowerCase() === normalizedAddress;
        });

        return userColors;
    }

    // Fallback: return empty array if JSON not loaded yet
    console.warn('Static mints data not loaded yet');
    return [];
}

// ============================================
// TRANSFER SUBGRAPH QUERIES
// ============================================

/**
 * Query last 3000 transfer colors
 * Optimized for transfer grid display
 */
async function queryTransferColors() {
    const query = `
        query GetRecentTransfers {
            transferColors(
                first: 3000
                orderBy: blockNumber
                orderDirection: desc
            ) {
                id
                blockNumber
                timestamp
                sender
                recipient
                color
                hue
                saturation
                lightness
            }
        }
    `;

    try {
        const response = await fetch(TRANSFER_SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error('Transfer subgraph errors:', result.errors);
            return [];
        }

        return result.data?.transferColors || [];
    } catch (error) {
        console.error('Transfer query failed:', error);
        return [];
    }
}

/**
 * Query NEW transfer colors since last known block
 * For incremental updates
 */
async function queryNewTransfers(afterBlock) {
    const query = `
        query GetNewTransfers($afterBlock: BigInt!) {
            transferColors(
                where: { blockNumber_gt: $afterBlock }
                orderBy: blockNumber
                orderDirection: asc
                first: 3000
            ) {
                id
                blockNumber
                timestamp
                sender
                recipient
                color
                hue
                saturation
                lightness
            }
        }
    `;

    try {
        const response = await fetch(TRANSFER_SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { afterBlock: afterBlock.toString() }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error('Transfer subgraph errors:', result.errors);
            return [];
        }

        return result.data?.transferColors || [];
    } catch (error) {
        console.error('Transfer query failed:', error);
        return [];
    }
}

/**
 * Get transfer stats
 */
async function getTransferStats() {
    const query = `
        query GetTransferStats {
            transferStats(id: "1") {
                totalTransfers
                latestBlockNumber
                lastUpdatedTimestamp
            }
        }
    `;

    try {
        const response = await fetch(TRANSFER_SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        return result.data?.transferStats || null;
    } catch (error) {
        console.error('Transfer stats query failed:', error);
        return null;
    }
}

/**
 * Query transfers using cursor-based pagination (for "show all" mode)
 * Uses blockNumber and ID for cursor to avoid skip limit (5000 max)
 */
async function queryTransferBatchCursor(afterBlockNumber, afterId, limit) {
    const query = `
        query GetTransferBatch($afterBlockNumber: BigInt!, $afterId: String!, $limit: Int!) {
            transferColors(
                first: $limit
                where: {
                    or: [
                        { blockNumber_gt: $afterBlockNumber }
                        { and: [{ blockNumber: $afterBlockNumber }, { id_gt: $afterId }] }
                    ]
                }
                orderBy: blockNumber
                orderDirection: asc
            ) {
                id
                blockNumber
                timestamp
                transactionHash
                sender
                recipient
                amount
                color
                hue
                saturation
                lightness
            }
        }
    `;

    try {
        const response = await fetch(TRANSFER_SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: {
                    afterBlockNumber: afterBlockNumber.toString(),
                    afterId: afterId,
                    limit
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error('Transfer batch query errors:', result.errors);
            return [];
        }

        return result.data?.transferColors || [];
    } catch (error) {
        console.error('Transfer batch query failed:', error);
        return [];
    }
}

/**
 * Load all transfers using cursor-based pagination (for "show all" mode)
 * Avoids skip limit of 5000 by using blockNumber/ID cursors
 */
async function loadAllTransfers(totalTransfers) {
    const transfers = [];
    const BATCH_SIZE = 1000; // Query 1000 at a time

    let lastBlockNumber = 0;
    let lastId = "0";
    let hasMore = true;

    while (hasMore && transfers.length < totalTransfers) {
        // Query next batch
        const batch = await queryTransferBatchCursor(lastBlockNumber, lastId, BATCH_SIZE);

        if (batch.length === 0) {
            // No more results
            hasMore = false;
            break;
        }

        // Add to results
        transfers.push(...batch);

        // Update cursor to last item in batch
        const lastItem = batch[batch.length - 1];
        lastBlockNumber = parseInt(lastItem.blockNumber);
        lastId = lastItem.id;

        // Small delay to avoid overwhelming the subgraph
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return transfers;
}

// ============================================
// LOCALSTORAGE CACHING (STRATEGY A)
// ============================================

/**
 * Cache a chunk of colors
 */
function cacheColorChunk(startId, endId, colors) {
    try {
        const cacheKey = `${CACHE_KEY_PREFIX}${startId}_${endId}_${CACHE_VERSION}`;
        const cacheData = {
            startId,
            endId,
            colors,
            timestamp: Date.now()
        };

        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    } catch (error) {
        // Quota exceeded - clear old cache
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old cache...');
            clearOldCache();

            // Try again after clearing
            try {
                const cacheKey = `${CACHE_KEY_PREFIX}${startId}_${endId}_${CACHE_VERSION}`;
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (e) {
                console.error('Still cannot cache after clearing:', e);
            }
        }
    }
}

/**
 * Load colors from cache
 */
async function loadFromCache() {
    const cachedChunks = [];
    const keys = Object.keys(localStorage);

    // Find all cache keys
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

    // Sort by start ID
    cacheKeys.sort((a, b) => {
        const aStart = parseInt(a.split('_')[2]);
        const bStart = parseInt(b.split('_')[2]);
        return aStart - bStart;
    });

    // Load chunks
    for (const key of cacheKeys) {
        try {
            const cached = JSON.parse(localStorage.getItem(key));

            // Check if expired
            const age = Date.now() - cached.timestamp;
            const maxAge = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

            if (age > maxAge) {
                localStorage.removeItem(key);
                continue;
            }

            cachedChunks.push(cached);

        } catch (error) {
            console.error('Error loading cache:', error);
            localStorage.removeItem(key);
        }
    }

    // Flatten colors
    const colors = [];
    cachedChunks.forEach(chunk => {
        colors.push(...chunk.colors);
    });

    return colors;
}

/**
 * Clear old cache entries
 */
function clearOldCache() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));

    // Remove all cache entries
    cacheKeys.forEach(key => {
        localStorage.removeItem(key);
    });
}

// ============================================
// STATIC MINTS DATA LOADING
// ============================================

/**
 * Load mints data from static JSON file instead of subgraph
 * This eliminates all subgraph queries for the homepage mints grid
 */
async function loadMintsFromJSON() {
    try {
        console.log('Loading mints data from static JSON file...');

        const response = await fetch('mints-data.json');

        if (!response.ok) {
            throw new Error(`Failed to fetch mints-data.json: ${response.status}`);
        }

        const data = await response.json();
        staticMintsData = data;

        console.log(`✓ Loaded ${data.totalColors} colors from static JSON`);
        console.log(`  Latest lot ID: ${data.latestLotId}`);
        console.log(`  Exported at: ${data.exportedAt}`);

        return true;
    } catch (error) {
        console.error('Failed to load mints data from JSON:', error);
        staticMintsData = null;
        return false;
    }
}

// ============================================
// CONTRACT INITIALIZATION
// ============================================

/**
 * Initialize dynamic contract values by reading from FlamingStar contract
 */
async function initializeContractValues() {
    try {
        // Hardcoded mainnet constants (immutable on-chain values)
        // This eliminates 9 RPC calls on page load for instant grid display
        TOKEN_SYMBOL = 'FSTAR';
        TOTAL_SUPPLY = 666666666666;
        USDC_CONTRACT = CURRENT_NETWORK.usdc;
        BMOON_CONTRACT = '0x9A2911782063285bb7d8a4d088a1FbB94bB8c6E8';
        MINT_PRICE_USDC = '660000'; // 0.66 USDC in 6 decimals
        MINT_PRICE_BMOON = '4444000000000000000000'; // 4,444 BMOON in 18 decimals
        TOKENS_PER_LOT = 3333333;

        const maxLotsPerAddress = 3000; // MAX_LOTS_PER_ADDRESS (lifetime limit per address)
        TOTAL_SQUARES = 100000; // MAX_LOTS (total grid size)

        // Calculate derived values
        MAX_MINT_LIMIT = TOKENS_PER_LOT * maxLotsPerAddress;
        MAX_USDC_APPROVAL = ethers.BigNumber.from(MINT_PRICE_USDC).mul(maxLotsPerAddress);
        MAX_BMOON_APPROVAL = ethers.BigNumber.from(MINT_PRICE_BMOON).mul(maxLotsPerAddress);

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize contract values:', error);
        alert('Failed to load contract configuration. Please refresh the page.');
        return false;
    }
}

/**
 * Update mint button amounts and prices dynamically
 */
function updateMintButtonPrices() {
    if (!MINT_PRICE_USDC || !MINT_PRICE_BMOON || !TOKENS_PER_LOT) return;

    // USDC prices
    const priceUsdc1 = ethers.utils.formatUnits(MINT_PRICE_USDC, 6);
    const priceUsdc7 = ethers.utils.formatUnits(ethers.BigNumber.from(MINT_PRICE_USDC).mul(7), 6);

    // BMOON prices
    const priceBmoon1 = ethers.utils.formatUnits(MINT_PRICE_BMOON, 18);
    const priceBmoon7 = ethers.utils.formatUnits(ethers.BigNumber.from(MINT_PRICE_BMOON).mul(7), 18);

    const tokens1 = TOKENS_PER_LOT;
    const tokens7 = TOKENS_PER_LOT * 7;

    // Update USDC button text
    const mintUsdc1Amount = document.querySelector('#mint-usdc-1-btn .mint-amount');
    const mintUsdc1Cost = document.querySelector('#mint-usdc-1-btn .mint-cost');
    const mintUsdc7Amount = document.querySelector('#mint-usdc-7-btn .mint-amount');
    const mintUsdc7Cost = document.querySelector('#mint-usdc-7-btn .mint-cost');

    if (mintUsdc1Amount) mintUsdc1Amount.textContent = `${tokens1.toLocaleString()} $${TOKEN_SYMBOL || 'FSTAR'}`;
    if (mintUsdc1Cost) mintUsdc1Cost.textContent = `${priceUsdc1} usdc`;
    if (mintUsdc7Amount) mintUsdc7Amount.textContent = `${tokens7.toLocaleString()} $${TOKEN_SYMBOL || 'FSTAR'}`;
    if (mintUsdc7Cost) mintUsdc7Cost.textContent = `${priceUsdc7} usdc`;

    // Update BMOON button text
    const mintBmoon1Amount = document.querySelector('#mint-bmoon-1-btn .mint-amount');
    const mintBmoon1Cost = document.querySelector('#mint-bmoon-1-btn .mint-cost');
    const mintBmoon7Amount = document.querySelector('#mint-bmoon-7-btn .mint-amount');
    const mintBmoon7Cost = document.querySelector('#mint-bmoon-7-btn .mint-cost');

    // Format BMOON amounts (show as integers, no decimals)
    const bmoon1Formatted = parseFloat(priceBmoon1).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const bmoon7Formatted = parseFloat(priceBmoon7).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    if (mintBmoon1Amount) mintBmoon1Amount.textContent = `${tokens1.toLocaleString()} $${TOKEN_SYMBOL || 'FSTAR'}`;
    if (mintBmoon1Cost) mintBmoon1Cost.textContent = `${bmoon1Formatted} $bmoon`;
    if (mintBmoon7Amount) mintBmoon7Amount.textContent = `${tokens7.toLocaleString()} $${TOKEN_SYMBOL || 'FSTAR'}`;
    if (mintBmoon7Cost) mintBmoon7Cost.textContent = `${bmoon7Formatted} $bmoon`;
}

/**
 * Update max USDC approval amount dynamically
 */
function updateMaxUSDCApproval() {
    if (!MAX_USDC_APPROVAL) return;

    const maxUsdcApprovalElement = document.getElementById('max-usdc-approval');
    if (!maxUsdcApprovalElement) return;

    const maxUsdcFormatted = parseFloat(ethers.utils.formatUnits(MAX_USDC_APPROVAL, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    maxUsdcApprovalElement.textContent = maxUsdcFormatted;
}

// ============================================
// STRATEGY A: GRID LOADING
// ============================================

/**
 * Load initial colors from static JSON (grid already drawn)
 */
async function loadInitialColors() {
    // Step 1: Get global stats from static JSON
    const stats = await getGlobalStats();
    const totalMinted = stats ? parseInt(stats.totalLotsMinted) : 0;

    if (totalMinted === 0) {
        globalStats = stats;
        await updateCountersDisplay();
        return;
    }

    // Step 2: Load ALL colors from static JSON (no batching needed - instant)
    const allColors = await loadColorRange(0, totalMinted);

    // Step 3: Store all colors
    allLoadedColors = allColors;
    lastKnownLotId = totalMinted - 1;

    // Step 4: Set global stats
    globalStats = stats;

    // Step 5: Add all colors to rendering queue for smooth animated appearance
    addToRenderQueue(allColors);

    // Step 6: Animate counters from 0
    animateCounters(true);

    // No caching needed - using static JSON
    // No polling needed - minting is complete
    // No background loading needed - all data already loaded from JSON
}

/**
 * PHASE 3: Incremental Polling (Only new colors)
 * DISABLED: Using static JSON data instead of live polling
 */
function startPollingForNewColors() {
    // Polling disabled - using static mints data from JSON file
    // Users need to refresh page to see new mints
    console.log('Mints polling disabled - using static JSON data');
    return;
}

async function pollForNewColors() {
    try {
        // Get current stats
        const stats = await getGlobalStats();
        if (!stats) return;

        const currentLatestLotId = parseInt(stats.latestLotId);

        // Check if there are new colors
        if (currentLatestLotId <= lastKnownLotId) {
            // No new colors, just update counters (only if still on mints view)
            globalStats = stats;
            if (currentView === 'mints') {
                await updateCountersDisplay();
            }
            return;
        }

        // Pause background loading if active
        backgroundLoadingPaused = true;

        // Query only NEW colors
        const newColors = await queryNewColors(lastKnownLotId);

        if (newColors.length === 0) {
            backgroundLoadingPaused = false;
            return;
        }

        // Add to our collection
        allLoadedColors = [...allLoadedColors, ...newColors];
        lastKnownLotId = currentLatestLotId;

        // Check if user minted (refresh their colors and balances)
        if (userAddress) {
            await refreshUserColors();
        }

        // Animate new colors
        if (isHighlightMode && userAddress) {
            // Already refreshed above, just check if we need to re-render highlight
            if (cachedUserColors && cachedUserColors.length > 0) {
                redrawCanvasHighlight(cachedUserColors);
            }
        } else {
            // Animate new colors appearing
            animateNewColors(newColors);
        }

        // Update counters with animation (only if still on mints view)
        previousStats = globalStats;
        globalStats = stats;
        if (currentView === 'mints') {
            animateCounters();
        }

        // Cache new colors
        if (newColors.length > 0) {
            const startId = parseInt(newColors[0].lotId);
            const endId = parseInt(newColors[newColors.length - 1].lotId);
            cacheColorChunk(startId, endId, newColors);
        }

        // Resume background loading
        setTimeout(() => {
            backgroundLoadingPaused = false;
        }, 5000);

    } catch (error) {
        console.error('Polling error:', error);
    }
}

/**
 * Slow polling for expensive RPC calls (every 60 seconds)
 * Updates USDC balance and user wallet balances
 */
async function slowPoll() {
    try {
        // Fetch USDC balance of contract (for counter display)
        if (readProvider) {
            const usdcContract = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, readProvider);
            const usdcBalanceWei = await usdcContract.balanceOf(FLAMINGSTAR_CONTRACT);
            cachedUsdcBalance = parseFloat(ethers.utils.formatUnits(usdcBalanceWei, 6));
        }

        // Update user wallet balances if connected
        if (userAddress && isWalletConnected) {
            await updateWalletUI();
        }
    } catch (error) {
        console.error('Slow polling error:', error);
    }
}

/**
 * Start slow polling (60 seconds)
 */
function startSlowPolling() {
    // Clear any existing interval
    if (slowPollingIntervalId) {
        clearInterval(slowPollingIntervalId);
    }

    // Poll immediately, then every 60 seconds
    slowPoll();
    slowPollingIntervalId = setInterval(slowPoll, SLOW_POLL_INTERVAL);
}

/**
 * Stop slow polling
 */
function stopSlowPolling() {
    if (slowPollingIntervalId) {
        clearInterval(slowPollingIntervalId);
        slowPollingIntervalId = null;
    }
}

/**
 * Enhanced initialization with static JSON data
 * Replaced cache/subgraph logic with static JSON loading
 */
async function initializeGridWithCache() {
    // Validate TOTAL_SQUARES is set
    if (!TOTAL_SQUARES || TOTAL_SQUARES <= 0) {
        console.error('❌ TOTAL_SQUARES not initialized!', TOTAL_SQUARES);
        alert('Failed to load grid configuration. Please clear browser cache and refresh.');
        return;
    }

    // Load mints data from static JSON file
    const jsonLoaded = await loadMintsFromJSON();
    if (!jsonLoaded) {
        console.error('❌ Failed to load mints data from JSON file');
        alert('Failed to load mints data. Please refresh the page.');
        return;
    }

    // Grid is already drawn in initializePage(), now load colors from JSON
    await loadInitialColors();
}

// ============================================
// TRANSFER GRID LOADING
// ============================================

/**
 * Initialize transfer grid - load last 3000 transfers with animation
 */
async function initializeTransferGrid() {
    // Query last 3000 transfers
    const transfers = await queryTransferColors();

    if (transfers.length === 0) {
        return;
    }

    // Store transfers (they're already ordered newest first from query)
    transferColors = transfers;

    // Track latest block for incremental updates
    if (transfers.length > 0) {
        lastTransferBlockNumber = parseInt(transfers[0].blockNumber);
    }

    // Fetch global stats from subgraph (total transfers across all history)
    globalTransferStats = await getTransferStats();

    // Set up grid for 3000 cells
    calculateTransferGrid();
    drawGrid();
    hideUnusedCells();

    // Prepare transfer colors for animated rendering
    // Display order: oldest first (top-left) to newest (bottom-right)
    // Query returns newest first, so we reverse for display
    const displayOrder = [...transferColors].reverse();

    const colorsWithIndices = displayOrder.map((transfer, index) => ({
        index: index,
        color: transfer.color
    }));

    // Animate all transfer colors progressively
    addToTransferRenderQueue(colorsWithIndices);

    // Update counters with transfer stats
    updateTransferCountersDisplay();

    // Start polling for new transfers
    startPollingForTransfers();
}

/**
 * Initialize "show all" transfers mode - loads ALL transfers from subgraph with animation
 */
async function initializeShowAllTransfers() {
    if (isLoadingAllTransfers) return;

    isLoadingAllTransfers = true;
    showAllTransfersMode = true;

    // Stop polling (show all mode is not live)
    stopPollingForTransfers();

    // Show highlight button in show all mode (if wallet connected)
    const highlightBtn = document.getElementById('highlight-btn');
    if (highlightBtn && userAddress) {
        highlightBtn.style.display = 'inline-block';
    }

    // Get total transfers from global stats
    if (!globalTransferStats) {
        globalTransferStats = await getTransferStats();
    }

    const totalTransfers = globalTransferStats ? parseInt(globalTransferStats.totalTransfers) : 0;

    if (totalTransfers === 0) {
        isLoadingAllTransfers = false;
        return;
    }

    // Update button text
    const showAllBtn = document.getElementById('show-all-transfers-btn');
    if (showAllBtn) {
        showAllBtn.textContent = 'loading...';
        showAllBtn.disabled = true;
    }

    // Clear canvas and set up grid for all transfers
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save original TOTAL_SQUARES and set to totalTransfers
    const originalTotalSquares = TOTAL_SQUARES;
    calculateAllTransfersGrid(totalTransfers);
    drawGrid();
    hideUnusedCells();

    // Restore original TOTAL_SQUARES after grid setup
    TOTAL_SQUARES = originalTotalSquares;

    // Load all transfers in chunks
    allTransferColors = await loadAllTransfers(totalTransfers);

    // Prepare for animated rendering
    // Display order: oldest first (top-left) to newest (bottom-right)
    // Query returns oldest first (asc order), so no need to reverse
    const colorsWithIndices = allTransferColors.map((transfer, index) => ({
        index: index,
        color: transfer.color
    }));

    // Animate all transfer colors progressively
    addToTransferRenderQueue(colorsWithIndices);

    // Update counters
    updateTransferCountersDisplay();

    // Update button to "hide all"
    if (showAllBtn) {
        showAllBtn.textContent = 'hide all';
        showAllBtn.disabled = false;
    }

    isLoadingAllTransfers = false;
}

/**
 * Exit "show all" mode and return to normal 3000 transfer view
 */
async function exitShowAllTransfers() {
    showAllTransfersMode = false;
    allTransferColors = [];

    // Exit highlight mode if active and hide highlight button
    if (isHighlightMode) {
        isHighlightMode = false;
    }

    const highlightBtn = document.getElementById('highlight-btn');
    if (highlightBtn) {
        highlightBtn.textContent = 'highlight';
        highlightBtn.style.display = 'none'; // Hide in normal transfer mode
    }

    // Update button text
    const showAllBtn = document.getElementById('show-all-transfers-btn');
    if (showAllBtn) {
        showAllBtn.textContent = 'show all';
    }

    // Clear canvas and reinitialize normal transfer grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    calculateTransferGrid();
    drawGrid();
    hideUnusedCells();

    // Re-render the last 3000 transfers
    const displayOrder = [...transferColors].reverse();
    displayOrder.forEach((transfer, index) => {
        if (index < TRANSFER_GRID_SIZE) {
            fillSquareWithTransferColor(index, transfer.color);
        }
    });

    // Update counters
    updateTransferCountersDisplay();

    // Resume polling
    startPollingForTransfers();
}

/**
 * Calculate grid for transfers (3000 cells)
 */
function calculateTransferGrid() {
    // Temporarily set TOTAL_SQUARES to 3000 for transfer grid
    const originalTotal = TOTAL_SQUARES;
    TOTAL_SQUARES = TRANSFER_GRID_SIZE;

    // Use existing calculateGrid logic
    calculateGrid();

    // Restore original value
    TOTAL_SQUARES = originalTotal;
}

/**
 * Calculate grid for all transfers (show all mode)
 * Note: Does NOT restore TOTAL_SQUARES - caller must manage this
 */
function calculateAllTransfersGrid(totalTransfers) {
    // Set TOTAL_SQUARES to total transfer count
    TOTAL_SQUARES = totalTransfers;

    // Use existing calculateGrid logic
    calculateGrid();
}

/**
 * Start polling for new transfer colors
 */
function startPollingForTransfers() {
    // Clear any existing interval
    if (transferPollingIntervalId) {
        clearInterval(transferPollingIntervalId);
    }

    // Poll immediately, then every 30 seconds
    pollForNewTransfers();
    transferPollingIntervalId = setInterval(pollForNewTransfers, TRANSFER_POLL_INTERVAL);
}

/**
 * Poll for new transfer colors with smart FIFO animation
 */
async function pollForNewTransfers() {
    try {
        if (lastTransferBlockNumber === 0) return;

        // Query new transfers since last known block
        const newTransfers = await queryNewTransfers(lastTransferBlockNumber);

        if (newTransfers.length === 0) {
            return; // No new transfers
        }

        // Update latest block
        if (newTransfers.length > 0) {
            const latestBlock = Math.max(...newTransfers.map(t => parseInt(t.blockNumber)));
            lastTransferBlockNumber = latestBlock;
        }

        // Refresh global stats from subgraph
        globalTransferStats = await getTransferStats();

        // Store previous count for logic branching
        const previousCount = transferColors.length;

        // Add new transfers to beginning (they're newest)
        transferColors = [...newTransfers.reverse(), ...transferColors];

        // CASE 1: Grid was not full - just append new colors
        if (previousCount < TRANSFER_GRID_SIZE) {
            // Trim to grid size if we exceeded
            if (transferColors.length > TRANSFER_GRID_SIZE) {
                transferColors = transferColors.slice(0, TRANSFER_GRID_SIZE);
            }

            // Re-render if currently viewing transfers
            if (currentView === 'transfers') {
                // Calculate which indices to animate (the new ones at the end)
                const displayOrder = [...transferColors].reverse();
                const startIndex = previousCount;
                const endIndex = Math.min(transferColors.length, TRANSFER_GRID_SIZE);

                const newColorsToAnimate = [];
                for (let i = startIndex; i < endIndex; i++) {
                    newColorsToAnimate.push({
                        index: i,
                        color: displayOrder[i].color
                    });
                }

                // Animate new colors appearing at the end
                animateNewTransferColors(newColorsToAnimate);

                // Update counters with new stats
                updateTransferCountersDisplay();
            }
        }
        // CASE 2: Grid was full - Smart FIFO sliding window
        else {
            const numNewTransfers = newTransfers.length;

            // Trim oldest transfers (keep only newest TRANSFER_GRID_SIZE)
            // This automatically removes the exact number of old transfers to make room
            transferColors = transferColors.slice(0, TRANSFER_GRID_SIZE);

            // Re-render if currently viewing transfers
            if (currentView === 'transfers') {
                // Smart calculation: determine how many rows are affected
                // If we receive N new transfers and grid width is W columns:
                // - Rows to replace = Math.ceil(N / W)
                // - Top rows are removed, all cells slide up, bottom rows get new colors
                const rowsReplaced = Math.ceil(numNewTransfers / cols);

                // Clear canvas and redraw grid structure
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                calculateTransferGrid();
                drawGrid();
                hideUnusedCells();

                // Prepare display order (oldest to newest for rendering)
                const displayOrder = [...transferColors].reverse();

                // Split into old cells (that slid up) and new cells (to animate)
                const numOldCells = TRANSFER_GRID_SIZE - numNewTransfers;

                // Instantly render old cells in their new shifted-up positions
                // This creates the "slide up" effect
                for (let i = 0; i < numOldCells; i++) {
                    fillSquareWithTransferColor(i, displayOrder[i].color);
                }

                // Animate only the new cells appearing at the bottom
                // This is efficient: whether we get 2 or 200 new transfers,
                // we only animate the new ones, not the entire grid
                const newColorsToAnimate = [];
                for (let i = numOldCells; i < TRANSFER_GRID_SIZE; i++) {
                    newColorsToAnimate.push({
                        index: i,
                        color: displayOrder[i].color
                    });
                }

                addToTransferRenderQueue(newColorsToAnimate);

                // Update counters with new stats
                updateTransferCountersDisplay();
            }
        }

    } catch (error) {
        console.error('Transfer polling error:', error);
    }
}

/**
 * Render transfer colors on grid
 */
function renderTransferColors(transfers) {
    if (!transfers || transfers.length === 0) return;

    // Transfers are already sorted newest first
    // We render them in reverse chronological order (newest = bottom-right)
    transfers.forEach((transfer, index) => {
        if (index >= TRANSFER_GRID_SIZE) return; // Safety check

        // Fill square at position index with transfer color
        fillSquareWithTransferColor(index, transfer.color);
    });
}

/**
 * Fill a square in transfer grid
 * Fills in reading order: top-left to bottom-right
 */
function fillSquareWithTransferColor(index, colorString) {
    // In show all mode, check against actual grid size; otherwise use TRANSFER_GRID_SIZE
    const maxIndex = showAllTransfersMode ? (rows * cols) : TRANSFER_GRID_SIZE;

    if (!ctx || index < 0 || index >= maxIndex) return;

    // Reading order: index 0 at top-left, increases left-to-right, top-to-bottom
    const visualIndex = index;
    const col = visualIndex % cols;
    const row = Math.floor(visualIndex / cols);

    // Calculate position
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;

    // Fill with color
    ctx.fillStyle = colorString;
    ctx.fillRect(x - 0.5, y - 0.5, cellSize + 1, cellSize + 1);
}

/**
 * Continuous rendering queue processor for transfer colors
 * Handles progressive animation with FIFO replacement when grid is full
 */
function processContinuousTransferRenderQueue() {
    if (isRenderingTransfers) return; // Already processing

    if (transferRenderQueue.length === 0) return; // Nothing to render

    // Capture snapshot of current queue for this batch
    const batchToRender = [...transferRenderQueue];
    transferRenderQueue = []; // Clear queue

    const totalColors = batchToRender.length;
    let renderedCount = 0;
    transferRenderStartTime = Date.now();

    // Calculate duration based on batch size
    // Smaller batches: 2-3 seconds for visibility
    // Larger batches: scale up smoothly
    const duration = totalColors < 100
        ? 2000
        : totalColors < 1000
        ? 3000
        : Math.min(3000 + (totalColors - 1000) * 2, 30000);

    function renderNextFrame() {
        // CRITICAL: Stop rendering if we switched away from transfers view
        if (!isRenderingTransfers || currentView !== 'transfers') {
            isRenderingTransfers = false;
            return;
        }

        const elapsed = Date.now() - transferRenderStartTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate how many colors should be rendered at this point
        const targetRendered = Math.floor(totalColors * progress);
        const colorsToRenderNow = targetRendered - renderedCount;

        // Render those colors from our snapshot batch
        for (let i = 0; i < colorsToRenderNow && renderedCount < totalColors; i++) {
            const transferData = batchToRender[renderedCount];
            fillSquareWithTransferColor(transferData.index, transferData.color);
            renderedCount++;
        }

        // Check if current batch is complete
        if (renderedCount >= totalColors) {
            isRenderingTransfers = false;
            transferRenderStartTime = null;

            // Check if new colors were added during rendering
            if (transferRenderQueue.length > 0) {
                setTimeout(() => processContinuousTransferRenderQueue(), 16); // Next frame
            }
            return;
        }

        // Continue to next frame
        requestAnimationFrame(renderNextFrame);
    }

    isRenderingTransfers = true;
    renderNextFrame();
}

/**
 * Add transfer colors to rendering queue
 */
function addToTransferRenderQueue(colorData) {
    if (!colorData || colorData.length === 0) return;

    // Add to queue
    transferRenderQueue.push(...colorData);

    // Start processing if not already running
    if (!isRenderingTransfers) {
        processContinuousTransferRenderQueue();
    }
}

/**
 * Animate new transfer colors appearing (for polling updates)
 */
function animateNewTransferColors(newTransfersWithIndices) {
    if (newTransfersWithIndices.length === 0) return;

    // Add to continuous rendering queue for smooth appearance
    addToTransferRenderQueue(newTransfersWithIndices);
}

/**
 * Stop transfer polling
 */
function stopPollingForTransfers() {
    if (transferPollingIntervalId) {
        clearInterval(transferPollingIntervalId);
        transferPollingIntervalId = null;
    }
}

/**
 * Calculate transfer statistics from loaded transfer data and global stats
 */
function calculateTransferStats() {
    if (transferColors.length === 0) {
        return {
            totalTransfers: globalTransferStats?.totalTransfers ? parseInt(globalTransferStats.totalTransfers) : 0,
            uniqueSenders: 0,
            uniqueColors: 0
        };
    }

    // Calculate unique senders (from visible 3000 transfers)
    const senders = new Set();
    transferColors.forEach(t => senders.add(t.sender.toLowerCase()));

    // Calculate unique HSL colors (from visible 3000 transfers)
    const colors = new Set();
    transferColors.forEach(t => colors.add(t.color));

    return {
        totalTransfers: globalTransferStats?.totalTransfers ? parseInt(globalTransferStats.totalTransfers) : transferColors.length,
        uniqueSenders: senders.size,
        uniqueColors: colors.size
    };
}

/**
 * Update counters display for transfer view
 */
function updateTransferCountersDisplay() {
    const progressCounter = document.getElementById('progress-counter');
    const colorsCounter = document.getElementById('colors-counter');
    const valueCounter = document.getElementById('value-counter');
    const mintersCounter = document.getElementById('minters-counter');

    const stats = calculateTransferStats();

    progressCounter.textContent = `${stats.totalTransfers} transfers`;
    colorsCounter.textContent = `${stats.uniqueSenders} senders`;
    valueCounter.style.display = 'none'; // Hide recipients stat completely
    mintersCounter.textContent = `${stats.uniqueColors} colors`;
}

// ============================================
// HIGHLIGHT FEATURE (STRATEGY A - PHASE 4)
// ============================================

/**
 * Load user's colors when wallet connects
 */
async function onWalletConnectHighlight(address) {
    if (!address) return;

    // Query user's colors independently
    cachedUserColors = await queryUserColors(address);
    userLotIds = cachedUserColors.map(c => parseInt(c.lotId));

    // Enable highlight button if user has colors
    const highlightBtn = document.getElementById('highlight-btn');
    if (userLotIds.length > 0 && highlightBtn) {
        highlightBtn.style.display = 'inline-block';
    }
}

/**
 * Refresh user colors (called during polling if user is connected)
 */
async function refreshUserColors() {
    if (!userAddress) return;

    const updatedColors = await queryUserColors(userAddress);

    // Initialize if first time
    if (!cachedUserColors) {
        cachedUserColors = updatedColors;
        userLotIds = updatedColors.map(c => parseInt(c.lotId));
        return;
    }

    if (updatedColors.length > cachedUserColors.length) {
        cachedUserColors = updatedColors;
        userLotIds = updatedColors.map(c => parseInt(c.lotId));

        // Don't update wallet balances here - causes too many RPC calls
        // User can refresh page or reopen mint modal to see updated balances

        // Re-render if in highlight mode
        if (isHighlightMode) {
            redrawCanvasHighlight(cachedUserColors);
        }
    }
}

/**
 * Render only user's colors (highlight mode)
 */
function redrawCanvasHighlight(userColors) {
    // Clear and redraw grid
    calculateGrid();
    drawGrid();
    hideUnusedCells();

    // Render only user's colors
    userColors.forEach(colorData => {
        const lotId = parseInt(colorData.lotId);
        fillSquareWithColor(lotId, colorData.color);
    });
}

/**
 * Redraw transfer canvas with only user's transfers highlighted
 * Works for both normal (3000) and "show all" modes
 */
function redrawTransferCanvasHighlight(userAddress) {
    if (!ctx || !userAddress) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Determine which transfers to filter
    const transfersToFilter = showAllTransfersMode ? allTransferColors : transferColors;

    if (transfersToFilter.length === 0) return;

    // Filter transfers where user is sender or recipient
    const userTransfers = transfersToFilter.filter(transfer => {
        const sender = transfer.sender.toLowerCase();
        const recipient = transfer.recipient.toLowerCase();
        const user = userAddress.toLowerCase();
        return sender === user || recipient === user;
    });

    if (userTransfers.length === 0) {
        // No transfers to highlight - show message or just show empty grid
        if (showAllTransfersMode) {
            const originalTotalSquares = TOTAL_SQUARES;
            calculateAllTransfersGrid(transfersToFilter.length);
            drawGrid();
            hideUnusedCells();
            TOTAL_SQUARES = originalTotalSquares;
        } else {
            calculateTransferGrid();
            drawGrid();
            hideUnusedCells();
        }
        return;
    }

    // Set up grid for highlighted transfers only
    if (showAllTransfersMode) {
        const originalTotalSquares = TOTAL_SQUARES;
        calculateAllTransfersGrid(userTransfers.length);
        drawGrid();
        hideUnusedCells();
        TOTAL_SQUARES = originalTotalSquares;
    } else {
        // For normal mode, calculate grid for user's transfer count
        const originalTotalSquares = TOTAL_SQUARES;
        TOTAL_SQUARES = userTransfers.length;
        calculateGrid();
        drawGrid();
        hideUnusedCells();
        TOTAL_SQUARES = originalTotalSquares;
    }

    // Render user's transfers
    userTransfers.forEach((transfer, index) => {
        fillSquareWithTransferColor(index, transfer.color);
    });
}

// ============================================
// PAGE VISIBILITY OPTIMIZATION (STRATEGY A)
// ============================================

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab hidden - pause ALL polling

        // Stop mint polling
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
        }
        backgroundLoadingPaused = true;

        // Stop transfer polling
        stopPollingForTransfers();

        // Stop slow polling
        stopSlowPolling();

    } else {
        // Tab visible - resume polling based on current view

        if (currentView === 'mints') {
            // Resume mint polling
            pollForNewColors();
            startPollingForNewColors();
            backgroundLoadingPaused = false;
        } else if (currentView === 'transfers') {
            // Resume transfer polling
            startPollingForTransfers();
        }

        // Resume slow polling
        startSlowPolling();
    }
});

// ============================================
// WALLET CONNECTION
// ============================================

/**
 * Check if user is on correct Base network
 */
async function checkNetwork() {
    if (!provider) return false;

    try {
        const network = await provider.getNetwork();
        return network.chainId === BASE_CHAIN_ID;
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
}

/**
 * Prompt user to switch to Base network
 */
async function switchToBaseNetwork() {
    if (!window.ethereum) return false;

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
        });
        return true;
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                        chainName: CURRENT_NETWORK.name,
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: [BASE_RPC],
                        blockExplorerUrls: [CURRENT_NETWORK.explorer]
                    }],
                });
                return true;
            } catch (addError) {
                console.error('Error adding network:', addError);
                return false;
            }
        }
        console.error('Error switching network:', switchError);
        return false;
    }
}

/**
 * Get user's FSTAR token balance from contract
 */
async function getFSTARBalance(address) {
    if (!readProvider || !address) return '0';

    try {
        const fstarContract = new ethers.Contract(FLAMINGSTAR_CONTRACT, ERC20_ABI, readProvider);
        const balance = await fstarContract.balanceOf(address);
        return ethers.utils.formatUnits(balance, 18);
    } catch (error) {
        console.error('Error getting FSTAR balance:', error);
        return '0';
    }
}

/**
 * Get user's USDC balance from contract
 */
async function getUSDCBalance(address) {
    if (!readProvider || !address) return '0';

    try {
        const usdcContract = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, readProvider);
        const balance = await usdcContract.balanceOf(address);
        return ethers.utils.formatUnits(balance, 6);
    } catch (error) {
        console.error('Error getting USDC balance:', error);
        return '0';
    }
}

/**
 * Get user's BMOON balance from contract
 */
async function getBMOONBalance(address) {
    if (!readProvider || !address || !BMOON_CONTRACT) return '0';

    try {
        const bmoonContract = new ethers.Contract(BMOON_CONTRACT, ERC20_ABI, readProvider);
        const balance = await bmoonContract.balanceOf(address);
        return ethers.utils.formatUnits(balance, 18);
    } catch (error) {
        console.error('Error getting BMOON balance:', error);
        return '0';
    }
}

/**
 * Update wallet UI with user data
 */
async function updateWalletUI() {
    const walletInfo = document.getElementById('wallet-info');
    const walletMinted = document.getElementById('wallet-minted');
    const walletBmoon = document.getElementById('wallet-bmoon');
    const walletUsdc = document.getElementById('wallet-usdc');
    const walletAddress = document.getElementById('wallet-address');
    const highlightBtn = document.getElementById('highlight-btn');

    if (!userAddress) {
        walletInfo.classList.remove('connected');
        walletMinted.textContent = `0 $${TOKEN_SYMBOL || 'FSTAR'}`;
        if (walletBmoon) walletBmoon.style.display = 'none'; // Hide BMOON when no wallet
        walletUsdc.textContent = '0 USDC';
        walletAddress.textContent = '0x0000...0000';
        highlightBtn.style.display = 'none';
        cachedUserColors = null;
        return;
    }

    walletInfo.classList.add('connected');

    // Get balances
    const fstarBalance = await getFSTARBalance(userAddress);
    const bmoonBalance = await getBMOONBalance(userAddress);
    const usdcBalance = await getUSDCBalance(userAddress);

    // Format balances
    const fstarFormatted = parseFloat(fstarBalance).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const bmoonFormatted = parseFloat(bmoonBalance).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const usdcFormatted = parseFloat(usdcBalance).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Update UI
    walletMinted.textContent = `${fstarFormatted} $${TOKEN_SYMBOL || 'FSTAR'}`;

    // Only show BMOON if balance > 0
    if (walletBmoon) {
        if (parseFloat(bmoonBalance) > 0) {
            walletBmoon.textContent = `${bmoonFormatted} $BMOON`;
            walletBmoon.style.display = '';
        } else {
            walletBmoon.style.display = 'none';
        }
    }

    walletUsdc.textContent = `${usdcFormatted} USDC`;

    // Format address
    const shortAddress = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    walletAddress.textContent = shortAddress;

    // Load user colors for highlight feature
    await onWalletConnectHighlight(userAddress);
}

/**
 * Connect wallet
 */
async function connectWallet() {
    const connectBtn = document.getElementById('connect-btn');

    try {
        if (!window.ethereum) {
            alert('Please install MetaMask or another Web3 wallet');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        // Create provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = accounts[0];
        isWalletConnected = true;

        // Check network
        const onCorrectNetwork = await checkNetwork();
        if (!onCorrectNetwork) {
            const switched = await switchToBaseNetwork();
            if (!switched) {
                alert(`Please switch to ${CURRENT_NETWORK.name}`);
                return;
            }
        }

        // Update UI
        connectBtn.textContent = 'connected';
        connectBtn.classList.add('connected');
        await updateWalletUI();

        // Update mint limit display if modal is open
        if (document.getElementById('mint-modal')?.classList.contains('active')) {
            await updateMintLimitDisplay();
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length === 0) {
                // Disconnected
                userAddress = null;
                isWalletConnected = false;
                connectBtn.textContent = 'connect';
                connectBtn.classList.remove('connected');
                await updateWalletUI();

                // Update mint limit display if modal is open
                if (document.getElementById('mint-modal')?.classList.contains('active')) {
                    await updateMintLimitDisplay();
                }
            } else {
                // Account changed
                userAddress = accounts[0];
                await updateWalletUI();

                // Update mint limit display if modal is open
                if (document.getElementById('mint-modal')?.classList.contains('active')) {
                    await updateMintLimitDisplay();
                }
            }
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', async (chainId) => {
            // Update provider without reloading page
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            // Update wallet UI to reflect new network
            await updateWalletUI();

            // Don't reload page - maintain current view (mints or transfers)
        });

    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
    }
}

// ============================================
// GRID RENDERING
// ============================================

let canvas, ctx;
let rows, cols;
let cellSize;
let offsetX, offsetY;
let gridWidth, gridHeight;
let blueShades = [];
let allColorsData = [];

// Continuous rendering queue for smooth background loading
let renderQueue = [];
let isRendering = false;
let renderStartTime = null;
const MIN_RENDER_DURATION = 2000; // Minimum 2 seconds for any batch to be visible

/**
 * Get safe area inset for mobile devices (iOS notch, etc.)
 */
function getSafeAreaInset(side) {
    // Create a test div with the safe-area-inset CSS variable
    const testDiv = document.createElement('div');
    testDiv.style.position = 'fixed';
    testDiv.style.top = '0';
    testDiv.style.left = '0';
    testDiv.style.width = '0';
    testDiv.style.height = '0';
    testDiv.style.zIndex = '-1';
    testDiv.style.visibility = 'hidden';

    // Use padding to get the safe area value
    testDiv.style[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`] = `env(safe-area-inset-${side}, 0px)`;
    document.body.appendChild(testDiv);

    // Get computed padding value (paddingTop or paddingBottom)
    const paddingProperty = `padding${side.charAt(0).toUpperCase() + side.slice(1)}`;
    const computedValue = getComputedStyle(testDiv)[paddingProperty];
    document.body.removeChild(testDiv);

    // Parse the pixel value
    return parseFloat(computedValue) || 0;
}

/**
 * Calculate grid dimensions based on viewport
 * HIGH-DPI SUPPORT - Same quality as BlueMoon
 */
function calculateGrid() {
    if (!TOTAL_SQUARES) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Get safe area insets (for mobile browser UI)
    const safeAreaTop = getSafeAreaInset('top');
    const safeAreaBottom = getSafeAreaInset('bottom');

    // Margins: UI height (30px) + safe area insets
    const topMargin = MARGIN_HEIGHT + safeAreaTop;
    const bottomMargin = MARGIN_HEIGHT + safeAreaBottom + 5; // +5px gap above bottom UI

    // Available space: full width, height minus top and bottom margins
    const availableWidth = viewportWidth;
    const availableHeight = viewportHeight - topMargin - bottomMargin;

    // Calculate aspect ratio of available space
    const aspectRatio = availableWidth / availableHeight;

    // Calculate columns and rows to fit TOTAL_SQUARES
    // cols/rows should approximate the aspect ratio
    cols = Math.ceil(Math.sqrt(TOTAL_SQUARES * aspectRatio));
    rows = Math.ceil(TOTAL_SQUARES / cols);

    // Cell size as floating point to fill entire width exactly
    cellSize = availableWidth / cols;

    // Check if grid height fits in available space
    let gridHeightEstimate = rows * cellSize;

    // If too tall, increase columns (smaller cells)
    while (gridHeightEstimate > availableHeight) {
        cols++;
        rows = Math.ceil(TOTAL_SQUARES / cols);
        cellSize = availableWidth / cols;
        gridHeightEstimate = rows * cellSize;
    }

    // Grid dimensions (fills entire available space)
    gridWidth = availableWidth;  // Exactly full width
    gridHeight = rows * cellSize;

    // Center grid vertically if there's extra space
    const extraVerticalSpace = availableHeight - gridHeight;
    offsetX = 0;
    offsetY = topMargin + (extraVerticalSpace / 2);

    // Set canvas size with high DPI support
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;

    // Set display size (CSS pixels)
    canvas.style.width = viewportWidth + 'px';
    canvas.style.height = viewportHeight + 'px';

    // Scale context for high DPI
    ctx.scale(dpr, dpr);

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
}

/**
 * Draw grid lines
 */
function drawGrid() {
    if (!ctx || !TOTAL_SQUARES) return;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = GRID_LINE_WIDTH;

    // Draw vertical lines - use floating point coordinates to match color cell positions
    for (let i = 0; i <= cols; i++) {
        const x = offsetX + i * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, offsetY + rows * cellSize);
        ctx.stroke();
    }

    // Draw horizontal lines - use floating point coordinates to match color cell positions
    for (let i = 0; i <= rows; i++) {
        const y = offsetY + i * cellSize;
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + cols * cellSize, y);
        ctx.stroke();
    }
}

/**
 * Hide unused cells with background color
 */
function hideUnusedCells() {
    if (!ctx || !TOTAL_SQUARES) return;

    const totalCells = rows * cols;

    // Fill all cells beyond TOTAL_SQUARES with background color
    for (let index = TOTAL_SQUARES; index < totalCells; index++) {
        const col = index % cols;
        const row = Math.floor(index / cols);

        // Calculate position - use floating point
        const x = offsetX + col * cellSize;
        const y = offsetY + row * cellSize;

        // Fill with background color (matches --white CSS variable)
        ctx.fillStyle = '#f3f3f3';
        ctx.fillRect(x - 0.5, y - 0.5, cellSize + 1, cellSize + 1);
    }
}

/**
 * Render colors on grid
 */
function renderColors(colors) {
    if (!colors || colors.length === 0) return;

    colors.forEach(colorData => {
        const lotId = parseInt(colorData.lotId);
        fillSquareWithColor(lotId, colorData.color);
    });
}

/**
 * Fill a square with a specific color
 */
function fillSquareWithColor(lotId, colorString) {
    if (!ctx || lotId < 0 || lotId >= TOTAL_SQUARES) return;

    // Reverse the visual position: start from bottom-right, move left and up
    const visualIndex = TOTAL_SQUARES - 1 - lotId;
    const col = visualIndex % cols;
    const row = Math.floor(visualIndex / cols);

    // Calculate position - use floating point for smooth grid filling
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;

    // Fill with color, slightly larger to completely cover grid lines
    ctx.fillStyle = colorString;
    ctx.fillRect(x - 0.5, y - 0.5, cellSize + 1, cellSize + 1);
}

/**
 * Continuous rendering queue processor
 * Renders colors smoothly over time for visible "water filling" effect
 * Handles colors being added during rendering by processing them in the next batch
 */
function processContinuousRenderQueue() {
    if (isRendering) return; // Already processing, new colors will be picked up after

    if (renderQueue.length === 0) return; // Nothing to render

    // Capture a SNAPSHOT of current queue for this batch
    const batchToRender = [...renderQueue];
    renderQueue = []; // Clear queue so new additions go to next batch

    const totalColors = batchToRender.length;
    let renderedCount = 0;
    renderStartTime = Date.now();

    // Calculate duration based on batch size
    // Small batches (< 5000): 2 seconds minimum for visibility
    // Large batches (> 5000): Scale up to ~60 seconds for 100k
    const duration = totalColors < 5000
        ? MIN_RENDER_DURATION
        : Math.min(MIN_RENDER_DURATION + (totalColors - 5000) * 0.6, 60000);

    function renderNextFrame() {
        // CRITICAL: Stop rendering if we switched away from mints view
        if (!isRendering || currentView !== 'mints') {
            isRendering = false;
            return;
        }

        const elapsed = Date.now() - renderStartTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate how many colors SHOULD be rendered at this point
        const targetRendered = Math.floor(totalColors * progress);
        const colorsToRenderNow = targetRendered - renderedCount;

        // Render those colors from our snapshot batch
        for (let i = 0; i < colorsToRenderNow && renderedCount < totalColors; i++) {
            const colorData = batchToRender[renderedCount];
            const lotId = parseInt(colorData.lotId);
            fillSquareWithColor(lotId, colorData.color);
            renderedCount++;
        }

        // Check if current batch is complete
        if (renderedCount >= totalColors) {
            isRendering = false;
            renderStartTime = null;

            // Check if new colors were added during rendering
            if (renderQueue.length > 0) {
                // Start next batch immediately for continuous flow
                setTimeout(() => processContinuousRenderQueue(), 16); // Next frame
            }
            return;
        }

        // Continue to next frame
        requestAnimationFrame(renderNextFrame);
    }

    isRendering = true;
    renderNextFrame();
}

/**
 * Add colors to continuous rendering queue
 */
function addToRenderQueue(colors) {
    if (!colors || colors.length === 0) return;

    // Add to queue
    renderQueue.push(...colors);

    // Start processing if not already running
    if (!isRendering) {
        processContinuousRenderQueue();
    }
}

/**
 * Animate new colors appearing (for polling updates)
 */
function animateNewColors(newColors) {
    if (newColors.length === 0) return;

    // Add to continuous rendering queue for smooth appearance
    addToRenderQueue(newColors);
}

/**
 * Stop all ongoing animations
 * Called when hiding canvas to prevent corrupted render state
 */
function stopAllAnimations() {
    // Stop mint render queue
    isRendering = false;
    renderQueue = [];
    renderStartTime = null;

    // Stop transfer render queue
    isRenderingTransfers = false;
    transferRenderQueue = [];
    transferRenderStartTime = null;
}

/**
 * Redraw transfer canvas with all current transfers
 * Handles both normal (3000) and "show all" modes
 */
function redrawTransferCanvas() {
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showAllTransfersMode && allTransferColors.length > 0) {
        // Show all mode - render all transfers
        const originalTotalSquares = TOTAL_SQUARES;
        calculateAllTransfersGrid(allTransferColors.length);
        drawGrid();
        hideUnusedCells();
        TOTAL_SQUARES = originalTotalSquares;

        // Render all transfers (oldest to newest)
        allTransferColors.forEach((transfer, index) => {
            fillSquareWithTransferColor(index, transfer.color);
        });
    } else {
        // Normal mode - render last 3000 transfers
        calculateTransferGrid();
        drawGrid();
        hideUnusedCells();

        // Render all transfers (oldest to newest)
        const displayOrder = [...transferColors].reverse();
        displayOrder.forEach((transfer, index) => {
            if (index < TRANSFER_GRID_SIZE) {
                fillSquareWithTransferColor(index, transfer.color);
            }
        });
    }
}

/**
 * Redraw entire canvas
 */
function redrawCanvas(colorsToShow = null) {
    if (!ctx) return;

    // Only redraw mints if we're on mints view
    // Prevents mints colors appearing when switching to transfers
    if (currentView !== 'mints') return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw grid
    calculateGrid();
    drawGrid();
    hideUnusedCells();

    // Render colors
    if (colorsToShow) {
        renderColors(colorsToShow);
    } else if (allLoadedColors.length > 0) {
        renderColors(allLoadedColors);
    }
}

// ============================================
// COUNTERS & UI UPDATES
// ============================================

/**
 * Update counter displays - reads directly from contract
 */
async function updateCountersDisplay() {
    const progressCounter = document.getElementById('progress-counter');
    const colorsCounter = document.getElementById('colors-counter');
    const valueCounter = document.getElementById('value-counter');
    const mintersCounter = document.getElementById('minters-counter');

    if (!readProvider) {
        console.error('❌ Read provider not initialized');
        progressCounter.textContent = 'loading...';
        colorsCounter.textContent = 'loading...';
        valueCounter.textContent = 'loading...';
        mintersCounter.textContent = 'loading...';
        return;
    }

    try {
        // Hardcoded final mints stats (minting complete)
        progressCounter.textContent = '333,333,300,000/666,666,666,666';
        colorsCounter.textContent = '100,000/100,000';
        valueCounter.style.display = 'block';
        valueCounter.textContent = '61,231 USDC';
        mintersCounter.textContent = '169';

        // Disable mint button ONLY if we're on mints view (all lots minted)
        // Don't disable if it's the amplify button on transfers view
        const mintBtn = document.getElementById('mint-btn');
        if (mintBtn && currentView === 'mints') {
            mintBtn.disabled = true;
            mintBtn.style.opacity = '0.5';
            mintBtn.style.cursor = 'not-allowed';
        }

    } catch (error) {
        console.error('Error updating counters:', error);
        progressCounter.textContent = 'error';
        colorsCounter.textContent = 'error';
        valueCounter.textContent = 'error';
        mintersCounter.textContent = 'error';
    }
}

/**
 * Animate counters - simplified to just update display
 * @param {boolean} fromZero - Kept for backwards compatibility, not used
 */
async function animateCounters(fromZero = false) {
    // Simply update the counters - no animation
    await updateCountersDisplay();
}

// ============================================
// MINTING FUNCTIONS
// ============================================

/**
 * Mint with USDC
 */
async function mintWithUSDC(amount) {
    const mintStatus = document.getElementById('mint-status');

    try {
        if (!signer) {
            mintStatus.textContent = 'please connect wallet first';
            return;
        }

        mintStatus.textContent = 'checking network...';

        // Check network
        const onCorrectNetwork = await checkNetwork();
        if (!onCorrectNetwork) {
            const switched = await switchToBaseNetwork();
            if (!switched) {
                mintStatus.textContent = `please switch to ${CURRENT_NETWORK.name}`;
                return;
            }
        }

        // Get contracts - separate read/write providers
        const fstarContractWrite = new ethers.Contract(FLAMINGSTAR_CONTRACT, FLAMINGSTAR_ABI, signer);
        const usdcContractRead = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, readProvider);
        const usdcContractWrite = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, signer);

        // Calculate total cost for this transaction
        const totalCost = ethers.BigNumber.from(MINT_PRICE_USDC).mul(amount);

        mintStatus.textContent = 'checking USDC allowance...';

        // Check current allowance
        const allowance = await usdcContractRead.allowance(userAddress, FLAMINGSTAR_CONTRACT);

        // If insufficient allowance, request approval for MAX amount (so user only approves once)
        if (allowance.lt(totalCost)) {
            const maxApprovalFormatted = ethers.utils.formatUnits(MAX_USDC_APPROVAL, 6);
            mintStatus.textContent = `Approving ${maxApprovalFormatted} USDC (one-time, max needed)...`;

            const approveTx = await usdcContractWrite.approve(FLAMINGSTAR_CONTRACT, MAX_USDC_APPROVAL, {
                gasLimit: 150000 // Fixed generous limit to handle reentrancy guard
            });
            mintStatus.textContent = 'Waiting for approval confirmation...';
            await approveTx.wait();
            mintStatus.textContent = 'USDC approved!';
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Calculate token amount for display
        const tokenAmount = (amount * TOKENS_PER_LOT).toLocaleString();

        mintStatus.textContent = `minting ${tokenAmount} $${TOKEN_SYMBOL || 'FSTAR'}...`;

        // Mint with generous gas limit to handle reentrancy guard
        const mintTx = await fstarContractWrite.mintWithUSDC(amount, {
            gasLimit: 500000
        });
        mintStatus.textContent = 'waiting for confirmation...';
        await mintTx.wait();

        mintStatus.textContent = `successfully minted ${tokenAmount} $${TOKEN_SYMBOL || 'FSTAR'}!`;

        // Don't update UI here - polling will handle it automatically within 15 seconds
        // This avoids redundant RPC calls that cause rate limiting

        // Don't close modal - let user close it manually

    } catch (error) {
        console.error('Mint error:', error);

        // User rejected transaction
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            mintStatus.textContent = 'user rejected transaction';
        }
        // Insufficient ETH for gas
        else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
            mintStatus.textContent = 'insufficient ETH for gas';
        }
        // Contract-specific errors
        else if (error.message) {
            if (error.message.includes('One mint per block')) {
                mintStatus.textContent = 'wait for next block (~2 sec)';
            } else if (error.message.includes('MAX_LOTS_REACHED') || error.message.includes('Address mint limit')) {
                mintStatus.textContent = 'address mint limit reached';
            } else if (error.message.includes('Sold out') || error.message.includes('MAX_LOTS')) {
                mintStatus.textContent = 'sold out';
            } else if (error.message.includes('USDC transfer failed') || error.message.includes('insufficient allowance')) {
                mintStatus.textContent = 'USDC transfer failed - check approval';
            } else if (error.message.includes('Must mint')) {
                mintStatus.textContent = 'invalid mint amount';
            } else {
                mintStatus.textContent = 'transaction failed';
            }
        } else {
            mintStatus.textContent = 'transaction failed';
        }

        throw error;
    }
}

/**
 * Mint with BMOON tokens
 */
async function mintWithBMOON(amount) {
    const mintStatus = document.getElementById('mint-status');

    try {
        if (!signer) {
            mintStatus.textContent = 'please connect wallet first';
            return;
        }

        mintStatus.textContent = 'checking network...';

        // Check network
        const onCorrectNetwork = await checkNetwork();
        if (!onCorrectNetwork) {
            const switched = await switchToBaseNetwork();
            if (!switched) {
                mintStatus.textContent = `please switch to ${CURRENT_NETWORK.name}`;
                return;
            }
        }

        // Get contracts - separate read/write providers
        const fstarContractWrite = new ethers.Contract(FLAMINGSTAR_CONTRACT, FLAMINGSTAR_ABI, signer);
        const bmoonContractRead = new ethers.Contract(BMOON_CONTRACT, ERC20_ABI, readProvider);
        const bmoonContractWrite = new ethers.Contract(BMOON_CONTRACT, ERC20_ABI, signer);

        // Calculate total cost for this transaction
        const totalCost = ethers.BigNumber.from(MINT_PRICE_BMOON).mul(amount);

        mintStatus.textContent = 'checking $BMOON allowance...';

        // Check current allowance
        const allowance = await bmoonContractRead.allowance(userAddress, FLAMINGSTAR_CONTRACT);

        // If insufficient allowance, request approval for MAX amount (so user only approves once)
        if (allowance.lt(totalCost)) {
            const maxApprovalFormatted = parseFloat(ethers.utils.formatUnits(MAX_BMOON_APPROVAL, 18)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            mintStatus.textContent = `Approving ${maxApprovalFormatted} $BMOON (one-time, max needed)...`;

            const approveTx = await bmoonContractWrite.approve(FLAMINGSTAR_CONTRACT, MAX_BMOON_APPROVAL, {
                gasLimit: 150000 // Fixed generous limit to handle reentrancy guard
            });
            mintStatus.textContent = 'Waiting for approval confirmation...';
            await approveTx.wait();
            mintStatus.textContent = '$BMOON approved!';
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Calculate token amount for display
        const tokenAmount = (amount * TOKENS_PER_LOT).toLocaleString();

        mintStatus.textContent = `minting ${tokenAmount} $${TOKEN_SYMBOL || 'FSTAR'}...`;

        // Mint with BMOON with generous gas limit to handle reentrancy guard
        const mintTx = await fstarContractWrite.mintWithBMOON(amount, {
            gasLimit: 500000
        });
        mintStatus.textContent = 'waiting for confirmation...';
        await mintTx.wait();

        mintStatus.textContent = `successfully minted ${tokenAmount} $${TOKEN_SYMBOL || 'FSTAR'}!`;

        // Don't update UI here - polling will handle it automatically within 15 seconds
        // This avoids redundant RPC calls that cause rate limiting

        // Don't close modal - let user close it manually

    } catch (error) {
        console.error('Mint error:', error);

        // User rejected transaction
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            mintStatus.textContent = 'user rejected transaction';
        }
        // Insufficient ETH for gas
        else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
            mintStatus.textContent = 'insufficient ETH for gas';
        }
        // Contract-specific errors
        else if (error.message) {
            if (error.message.includes('One mint per block')) {
                mintStatus.textContent = 'wait for next block (~2 sec)';
            } else if (error.message.includes('MAX_LOTS_REACHED') || error.message.includes('Address mint limit')) {
                mintStatus.textContent = 'address mint limit reached';
            } else if (error.message.includes('Sold out') || error.message.includes('MAX_LOTS')) {
                mintStatus.textContent = 'sold out';
            } else if (error.message.includes('BMOON transfer failed') || error.message.includes('insufficient allowance')) {
                mintStatus.textContent = '$BMOON transfer failed - check approval';
            } else if (error.message.includes('Must mint')) {
                mintStatus.textContent = 'invalid mint amount';
            } else {
                mintStatus.textContent = 'transaction failed';
            }
        } else {
            mintStatus.textContent = 'transaction failed';
        }

        throw error;
    }
}

// ============================================
// AMPLIFY MODAL & DIRECT CONTRACT INTERACTION
// ============================================

/**
 * Check amplify contract status
 */
async function checkAmplifyStatus() {
    try {
        const provider = new ethers.providers.JsonRpcProvider(AMPLIFY_NETWORK_CONFIG.rpc);
        const amplifierContract = new ethers.Contract(AMPLIFIER_CONTRACT_ADDRESS, AMPLIFIER_ABI, provider);

        const [remainingAmplifies, balance] = await Promise.all([
            amplifierContract.getRemainingAmplifies(),
            amplifierContract.getBalance()
        ]);

        return {
            remainingAmplifies: remainingAmplifies.toNumber(),
            contractBalance: ethers.utils.formatEther(balance)
        };
    } catch (error) {
        console.error('Failed to check amplify status:', error);
        return null;
    }
}

/**
 * Open amplify modal and check contract status
 */
async function openAmplifyModal() {
    const amplifyModal = document.getElementById('amplify-modal');
    const amplifyStatus = document.getElementById('amplify-status');
    const amplifyExplanation = document.getElementById('amplify-explanation');
    const amplifyButtons = document.getElementById('amplify-buttons');
    const amplifyResult = document.getElementById('amplify-result');
    const amplifierContractLink = document.getElementById('amplifier-contract-link');

    // Show modal
    amplifyModal.classList.add('active');

    // Set the amplifier contract link
    if (amplifierContractLink) {
        amplifierContractLink.innerHTML = `<a href="${AMPLIFY_NETWORK_CONFIG.explorer}/address/${AMPLIFIER_CONTRACT_ADDRESS}" target="_blank" class="amplify-link">Amplifier contract</a>`;
    }

    // Reset state
    amplifyExplanation.style.display = 'block';
    amplifyButtons.style.display = 'flex'; // Reset button visibility
    amplifyResult.innerHTML = '';
    amplifyStatus.innerHTML = '<p>Contract balance: checking...<br>Amplifications remaining: checking...</p>';

    // Disable buttons while checking
    const cancelBtn = document.getElementById('cancel-amplify-btn');
    const proceedBtn = document.getElementById('proceed-amplify-btn');
    cancelBtn.disabled = true;
    proceedBtn.disabled = true;

    // Check contract status
    const status = await checkAmplifyStatus();

    if (!status) {
        amplifyStatus.innerHTML = '<p>Service unavailable. Please try again later.</p>';
        // Enable cancel button so user can close modal
        cancelBtn.disabled = false;
        return;
    }

    // Display contract stats in simple format
    amplifyStatus.innerHTML = `
        <p style="margin-top: 15px; margin-bottom: 15px;">Contract balance: ${parseFloat(status.contractBalance).toFixed(2)} $FSTAR<br>
        Amplifications remaining: ${status.remainingAmplifies}</p>
    `;

    // Enable cancel button
    cancelBtn.disabled = false;

    // Check if amplifies are available
    if (status.remainingAmplifies === 0) {
        amplifyStatus.innerHTML = '<p style="margin-top: 15px; margin-bottom: 15px;">Contract balance: ${parseFloat(status.contractBalance).toFixed(2)} $FSTAR<br>Amplifications remaining: 0<br><br>Out of stock. No amplifies available.</p>';
        // Keep proceed button disabled
        return;
    }

    // Enable proceed button if amplifies are available
    proceedBtn.disabled = false;
}

/**
 * Close amplify modal
 */
function closeAmplifyModal() {
    const amplifyModal = document.getElementById('amplify-modal');
    amplifyModal.classList.remove('active');
}

/**
 * Execute amplify transaction directly on contract
 */
async function proceedWithAmplifyPayment() {
    const amplifyExplanation = document.getElementById('amplify-explanation');
    const amplifyButtons = document.getElementById('amplify-buttons');
    const amplifyResult = document.getElementById('amplify-result');

    // Hide explanation and buttons
    amplifyExplanation.style.display = 'none';
    amplifyButtons.style.display = 'none';

    amplifyResult.innerHTML = 'Connecting wallet...';

    try {
        // Check MetaMask
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Please install MetaMask to use this feature');
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== AMPLIFY_CHAIN_ID) {
            amplifyResult.innerHTML = `Switching to ${AMPLIFY_NETWORK_CONFIG.name}...`;
            try {
                await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${AMPLIFY_CHAIN_ID.toString(16)}` }]);
            } catch (switchError) {
                throw new Error(`Please switch to ${AMPLIFY_NETWORK_CONFIG.name} in MetaMask`);
            }
        }

        amplifyResult.innerHTML = 'Preparing amplify transaction...';

        // Connect to amplifier contract
        const amplifierContract = new ethers.Contract(AMPLIFIER_CONTRACT_ADDRESS, AMPLIFIER_ABI, signer);

        amplifyResult.innerHTML = 'Waiting for transaction approval...';

        // Call amplify() function
        const tx = await amplifierContract.amplify();

        amplifyResult.innerHTML = `
            <div style="line-height: 1.5; margin-bottom: 15px;">
                <div>Transaction Submitted</div>
                <div>Tx Hash: <a href="${AMPLIFY_NETWORK_CONFIG.explorer}/tx/${tx.hash}" target="_blank" class="amplify-link">${tx.hash.slice(0, 10)}...</a></div>
                <div>Waiting for confirmation...</div>
            </div>
        `;

        // Wait for transaction confirmation
        const receipt = await tx.wait();

        amplifyResult.innerHTML = `
            <div style="line-height: 1.5; margin-bottom: 15px;">
                <div>Amplify Complete!</div>
                <div>Tx Hash: <a href="${AMPLIFY_NETWORK_CONFIG.explorer}/tx/${tx.hash}" target="_blank" class="amplify-link">${tx.hash.slice(0, 10)}...</a></div>
            </div>
        `;

        // Parse TransferColor events to get HSL values for each transfer
        const transferColorTopic = ethers.utils.id("TransferColor(address,address,uint256,uint256,uint256,uint256,string)");
        const transferColorLogs = receipt.logs.filter(log => log.topics[0] === transferColorTopic);

        // Create interface to decode the event data
        const iface = new ethers.utils.Interface([
            "event TransferColor(address indexed sender, address indexed recipient, uint256 amount, uint256 hue, uint256 saturation, uint256 lightness, string color)"
        ]);

        // Parse each TransferColor event to extract both recipient addresses and HSL values
        const transfersWithColors = transferColorLogs.map((log, index) => {
            const parsedLog = iface.parseLog(log);
            return {
                index: index + 1,
                address: parsedLog.args.recipient,
                hslColor: parsedLog.args.color // This is the full "hsl(h, s%, l%)" string
            };
        });

        // Display all transfers with addresses AND their HSL colors in scrollable container
        const transfersHtml = transfersWithColors.map(t => {
            // Shorten address to 0xabc...123 format
            const shortAddress = `${t.address.slice(0, 5)}...${t.address.slice(-3)}`;
            // Remove % symbols from HSL color string
            const hslWithoutPercent = t.hslColor.replace(/%/g, '');
            // Pad index with leading zero for single digits (01, 02, ... 09, 10, 11...)
            const paddedIndex = t.index.toString().padStart(2, '0');
            return `<div>${paddedIndex}: <a href="${AMPLIFY_NETWORK_CONFIG.explorer}/address/${t.address}" target="_blank" class="amplify-link">${shortAddress}</a> ${hslWithoutPercent}</div>`;
        }).join('');

        amplifyResult.innerHTML = `
            <div style="line-height: 1.5; margin-bottom: 15px;">
                <div>Amplifier generated 33 addresses and sent 1 $FSTAR each</div>
                <div>Tx Hash: <a href="${AMPLIFY_NETWORK_CONFIG.explorer}/tx/${tx.hash}" target="_blank" class="amplify-link">${tx.hash.slice(0, 10)}...</a></div>
                <div style="max-height: 300px; overflow-y: auto; margin-top: 10px; padding-right: 5px;">
                    ${transfersHtml}
                </div>
            </div>
            <button id="amplify-again-btn" style="padding: 0 10px; height: 30px; border: 1px solid var(--blue); background: var(--blue); color: white; cursor: pointer; font-family: 'ProtoMono', monospace; font-size: 12px;">Amplify Again</button>
        `;

        // Add click handler for amplify again button
        document.getElementById('amplify-again-btn').addEventListener('click', () => {
            openAmplifyModal();
        });

    } catch (error) {
        // Create user-friendly error messages
        let userMessage = 'Transaction failed';

        if (error.code === 'CALL_EXCEPTION') {
            // Transaction reverted on-chain
            userMessage = 'Transaction reverted. The amplifier contract may not have enough FSTAR tokens.';
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            userMessage = 'Insufficient funds to pay for gas.';
        } else if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            userMessage = 'Transaction was rejected.';
        } else if (error.message && error.message.includes('user rejected')) {
            userMessage = 'Transaction was rejected.';
        } else if (error.message && error.message.length < 100) {
            // If error message is short, show it
            userMessage = error.message;
        }

        amplifyResult.innerHTML = `
            <p style="margin-bottom: 15px;">Error: ${userMessage}</p>
            <button id="amplify-again-btn" style="padding: 0 10px; height: 30px; border: 1px solid var(--blue); background: var(--blue); color: white; cursor: pointer; font-family: 'ProtoMono', monospace; font-size: 12px;">Try Again</button>
        `;

        // Add click handler for try again button
        document.getElementById('amplify-again-btn').addEventListener('click', () => {
            openAmplifyModal();
        });

        console.error('Amplify error:', error);
    }
}

// ============================================
// EVENT LISTENERS & MODALS
// ============================================

// DOM Elements
const canvas_element = document.getElementById('canvas');
const connectBtn = document.getElementById('connect-btn');
const mintBtn = document.getElementById('mint-btn');
const highlightBtn = document.getElementById('highlight-btn');
const aboutBtn = document.getElementById('about-btn');
const closeAbout = document.getElementById('close-about');
const aboutModal = document.getElementById('about-modal');
const mintModal = document.getElementById('mint-modal');
const closeMint = document.getElementById('close-mint');
const mintUsdc1Btn = document.getElementById('mint-usdc-1-btn');
const mintUsdc7Btn = document.getElementById('mint-usdc-7-btn');
const mintBmoon1Btn = document.getElementById('mint-bmoon-1-btn');
const mintBmoon7Btn = document.getElementById('mint-bmoon-7-btn');
const claimArtworkBtn = document.getElementById('claim-artwork-btn');
const artworkModal = document.getElementById('artwork-modal');
const closeArtwork = document.getElementById('close-artwork');
const artworkGrid = document.getElementById('artwork-grid');
const playPauseBtn = document.getElementById('play-pause-btn');
const audioPlayer = document.getElementById('audio-player');
const amplifyModal = document.getElementById('amplify-modal');
const closeAmplify = document.getElementById('close-amplify');
const cancelAmplifyBtn = document.getElementById('cancel-amplify-btn');
const proceedAmplifyBtn = document.getElementById('proceed-amplify-btn');

// Connect wallet
if (connectBtn) {
    connectBtn.addEventListener('click', connectWallet);
}

// Mint button (or Amplify button when in transfer view)
if (mintBtn) {
    mintBtn.addEventListener('click', async () => {
        // Check if in amplify mode (transfer view)
        if (mintBtn.getAttribute('data-mode') === 'amplify') {
            // Open amplify modal instead
            openAmplifyModal();
            return;
        }

        // Normal mint flow
        if (!isWalletConnected) {
            alert('Please connect your wallet first');
            return;
        }
        closeAllModals();
        mintModal.classList.add('active');
        // Note: canvas stays visible (modal appears on top)
        await updateMintLimitDisplay();
    });
}

// Close mint modal
if (closeMint) {
    closeMint.addEventListener('click', () => {
        closeAllModals();
    });
}

// Close amplify modal
if (closeAmplify) {
    closeAmplify.addEventListener('click', closeAmplifyModal);
}

// Cancel amplify
if (cancelAmplifyBtn) {
    cancelAmplifyBtn.addEventListener('click', closeAmplifyModal);
}

// Proceed with amplify payment
if (proceedAmplifyBtn) {
    proceedAmplifyBtn.addEventListener('click', proceedWithAmplifyPayment);
}

// Mint 1 lot with USDC
if (mintUsdc1Btn) {
    mintUsdc1Btn.addEventListener('click', () => mintWithUSDC(1));
}

// Mint 7 lots with USDC
if (mintUsdc7Btn) {
    mintUsdc7Btn.addEventListener('click', () => mintWithUSDC(7));
}

// Mint 1 lot with BMOON
if (mintBmoon1Btn) {
    mintBmoon1Btn.addEventListener('click', () => mintWithBMOON(1));
}

// Mint 7 lots with BMOON
if (mintBmoon7Btn) {
    mintBmoon7Btn.addEventListener('click', () => mintWithBMOON(7));
}

// Highlight button
if (highlightBtn) {
    highlightBtn.addEventListener('click', () => {
        isHighlightMode = !isHighlightMode;

        if (isHighlightMode) {
            highlightBtn.textContent = 'show all';

            // Handle based on current view
            if (currentView === 'mints') {
                if (!cachedUserColors || cachedUserColors.length === 0) {
                    isHighlightMode = false;
                    highlightBtn.textContent = 'highlight';
                    return;
                }
                redrawCanvasHighlight(cachedUserColors);
            } else if (currentView === 'transfers') {
                if (!userAddress) {
                    isHighlightMode = false;
                    highlightBtn.textContent = 'highlight';
                    return;
                }
                redrawTransferCanvasHighlight(userAddress);
            }
        } else {
            highlightBtn.textContent = 'highlight';

            // Restore normal view based on current view
            if (currentView === 'mints') {
                redrawCanvas(allLoadedColors);
            } else if (currentView === 'transfers') {
                redrawTransferCanvas();
            }
        }
    });
}

/**
 * Close all modals and show canvas
 */
function closeAllModals() {
    aboutModal.classList.remove('active');
    mintModal.classList.remove('active');
    artworkModal.classList.remove('active');
    amplifyModal.classList.remove('active');
    canvas_element.style.display = 'block';
}

// About modal
if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
        // Stop any ongoing animations before hiding canvas
        stopAllAnimations();

        closeAllModals();
        aboutModal.classList.add('active');
        canvas_element.style.display = 'none';
    });
}

if (closeAbout) {
    closeAbout.addEventListener('click', () => {
        closeAllModals();

        // When returning to canvas, re-render everything properly
        if (currentView === 'mints') {
            redrawCanvas(allLoadedColors);
        } else if (currentView === 'transfers') {
            redrawTransferCanvas();
        }
    });
}

/**
 * Artwork gallery modal handlers
 */
claimArtworkBtn.addEventListener('click', async () => {
    // Stop any ongoing animations before hiding canvas
    stopAllAnimations();

    closeAllModals();
    artworkModal.classList.add('active');
    canvas_element.style.display = 'none';
    await loadArtworkGallery();
});

closeArtwork.addEventListener('click', () => {
    closeAllModals();

    // When returning to canvas, re-render everything properly
    if (currentView === 'mints') {
        redrawCanvas(allLoadedColors);
    } else if (currentView === 'transfers') {
        redrawTransferCanvas();
    }
});

// View toggle button (mints <-> transfers)
const viewToggleBtn = document.getElementById('view-toggle-btn');
if (viewToggleBtn) {
    viewToggleBtn.addEventListener('click', async () => {
        if (currentView === 'mints') {
            // Switch to transfers view

            // CRITICAL: Stop all rendering animations before switching
            stopAllAnimations();

            // Reset highlight mode and hide highlight button (not available on normal 3000 transfers)
            if (isHighlightMode) {
                isHighlightMode = false;
            }
            const highlightBtn = document.getElementById('highlight-btn');
            if (highlightBtn) {
                highlightBtn.textContent = 'highlight';
                highlightBtn.style.display = 'none'; // Hidden on normal transfers, shown only in "show all"
            }

            // Stop mint polling
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
                pollingIntervalId = null;
            }

            // Stop any background loading
            backgroundLoadingPaused = true;
            isBackgroundLoading = false;

            // Update button text
            viewToggleBtn.textContent = 'mints';
            currentView = 'transfers';

            // Show the "show all" button when on transfers view
            const showAllBtn = document.getElementById('show-all-transfers-btn');
            if (showAllBtn) {
                showAllBtn.style.display = 'flex';
            }

            // Change mint button to amplify button
            const mintBtn = document.getElementById('mint-btn');
            if (mintBtn) {
                mintBtn.textContent = 'amplify';
                mintBtn.setAttribute('data-mode', 'amplify');
                // Re-enable button (it may have been disabled on mints view)
                mintBtn.disabled = false;
                mintBtn.style.opacity = '1';
                mintBtn.style.cursor = 'pointer';
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Initialize transfer grid if not already loaded
            if (transferColors.length === 0) {
                await initializeTransferGrid();
            } else {
                // Render existing transfer data with animation
                calculateTransferGrid();
                drawGrid();
                hideUnusedCells();

                // Prepare colors for animated rendering
                const displayOrder = [...transferColors].reverse();
                const colorsWithIndices = displayOrder.map((transfer, index) => ({
                    index: index,
                    color: transfer.color
                }));

                // Animate transfer colors
                addToTransferRenderQueue(colorsWithIndices);

                // Resume polling if not already running
                if (!transferPollingIntervalId) {
                    startPollingForTransfers();
                }
            }

            // Update counters to show transfer stats
            updateTransferCountersDisplay();

        } else {
            // Switch to mints view

            // CRITICAL: Stop all rendering animations before switching
            stopAllAnimations();

            // Reset highlight mode
            if (isHighlightMode) {
                isHighlightMode = false;
            }

            // Show highlight button again if user has minted colors
            const highlightBtn = document.getElementById('highlight-btn');
            if (highlightBtn) {
                highlightBtn.textContent = 'highlight';
                // Show if user has cached colors (mints view)
                if (cachedUserColors && cachedUserColors.length > 0) {
                    highlightBtn.style.display = 'inline-block';
                } else {
                    highlightBtn.style.display = 'none';
                }
            }

            // Exit show all mode if active
            if (showAllTransfersMode) {
                showAllTransfersMode = false;
                allTransferColors = [];
            }

            // Stop transfer polling
            stopPollingForTransfers();

            // Update button text
            viewToggleBtn.textContent = 'transfers';
            currentView = 'mints';

            // Hide the "show all" button when on mints view
            const showAllBtn = document.getElementById('show-all-transfers-btn');
            if (showAllBtn) {
                showAllBtn.style.display = 'none';
                showAllBtn.textContent = 'show all';
            }

            // Change amplify button back to mint button
            const mintBtn = document.getElementById('mint-btn');
            if (mintBtn) {
                mintBtn.textContent = 'mint';
                mintBtn.removeAttribute('data-mode');
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Render mint grid
            redrawCanvas(allLoadedColors);

            // Resume mint polling
            backgroundLoadingPaused = false;
            startPollingForNewColors();

            // Update counters to show mint stats
            await updateCountersDisplay();
        }
    });
}

// Show All Transfers button handler
const showAllTransfersBtn = document.getElementById('show-all-transfers-btn');
if (showAllTransfersBtn) {
    showAllTransfersBtn.addEventListener('click', async () => {
        if (showAllTransfersMode) {
            // Exit show all mode
            await exitShowAllTransfers();
        } else {
            // Enter show all mode
            await initializeShowAllTransfers();
        }
    });
}

// Audio player
if (playPauseBtn && audioPlayer) {
    let isPlaying = false;
    let hasStartedPlaying = false; // Track if music has ever started

    audioPlayer.volume = 0.5;

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            audioPlayer.pause();
            playPauseBtn.textContent = '▶';
            isPlaying = false;
        } else {
            audioPlayer.play().catch(e => {
                console.error('Audio play failed:', e);
            });
            playPauseBtn.textContent = '◼';
            isPlaying = true;
        }
    });

    // Try autoplay
    audioPlayer.play().then(() => {
        isPlaying = true;
        hasStartedPlaying = true;
        playPauseBtn.textContent = '◼';
    }).catch(() => {
        isPlaying = false;
        playPauseBtn.textContent = '▶';

        // Autoplay blocked - set up one-time click handler to start music
        const startMusicOnFirstClick = () => {
            if (!hasStartedPlaying) {
                audioPlayer.play().then(() => {
                    isPlaying = true;
                    hasStartedPlaying = true;
                    playPauseBtn.textContent = '◼';
                }).catch(e => {
                    console.error('Audio play failed on first click:', e);
                });

                // Remove this listener after first click
                document.removeEventListener('click', startMusicOnFirstClick);
            }
        };

        // Add one-time click listener to entire document
        document.addEventListener('click', startMusicOnFirstClick);
    });
}

// Update mint limit display
async function updateMintLimitDisplay() {
    const mintLimitDisplay = document.getElementById('mint-limit-display');
    if (!mintLimitDisplay || !userAddress) {
        if (mintLimitDisplay) {
            mintLimitDisplay.textContent = 'Connect wallet to see minting progress';
        }
        return;
    }

    if (!TOKENS_PER_LOT || !provider) {
        if (mintLimitDisplay) {
            mintLimitDisplay.textContent = 'Loading...';
        }
        return;
    }

    try {
        // Query user's current lot count from contract (uses readProvider)
        const fstarContract = new ethers.Contract(FLAMINGSTAR_CONTRACT, FLAMINGSTAR_ABI, readProvider);
        const lotsMinted = await fstarContract.lotsByAddress(userAddress);

        // Calculate total tokens minted (1 lot = 3,333,333 tokens)
        // TOKENS_PER_LOT is stored as a plain number (e.g., 3333333), not in wei
        const tokensPerLot = TOKENS_PER_LOT || 3333333;

        // lotsMinted is a BigNumber, convert to number and multiply
        const lotsMintedNumber = lotsMinted.toNumber();
        const tokensMinted = lotsMintedNumber * tokensPerLot;

        const tokensMintedFormatted = tokensMinted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        // Max limit
        const maxLimitFormatted = MAX_MINT_LIMIT?.toLocaleString() || '9,999,999,000';

        // Display: "x/9,999,999,000"
        mintLimitDisplay.textContent = `${tokensMintedFormatted}/${maxLimitFormatted}`;
    } catch (error) {
        console.error('❌ Error fetching minted amount:', error);
        mintLimitDisplay.textContent = `Max ${MAX_MINT_LIMIT?.toLocaleString() || '...'} $${TOKEN_SYMBOL || 'FSTAR'} per address`;
    }
}

// Update contract links
function updateContractLinks() {
    const erc20Link = document.getElementById('contract-erc20-link');
    const erc721Link = document.getElementById('contract-erc721-link');
    const usdcLink = document.getElementById('usdc-contract-link');
    const bmoonErc20Link = document.getElementById('bmoon-erc20-link');
    const bmoonErc721Link = document.getElementById('bmoon-erc721-link');

    const explorerUrl = CURRENT_NETWORK.explorer;

    if (erc20Link) {
        erc20Link.href = `${explorerUrl}/address/${FLAMINGSTAR_CONTRACT}`;
    }

    if (erc721Link) {
        erc721Link.href = `${explorerUrl}/address/${FLAMINGSTAR_NFT_CONTRACT}`;
    }

    if (usdcLink) {
        usdcLink.href = `${explorerUrl}/address/${USDC_CONTRACT}`;
    }

    if (bmoonErc20Link) {
        bmoonErc20Link.href = `${explorerUrl}/address/${FLAMINGSTAR_CONTRACT}`;
    }

    if (bmoonErc721Link) {
        bmoonErc721Link.href = `${explorerUrl}/address/${FLAMINGSTAR_NFT_CONTRACT}`;
    }
}

function updateUSDCLink() {
    const usdcLink = document.getElementById('usdc-contract-link');
    if (usdcLink && USDC_CONTRACT) {
        usdcLink.href = `${CURRENT_NETWORK.explorer}/address/${USDC_CONTRACT}`;
    }
}

// ============================================
// ARTWORK GALLERY FUNCTIONS
// ============================================

/**
 * Load and display the NFT artwork gallery
 */
async function loadArtworkGallery() {
    try {
        // Show loading state
        artworkGrid.innerHTML = '<div style="text-align: center; padding: 40px;">loading artworks...</div>';

        // Create a read-only provider for Base mainnet
        const readProvider = new ethers.providers.JsonRpcProvider(BASE_RPC);

        // Connect to NFT contract
        const nftContract = new ethers.Contract(FLAMINGSTAR_NFT_CONTRACT, FLAMINGSTAR_NFT_ABI, readProvider);

        // Get total supply, artist proofs, and total minted
        const totalSupply = await nftContract.TOTAL_SUPPLY();
        const artistProofs = await nftContract.ARTIST_PROOFS();
        const totalMinted = await nftContract.totalMinted();

        // Update modal heading
        const modalHeading = document.querySelector('#artwork-modal h2');
        modalHeading.textContent = `${totalMinted}/${totalSupply} (${artistProofs} AP)`;

        // Clear the grid
        artworkGrid.innerHTML = '';

        // Create placeholder boxes for all NFTs first (fast, prevents blank space)
        const placeholders = [];
        for (let tokenId = totalSupply - 1; tokenId >= 0; tokenId--) {
            const placeholder = document.createElement('div');
            placeholder.className = 'nft-box';
            placeholder.innerHTML = '<div class="nft-artwork unminted">loading...</div>';
            artworkGrid.appendChild(placeholder);
            placeholders.push({ element: placeholder, tokenId });
        }

        // Load actual NFT content and replace placeholders (reversed: totalSupply-1 to 0)
        // This shows unminted NFTs first (faster loading) and minted ones below (slower SVG loading)
        for (let i = 0; i < placeholders.length; i++) {
            const { element, tokenId } = placeholders[i];
            const isMinted = tokenId < totalMinted;
            const nftBox = await createNFTBox(tokenId, isMinted, nftContract);
            element.replaceWith(nftBox);
        }

    } catch (error) {
        console.error('Error loading artwork gallery:', error);
        artworkGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--blue);">error loading artworks. please try again.</div>';
    }
}

/**
 * Create an NFT box element
 */
async function createNFTBox(tokenId, isMinted, nftContract) {
    const box = document.createElement('div');
    box.className = 'nft-box';

    if (isMinted) {
        // NFT is minted - fetch metadata
        try {
            const tokenURIData = await nftContract.tokenURI(tokenId);
            const metadata = parseTokenURI(tokenURIData);

            // Create artwork container
            const artworkDiv = document.createElement('div');
            artworkDiv.className = 'nft-artwork';
            artworkDiv.innerHTML = metadata.svg;

            // Create traits
            const traitsDiv = document.createElement('div');
            traitsDiv.className = 'nft-traits';

            const tokenIdTrait = document.createElement('div');
            tokenIdTrait.className = 'nft-trait';
            tokenIdTrait.innerHTML = `
                <span class="trait-label">token id:</span>
                <span class="trait-value">${tokenId}</span>
            `;

            traitsDiv.appendChild(tokenIdTrait);

            // Create view button
            const viewBtn = document.createElement('button');
            viewBtn.className = 'nft-view-btn';
            viewBtn.textContent = 'view';
            viewBtn.addEventListener('click', () => {
                openNFTInNewTab(metadata.svg, tokenId);
            });

            // Create marketplace button
            const marketplaceBtn = document.createElement('button');
            marketplaceBtn.className = 'nft-view-btn';
            marketplaceBtn.textContent = 'marketplace';
            marketplaceBtn.addEventListener('click', () => {
                const openseaUrl = `${CURRENT_NETWORK.openseaBase}/${FLAMINGSTAR_NFT_CONTRACT.toLowerCase()}/${tokenId}`;
                window.open(openseaUrl, '_blank');
            });

            box.appendChild(artworkDiv);
            box.appendChild(traitsDiv);
            box.appendChild(viewBtn);
            box.appendChild(marketplaceBtn);

        } catch (error) {
            console.error(`Error loading NFT #${tokenId}:`, error);
            box.innerHTML = `<div class="nft-artwork unminted">error loading #${tokenId}</div>`;
        }

    } else {
        // NFT not minted yet (token ID hidden - contract mints sequentially)
        const artworkDiv = document.createElement('div');
        artworkDiv.className = 'nft-artwork unminted';
        artworkDiv.textContent = 'not minted yet';

        const mintBtn = document.createElement('button');
        mintBtn.className = 'nft-view-btn mint-style';
        mintBtn.textContent = 'claim/mint';
        mintBtn.addEventListener('click', async () => {
            await mintNFT(tokenId, mintBtn);
        });

        box.appendChild(artworkDiv);
        box.appendChild(mintBtn);
    }

    return box;
}

/**
 * Parse base64-encoded tokenURI data
 */
function parseTokenURI(tokenURIData) {
    // Remove "data:application/json;base64," prefix
    const base64Data = tokenURIData.replace('data:application/json;base64,', '');

    // Decode base64
    const jsonString = atob(base64Data);
    const metadata = JSON.parse(jsonString);

    // Extract SVG from image data URI
    const svgBase64 = metadata.image.replace('data:image/svg+xml;base64,', '');
    const svg = atob(svgBase64);

    // Extract traits (FlamingStarNFT has: Current Owner, Current Block, Original Minter, Mint Block, Type)
    const currentOwnerTrait = metadata.attributes.find(attr => attr.trait_type === 'Current Owner');
    const currentBlockTrait = metadata.attributes.find(attr => attr.trait_type === 'Current Block');
    const originalMinterTrait = metadata.attributes.find(attr => attr.trait_type === 'Original Minter');
    const mintBlockTrait = metadata.attributes.find(attr => attr.trait_type === 'Mint Block');
    const typeTrait = metadata.attributes.find(attr => attr.trait_type === 'Type');

    return {
        svg: svg,
        minter: currentOwnerTrait ? currentOwnerTrait.value : '-',
        blockNumber: currentBlockTrait ? currentBlockTrait.value : '-',
        originalMinter: originalMinterTrait ? originalMinterTrait.value : '-',
        mintBlock: mintBlockTrait ? mintBlockTrait.value : '-',
        nftType: typeTrait ? typeTrait.value : '-'
    };
}

/**
 * Mint an NFT (requires wallet connection and $BMOON token approval)
 */
async function mintNFT(tokenId, buttonElement) {
    try {
        // Check if wallet is connected
        if (!isWalletConnected || !signer) {
            buttonElement.textContent = 'connect wallet first';
            setTimeout(() => {
                buttonElement.textContent = 'claim/mint';
            }, 2000);
            return;
        }

        // Get user address
        const address = await signer.getAddress();

        // Connect to NFT contract
        const nftContract = new ethers.Contract(FLAMINGSTAR_NFT_CONTRACT, FLAMINGSTAR_NFT_ABI, signer);

        // Try to read fstarToken address from contract
        let fstarTokenAddress;
        try {
            fstarTokenAddress = await nftContract.fstarToken();
        } catch (error) {
            console.error('❌ Failed to read fstarToken from contract:', error);
            buttonElement.textContent = 'contract error - check console';
            setTimeout(() => {
                buttonElement.textContent = 'claim/mint';
            }, 3000);
            return;
        }

        const fstarContract = new ethers.Contract(fstarTokenAddress, ERC20_ABI, signer);

        // Get mint price from contract (666,666,666 $FSTAR tokens per NFT)
        let mintPrice;
        try {
            mintPrice = await nftContract.MINT_PRICE();
        } catch (error) {
            console.error('❌ Failed to read MINT_PRICE from contract:', error);
            buttonElement.textContent = 'contract error - check console';
            setTimeout(() => {
                buttonElement.textContent = 'claim/mint';
            }, 3000);
            return;
        }

        // Check $FSTAR balance
        buttonElement.textContent = 'checking balance...';
        const balance = await fstarContract.balanceOf(address);

        if (balance.lt(mintPrice)) {
            buttonElement.textContent = `insufficient $FSTAR`;
            setTimeout(() => {
                buttonElement.textContent = 'claim/mint';
            }, 2000);
            return;
        }

        // Check approval
        buttonElement.textContent = 'checking approval...';
        const allowance = await fstarContract.allowance(address, FLAMINGSTAR_NFT_CONTRACT);

        if (allowance.lt(mintPrice)) {
            // Need approval first - approve exactly the mint price for this NFT
            // User will need to approve again for each subsequent NFT mint
            buttonElement.textContent = `approve $FSTAR...`;
            const approveTx = await fstarContract.approve(FLAMINGSTAR_NFT_CONTRACT, mintPrice);
            buttonElement.textContent = 'approving...';
            await approveTx.wait();

            // Verify approval was successful
            buttonElement.textContent = 'verifying approval...';
            const newAllowance = await fstarContract.allowance(address, FLAMINGSTAR_NFT_CONTRACT);

            if (newAllowance.lt(mintPrice)) {
                // Approval didn't work for some reason
                buttonElement.textContent = 'approval failed - try again';
                setTimeout(() => {
                    buttonElement.textContent = 'claim/mint';
                }, 3000);
                return;
            }

            // Approval successful - continue to minting automatically
        }

        // Allowance is sufficient (or just approved), proceed with minting
        buttonElement.textContent = 'minting...';

        try {
            const mintTx = await nftContract.mint();
            buttonElement.textContent = 'confirming...';
            const receipt = await mintTx.wait();
        } catch (mintError) {
            console.error('❌ Mint transaction failed:', mintError);
            throw mintError; // Re-throw to be caught by outer catch block
        }

        buttonElement.textContent = 'minted!';

        // Reload the gallery after a short delay
        setTimeout(async () => {
            await loadArtworkGallery();
        }, 1500);

    } catch (error) {
        console.error('Error minting NFT:', error);

        // Better error handling
        let errorMessage = 'error - try again';

        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            errorMessage = 'user rejected transaction';
        }
        else if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
            errorMessage = 'insufficient ETH for gas';
        }
        else if (error.code === 'NETWORK_ERROR' || error.code === 'CALL_EXCEPTION') {
            errorMessage = 'wrong network or contract error';
        }
        else if (error.message) {
            if (error.message.includes('insufficient')) {
                errorMessage = `insufficient $BMOON`;
            } else if (error.message.includes('exceeds balance')) {
                errorMessage = `insufficient $BMOON`;
            }
        }

        buttonElement.textContent = errorMessage;
        setTimeout(() => {
            buttonElement.textContent = 'claim/mint';
        }, 3000);
    }
}

/**
 * Open NFT artwork in new tab as PNG image (4400x4400px, Display P3 color space)
 */
function openNFTInNewTab(svg, tokenId) {
    // Generate timestamp for snapshot (YYYY-MM-DD_HH-MM-SS format)
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + '-' +
        String(now.getMinutes()).padStart(2, '0') + '-' +
        String(now.getSeconds()).padStart(2, '0');

    const filename = `flamingstar_nft_token_${tokenId}_${timestamp}.png`;

    // Open window immediately (synchronously with user click) to avoid popup blockers
    const newWindow = window.open('', `_blank_nft_${tokenId}`);

    if (!newWindow) {
        alert('Please allow popups for this site to view NFT artwork.');
        return;
    }

    // Write loading state to the window
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${filename}</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #f3f3f3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    font-family: monospace;
                    color: #353535ff;
                }
            </style>
        </head>
        <body>
            <div>Loading artwork...</div>
        </body>
        </html>
    `);

    // Create a canvas with Display P3 color space for wider color gamut
    const canvas = document.createElement('canvas');
    const size = 4400; // 4400x4400px (200px per grid cell for 22x22 grid)
    canvas.width = size;
    canvas.height = size;

    // Get context with Display P3 color space (important for accurate blue hues)
    // Fallback to regular 2d context if Display P3 not supported
    let ctx;
    try {
        ctx = canvas.getContext('2d', {
            colorSpace: 'display-p3',
            willReadFrequently: false
        });
    } catch (e) {
        ctx = canvas.getContext('2d');
    }

    // Disable all image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    if (ctx.imageSmoothingQuality) {
        ctx.imageSmoothingQuality = 'high';
    }

    // Create an image from the SVG
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Timeout fallback if image doesn't load within 10 seconds
    const loadTimeout = setTimeout(() => {
        newWindow.document.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Error</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #f3f3f3;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        font-family: monospace;
                        color: #353535ff;
                    }
                </style>
            </head>
            <body>
                <div>Error rendering NFT artwork. Please try again.</div>
            </body>
            </html>
        `);
        newWindow.document.close();
        URL.revokeObjectURL(svgUrl);
    }, 10000);

    img.onload = function() {
        clearTimeout(loadTimeout);
        // Draw SVG to canvas at 4400x4400
        ctx.drawImage(img, 0, 0, size, size);

        // Clean up SVG blob URL
        URL.revokeObjectURL(svgUrl);

        // Convert canvas to data URL (base64 PNG)
        const dataUrl = canvas.toDataURL('image/png', 1.0);

        // Write the complete HTML with the image to the window
        newWindow.document.open();
        newWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${filename}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #f3f3f3;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: monospace;
        }
        img {
            max-width: 90%;
            max-height: 80vh;
            display: block;
            cursor: pointer;
            image-rendering: -moz-crisp-edges;
            image-rendering: -webkit-crisp-edges;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
        .download-btn {
            margin-top: 20px;
            padding: 10px 20px;
            background: #f3f3f3;
            color: #353535ff;
            border: 1px solid #353535ff;
            font-family: monospace;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .download-btn:hover {
            background: #353535ff;
            color: #f3f3f3;
        }
    </style>
</head>
<body>
    <img src="${dataUrl}" alt="${filename}" id="nftImage">
    <a href="${dataUrl}" download="${filename}" class="download-btn" id="downloadLink">DOWNLOAD</a>
    <script>
        // Allow clicking the image to download as well
        document.getElementById('nftImage').addEventListener('click', function() {
            document.getElementById('downloadLink').click();
        });

        // Also enable right-click context menu to work on the image
        document.getElementById('nftImage').addEventListener('contextmenu', function(e) {
            e.stopPropagation();
        });
    </script>
</body>
</html>`);
        newWindow.document.close();
    };

    img.onerror = function(error) {
        clearTimeout(loadTimeout);
        newWindow.document.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Error</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #f3f3f3;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        font-family: monospace;
                        color: #353535ff;
                    }
                </style>
            </head>
            <body>
                <div>Error loading NFT image. Please try again.</div>
            </body>
            </html>
        `);
        newWindow.document.close();
        URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
}

// ============================================
// INITIALIZATION
// ============================================

async function initializePage() {
    // Initialize canvas
    canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    ctx = canvas.getContext('2d');

    // Initialize read-only provider for all read operations (never changes)
    readProvider = new ethers.providers.JsonRpcProvider(BASE_RPC);

    // Initialize contract values (now instant with hardcoded values)
    const initialized = await initializeContractValues();
    if (!initialized) return;

    // Update UI elements
    updateMintButtonPrices();
    updateMaxUSDCApproval();
    updateContractLinks();

    // Draw empty grid IMMEDIATELY (instant visual feedback)
    calculateGrid();
    drawGrid();
    hideUnusedCells();

    // Load colors from subgraph in background (async, non-blocking)
    initializeGridWithCache();

    // Start slow polling for USDC balance and user wallet balances (every 60 seconds)
    startSlowPolling();
}

// Handle window resize
window.addEventListener('resize', () => {
    // Redraw based on current view to prevent mints colors appearing on transfers view
    if (currentView === 'mints') {
        redrawCanvas();
    } else if (currentView === 'transfers') {
        redrawTransferCanvas();
    }
});

// Start initialization when page loads
window.addEventListener('DOMContentLoaded', initializePage);
