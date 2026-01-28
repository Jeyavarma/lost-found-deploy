// API versioning middleware
const apiVersioning = (req, res, next) => {
  // Get version from header or default to v1
  const version = req.get('API-Version') || req.query.version || 'v1';
  
  // Validate version
  const supportedVersions = ['v1'];
  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      supportedVersions,
      requestedVersion: version
    });
  }
  
  // Add version to request
  req.apiVersion = version;
  
  // Add version to response headers
  res.setHeader('API-Version', version);
  res.setHeader('Supported-Versions', supportedVersions.join(', '));
  
  next();
};

// Version-specific route handler
const versionedRoute = (handlers) => {
  return (req, res, next) => {
    const version = req.apiVersion || 'v1';
    const handler = handlers[version];
    
    if (!handler) {
      return res.status(501).json({
        error: `Handler not implemented for version ${version}`
      });
    }
    
    handler(req, res, next);
  };
};

module.exports = { apiVersioning, versionedRoute };