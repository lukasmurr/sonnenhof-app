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

app.post('/api/mail/account-created', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: email,
        subject: 'Ihr Account wurde erstellt',
        text: `Hallo ${name || 'User'},\n\nDein Account für die Sonnenhof App wurde erstellt.\n\nDein initiales Passwort lautet: ${password}\n\nBitte ändere dieses Passwort nach dem ersten Login.\n\nViele Grüße,\nDein Sonnenhof Team`,
        html: `<p>Hallo ${name || 'User'},</p><p>Dein Account für die Sonnenhof App wurde erstellt.</p><p>Dein initiales Passwort lautet: <strong>${password}</strong></p><p>Bitte ändere dieses Passwort nach dem ersten Login.</p><p>Viele Grüße,<br>Dein Sonnenhof Team</p>`
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
        items,
        pdfFileName,
        pdfBase64
    } = req.body;

    if (!customerName || !market || !orderDate || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const formattedDate = new Date(orderDate).toLocaleDateString('de-DE');
    const itemsText = items
        .map(item => `- ${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}`)
        .join('\n');
    const itemsHtml = items
        .map(item => `<li>${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}</li>`)
        .join('');

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: 'direktverkauf@bauernshop.de',
        subject: `Neue Bestellung: ${customerName} (${market})`,
        text: `Es wurde eine neue Bestellung angelegt.\n\nKunde: ${customerName}\nE-Mail: ${customerEmail || '-'}\nTelefon: ${customerPhone || '-'}\nMarkt: ${market}\nDatum: ${formattedDate}\n\nPositionen:\n${itemsText}`,
        html: `<p>Es wurde eine neue Bestellung angelegt.</p><p><strong>Kunde:</strong> ${customerName}<br><strong>E-Mail:</strong> ${customerEmail || '-'}<br><strong>Telefon:</strong> ${customerPhone || '-'}<br><strong>Markt:</strong> ${market}<br><strong>Datum:</strong> ${formattedDate}</p><p><strong>Positionen:</strong></p><ul>${itemsHtml}</ul>`,
        attachments: pdfBase64 ? [{
            filename: pdfFileName || 'Bestellung.pdf',
            content: pdfBase64,
            encoding: 'base64',
            contentType: 'application/pdf'
        }] : []
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
        items,
        pdfFileName,
        pdfBase64
    } = req.body;

    if (!customerName || !market || !orderDate || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const formattedDate = new Date(orderDate).toLocaleDateString('de-DE');
    const itemsText = items
        .map(item => `- ${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}`)
        .join('\n');
    const itemsHtml = items
        .map(item => `<li>${item.productName}: ${item.quantity} ${item.unit}${item.notes ? ` (${item.notes})` : ''}</li>`)
        .join('');

    const mailOptions = {
        from: '"Sonnenhof App" <noreply@sonnenhof-app.de>',
        to: 'direktverkauf@bauernshop.de',
        subject: `Bestellung aktualisiert: ${customerName} (${market})`,
        text: `Eine bestehende Bestellung wurde aktualisiert.\n\nKunde: ${customerName}\nE-Mail: ${customerEmail || '-'}\nTelefon: ${customerPhone || '-'}\nMarkt: ${market}\nDatum: ${formattedDate}\n\nPositionen:\n${itemsText}`,
        html: `<p><strong>Hinweis:</strong> Eine bestehende Bestellung wurde <strong>aktualisiert</strong>.</p><p><strong>Kunde:</strong> ${customerName}<br><strong>E-Mail:</strong> ${customerEmail || '-'}<br><strong>Telefon:</strong> ${customerPhone || '-'}<br><strong>Markt:</strong> ${market}<br><strong>Datum:</strong> ${formattedDate}</p><p><strong>Positionen:</strong></p><ul>${itemsHtml}</ul>`,
        attachments: pdfBase64 ? [{
            filename: pdfFileName || 'Bestellung_Update.pdf',
            content: pdfBase64,
            encoding: 'base64',
            contentType: 'application/pdf'
        }] : []
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Order update email sent successfully' });
    } catch (error) {
        console.error('Error sending order update email:', error);
        res.status(500).json({ error: 'Failed to send order update email' });
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
        to: 'direktverkauf@bauernshop.de',
        subject: `TÜV Erinnerung (${reminderTypeText}): ${vehicleName} (${licensePlate})`,
        text: `TÜV-Erinnerung\n\nFahrzeug: ${vehicleName}\nKennzeichen: ${licensePlate}\nTÜV-Ablaufdatum: ${formattedDate}\nErinnerung: ${reminderTypeText}`,
        html: `<p><strong>TÜV-Erinnerung</strong></p><p><strong>Fahrzeug:</strong> ${vehicleName}<br><strong>Kennzeichen:</strong> ${licensePlate}<br><strong>TÜV-Ablaufdatum:</strong> ${formattedDate}<br><strong>Erinnerung:</strong> ${reminderTypeText}</p>`
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
