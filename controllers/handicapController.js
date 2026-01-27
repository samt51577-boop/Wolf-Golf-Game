const { GhinClient } = require('@spicygolf/ghin');

let ghinClient;

async function getClient() {
    if (!ghinClient) {
        ghinClient = new GhinClient({
            username: process.env.GHIN_USERNAME || 'samt51577@gmail.com',
            password: process.env.GHIN_PASSWORD || 'T!gger10!'
        });
    }
    return ghinClient;
}

exports.searchGolfers = async (req, res) => {
    const { first_name, last_name, state } = req.query;

    console.log(`[GHIN Search] Request: name="${first_name} ${last_name}", state="${state}"`);

    if (!last_name) {
        return res.status(400).json({ error: 'Last name is required for search' });
    }

    try {
        const client = await getClient();
        const searchParams = { last_name };
        if (first_name) searchParams.first_name = first_name;
        if (state && state !== 'Custom') searchParams.state = state;

        console.log(`[GHIN SDK] Calling golfers.search with:`, searchParams);
        const results = await client.golfers.search(searchParams);
        console.log(`[GHIN SDK] Found ${results ? results.length : 0} results`);

        // Return streamlined results
        const minified = (results || []).map(p => ({
            name: `${p.first_name} ${p.last_name}`,
            handicap_index: p.handicap_index,
            ghin: p.ghin,
            club: p.club_name,
            state: p.state
        }));

        res.status(200).json(minified);
    } catch (error) {
        console.error('GHIN Search Error:', error);
        const details = error.message || 'Unknown GHIN API error';
        if (error.statusCode === 401 || error.statusCode === 403) {
            console.log("[GHIN Service] Auth failure, clearing client for retry...");
            ghinClient = null;
        }
        res.status(error.statusCode || 500).json({
            error: 'GHIN Search Failed',
            details: details,
            statusCode: error.statusCode
        });
    }
};

exports.getHandicap = async (req, res) => {
    const { memberId } = req.params;

    console.log(`[GHIN Lookup] Request for GHIN: ${memberId}`);

    if (!memberId) {
        return res.status(400).json({ error: 'GHIN Number is required' });
    }

    try {
        const client = await getClient();

        // Convert memberId to number for getOne
        const ghinNum = parseInt(memberId);
        if (isNaN(ghinNum)) {
            return res.status(400).json({ error: 'Invalid GHIN number format' });
        }

        console.log(`[GHIN SDK] Calling golfers.getOne for: ${ghinNum}`);
        const player = await client.golfers.getOne(ghinNum);

        if (player) {
            console.log(`[GHIN SDK] Found player: ${player.first_name} ${player.last_name}`);
            res.status(200).json({
                name: `${player.first_name} ${player.last_name}`,
                handicap_index: player.handicap_index,
                ghin: player.ghin
            });
        } else {
            console.log(`[GHIN SDK] No player found for GHIN: ${ghinNum}`);
            res.status(404).json({ error: 'Golfer not found' });
        }
    } catch (error) {
        console.error('GHIN API Error:', error);
        const details = error.message || 'Unknown GHIN API error';
        // Reset client on auth error to force re-login next time
        if (error.statusCode === 401 || error.statusCode === 403) {
            console.log("[GHIN Service] Auth failure, clearing client for retry...");
            ghinClient = null;
        }
        res.status(error.statusCode || 500).json({
            error: 'GHIN Lookup Failed',
            details: details,
            statusCode: error.statusCode
        });
    }
};
