const express = require('express')
const router = express.Router()

const { check, validationResult } = require('express-validator')

const verifyToken = require('../../verify-token')
const views = require('../../app/goals/views')

router.get('/', verifyToken, views.goals);

router.post('/',[
    check('title').exists(),
    check('days').exists().isNumeric(),
    check('startDate').exists()
  ], verifyToken, views.addGoal);

router.get('/:goalId', verifyToken, views.getGoal);

router.patch('/:goalId', verifyToken, views.updateGoal);

router.delete('/:goalId', verifyToken, views.deleteGoal);  

router.post('/:goalId/check', [
    check('goalDayDate').exists(),
    check('dayNumber').exists().isNumeric()
  ], verifyToken, views.checkADay);

// router.post('/:goalId/undo-check', [
//     check('goalDayDate').exists(),
//     check('dayNumber').exists().isNumeric()
//   ], verifyToken, views.checkADay);

router.post('/:goalId/miss', [
    check('goalDayDate').exists(),
    check('dayNumber').exists().isNumeric()
  ], verifyToken, views.missADay);

// router.post('/:goalId/undo-miss', [
//     check('goalDayDate').exists(),
//     check('dayNumber').exists().isNumeric()
//   ], verifyToken, views.missADay);

module.exports = router;