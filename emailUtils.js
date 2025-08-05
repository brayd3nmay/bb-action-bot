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
    for (let initiative of initiatives) {
        const initiativeName = initiative.initiative;
        const items = initiative.items;

        for (let lead of initiative.leads) {
            const leadFullName = lead.name;
            const leadEmail = lead.email;

            const textBody = createText(initiativeName, leadFullName, items);
            
            /*(async () => {
                const info = await transporter.sendMail({
                    from: `"Business Builders Bot" <${process.env.NODEMAILER_EMAIL}>`,
                    to: email,
                    cc: process.env.NODEMAILER_CC,
                    subject: 'Late Action Items',
                    text: textBody,
                    html: htmlBody,
                });

                console.log("Message sent:", info.messageId);
            })(); */
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

You and the ${initiative} team have ${itemCount} past due action item${itemCount > 1 ? 's' : ''} that need your attention:
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

module.exports = {
    sendEmails
};