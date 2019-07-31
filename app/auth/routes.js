const express = require('express')
const router = express.Router()

const { check, validationResult } = require('express-validator')

const verifyToken = require('../../verify-token')
const views = require('../../app/auth/views')

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

router.post('/logout', [
    check('loginLogId').exists()
  ], verifyToken, views.logout);

module.exports = router;