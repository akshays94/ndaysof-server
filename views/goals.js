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
        text: `SELECT * FROM goal WHERE created_by=$1`,
        values: [userId] 
      }
    
      pool
        .query(getGoalsQuery)
        .then(results => response.json(results.rows))
        .catch(err => response.status(500).json({ message: `Error isGoalAlreadyExistsQuery: ${err}` }))
          
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
  
        .then(results => response.status(201).json({ message: `Goal created`, goal: results.rows[0] }))
        .catch(err => response.status(500).json({ message: `Error createNewGoalQuery: ${err}` }))
        
    })    
  },

  updateGoal (request, response) {},

  deleteGoal (request, response) {},

  checkADay (request, response) {},

  missADay (request, response) {},

}