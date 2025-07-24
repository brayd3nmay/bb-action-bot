require('dotenv').config();

const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_KEY });

// Get the page ids for the action items that have been assigned and are past due
async function fetchActionItems() {
    let pastDueActionItems = [];
    let hasMore = true;
    let startCursor = undefined;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

    try {
        const databaseId = process.env.NOTION_DATABASE_ID;
        const filter = {
            'and': [
                {
                    'property': 'Due Date',
                    'date': { 'before': today }
                },
                {
                    'or': [
                        { 'property': 'Status', 'status': { 'equals': 'Assigned' } },
                        { 'property': 'Status', 'status': { 'equals': 'Past Due' } },
                        { 'property': 'Status', 'status': { 'equals': 'Delegated' } },
                        { 'property': 'Status', 'status': { 'equals': 'In Progress' } }
                    ]
                }
            ]
        };

        while(hasMore) {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: startCursor,
                filter: filter,
            });
            
            pastDueActionItems.push(...response.results);
            console.log(`Fetched batch of ${response.results.length} past-due action items. Total so far: ${pastDueActionItems.length}`);

            hasMore = response.has_more;
            if (hasMore) {
                startCursor = response.next_cursor;
                console.log('There are more action items to fetch.');
                console.log(`Next start cursor is ${startCursor}`);
            }
            else {
                console.log('There are no more action items to fetch.');
            }
        }

        return pastDueActionItems;
    } catch (error) {
        console.error(`\nERROR with status ${error.status} fetching past due action items:\n\n${error.message}`, error);
        throw new Error(`Failed to fetch past due action item(s): ${error.message}`);
    }
}