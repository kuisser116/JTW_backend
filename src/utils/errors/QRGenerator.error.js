const QR_GENERATOR_ERROR_CODES = {
  ERROR_GENERATING_CODE: 500
}

/**
 * Codigo de error mienstras se generaba el codigo QR: 500
*/
class QRGeneratorError extends Error {
  constructor(message, errorCode) {
    super(message);
    errorCode = errorCode;
  }
}

module.exports = { QR_GENERATOR_ERROR_CODES, QRGeneratorError };