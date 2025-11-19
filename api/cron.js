import {
    queryPastDue,
    queryAssigned,
    queryDueTomorrow,
    queryTwoDaysPastDue,
    queryFourDaysPastDue,
    aggregateByInitiative,
    retrieveInitiativeInfo
} from '../notionUtils.js';
import { sendEmails } from '../emailUtils.js';

export default async function handler(req, res) {
    // Verify this is a cron request from Vercel
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Cron job started at', new Date().toISOString());

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

        console.log('Cron job completed successfully at', new Date().toISOString());

        return res.status(200).json({
            success: true,
            message: 'Email sending completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in cron job:', error);
        return res.status(500).json({
            error: 'Cron job failed',
            message: error.message
        });
    }
}
