import 'dotenv/config';
import { Resend } from 'resend';
import { addEmail, querySentEmails } from './supabaseUtils.js';

const resend = new Resend(process.env.RESEND_KEY);

async function sendEmails(initiatives) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

    for (let initiative of initiatives) {
        const initiativeName = initiative.initiative;
        const initiativeId = initiative.id;
        const items = initiative.items;

        for (let lead of initiative.leads) {
            const leadFullName = lead.name;
            const leadEmail = lead.email;
            const leadId = lead.id;

            // Collect all items that need to be sent for this lead
            const digestItems = {
                assigned: [],
                dueTomorrow: [],
                pastDue: [],
                twoDaysPastDue: [],
                fourDaysPastDue: []
            };

            // Check each category and filter out items already sent today
            for (let category of Object.keys(digestItems)) {
                for (let item of items[category]) {
                    const sentEmails = await querySentEmails(item.pageId, initiativeId, leadId);

                    // Check if we already sent an email today for this item, initiative, and recipient
                    const alreadySentToday = sentEmails.some(email => {
                        const emailDate = new Date(email.run_date).toLocaleDateString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
                        return emailDate === today;
                    });

                    if (!alreadySentToday) {
                        digestItems[category].push(item);
                    }
                }
            }

            // Determine the highest priority notification type and recipients
            const emailConfig = determineEmailConfig(digestItems, leadEmail);

            if (!emailConfig) {
                continue; // No items to send
            }

            // Create email content
            const textBody = createText(initiativeName, leadFullName, digestItems, emailConfig.type);
            const htmlBody = createHtml(initiativeName, leadFullName, digestItems, emailConfig.type);

            try {
                const info = await resend.emails.send({
                    from: 'Business Builders Bot <bot@bbosu.org>',
                    to: emailConfig.to,
                    cc: emailConfig.cc,
                    subject: emailConfig.subject,
                    text: textBody,
                    html: htmlBody,
                });

                console.log("Message sent:", info);

                // Track all items sent in this digest email
                for (let category of Object.keys(digestItems)) {
                    for (let item of digestItems[category]) {
                        await addEmail(
                            item.pageId,
                            initiativeId,
                            leadId,
                            leadEmail,
                            item.dueDate,
                            item.dueDate,
                            category,
                            'resend',
                            info.id,
                            'sent'
                        );
                    }
                }

                // wait 500ms so we don't hit resend rate limit
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Failed to send email to ${leadEmail}`, error);

                // wait 500ms so we don't hit resend rate limit
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
}

function determineEmailConfig(digestItems, leadEmail) {
    // Priority order: fourDaysPastDue > twoDaysPastDue > pastDue > dueTomorrow > assigned

    if (digestItems.fourDaysPastDue.length > 0) {
        return {
            type: 'fourDaysPastDue',
            to: [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2],
            cc: [],
            subject: 'Critical: Team is 4+ Days Late on Action Items'
        };
    }

    if (digestItems.twoDaysPastDue.length > 0) {
        return {
            type: 'twoDaysPastDue',
            to: leadEmail,
            cc: [process.env.PREZ_EMAIL, process.env.VP_EMAIL],
            subject: 'Action Items Update - Attention Required'
        };
    }

    const totalItems = digestItems.assigned.length + digestItems.dueTomorrow.length + digestItems.pastDue.length;

    if (totalItems === 0) {
        return null;
    }

    return {
        type: 'digest',
        to: leadEmail,
        cc: [],
        subject: 'Action Items Update'
    };
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

    const difference = Math.floor((startOfToday - startOfDueDate) / 86400000);
    return Math.max(0, difference);
}

function createText(initiative, fullName, digestItems, emailType) {
    const firstName = fullName.split(" ")[0];

    if (emailType === 'fourDaysPastDue') {
        const itemCount = digestItems.fourDaysPastDue.length;
        let emailText = `CRITICAL ALERT

The ${initiative} team has ${itemCount} action item${itemCount > 1 ? 's' : ''} that ${itemCount > 1 ? 'are' : 'is'} 4 or more days past due:
`;

        digestItems.fourDaysPastDue.forEach((item) => {
            const daysPastDue = calculateDaysOverdue(item.dueDate);
            emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)
View in Notion: ${item.url}
`;
        });

        emailText += `
This team requires immediate intervention.

Best regards,
Business Builders Bot

This is an automated message. Please do not reply to this email.`;

        return emailText;
    }

    if (emailType === 'twoDaysPastDue') {
        let emailText = `Hi ${firstName},

This is an important notice regarding your action items for the ${initiative} team.
`;

        if (digestItems.twoDaysPastDue.length > 0) {
            emailText += `
ITEMS NOW 2 DAYS PAST DUE (Leadership has been notified):
`;
            digestItems.twoDaysPastDue.forEach((item) => {
                const daysPastDue = calculateDaysOverdue(item.dueDate);
                emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)
View in Notion: ${item.url}
`;
            });
        }

        if (digestItems.pastDue.length > 0) {
            emailText += `
PAST DUE ITEMS:
`;
            digestItems.pastDue.forEach((item) => {
                const daysPastDue = calculateDaysOverdue(item.dueDate);
                emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)
View in Notion: ${item.url}
`;
            });
        }

        emailText += `
Please prioritize these items immediately.

If you need assistance or want to discuss timeline adjustments, don't hesitate to reach out.

Best regards,
Business Builders Bot

This is an automated message. Please do not reply to this email.`;

        return emailText;
    }

    // Regular digest email
    let emailText = `Hi ${firstName},

Here's your action items update for the ${initiative} team:
`;

    if (digestItems.assigned.length > 0) {
        emailText += `
NEWLY ASSIGNED ITEMS:
`;
        digestItems.assigned.forEach((item) => {
            emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)}
View in Notion: ${item.url}
`;
        });
    }

    if (digestItems.dueTomorrow.length > 0) {
        emailText += `
DUE TOMORROW:
`;
        digestItems.dueTomorrow.forEach((item) => {
            emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)}
View in Notion: ${item.url}
`;
        });
    }

    if (digestItems.pastDue.length > 0) {
        emailText += `
PAST DUE:
`;
        digestItems.pastDue.forEach((item) => {
            const daysPastDue = calculateDaysOverdue(item.dueDate);
            emailText += `
${item.actionItem}
Status: ${item.status}
Due Date: ${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)
View in Notion: ${item.url}
`;
        });
    }

    emailText += `
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

function createHtml(initiative, fullName, digestItems, emailType) {
    const firstName = fullName.split(" ")[0];
    const escapedFirstName = escapeHtml(firstName);
    const escapedInitiative = escapeHtml(initiative);

    if (emailType === 'fourDaysPastDue') {
        const itemCount = digestItems.fourDaysPastDue.length;
        const preheaderText = `CRITICAL: ${itemCount} action item${itemCount > 1 ? 's' : ''} ${itemCount > 1 ? 'are' : 'is'} 4+ days past due for ${escapedInitiative}.`;

        const actionItemCards = digestItems.fourDaysPastDue.map(item => createItemCard(item, true)).join('');

        return createEmailTemplate(
            preheaderText,
            'CRITICAL ALERT',
            '#ef4444',
            `<div style="margin: 0 0 32px 0;">
                <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 6px; margin-bottom: 16px;">
                    <span style="font-size: 12px; font-weight: 600; color: #ef4444; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">Critical</span>
                </div>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                    The <strong style="color: #0f172a;">${escapedInitiative}</strong> team has ${itemCount} action item${itemCount > 1 ? 's' : ''} that ${itemCount > 1 ? 'are' : 'is'} 4+ days past due.
                </p>
            </div>`,
            actionItemCards,
            `<p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                This team requires immediate intervention.
            </p>`
        );
    }

    if (emailType === 'twoDaysPastDue') {
        const preheaderText = `Important notice: Action items for ${escapedInitiative} require immediate attention.`;

        let sections = `<div style="margin: 0 0 32px 0;">
            <p style="margin: 0 0 8px 0; font-size: 15px; line-height: 1.6; color: #0f172a; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                Hi ${escapedFirstName},
            </p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                Important updates for <strong style="color: #0f172a;">${escapedInitiative}</strong>
            </p>
        </div>`;

        if (digestItems.twoDaysPastDue.length > 0) {
            sections += `<div style="margin: 0 0 24px 0;">
                <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 6px; margin-bottom: 20px;">
                    <span style="font-size: 11px; font-weight: 600; color: #ef4444; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">2 Days Past Due — Leadership Notified</span>
                </div>
            </div>`;
            sections += digestItems.twoDaysPastDue.map(item => createItemCard(item, true)).join('');
        }

        if (digestItems.pastDue.length > 0) {
            sections += `<div style="margin: 32px 0 24px 0;">
                <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 6px; margin-bottom: 20px;">
                    <span style="font-size: 11px; font-weight: 600; color: #ef4444; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">Past Due</span>
                </div>
            </div>`;
            sections += digestItems.pastDue.map(item => createItemCard(item, true)).join('');
        }

        return createEmailTemplate(
            preheaderText,
            'Action Items - Attention Required',
            '#ef4444',
            sections,
            '',
            `<p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                Please prioritize these items immediately. Reach out if you need support.
            </p>`
        );
    }

    // Regular digest
    const totalItems = digestItems.assigned.length + digestItems.dueTomorrow.length + digestItems.pastDue.length;
    const preheaderText = `You have ${totalItems} action item${totalItems > 1 ? 's' : ''} for ${escapedInitiative}.`;

    let sections = `<div style="margin: 0 0 32px 0;">
        <p style="margin: 0 0 8px 0; font-size: 15px; line-height: 1.6; color: #0f172a; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            Hi ${escapedFirstName},
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            Here's your update for <strong style="color: #0f172a;">${escapedInitiative}</strong>
        </p>
    </div>`;

    if (digestItems.assigned.length > 0) {
        sections += `<div style="margin: 0 0 24px 0;">
            <div style="display: inline-block; padding: 6px 12px; background-color: #f0f9ff; border-radius: 6px; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: 600; color: #0284c7; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">Newly Assigned</span>
            </div>
        </div>`;
        sections += digestItems.assigned.map(item => createItemCard(item, false)).join('');
    }

    if (digestItems.dueTomorrow.length > 0) {
        sections += `<div style="margin: 32px 0 24px 0;">
            <div style="display: inline-block; padding: 6px 12px; background-color: #fef3c7; border-radius: 6px; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: 600; color: #d97706; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">Due Tomorrow</span>
            </div>
        </div>`;
        sections += digestItems.dueTomorrow.map(item => createItemCard(item, false)).join('');
    }

    if (digestItems.pastDue.length > 0) {
        sections += `<div style="margin: 32px 0 24px 0;">
            <div style="display: inline-block; padding: 6px 12px; background-color: #fef2f2; border-radius: 6px; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: 600; color: #ef4444; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">Past Due</span>
            </div>
        </div>`;
        sections += digestItems.pastDue.map(item => createItemCard(item, true)).join('');
    }

    return createEmailTemplate(
        preheaderText,
        'Action Items Update',
        '#0284c7',
        sections,
        '',
        `<p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            Questions? Reach out anytime.
        </p>`
    );
}

function createItemCard(item, isPastDue) {
    const escapedActionItem = escapeHtml(item.actionItem);
    const escapedStatus = escapeHtml(item.status);
    const daysPastDue = calculateDaysOverdue(item.dueDate);
    const formattedDate = daysPastDue > 0
        ? `${formatDate(item.dueDate)} (${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue)`
        : formatDate(item.dueDate);
    const escapedUrl = escapeHtml(item.url);

    let statusColor = '#f59e0b';
    if (item.status.toLowerCase().includes('in progress')) {
        statusColor = '#10b981';
    } else if (item.status.toLowerCase().includes('past due')) {
        statusColor = '#ef4444';
    }

    const dateColor = isPastDue ? '#ef4444' : '#6b7280';

    return `
        <tr>
            <td style="padding: 0 0 24px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 0 0 12px 0;">
                            <div style="font-size: 16px; font-weight: 500; color: #0f172a; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
                                ${escapedActionItem}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 0 4px 0;">
                            <span style="display: inline-block; width: 3px; height: 3px; background-color: ${statusColor}; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                            <span style="font-size: 13px; color: #64748b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${escapedStatus}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 0 12px 0;">
                            <span style="font-size: 13px; color: ${dateColor}; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${formattedDate}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <a href="${escapedUrl}" style="display: inline-block; color: #0f172a; text-decoration: none; font-size: 13px; font-weight: 500; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-bottom: 1px solid #0f172a; padding-bottom: 1px;">
                                View →
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;
}

function createEmailTemplate(preheaderText, alertTitle, alertColor, contentBefore, actionItemCards, contentAfter) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(alertTitle)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <div style="display: none; overflow: hidden; line-height: 1px; max-height: 0; max-width: 0; opacity: 0;">
        ${escapeHtml(preheaderText)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 48px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
                    <tr>
                        <td style="padding: 0;">

                            <!-- Brand -->
                            <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; font-style: italic; color: #0f172a; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; letter-spacing: -0.02em;">
                                builders.
                            </h1>

                            <!-- Subtle divider -->
                            <div style="height: 1px; background: linear-gradient(to right, #e2e8f0 0%, transparent 100%); margin: 0 0 32px 0;"></div>

                            ${contentBefore}

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                ${actionItemCards}
                            </table>

                            ${contentAfter}

                            <!-- Footer -->
                            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                                <p style="margin: 0; font-size: 12px; color: #94a3b8; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
                                    Automated notification — no reply needed
                                </p>
                            </div>
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

export { sendEmails };
