const QRCode = require("qrcode");

const generateQRBase64URI = (data) => {
  return new Promise((resolve, reject) => {

    const json = JSON.parse(data);

    const { userId, eventId } = json;
    if(!userId || !eventId) reject("Especifique los dos parametros necesarios para formar el qr: userId y eventId dentro de un objeto");

    const folio = userId.slice(-5) + eventId.slice(-5);

    QRCode.toDataURL(data, (err, url) => {
      if(err) reject(err);
      resolve({ dataURL: url, folio });
    });
  });
}

module.exports = { generateQRBase64URI };