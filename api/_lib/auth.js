function adminAuth(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

module.exports = adminAuth;
