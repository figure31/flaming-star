#!/usr/bin/env node

/**
 * Export all mints data from subgraph to static JSON file
 * Run: node export-mints-data.js
 */

const fs = require('fs');
const https = require('https');

const SUBGRAPH_URL = 'https://subgraph.satsuma-prod.com/dd1da9748384/figure31--8074/flamingstar-mints/version/v1.0.0/api';
const OUTPUT_FILE = './mints-data.json';
const BATCH_SIZE = 1000;

/**
 * Query subgraph using https module
 */
function querySubgraph(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(SUBGRAPH_URL, options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(body);

                    if (result.errors) {
                        console.error('GraphQL errors:', result.errors);
                        reject(new Error(result.errors[0].message));
                        return;
                    }

                    resolve(result.data);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Get global stats
 */
async function getGlobalStats() {
    console.log('Fetching global stats...');

    const query = `
        query GetGlobalStats {
            globalStats(id: "1") {
                totalLotsMinted
                latestLotId
                totalFStarMinted
                remainingLots
                uniqueMinters
                totalMintTransactions
                totalUSDCCollected
                totalBMOONCollected
                usdcMints
                bmoonMints
                totalSupply
                tokensPerLot
                bmoonPerLot
                mintPriceUsdc
                maxLots
                maxLotsPerAddress
            }
        }
    `;

    const data = await querySubgraph(query);
    return data?.globalStats || null;
}

/**
 * Query a batch of colors
 */
async function queryColorBatch(skip) {
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

    const data = await querySubgraph(query, { skip, limit: BATCH_SIZE });
    return data?.colors || [];
}

/**
 * Fetch all colors from subgraph
 */
async function fetchAllColors(totalLots) {
    console.log(`Fetching ${totalLots} colors in batches of ${BATCH_SIZE}...`);

    const allColors = [];
    let skip = 0;

    while (skip < totalLots) {
        process.stdout.write(`\rProgress: ${skip}/${totalLots} colors fetched...`);

        const batch = await queryColorBatch(skip);

        if (batch.length === 0) {
            break;
        }

        allColors.push(...batch);
        skip += BATCH_SIZE;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\nFetched ${allColors.length} colors total`);
    return allColors;
}

/**
 * Main export function
 */
async function exportMintsData() {
    try {
        console.log('Starting mints data export...\n');

        // Step 1: Get global stats
        const globalStats = await getGlobalStats();

        if (!globalStats) {
            throw new Error('Failed to fetch global stats');
        }

        const totalLots = parseInt(globalStats.totalLotsMinted);
        console.log(`Total lots minted: ${totalLots}\n`);

        if (totalLots === 0) {
            console.log('No mints found. Creating empty data file.');
            const emptyData = {
                globalStats,
                colors: [],
                exportedAt: new Date().toISOString(),
                exportedAtTimestamp: Date.now(),
                latestLotId: -1,
                totalColors: 0
            };

            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emptyData, null, 2));
            console.log(`✓ Empty data file created: ${OUTPUT_FILE}`);
            return;
        }

        // Step 2: Fetch all colors
        const colors = await fetchAllColors(totalLots);

        // Step 3: Create output data
        const outputData = {
            globalStats,
            colors,
            exportedAt: new Date().toISOString(),
            exportedAtTimestamp: Date.now(),
            latestLotId: parseInt(globalStats.latestLotId),
            totalColors: colors.length
        };

        // Step 4: Write to file
        console.log('\nWriting to file...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));

        // Step 5: Show file size
        const stats = fs.statSync(OUTPUT_FILE);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`\n✓ Export complete!`);
        console.log(`  File: ${OUTPUT_FILE}`);
        console.log(`  Size: ${fileSizeMB} MB`);
        console.log(`  Colors: ${colors.length}`);
        console.log(`  Latest lot ID: ${outputData.latestLotId}`);

    } catch (error) {
        console.error('\n✗ Export failed:', error.message);
        process.exit(1);
    }
}

// Run export
exportMintsData();
