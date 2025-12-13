const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(express.json());
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

app.listen(3000, () => console.log('API listening on 3000'));
