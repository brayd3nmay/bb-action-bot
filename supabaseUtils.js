import 'dotenv/config';
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function addEmail (actionItemPageId, initiativeId, recipientId, recipientEmail, originalDueDate, currentDueDate, category, providerName, providerMessageId, emailStatus) {
    try {
        const { data, error } = await supabase
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
                    email_status: emailStatus,
                }
            ])
            .select()

        if (error) throw error;

        return data;
    } catch (error) {
        console.error(`Failed to add email for ${actionItemPageId}, ${initiativeId}, ${recipientId}`);
        throw error;
    }
}

async function querySentEmails(actionItemPageId, initiativeId, recipientId) {
    try {
        const { data, error } = await supabase
            .from('sent_emails')
            .select('action_item_page_id, initiative_id, recipient_id, original_due_date, current_due_date, run_date, email_status, category')
            .eq('action_item_page_id', actionItemPageId)
            .eq('initiative_id', initiativeId)
            .eq('recipient_id', recipientId)

        if (error) throw error;

        return data;
    } catch (error) {
        console.error(`Failed to query sent emails for ${actionItemPageId}, ${initiativeId}, ${recipientId}`);
        throw error;
    }
}

export {
    addEmail,
    querySentEmails
};