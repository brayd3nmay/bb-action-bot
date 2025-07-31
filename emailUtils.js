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
        for (let lead of initiative.leads) {
            const { name, email } = lead;
            
            (async () => {
                const info = await transporter.sendMail({
                    from: `"Business Builders Bot" <${process.env.NODEMAILER_EMAIL}>`,
                    to: lead.email,
                    cc: process.env.NODEMAILER_CC,
                    subject: 'Late Action Items',
                    text: textBody,
                    html: htmlBody,
                });

                console.log("Message sent:", info.messageId);
            })();
        }
    }
}

function getTodaysDate() {
    let date = new Date();

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    date = date.toLocaleDateString('en-US', options);
    return date;
}

function calculateDaysOverdue(dueDate) {
    const startOfToday = new Date();
    const startOfDueDate = new Date(dueDate);

    startOfToday.setHours(0, 0, 0, 0);
    startOfDueDate.setHours(0, 0, 0, 0);

    const difference = Math.floor((startOfToday - startOfDueDate) / 86400000); // 86_400_000 milliseconds in a day
    return Math.max(0, difference);
}