const express = require('express')
const router = express.Router()

const { check, validationResult } = require('express-validator')

const verifyToken = require('../verify-token')
const views = require('../views/goals')

router.get('/', verifyToken, views.goals);

router.post('/',[
    check('title').exists(),
    check('days').exists().isNumeric(),
    // check('userId').exists().isNumeric(),
    // check('startDate').exists(),
  ], verifyToken, views.addGoal);

router.get('/:goalId', verifyToken, views.getGoal);

router.patch('/:goalId', verifyToken, views.updateGoal);

router.delete('/:goalId', verifyToken, views.deleteGoal);  

router.post('/:goalId/check', verifyToken, views.checkADay);  

router.post('/:goalId/miss', verifyToken, views.missADay);

module.exports = router;