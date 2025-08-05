require('dotenv').config();

const nodemailer = require ('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

async function verifyTransporter() {
    try {
        await transporter.verify();
        console.log('Transporter is ready to send emails');
    } catch (error) {
        console.error(`Transporter verification failed: ${error}`);
        throw error;
    }
}

async function sendEmails(initiatives) {
    await verifyTransporter();

    for (let initiative of initiatives) {
        const initiativeName = initiative.initiative;
        const items = initiative.items;

        for (let lead of initiative.leads) {
            const leadFullName = lead.name;
            const leadEmail = lead.email;

            const textBody = createText(initiativeName, leadFullName, items);
            const htmlBody = createHtml(initiativeName, leadFullName, items);
            
            try {
                const info = await transporter.sendMail({
                    from: `"Business Builders Bot" <${process.env.NODEMAILER_EMAIL}>`,
                    to: leadEmail,
                    cc: process.env.NODEMAILER_CC,
                    subject: 'Late Action Items',
                    text: textBody,
                    html: htmlBody,
                });

                console.log("Message sent:", info.messageId);
            } catch (error) {
                console.error(`Failed to send email to ${leadEmail}`, error);
            }
        }
    }
}

function formatDate(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', options);
}

function calculateDaysOverdue(dueDate) {
    const startOfToday = new Date();
    const startOfDueDate = new Date(dueDate);

    startOfToday.setHours(0, 0, 0, 0);
    startOfDueDate.setHours(0, 0, 0, 0);

    const difference = Math.floor((startOfToday - startOfDueDate) / 86400000); // 86_400_000 milliseconds in a day
    return Math.max(0, difference);
}

function createText(initiative, fullName, pastDueItems) {
    const firstName = fullName.split(" ")[0]; // assuming the first name is well formatted on notion with a 'firstName lastName'
    const itemCount = pastDueItems.length;

    let emailText = `Hi ${firstName},

You and the ${initiative} team have ${itemCount} past due action item${itemCount > 1 ? 's' : ''} that needs your attention:
`;

    pastDueItems.forEach((item) => {
        const daysPastDue = calculateDaysOverdue(item.dueDate);

        emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)
View in Notion: ${item.url}
`;
    });

    emailText += `
Please take action on these items as soon as possible.
    
If you need assistance or want to discuss timeline adjustments, don't hesitate to reach out.
    
Best regards,
Business Builders Bot
    
This is an automated message. Please do not reply to this email.`;

    return emailText;
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}



function createHtml(initiative, fullName, pastDueItems) {
    const firstName = fullName.split(" ")[0]; // assuming the first name is well formatted on notion with a 'firstName lastName'
    const escapedFirstName = escapeHtml(firstName);
    const escapedInitiative = escapeHtml(initiative);
    const itemCount = pastDueItems.length;
    
    // Preheader text
    const preheaderText = `You have ${itemCount} past-due action item${itemCount > 1 ? 's' : ''} for ${escapedInitiative}.`;
    
    // Generate action item cards (table-based for email compatibility)
    const actionItemCards = pastDueItems.map(item => {
        const escapedActionItem = escapeHtml(item.actionItem);
        const escapedStatus = escapeHtml(item.status);
        const daysPastDue = calculateDaysOverdue(item.dueDate);
        const formattedDate = daysPastDue > 0 
            ? `${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)`
            : formatDate(item.dueDate);
        const escapedUrl = escapeHtml(item.url);
        
        // Status badge colors
        let statusBgColor = '#fff2e6';
        let statusTextColor = '#d97706';
        if (item.status.toLowerCase().includes('assigned')) {
            statusBgColor = '#fff2e6';
            statusTextColor = '#d97706';
        } else if (item.status.toLowerCase().includes('in progress')) {
            statusBgColor = '#dcfce7';
            statusTextColor = '#16a34a';
        } else if (item.status.toLowerCase().includes('past due')) {
            statusBgColor = '#fef2f2';
            statusTextColor = '#dc2626';
        }
        
        // Check if overdue for red text
        const isOverdue = formattedDate.includes('overdue');
        const dateColor = isOverdue ? '#dc2626' : '#6b7280';
        
        return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;">
                <tr>
                    <td style="padding: 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.4;">
                                        ${escapedActionItem}
                                    </h3>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 8px;">
                                    <span style="font-size: 14px; color: #374151; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Status: </span>
                                    <span style="padding: 4px 12px; background-color: ${statusBgColor}; color: ${statusTextColor}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">${escapedStatus}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 16px;">
                                    <span style="font-size: 14px; color: #374151; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Due Date: </span>
                                    <span style="font-size: 14px; color: ${dateColor}; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">${formattedDate}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <table role="presentation" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="background-color: #3b82f6; padding: 12px 24px; border-radius: 6px;">
                                                <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                                    View in Notion
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `;
    }).join('');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Past-Due Action Items</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; line-height: 1.5;">
    <!-- Preheader -->
    <div style="display: none; overflow: hidden; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; color: #fff;">
        ${escapeHtml(preheaderText)}
    </div>
    
    <!-- Wrapper Table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Container Table -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <tr>
                        <td style="padding: 40px;">
                            
                            <!-- Warning Alert Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 32px;">
                                <tr>
                                    <td align="center" style="padding: 16px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding-bottom: 8px;">
                                                    <span style="color: #dc2626; font-size: 20px;">⚠️</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center">
                                                    <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #dc2626; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                                        Past Due Action Items
                                                    </h2>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                Hi ${escapedFirstName},
                            </p>
                            
                            <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                You and the ${escapedInitiative} team have <strong>${itemCount} late action item${itemCount > 1 ? 's' : ''}</strong> that needs your attention:
                            </p>
                            
                            <!-- Action Item Cards -->
                            ${actionItemCards}
                            
                            <!-- Additional Text -->
                            <p style="margin: 24px 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                Please take action on these items as soon as possible.
                            </p>
                            
                            <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                If you need assistance or want to discuss timeline adjustments, don't hesitate to reach out.
                            </p>
                            
                            <!-- Sign-off -->
                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                Best regards,
                            </p>
                            <p style="margin: 0 0 32px 0; font-size: 14px; font-weight: 500; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                Business Builders Action Items Bot
                            </p>
                            
                            <!-- Footer -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; margin-top: 24px;">
                                <tr>
                                    <td align="center" style="padding-top: 24px;">
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 400; line-height: 1.4;">
                                            This is an automated message. Please do not reply to this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

module.exports = {
    sendEmails
};