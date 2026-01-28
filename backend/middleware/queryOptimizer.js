// Database query optimization middleware
const queryOptimizer = (req, res, next) => {
  // Add query optimization helpers to request
  req.optimizeQuery = (query) => {
    // Limit results to prevent memory issues
    if (!query.getOptions().limit) {
      query.limit(100);
    }
    
    // Add lean() for read-only operations
    if (req.method === 'GET') {
      query.lean();
    }
    
    return query;
  };
  
  // Add pagination helper
  req.paginate = (query, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return query.skip(skip).limit(Math.min(limit, 100));
  };
  
  next();
};

module.exports = queryOptimizer;