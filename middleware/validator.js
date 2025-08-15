const { validationResult, check } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const postValidationRules = [
  check('caption').trim().isLength({ max: 2200 }),
  check('location').optional().trim().isLength({ max: 100 })
];