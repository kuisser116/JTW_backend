const { clientDataValidation } = require("../utils/client.data.validation");
const authService = require("../services/auth.service");
const { DataBaseError, DB_ERROR_CODES } = require("../utils/errors/DataBase.error");

exports.register = async (req, res) => {
  // 1. Validación de inputs (Express Validator u otros)
  const validation = clientDataValidation(req);
  if (validation.status === 400) return res.status(400).json(validation);

  try {
    // 2. Llamar al servicio
    await authService.registerUser(req.body);
    
    return res.status(201).json({ 
      data: "Usuario creado con éxito", 
      status: 201 
    });

  } catch (error) {
    console.error("Error en registro:", error);

    // Manejo de errores controlados
    if (error instanceof DataBaseError) {
      // Si es error de duplicado, enviamos 409 (Conflict) o 400
      const statusCode = error.errorCode === DB_ERROR_CODES.DUPLICATED_CONTENT ? 409 : 400;
      return res.status(statusCode).json({ 
        message: error.message, 
        status: statusCode 
      });
    }

    if (error.message === "Rol no válido para registro directo") {
      return res.status(403).json({ message: error.message, status: 403 });
    }

    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    // 1. Llamar al servicio
    const result = await authService.loginUser(email, password);

    if (!result) {
      // Usamos un mensaje genérico por seguridad
      return res.status(401).json({ message: "Credenciales inválidas", status: 401 });
    }

    // 2. Responder
    return res.json({
      token: result.token,
      role: result.user.role,
      user: result.user
    });

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
// ... importaciones anteriores ...

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body; // El frontend enviará { token: "google_id_token..." }

    if (!token) {
      return res.status(400).json({ message: "No se proporcionó el token de Google" });
    }

    const result = await authService.googleLogin(token);

    // Validación de seguridad para Checadores en Web
    // Si el rol es supervisor, el frontend web debería bloquearlo, pero el backend devuelve el token igual.
    // Opcionalmente puedes bloquearlo aquí si sabes que esta API solo la usa la Web.

    return res.json({
      token: result.token,
      role: result.user.role,
      user: result.user
    });

  } catch (error) {
    console.error("Error en Google Login:", error);
    return res.status(500).json({ message: "Error al autenticar con Google" });
  }
};