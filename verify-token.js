// === verify token ===
const verifyToken = (request, response, next) => {

  const bearerHeader = request.headers['authorization'];

  if (typeof bearerHeader !== 'undefined') {

    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    request.token = bearerToken;
    next();

  } else {
    response
      .status(403)
      .json({
        message: 'No token'
      })
  }

}
// ====================

module.exports = verifyToken;