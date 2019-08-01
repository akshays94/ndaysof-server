const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt'); 
const moment = require('moment');

const { check, validationResult } = require('express-validator');

const pool = require('../../db-config.js');

const JWTSECRETKEY = process.env.JWTSECRETKEY;

const verifyToken = require('../../verify-token')

module.exports = {

  goals (request, response) {

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      const userId = authData.user.id;

      const getGoalsQuery = {
        text: `SELECT * FROM goal 
              WHERE created_by=$1 
              ORDER BY created_on DESC`,
        values: [userId] 
      }
    
      pool
        .query(getGoalsQuery)
        .then(results => {

          let rows = results.rows
            .map(goal => Object.assign(goal, {
              completion_percentage: parseInt( goal.days_completed / goal.days * 100 ),
              current_day_number: goal.days_completed + 1,
              start_date: moment(goal.start_date).format('DD MMMM YYYY'),
              current_day_date: moment(goal.start_date).add(goal.days_completed, 'days').format('DD MMMM YYYY')
            }))

          return response.json(rows)
        })
        .catch(err => response.status(500).json({ message: `Error getGoalsQuery: ${err}` }))
          
    })

  }, 

  getGoal (request, response) {

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      const userId = authData.user.id;
      const goalId = request.params.goalId;

      const getGoalQuery = {
        text: `SELECT * FROM goal 
              WHERE created_by=$1 and id=$2 
              ORDER BY created_on DESC`,
        values: [userId, goalId] 
      }
    
      pool
        .query(getGoalQuery)
        .then(results => {
          // {
          //   "id": 35,
          //   "title": "LeetCode",
          //   "days": 100,
          //   "days_completed": 0,
          //   "start_date": "2019-07-09T00:00:00.000Z",
          //   "created_by": 54,
          //   "created_on": "2019-07-09T09:52:32.449Z",
          //   "modified_on": null
          // }
          let goal = results.rows[0];
          goal = Object.assign(goal, {
            completion_percentage: goal.days_completed/goal.days,
            current_day_number: goal.days_completed + 1,
            start_date: moment(goal.start_date).format('D MMMM YYYY')
          });

          return response.json(goal)
        })
        .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
          
    })

  },

  addGoal (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      let { title, days, startDate } = request.body;

      let userId = authData.user.id;

      startDate = moment(startDate, "DD-MM-YYYY", true);

      if (!startDate.isValid()) {
        return response.status(422).json({ message: 'Invalid start date format' });
      }

      const isGoalAlreadyExistsQuery = {
        text: `SELECT EXISTS
          (SELECT * FROM goal WHERE title=$1 and created_by=$2)`,
        values: [title, userId] 
      }
  
      const createNewGoalQuery = {
        text: `INSERT INTO goal
            (title, days, created_by, start_date)
            VALUES ($1, $2, $3, $4) 
            RETURNING id, title, days, start_date`,
        values: [title, days, userId, startDate]
      }
  
      pool
        .query(isGoalAlreadyExistsQuery)
        .then(results => {
          const isGoalAlreadyExists = results.rows[0]['exists'];
          if (isGoalAlreadyExists) {
            return response.status(409).json({ message: 'Goal with the same name already exists' });
          } else {
            return pool.query(createNewGoalQuery)
          }
        })
        .catch(err => response.status(500).json({ message: `Error isGoalAlreadyExistsQuery: ${err}` }))
  
        .then(results => {
          return response
            .status(201)
            .json({ 
              message: `Goal created`, 
              goal: results.rows[0] 
            })
        })
        .catch(err => response.status(500).json({ message: `Error createNewGoalQuery: ${err}` }))
        
    })    
  },

  checkADay (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      let { goalDayDate, dayNumber } = request.body; 

      dayNumber = parseInt(dayNumber);

      if (dayNumber === NaN) {
        return response.status(422).json({ message: `Invalid day number format` })
      }

      let goalId = request.params.goalId; 
      let userId = authData.user.id;

      goalDayDate = moment(goalDayDate, "DD-MM-YYYY", true);

      if (!goalDayDate.isValid()) {
        return response.status(422).json({ message: 'Invalid goal day date format' });
      }

      goalDayDate = goalDayDate.toDate();

      const isGoalExists = {
        text: `SELECT EXISTS 
                (SELECT * from goal where id=$1)`,
        values: [goalId]
      }

      const isCheckDayExists = {
        text: `SELECT EXISTS 
                (SELECT * from day 
                where goal=$1 and day_date=$2 and day_no=$3 and is_checked=true)`,
        values: [goalId, goalDayDate, dayNumber]  
      }

      const getGoalQuery = {
        text: `SELECT days, days_completed, start_date from goal 
                WHERE id=$1`,
        values: [goalId]
      }

      const createNewGoalDayQuery = {
        text: `INSERT INTO day
            (goal, day_no, day_date, is_checked)
            VALUES ($1, $2, $3, $4)`,
        values: [goalId, dayNumber, goalDayDate, true]
      }

      const updateGoalInfoQuery = {
        text: `UPDATE goal
            SET days_completed=$2, modified_on=current_timestamp 
            WHERE id=$1`,
        values: [goalId, dayNumber]
      }

      pool
        .query(isGoalExists)
        // --- is goal id valid ---
        .then(results => {
          const isGoalExists = results.rows[0]['exists']; 
          if (isGoalExists)
            return pool.query(isCheckDayExists)  
          else 
            return response.status(404).json({ message: `Goal not found with id:${goalId}` })
        })
        .catch(err => response.status(500).json({ message: `Error isGoalExists: ${err}` }))
        // ------------------------

        // --- is day already checked ---
        .then(results => {
          const isCheckDayExists = results.rows[0]['exists']; 
          if (!isCheckDayExists)
            return pool.query(getGoalQuery)
          else 
            return response.status(409).json({ message: `Day already checked` })    
        })
        .catch(err => response.status(500).json({ message: `Error isCheckDayExists: ${err}` }))
        // ------------------------------

        // --- validations ---
        .then(results => {
          const rows = results.rows[0];
          
          const days = rows.days;
          const daysCompleted = rows.days_completed;
          const startDate = rows.start_date;

          if (daysCompleted + 1 !== dayNumber) {
            return response.status(422).json({ message: `dayNumber invalid. Take action for dayNumber ${daysCompleted + 1}` })
          }

          var expectedCurrentDate 
            = moment(startDate, "DD-MM-YYYY")
                .add(dayNumber - 1, 'days')
                .toDate();
          
          if ( moment(expectedCurrentDate).format("YYYY-MM-DD") !== moment(goalDayDate).format("YYYY-MM-DD") ) {
            return response.status(422).json({ message: `Expected date: ${moment(expectedCurrentDate).format('DD-MM-YYYY')}` })
          }
          return Promise.all([
              pool.query(updateGoalInfoQuery), 
              pool.query(createNewGoalDayQuery)          
          ])  
        })
        .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
        // -------------------

        // --- goal day creation & update goals ---
        .then(results => {
          return response
            .status(201)
            .json({ 
              message: `Goal day created` 
            })
        })
        .catch(err => response.status(500).json({ message: `Error createNewGoalDayQuery: ${err}` }))
        // -------------------------
    })    
  },

  missADay (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      let { goalDayDate, dayNumber } = request.body; 

      dayNumber = parseInt(dayNumber);

      if (dayNumber === NaN) {
        return response.status(422).json({ message: `Invalid day number format` })
      }

      let goalId = request.params.goalId; 
      let userId = authData.user.id;

      goalDayDate = moment(goalDayDate, "DD-MM-YYYY", true);

      if (!goalDayDate.isValid()) {
        return response.status(422).json({ message: 'Invalid goal day date format' });
      }

      goalDayDate = goalDayDate.toDate();

      const isGoalExists = {
        text: `SELECT EXISTS 
                (SELECT * from goal where id=$1)`,
        values: [goalId]
      }

      const isCheckDayExists = {
        text: `SELECT EXISTS 
                (SELECT * from day 
                where goal=$1 and day_date=$2 and day_no=$3 and is_checked=$4)`,
        values: [goalId, goalDayDate, dayNumber, true]  
      }

      const getGoalQuery = {
        text: `SELECT days, days_completed, start_date from goal 
                WHERE id=$1`,
        values: [goalId]
      }

      const lastDayDateQuery = {
        text: `SELECT day_date, is_checked FROM day
              WHERE goal=$1 
              ORDER BY created_on DESC 
              LIMIT 1`,
        values: [goalId]      
      }

      const updateGoalInfoQuery = {
        text: `UPDATE goal
            SET days_completed=$2, modified_on=current_timestamp 
            WHERE id=$1`,
        values: [goalId, dayNumber]
      }

      const createNewMissGoalDayQuery = {
        text: `INSERT INTO day
            (goal, day_no, day_date, is_checked)
            VALUES ($1, $2, $3, $4)`,
        values: [goalId, dayNumber, goalDayDate, false]
      }

      pool
        .query(isGoalExists)
        // --- is goal id valid ---
        .then(results => {
          const isGoalExists = results.rows[0]['exists']; 
          if (isGoalExists)
            return pool.query(isCheckDayExists)  
          else 
            return response.status(404).json({ message: `Goal not found with id:${goalId}` })
        })
        .catch(err => response.status(500).json({ message: `Error isGoalExists: ${err}` }))
        // ------------------------

        // --- is day already checked ---
        .then(results => {
          const isCheckDayExists = results.rows[0]['exists']; 
          if (!isCheckDayExists)
            return pool.query(getGoalQuery)
          else 
            return response.status(409).json({ message: `Day already checked` })    
        })
        .catch(err => response.status(500).json({ message: `Error isCheckDayExists: ${err}` }))
        // ------------------------------

        // --- validations ---
        .then(results => {
          const rows = results.rows[0];
          
          const days = rows.days;
          const daysCompleted = rows.days_completed;
          const startDate = rows.start_date;

          if (daysCompleted + 1 !== dayNumber) {
            return response.status(422).json({ message: `dayNumber invalid. Take action for dayNumber ${daysCompleted + 1}` })
          }

          return pool.query(lastDayDateQuery)
          
        })
        .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
        // -------------------
        
        .then(results => {
          const row = results.rows[0];
          let expectedCurrentDate = row.day_date;
          const isChecked = row.is_checked;


          expectedCurrentDate 
            = moment(expectedCurrentDate, "DD-MM-YYYY")
                .add(1, 'days')
                .toDate();

          console.log('isChecked', isChecked)
          console.log('expectedCurrentDate', expectedCurrentDate)

          if ( moment(expectedCurrentDate).format("YYYY-MM-DD") !== moment(goalDayDate).format("YYYY-MM-DD") ) {
            return response.status(422).json({ message: `Expected date: ${moment(expectedCurrentDate).format('DD-MM-YYYY')}` })
          }
          return Promise.all([
              // pool.query(updateGoalInfoQuery), 
              pool.query(createNewMissGoalDayQuery)          
          ])  
        })
        .catch(err => response.status(500).json({ message: `Error lastDayDateQuery: ${err}` }))

        // --- goal day creation & update goals ---
        .then(results => {
          return response
            .status(201)
            .json({ 
              message: `Missed goal day created` 
            })
        })
        .catch(err => response.status(500).json({ message: `Error createNewGoalDayQuery: ${err}` }))
        // -------------------------
    })

  },

  updateGoal (request, response) {},

  deleteGoal (request, response) {},


}