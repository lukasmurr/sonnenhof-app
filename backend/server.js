const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors()); // Erlaubt Zugriff von deiner Angular Domain

// Verbindung zum Postfix-Container (im gleichen Docker-Netzwerk)
const transporter = nodemailer.createTransport({
    host: 'postfix-relay', // Name des Containers im Stack
    port: 25,
    secure: false,
    tls: { rejectUnauthorized: false }
});

const buildSystemMailHeaders = () => ({
    'Auto-Submitted': 'auto-generated',
    'X-Auto-Response-Suppress': 'All',
    Precedence: 'bulk'
});

const orderNotificationRecipients = [
    'direktverkauf@bauernshop.de'
];

const wrapMailHtml = (content) => `<div style="font-size: 20px; line-height: 1; font-family: Arial, sans-serif;">${content}</div>`;

const buildOrderMetaTableHtml = (rows) => {
    const rowsHtml = rows
        .map(({ label, value }) => `
            <tr>
                <td style="padding: 6px 8px 6px 0; vertical-align: top; width: 130px; white-space: nowrap; font-size: 22px;"><strong>${label}</strong></td>
                <td style="padding: 6px 0; vertical-align: top; font-size: 22px;">${value}</td>
            </tr>
        `)
        .join('');

    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%;">
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
};

const buildOrderItemsTableHtml = (items) => {
    const rowsHtml = items
        .map(item => `
            <tr>
                <td style="padding: 6px 8px 6px 0; vertical-align: top; font-size: 22px;">${item.productName}</td>
                <td style="padding: 6px 0; vertical-align: top; white-space: nowrap; font-size: 22px;">${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}</td>
            </tr>
        `)
        .join('');

    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; margin-top: 4px;">
            <thead>
                <tr>
                    <th align="left" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #ddd; font-size: 22px;">Produkt</th>
                    <th align="left" style="padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 22px;">Menge</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
};

const formatDateForGermanMail = (value) => {
    if (!value) {
        return '-';
    }

    // Keep date-only values timezone-agnostic to avoid off-by-one day shifts in mails.
    const asString = String(value);
    const match = asString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const [, year, month, day] = match;
        const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        const weekdayIndex = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
        return `${weekdayNames[weekdayIndex]}, ${day}.${month}.${year}`;
    }

    const parsed = new Date(asString);
    if (Number.isNaN(parsed.getTime())) {
        return asString;
    }

    return parsed.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Berlin'
    });
};

