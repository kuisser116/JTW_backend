// Formatea una fecha del formato: DD/MM/YYYYTHH:mm:SS a YYYY/MM/DDTHH:mm:SS (Formato especifico para JS)
function formattDate(value) {
  const indexDateDelimetter = value.indexOf("T");
  const hasTime = indexDateDelimetter >= 0;
  // Extraer la fecha
  const date = value.slice(0, hasTime ? indexDateDelimetter : value.length).split("-");
  const dateFormatted = `${date[2]}-${date[1]}-${date[0]}${hasTime ? value.slice(indexDateDelimetter) : ''}`;
  return dateFormatted;
}


function isDate(opts = {}) {
  const {
    field,
    message = "Valor inválido",
    isOptional = false,
  } = opts;

  return (req, res, next) => {
    const value = req.body[field];
    if (!value && isOptional) {
      return next(); // Si es opcional y no hay valor, pasa al siguiente middleware
    }
    if (!value && !isOptional) {
      return res.status(400).json({ data: `El campo ${field} es requerido`, status: 400 });
    }
    const dateFormatted = formattDate(value);
    if (isNaN(new Date(dateFormatted))) {
      return res.status(400).json({ data: message, status: 400 });
    }
    next(); // Si la fecha es válida, pasa al siguiente middleware
  };
}

function isAfterDate(opts = {}) {
  const { field, date, isOptional = false } = opts;

  return (req, res, next) => {
    const dateToCompare = typeof date === "function" ? date(req) : date;
    const endDate = req.body[field];

    if (isOptional && (!dateToCompare || !endDate)) {
      return next(); // Si es opcional y alguna fecha no existe, pasa al siguiente middleware
    }

    if (!dateToCompare || !endDate) {
      return res.status(400).json({
        data: "Asegúrate de especificar la fecha a comparar y la fecha de fin",
        status: 400,
      });
    }

    const dateToCompareFormatted = formattDate(dateToCompare);
    const endDateFormatted = formattDate(endDate);

    if (new Date(endDateFormatted) <= new Date(dateToCompareFormatted)) {
      return res.status(400).json({
        data: `${field} debe ser una fecha posterior a '${dateToCompare}'. Actualmente tiene un valor de: '${endDate}'`,
        status: 400,
      });
    }

    next(); // Si la fecha es válida, pasa al siguiente middleware
  };
}

module.exports = { isDate, isAfterDate, formattDate };