const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const validateRequest = (rules) => (req, res, next) => {
  const errors = [];

  for (const rule of rules) {
    const source = rule.in || 'body';
    const container = req[source] || {};
    const rawValue = container[rule.field];
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (rule.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        errors.push(`${rule.field} must be a valid email`);
      }
    }

    if (rule.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
      }
      if (rule.minLength && String(value).length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && String(value).length > rule.maxLength) {
        errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
    }

    if (rule.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors.push(`${rule.field} must be a valid number`);
      } else {
        if (rule.min !== undefined && n < rule.min) {
          errors.push(`${rule.field} must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && n > rule.max) {
          errors.push(`${rule.field} must be <= ${rule.max}`);
        }
      }
    }

    if (rule.type === 'int') {
      const n = Number(value);
      if (!Number.isInteger(n)) {
        errors.push(`${rule.field} must be an integer`);
      } else {
        if (rule.min !== undefined && n < rule.min) {
          errors.push(`${rule.field} must be >= ${rule.min}`);
        }
        if (rule.max !== undefined && n > rule.max) {
          errors.push(`${rule.field} must be <= ${rule.max}`);
        }
      }
    }

    if (rule.type === 'date') {
      if (!isIsoDate(value)) {
        errors.push(`${rule.field} must be in YYYY-MM-DD format`);
      }
    }

    if (rule.type === 'enum' && Array.isArray(rule.values)) {
      if (!rule.values.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.values.join(', ')}`);
      }
    }
  }

  if (errors.length) {
    return res.status(400).json({
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateRequest
};
