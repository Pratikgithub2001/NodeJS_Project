// Validate required parameters
export const validateRequiredParams = (requiredParams, requestParams) => {
  const missingParams = [];
  
  for (const param of requiredParams) {
    if (requestParams[param] === undefined || 
        requestParams[param] === null || 
        requestParams[param] === '') {
      missingParams.push(param);
    }
  }
  
  return missingParams;
};

// Validate numeric parameter
export const validateNumeric = (value, paramName, maxLength = null) => {
  const errors = [];
  
  if (value !== undefined && value !== null && value !== '') {
    if (isNaN(value)) {
      errors.push(`${paramName} must be a valid number.`);
    }
    
    if (maxLength && String(value).length > maxLength) {
      errors.push(`${paramName} cannot exceed ${maxLength} digits.`);
    }
  }
  
  return errors;
};