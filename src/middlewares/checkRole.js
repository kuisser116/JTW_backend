// Middleware para verificar el rol del usuario
function checkRole(...allowedRoles) {
    return (req, res, next) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: "Acceso denegado: no tienes el rol adecuado para acceder a esta ruta, actualmente tienes el rol: " + req.user.role,
          user: req.user,
        });
      }
      next();
    };
  }
  
module.exports = { checkRole };