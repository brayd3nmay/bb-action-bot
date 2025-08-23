import 'dotenv/config';
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


async function addEmail () {
    try {
        const data = await supabase
            .from('sent_emails')
            .insert([
                {
                    page_id: '',
                    initiative_id: '',
                    recipient_id: '',
                    recipient_email: '',
                    original_due_date: '',
                    current_due_date: '',
                    category: '',
                    provider_name: '',
                    provider_message_id: '',
                }
            ])
            .select()
    } catch (error) {
        console.error(`Failed to add email for ${} to ${}`);
    }
}