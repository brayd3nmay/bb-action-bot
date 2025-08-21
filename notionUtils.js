import 'dotenv/config';
import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_KEY });

async function queryActionItems(filter, sort, description) {
    let actionItems = [];
    let hasMore = true;
    let startCursor = undefined;

    try {
        const databaseId = process.env.NOTION_DATABASE_ID;

        while(hasMore) {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: startCursor,
                filter: filter,
                sorts: sort 
            });
            
            actionItems.push(...response.results);
            console.log(`Fetched batch of ${response.results.length} ${description} action items.\nTotal so far: ${actionItems.length}`);

            hasMore = response.has_more;
            if (hasMore) {
                startCursor = response.next_cursor;
                console.log(`There are more ${description} action items to fetch.`);
                console.log(`Next start cursor is ${startCursor}`);
            }
            else {
                console.log(`There are no more ${description} action items to fetch.`);
                console.log('-------------------------------------------------------');
            }
        }

        return actionItems;
    } catch (error) {
        console.error(`\nERROR with status ${error.status} fetching ${description} action items:\n\n${error.message}`, error);
        throw new Error(`Failed to fetch ${description} action item(s): ${error.message}`);
    }
}

async function updatePastDueStatus(items) {
    let updatedItems = [];

    for (let item of items) {
        const pageId = item.id;

        try {
            console.log(`Updating page ${pageId}`);

            const response = await notion.pages.update({
                page_id: pageId,
                properties: {
                    'Status': {
                        status: {
                            name: 'Past Due'
                        }
                    }
                }
            });

            console.log(`Updated page ${pageId}`);

            updatedItems.push(response);

        } catch(error) {
            console.error(`\nERROR with status ${error.status} updating page ${pageId}\n\n${error.message}`, error);
            throw new Error(`Failed to update ${pageId} ${error.message}`);
        }
    }

    return updatedItems;
}

let pastDue = await queryPastDue();

async function queryPastDue() {
    let items = [];

    let filter = {
        'property': 'Status', 
        'status': { 
            'equals': 'Past Due' 
        }
    };

    const sort = [
        {
            'property': 'Due Date',
            'direction': 'ascending'
        }
    ];

    // Get the action items that are labeled as past due
    const pastDue = await queryActionItems(filter, sort, 'past due status');
    items.push(...pastDue);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    filter = {
        'and': [
            {
                'property': 'Due Date',
                'date': { 'before': today }
            },
            {
                'or': [
                    { 'property': 'Status', 'status': { 'equals': 'Assigned' } },
                    { 'property': 'Status', 'status': { 'equals': 'Delegated' } },
                    { 'property': 'Status', 'status': { 'equals': 'In Progress' } }
                ]
            }
        ]
    };

    const pastDueWrongStatus =  await queryActionItems(filter, sort, 'assigned, delegated, or in progress status and past due date');
    
    // update status to be past due
    if(pastDueWrongStatus.length > 0) {     
        const updated = await updatePastDueStatus(pastDueWrongStatus);
        items.push(...updated);
    }

    return items;
}

async function queryAssigned() {
    const filter = { 'property': 'Status', 'status': { 'equals': 'Assigned'} };

    return await queryActionItems(filter, 'assigned');
}

async function aggregateByInitiative(pastDue, assigned) {
    let initiatives = new Map(); // Map<string, [pastDueItems[], assignedItems[]]>`
    
    for (let item of pastDue) {
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

    console.dir(initiatives, { depth: null, colors: true });

    return initiatives;
}

async function enrichInitiatives(initiativesMap) {
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

    return enriched;
}

export {
    queryPastDue,
    queryAssigned,
    aggregateByInitiative,
    enrichInitiatives
};