import 'dotenv/config';
import { Client } from '@notionhq/client';
const notion = new Client({ auth: process.env.NOTION_KEY });

async function queryActionItems(filter, sorts, description) {
    let actionItems = [];
    let hasMore = true;
    let startCursor = undefined;

    try {
        const databaseId = process.env.NOTION_DATABASE_ID;

        if (!databaseId) {
            throw new Error('NOTION_DATABASE_ID is missing');
        }

        while(hasMore) {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: startCursor,
                filter: filter,
                sorts: sorts
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

        } catch(error) {
            console.error(`\nERROR with status ${error.status} updating page ${pageId}\n\n${error.message}`, error);
            throw new Error(`Failed to update ${pageId} ${error.message}`);
        }
    }
}

async function queryPastDue() {
    let items = [];

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    let filter = {
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

    const pastDueWrongStatus =  await queryActionItems(filter, [], 'assigned, delegated, or in progress status and past due date');
    
    // update status to be past due
    if(pastDueWrongStatus.length > 0) {     
        await updatePastDueStatus(pastDueWrongStatus);
    }

    filter = {
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

    const pastDue = await queryActionItems(filter, sort, 'past due status');
    items.push(...pastDue);

    return items;
}

async function queryAssigned() {
    const filter = { 'property': 'Status', 'status': { 'equals': 'Assigned'} };
    const sort = [
        {
            'property': 'Due Date',
            'direction': 'ascending'
        }
    ];

    return await queryActionItems(filter, sort, 'assigned');
}

async function aggregateByInitiative(pastDue, assigned) {
    let initiatives = new Map(); // Map<string, [pastDueItems[], assignedItems[]]>`

    const pushItem = (bucket, item) => {
        let pageId = item.id;
        
        let relations = [];
        if(item.properties && item.properties['Assigned Initiative(s)']) {
            relations = item.properties['Assigned Initiative(s)'].relation.map( initiativePage => initiativePage.id);
        }
        if(relations.length === 0) {
            relations = ['UNASSIGNED'];
        }
        
        let itemTitle = '';
        if(item.properties && item.properties['Action Item']){
            itemTitle = item.properties['Action Item'].title.map(itemTitle => itemTitle.plain_text).join('');
        }

        let status = 'undefined';
        if(item.properties && item.properties['Status'] && item.properties['Status'].status.name) {
            status = item.properties['Status'].status.name;
        }


        let dueDate = 'None';
        if(item.properties && item.properties['Due Date'] && item.properties['Due Date'].date){
            dueDate = item.properties['Due Date'].date.start;
        }

        let url = item.url;

        const newItem = {
            pageId: pageId,
            actionItem: itemTitle,
            status: status,
            dueDate: dueDate,
            url: url,
        };

        for (const id of relations) {
            if (!initiatives.has(id)) {
                initiatives.set(id, { pastDue: [], assigned: []});
            }
            initiatives.get(id)[bucket].push(newItem);
        }
    };
    
    for(let item of pastDue) pushItem('pastDue', item);
    for(let item of assigned) pushItem('assigned', item);

    return initiatives;
}

async function retrieveInitiativeInfo(initiativesMap) {
    const enriched = []

    for(const [initiativeId, items] of initiativesMap.entries()) {
        if (initiativeId === 'UNASSIGNED') {
            enriched.push({
                id: initiativeId,
                initiative: 'Unassigned',
                leads: [],
                items
            });

            continue;
        }

        const page = await notion.pages.retrieve({ page_id: initiativeId });

        let title = 'undefined';
        if(page.properties?.['Initiative']?.title) {
            title = page.properties['Initiative'].title.map(initiativeTitle => initiativeTitle.plain_text).join('');
        }

        let leads = []
        if(page.properties?.['Lead']?.relation) {
            const leadPagesIds = page.properties['Lead'].relation.map(lead => lead.id);

            for (let leadPageId of leadPagesIds) {
                const leadPage = await notion.pages.retrieve({ page_id: leadPageId });
                
                let lead = 'undefined';
                if(leadPage.properties?.Name?.title) {
                    lead = leadPage.properties.Name.title.map(leadTitle => leadTitle.plain_text).join('');
                }
                
                let leadEmail = 'undefined';
                if(leadPage.properties?.['School Email']?.email) {
                    leadEmail = leadPage.properties['School Email'].email;
                }

                leads.push({id: leadPageId, name: lead, email: leadEmail });
            }
        }
        
        enriched.push({
            id: initiativeId,
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
    retrieveInitiativeInfo
};