app.post('/api/mail/account-created', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: email,
        subject: 'Ihr Account wurde erstellt',
        headers: buildSystemMailHeaders(),
        text: `Hallo ${name || 'User'},\n\nDein Account für die Sonnenhof App wurde erstellt.\n\nDein initiales Passwort lautet: ${password}\n\nBitte ändere dieses Passwort nach dem ersten Login.\n\nViele Grüße,\nDein Sonnenhof Team`,
        html: wrapMailHtml(`<p>Hallo ${name || 'User'},</p><p>Dein Account für die Sonnenhof App wurde erstellt.</p><p>Dein initiales Passwort lautet: <strong>${password}</strong></p><p>Bitte ändere dieses Passwort nach dem ersten Login.</p><p>Viele Grüße,<br>Dein Sonnenhof Team</p>`)
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.post('/api/mail/order-created', async (req, res) => {
    const {
        customerName,
        customerEmail,
        customerPhone,
        market,
        orderDate,
        orderNumber,
        items
    } = req.body;

    if (!customerName || !market || !orderDate || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const formattedDate = formatDateForGermanMail(orderDate);
    const itemsText = items
        .map(item => `- ${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}`)
        .join('\n');
    const orderMetaHtml = buildOrderMetaTableHtml([
        { label: 'Datum:', value: formattedDate },
        { label: 'Markt:', value: market },
        { label: 'Kunde:', value: customerName },
        { label: 'E-Mail:', value: customerEmail || '-' },
        { label: 'Telefon:', value: customerPhone || '-' },
        { label: 'Bestell-Nr.:', value: orderNumber || '-' }
    ]);
    const orderItemsTableHtml = buildOrderItemsTableHtml(items);

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: orderNotificationRecipients,
        subject: `Neue Bestellung: ${customerName} (${market})`,
        headers: buildSystemMailHeaders(),
        text: `Es wurde eine neue Bestellung angelegt.\n\nKunde: ${customerName}\nE-Mail: ${customerEmail || '-'}\nTelefon: ${customerPhone || '-'}\nMarkt: ${market}\nDatum: ${formattedDate}\nBestell-Nr.: ${orderNumber || '-'}\n\nPositionen:\n${itemsText}`,
        html: wrapMailHtml(`<p style="margin: 0 0 14px 0;">Es wurde eine neue Bestellung angelegt.</p>${orderMetaHtml}<p style="margin: 16px 0 6px 0;"><strong>Positionen:</strong></p>${orderItemsTableHtml}`)
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Order email sent successfully' });
    } catch (error) {
        console.error('Error sending order email:', error);
        res.status(500).json({ error: 'Failed to send order email' });
    }
});

app.post('/api/mail/order-updated', async (req, res) => {
    const {
        customerName,
        customerEmail,
        customerPhone,
        market,
        orderDate,
        orderNumber,
        items
    } = req.body;

    if (!customerName || !market || !orderDate || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const formattedDate = formatDateForGermanMail(orderDate);
    const itemsText = items
        .map(item => `- ${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}`)
        .join('\n');
    const orderMetaHtml = buildOrderMetaTableHtml([
        { label: 'Datum:', value: formattedDate },
        { label: 'Markt:', value: market },
        { label: 'Kunde:', value: customerName },
        { label: 'E-Mail:', value: customerEmail || '-' },
        { label: 'Telefon:', value: customerPhone || '-' },
        { label: 'Bestell-Nr.:', value: orderNumber || '-' }
    ]);
    const orderItemsTableHtml = buildOrderItemsTableHtml(items);

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: orderNotificationRecipients,
        subject: `Bestellung aktualisiert: ${customerName} (${market})`,
        headers: buildSystemMailHeaders(),
        text: `Eine bestehende Bestellung wurde aktualisiert.\n\nKunde: ${customerName}\nE-Mail: ${customerEmail || '-'}\nTelefon: ${customerPhone || '-'}\nMarkt: ${market}\nDatum: ${formattedDate}\nBestell-Nr.: ${orderNumber || '-'}\n\nPositionen:\n${itemsText}`,
        html: wrapMailHtml(`<p style="margin: 0 0 14px 0;"><strong>Hinweis:</strong> Eine bestehende Bestellung wurde <strong>aktualisiert</strong>.</p>${orderMetaHtml}<p style="margin: 16px 0 6px 0;"><strong>Positionen:</strong></p>${orderItemsTableHtml}`)
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Order update email sent successfully' });
    } catch (error) {
        console.error('Error sending order update email:', error);
        res.status(500).json({ error: 'Failed to send order update email' });
    }
});

app.post('/api/mail/order-deleted', async (req, res) => {
    const {
        customerName,
        customerEmail,
        customerPhone,
        market,
        orderDate,
        orderNumber,
        items
    } = req.body;

    if (!customerName || !market || !orderDate || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const formattedDate = formatDateForGermanMail(orderDate);
    const itemsText = items
        .map(item => `- ${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}`)
        .join('\n');
    const orderMetaHtml = buildOrderMetaTableHtml([
        { label: 'Datum:', value: formattedDate },
        { label: 'Markt:', value: market },
        { label: 'Kunde:', value: customerName },
        { label: 'E-Mail:', value: customerEmail || '-' },
        { label: 'Telefon:', value: customerPhone || '-' },
        { label: 'Bestell-Nr.:', value: orderNumber || '-' }
    ]);
    const orderItemsTableHtml = buildOrderItemsTableHtml(items);

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: orderNotificationRecipients,
        subject: `Bestellung gelöscht: ${customerName} (${market})`,
        headers: buildSystemMailHeaders(),
        text: `Eine bestehende Bestellung wurde gelöscht.\n\nKunde: ${customerName}\nE-Mail: ${customerEmail || '-'}\nTelefon: ${customerPhone || '-'}\nMarkt: ${market}\nDatum: ${formattedDate}\nBestell-Nr.: ${orderNumber || '-'}\n\nPositionen:\n${itemsText}`,
        html: wrapMailHtml(`<p style="margin: 0 0 14px 0;"><strong>Hinweis:</strong> Eine bestehende Bestellung wurde <strong>gelöscht</strong>.</p>${orderMetaHtml}<p style="margin: 16px 0 6px 0;"><strong>Positionen:</strong></p>${orderItemsTableHtml}`)
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Order delete email sent successfully' });
    } catch (error) {
        console.error('Error sending order delete email:', error);
        res.status(500).json({ error: 'Failed to send order delete email' });
    }
});

app.post('/api/mail/tuev-reminder', async (req, res) => {
    const {
        vehicleName,
        licensePlate,
        nextTuevDate,
        reminderType
    } = req.body;

    if (!vehicleName || !licensePlate || !nextTuevDate || !reminderType) {
        return res.status(400).json({ error: 'Invalid tuev reminder data' });
    }

    const formattedDate = new Date(nextTuevDate).toLocaleDateString('de-DE');
    const reminderTypeTextMap = {
        'three-months-before': '3 Monate vor Ablauf',
        'one-month-before': '1 Monat vor Ablauf',
        'on-expiry': 'am Ablauftag',
        'one-month-after': '1 Monat nach Ablauf'
    };

    const reminderTypeText = reminderTypeTextMap[reminderType] || reminderType;

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: 'info@bauernshop.de',
        subject: `TÜV Erinnerung (${reminderTypeText}): ${vehicleName} (${licensePlate})`,
        text: `TÜV-Erinnerung\n\nFahrzeug: ${vehicleName}\nKennzeichen: ${licensePlate}\nTÜV-Ablaufdatum: ${formattedDate}\nErinnerung: ${reminderTypeText}`,
        html: wrapMailHtml(`<p><strong>TÜV-Erinnerung</strong></p><p><strong>Fahrzeug:</strong> ${vehicleName}<br><strong>Kennzeichen:</strong> ${licensePlate}<br><strong>TÜV-Ablaufdatum:</strong> ${formattedDate}<br><strong>Erinnerung:</strong> ${reminderTypeText}</p>`)
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Tuev reminder email sent successfully' });
    } catch (error) {
        console.error('Error sending tuev reminder email:', error);
        res.status(500).json({ error: 'Failed to send tuev reminder email' });
    }
});

app.listen(3000, () => console.log('API listening on 3000'));
