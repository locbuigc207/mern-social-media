const mongoose = require('mongoose');
const { ValidationError } = require('../utils/AppError');

const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid ${paramName}`);
    }
    
    next();
  };
};

module.exports = validateObjectId;