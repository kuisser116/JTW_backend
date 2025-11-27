
const DB_ERROR_CODES = {
  UNKNOWN_ERROR: 0,
  DUPLICATED_CONTENT: 11_000,
  RESOURCE_NOT_FOUND: 404,
  BAD_REQUEST: 400,
}

/**
 * Codigo de error para contenido duplicado: 11_000
 * Codigo de error para recursos no encontrados: 404
*/
class DataBaseError extends Error {
  constructor(message, errorCode = DB_ERROR_CODES.UNKNOWN_ERROR) {
    super(message);
    this.errorCode = errorCode;
  }
}

module.exports = { DB_ERROR_CODES, DataBaseError };