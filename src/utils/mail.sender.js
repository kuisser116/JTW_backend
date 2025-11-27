const nodemailer = require("nodemailer");

function mailSender(opts) {
  const {
    pass,
    service,
    user,
    recipient,
    subject,
    text
  } = opts;

  // Datos del emisor
  const transporter = nodemailer.createTransport({
    service,
    auth: {
      user,
      pass
    }
  });

  // Datos del remitente
  const mailOptions = {
    from: user, // Dirección del remitente
    to: recipient, // Dirección del destinatario
    subject,
    text
  };

  // Enviar el correo
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error al enviar el correo:', error);
    } else {
      console.log(info);
      console.log('Correo enviado:', info.response);
    }
  });
}

module.exports = { mailSender };