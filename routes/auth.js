const express = require('express')
const router = express.Router()

const { check, validationResult } = require('express-validator')

const views = require('../views/auth')

router.post('/register', [
    check('firstname').exists(),
    check('lastname').exists(),
    check('email').exists().isEmail(),
    check('password').exists(),
  ], views.register);

router.post('/login', [
    check('email').exists().isEmail(),
    check('password').exists(),
  ], views.login);

module.exports = router;