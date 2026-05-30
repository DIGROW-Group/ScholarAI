const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireLower: /[a-z]/,
  requireUpper: /[A-Z]/,
  requireNumber: /\d/,
  requireSymbol: /[^A-Za-z0-9]/
};

const normalizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim();
};

const validateRegister = (req, res, next) => {
  const errors = [];
  const roleAllowList = new Set(['student', 'parent']);

  const email = normalizeString(req.body.email);
  const password = req.body.password;
  const firstName = normalizeString(req.body.firstName);
  const lastName = normalizeString(req.body.lastName);
  const role = normalizeString(req.body.role);
  const grade = normalizeString(req.body.grade);
  const subjects = req.body.subjects;

  if (!email) {
    errors.push('Email is required');
  } else if (typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
    errors.push('Email must be a valid address');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
  } else {
    if (password.length < PASSWORD_POLICY.minLength || password.length > PASSWORD_POLICY.maxLength) {
      errors.push(`Password must be ${PASSWORD_POLICY.minLength}-${PASSWORD_POLICY.maxLength} characters`);
    }
    if (!PASSWORD_POLICY.requireLower.test(password)) {
      errors.push('Password must include a lowercase letter');
    }
    if (!PASSWORD_POLICY.requireUpper.test(password)) {
      errors.push('Password must include an uppercase letter');
    }
    if (!PASSWORD_POLICY.requireNumber.test(password)) {
      errors.push('Password must include a number');
    }
    if (!PASSWORD_POLICY.requireSymbol.test(password)) {
      errors.push('Password must include a symbol');
    }
  }

  if (!firstName) {
    errors.push('First name is required');
  } else if (firstName.length > 100) {
    errors.push('First name is too long');
  }

  if (!lastName) {
    errors.push('Last name is required');
  } else if (lastName.length > 100) {
    errors.push('Last name is too long');
  }

  if (role && !roleAllowList.has(role)) {
    errors.push('Role is invalid');
  }

  if (grade && grade.length > 50) {
    errors.push('Grade is too long');
  }

  if (subjects !== undefined) {
    if (!Array.isArray(subjects)) {
      errors.push('Subjects must be an array');
    } else {
      if (subjects.length > 20) {
        errors.push('Subjects has too many entries');
      }
      subjects.forEach((subject) => {
        if (typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 50) {
          errors.push('Subjects must contain valid strings');
        }
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  req.body.email = email.toLowerCase();
  req.body.firstName = firstName;
  req.body.lastName = lastName;
  if (role) {
    req.body.role = role;
  }
  if (grade) {
    req.body.grade = grade;
  }

  return next();
};

const validateLogin = (req, res, next) => {
  const errors = [];

  const email = normalizeString(req.body.email);
  const password = req.body.password;

  if (!email) {
    errors.push('Email is required');
  } else if (typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
    errors.push('Email must be a valid address');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string' || password.length > PASSWORD_POLICY.maxLength) {
    errors.push('Password is invalid');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  req.body.email = email.toLowerCase();
  return next();
};

module.exports = {
  validateRegister,
  validateLogin,
  PASSWORD_POLICY
};