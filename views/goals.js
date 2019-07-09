const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt'); 
const moment = require('moment');

const { check, validationResult } = require('express-validator');

const pool = require('../db-config.js');

const JWTSECRETKEY = process.env.JWTSECRETKEY;

const verifyToken = require('../verify-token')

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
          let rows = results.rows
            .map(goal => Object.assign(goal, {
              completion_percentage: goal.days_completed/goal.days,
              current_day_number: goal.days_completed + 1,
              start_date: moment().format('D MMMM YYYY')
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

      // let { title, days, userId, startDate } = request.body;
      let { title, days } = request.body;

      // let startDate = moment(startDate, "MM-DD-YYYY", true);
      // if (!startDate.isValid()) {
      //   return response.status(422).json({ message: 'Invalid start date format' });
      // }

      let userId = authData.user.id;
      let startDate = new Date();

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

      let goalId = request.params.goalId; 
      let userId = authData.user.id;

      // create table day(
      //   id serial primary key,
      //   goal integer,
      //   day_no integer default 0,
      //   content text null,
      //   day_date date not null,
      //   is_checked boolean default false,
      //   created_on timestamp default current_timestamp,
      //   foreign key(goal) references goal(id) ON DELETE CASCADE
      // );

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

  updateGoal (request, response) {},

  deleteGoal (request, response) {},

  missADay (request, response) {},

}