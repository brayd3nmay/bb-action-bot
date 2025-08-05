const { fetchActionItems, aggregateActionItemsByInitiative, enrichInitiatives } = require('./notionUtils');
const { sendEmails } = require('./emailUtils');

(async () => {
    try {
        console.log('main.js running');
        const actionItems = await fetchActionItems();
        const initiatives = await aggregateActionItemsByInitiative(actionItems);
        const enriched = await enrichInitiatives(initiatives);

        sendEmails(enriched);
    } catch (error) {
        console.error(error);
    }
})();