import 'dotenv/config';
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


async function addEmail (actionItemPageId, initiativeId, recipientId, recipientEmail, originalDueDate, currentDueDate, category, providerName, providerMessageId) {
    try {
        const data = await supabase
            .from('sent_emails')
            .insert([
                {
                    action_item_page_id: actionItemPageId,
                    initiative_id: initiativeId,
                    recipient_id: recipientId,
                    recipient_email: recipientEmail,
                    original_due_date: originalDueDate,
                    current_due_date: currentDueDate,
                    category: category,
                    provider_name: providerName,
                    provider_message_id: providerMessageId,
                }
            ])
            .select()
    } catch (error) {
        console.error(`Failed to add email for ${} to ${}`);
    }
}