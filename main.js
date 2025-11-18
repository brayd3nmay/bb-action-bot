import {
    queryPastDue,
    queryAssigned,
    queryDueTomorrow,
    queryTwoDaysPastDue,
    queryFourDaysPastDue,
    aggregateByInitiative,
    retrieveInitiativeInfo
} from './notionUtils.js';
import { sendEmails } from './emailUtils.js';

(async () => {
    try {
        console.log('main.js running');

        // Query all different categories
        const pastDue = await queryPastDue();
        const assigned = await queryAssigned();
        const dueTomorrow = await queryDueTomorrow();
        const twoDaysPastDue = await queryTwoDaysPastDue();
        const fourDaysPastDue = await queryFourDaysPastDue();

        // Aggregate all items by initiative
        const items = {
            assigned,
            dueTomorrow,
            pastDue,
            twoDaysPastDue,
            fourDaysPastDue
        };

        const initiatives = await aggregateByInitiative(items);
        const enriched = await retrieveInitiativeInfo(initiatives);

        await sendEmails(enriched);

        console.log('Email sending completed');
    } catch (error) {
        console.error('Error in main.js:', error);
    }
})();