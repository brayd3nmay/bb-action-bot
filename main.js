import { queryPastDue, queryAssigned, aggregateByInitiative, retrieveInitiativeInfo } from './notionUtils.js';
import { sendEmails } from './emailUtils.js';

(async () => {
    try {
        console.log('main.js running');
        const pastDue = await queryPastDue();
        const assigned = await queryAssigned();
        const initiatives = await aggregateByInitiative(pastDue, assigned);
        const enriched = await retrieveInitiativeInfo(initiatives);

        sendEmails(enriched);
    } catch (error) {
        console.error(error);
    }
})();