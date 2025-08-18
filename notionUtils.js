import 'dotenv/config';
import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_KEY });

async function queryPastDueActionItems(debug) {
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

            if(debug) {
                console.log('\nqueryActionItems database query response:');
                console.dir(response, { depth: null, colors: true });
                console.log('\npastDueActionItems: ');
                console.dir(pastDueActionItems, { depth: null, colors: true });
            }

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

async function queryActionItems(filter, description, debug) {
    let actionItems = [];
    let hasMore = true;
    let startCursor = undefined;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

    try {
        const databaseId = process.env.NOTION_DATABASE_ID;

        while(hasMore) {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: startCursor,
                filter: filter,
            });
            
            actionItems.push(...response.results);
            console.log(`Fetched batch of ${response.results.length} ${description} action items. Total so far: ${actionItems.length}`);

            if(debug) {
                console.log('\nqueryActionItems database query response:');
                console.dir(response, { depth: null, colors: true });
                console.log('\nactionItems: ');
                console.dir(actionItems, { depth: null, colors: true });
            }

            hasMore = response.has_more;
            if (hasMore) {
                startCursor = response.next_cursor;
                console.log(`There are more ${description} action items to fetch.`);
                console.log(`Next start cursor is ${startCursor}`);
            }
            else {
                console.log(`There are no more ${description} action items to fetch.`);
            }
        }

        return actionItems;
    } catch (error) {
        console.error(`\nERROR with status ${error.status} fetching ${description} action items:\n\n${error.message}`, error);
        throw new Error(`Failed to fetch ${description} action item(s): ${error.message}`);
    }
}

async function aggregateActionItemsByInitiative(actionItems, debug) {
    let initiatives = new Map(); // Map<string, PastDueItem[]> - stores action items grouped by initiative ID

    for (let item of actionItems) {
        let initiativePageIds = item.properties['Assigned Initiative(s)'].relation.map( initiativePage => initiativePage.id);
        let itemTitle = item.properties['Action Item'].title.map(itemTitle => itemTitle.plain_text).join('');
        let status = item.properties['Status'].status.name;
        let dueDate = item.properties['Due Date'].date.start;
        let url = item.url;

        const newItem = {
            actionItem: itemTitle,
            status: status,
            dueDate: dueDate,
            url: url,
        };

        for (const id of initiativePageIds) {
            if (initiatives.has(id)) {
                initiatives.get(id).push(newItem);
            }
            else {
                initiatives.set(id, [newItem]);
            }
        }
    }

    if (debug) {
        console.log('\ninitiatives (Map<string, PastDueItem[]>:');
        console.dir(initiatives, { depth: null, colors: true });
    }

    return initiatives;
}

async function enrichInitiatives(initiativesMap, debug) {
    const enriched = []

    for(const [initiativeId, items] of initiativesMap.entries()) {
        items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const page = await notion.pages.retrieve({ page_id: initiativeId });

        const title = page.properties['Initiative'].title.map(initiativeTitle => initiativeTitle.plain_text).join('');

        let leads = []
        const leadPagesIds = page.properties['Lead'].relation.map(lead => lead.id);
        for (let leadPageId of leadPagesIds) {
            const leadPage = await notion.pages.retrieve({ page_id: leadPageId });
            
            const lead = leadPage.properties.Name.title.map(leadTitle => leadTitle.plain_text).join('');
            const leadEmail = leadPage.properties['School Email'].email;

            leads.push({name: lead, email: leadEmail });
        }
        
        enriched.push({
            initiative: title,
            leads: leads,
            items: items,
        });
    }

    if (debug) {
        console.log('\n enriched: ');
        console.dir(enriched, { depth: null, colors: true });
    }

    return enriched;
}

export {
    queryActionItems,
    aggregateActionItemsByInitiative,
    enrichInitiatives
};