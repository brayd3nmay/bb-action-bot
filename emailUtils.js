function createEmail(leadName, initiative) {
    const totalItems = initiative.items.length;
    const itemsWord = totalItems === 1 ? 'item' : 'items';
    const firstName = leadName.split(' ')[0];
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Past Due Action Items</title>
        <style>
            body {
                font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
                line-height: 1.5;
                color: #000000;
                max-width: 600px;
                margin: 0 auto;
                padding: 24px;
                background-color: #ffffff;
            }
            .container {
                background: #ffffff;
                border-radius: 0;
                padding: 0;
                border: none;
            }
            .logo-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9e9e7;
            }
            .logo {
                max-width: 100%;
                width: 100%;
                height: auto;
                margin-bottom: 8px;
            }
            .header {
                text-align: center;
                margin-bottom: 24px;
                padding: 12px 16px;
                background-color: #fdf2f2;
                border: 1px solid #fecaca;
                border-radius: 6px;
            }
            .alert-icon {
                font-size: 20px;
                margin-bottom: 4px;
            }
            .header h1 {
                color: #dc2626;
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                letter-spacing: -0.025em;
            }
            .greeting {
                font-size: 16px;
                color: #000000;
                margin-bottom: 16px;
                font-weight: 400;
            }
            .intro-text {
                font-size: 16px;
                color: #000000;
                margin-bottom: 32px;
                line-height: 1.5;
            }
            .initiative-title {
                color: #000000;
                font-size: 16px;
                font-weight: 600;
                margin: 32px 0 24px 0;
                padding: 12px 16px;
                background-color: #f3f4f6;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
                border: 1px solid #e5e7eb;
            }
            .item {
                margin: 16px 0;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                background-color: #ffffff;
                transition: border-color 0.15s ease;
            }
            .item:hover {
                border-color: #d1d5db;
            }
            .item-title {
                font-weight: 600;
                color: #000000;
                margin-bottom: 12px;
                font-size: 15px;
                line-height: 1.4;
            }
            .item-details {
                font-size: 14px;
                color: #6b7280;
                margin: 8px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .status {
                display: inline-flex;
                align-items: center;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .status-assigned { 
                background-color: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            .status-past-due { 
                background-color: #fee2e2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }
            .status-delegated { 
                background-color: #dbeafe;
                color: #2563eb;
                border: 1px solid #bfdbfe;
            }
            .status-in-progress { 
                background-color: #d1fae5;
                color: #059669;
                border: 1px solid #a7f3d0;
            }
            .due-date {
                font-weight: 500;
                color: #dc2626;
            }
            .action-button {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background-color: #2563eb;
                color: white;
                padding: 10px 16px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 8px 0 0 0;
                font-size: 14px;
                transition: background-color 0.15s ease;
                vertical-align: top;
            }
            .action-button:hover {
                background-color: #1d4ed8;
            }
            .footer {
                margin-top: 48px;
                padding-top: 24px;
                border-top: 1px solid #e9e9e7;
                font-size: 13px;
                color: #9b9a97;
                text-align: center;
                line-height: 1.5;
            }
            .days-overdue {
                font-weight: 500;
                color: #dc2626;
                background-color: #fee2e2;
                padding: 2px 6px;
                border-radius: 4px;
                margin-left: 6px;
                font-size: 12px;
            }
            .closing-text {
                font-size: 16px;
                color: #000000;
                margin: 32px 0 24px 0;
                line-height: 1.5;
            }
            .signature {
                font-size: 16px;
                color: #000000;
                font-weight: 500;
                margin-bottom: 8px;
            }
            
            /* Mobile Optimizations */
            @media only screen and (max-width: 480px) {
                body {
                    padding: 16px;
                }
                .container {
                    padding: 0;
                    border-radius: 0;
                }
                .logo {
                    margin-bottom: 6px;
                }
                .header {
                    padding: 10px 12px;
                    margin-bottom: 20px;
                }
                .alert-icon {
                    font-size: 18px;
                }
                .header h1 {
                    font-size: 16px !important;
                }
                .greeting {
                    font-size: 15px;
                    margin-bottom: 12px;
                }
                .intro-text {
                    font-size: 15px;
                    margin-bottom: 24px;
                }
                .initiative-title {
                    font-size: 15px;
                    padding: 10px 12px;
                    margin: 24px 0 16px 0;
                    flex-direction: column;
                    text-align: center;
                    gap: 6px;
                }
                .item {
                    margin: 12px 0;
                    padding: 16px;
                }
                .item-title {
                    font-size: 14px;
                    margin-bottom: 10px;
                }
                .item-details {
                    font-size: 13px;
                    margin: 6px 0;
                    flex-direction: row;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: nowrap;
                }
                .action-button {
                    display: flex;
                    width: 100%;
                    justify-content: center;
                    padding: 12px 8px;
                    margin: 8px 0 0 0;
                    font-size: 13px;
                    box-sizing: border-box;
                    word-wrap: break-word;
                    text-align: center;
                    max-width: 100%;
                }
                .closing-text {
                    font-size: 15px;
                    margin: 24px 0 16px 0;
                }
                .signature {
                    font-size: 15px;
                }
                .footer {
                    font-size: 12px;
                    margin-top: 32px;
                    padding-top: 16px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Business Builders Logo Header -->
            <div class="logo-header">
                <img src="./assets/business-builders-logo.png" alt="Business Builders" class="logo">
            </div>
            
            <div class="header">
                <div class="alert-icon">⚠️</div>
                <h1>Past Due Action Items</h1>
            </div>

            <p class="greeting">Hi ${firstName},</p>
            
            <p class="intro-text">You and the ${initiative.initiative} team have <strong>${totalItems} late action ${itemsWord}</strong> that need your attention:</p>

            ${initiative.items.map(item => {
                const daysOverdue = Math.floor((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24));
                const statusClass = `status-${item.status.toLowerCase().replace(' ', '-')}`;
                
                return `
                <div class="item">
                    <div class="item-title">${item.actionItem}</div>
                    <div class="item-details">
                        <strong>Status:</strong> <span class="status ${statusClass}">${item.status}</span>
                    </div>
                    <div class="item-details">
                        <strong>Due Date:</strong> <span class="due-date">${new Date(item.dueDate).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        })}</span> <span class="days-overdue">(${daysOverdue} days overdue)</span>
                    </div>
                    <div style="margin-top: 12px; text-align: center; margin-bottom: 0;">
                        <a href="${item.url}" class="action-button">View in Notion</a>
                    </div>
                </div>
                `;
            }).join('')}

            <p class="closing-text">Please take action on these items as soon as possible.</p>
            
            <p class="closing-text">If you need assistance or want to discuss timeline adjustments, don't hesitate to reach out.</p>

            <p class="signature">Best regards,<br>
            <strong>Business Builders Action Items Bot</strong></p>

            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>Generated on ${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</p>
            </div>
        </div>
    </body>
    </html>
    `;
}