require('dotenv').config();

const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_KEY });

async function getAllPageIds() {
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
                                'before': new Date().toISOString()
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
                                }
                            ]
                        }
                    ]
                },
            });
            
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