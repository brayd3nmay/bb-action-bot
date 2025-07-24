require('dotenv').config();

const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_KEY });

// Get the page ids for the action items that have been assigned and are past due
async function getIds() {
    let pageIds = [];
    let hasMore = true;
    let startCursor = undefined;

    try {
        while(hasMore) {
            const databaseId = process.env.NOTION_DATABASE_ID;
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: startCursor,
                filter: {
                    'and': [
                        {
                            'property': 'Due Date',
                            'date': {
                                'before': new Date().toISOString().split('T')[0]
                            }
                        },
                        {
                            'or': [
                                {
                                    'property': 'Status',
                                    'status': {
                                        'equals': 'Assigned'
                                    }
                                },
                                {
                                    'property': 'Status',
                                    'status': {
                                        'equals': 'Past Due'
                                    }
                                },
                                {
                                    'property': 'Status',
                                    'status': {
                                        'equals': 'Delegated'
                                    }
                                },
                                {
                                    'property': 'Status',
                                    'status': {
                                        'equals': 'In Progress'
                                    }
                                }
                            ]
                        }
                    ]
                },
            });

            console.dir(response, { depth: null });
            
            for(const page of response.results) {
                const id = page.id;

                pageIds.push(id);
            }
            
            hasMore = response.has_more;
            if (hasMore) {
                startCursor = response.next_cursor;
            }
        }

        return pageIds;
    } catch (error) {
        return [];
    }
}