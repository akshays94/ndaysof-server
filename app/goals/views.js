const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt'); 
const moment = require('moment');

const { check, validationResult } = require('express-validator');

const pool = require('../../db-config.js');

const JWTSECRETKEY = process.env.JWTSECRETKEY;

const verifyToken = require('../../verify-token')


const addExtraParamsInGoalObject = (goal) => {
  return Object.assign(goal, {
      completion_percentage: parseInt( goal.days_completed / goal.days * 100 ),
      current_day_number: goal.days_completed + 1,
      start_date: moment(goal.start_date).format('DD MMMM YYYY'),
      current_day_date: moment(goal.start_date).add(goal.days_completed, 'days').format('DD MMMM YYYY')
    })
}

module.exports = {

  goals (request, response) {

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      const userId = authData.user.id;

      const getGoalsQuery = {
        text: `SELECT * FROM goal 
              WHERE created_by=$1 
              ORDER BY created_on ASC`,
        values: [userId] 
      }
    
      pool
        .query(getGoalsQuery)
        .then(results => {
          let rows = results.rows.map(addExtraParamsInGoalObject)
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
            RETURNING *`,
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
          let row = results.rows[0];
          row = addExtraParamsInGoalObject(row);
          return response
            .status(201)
            .json(row)
        })
        .catch(err => response.status(500).json({ message: `Error createNewGoalQuery: ${err}` }))
        
    })    
  },


  checkADayWithoutDate (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      let { dayNumber } = request.body; 

      dayNumber = parseInt(dayNumber);

      if (dayNumber === NaN) {
        return response.status(422).json({ message: `Invalid day number format` })
      }

      let goalId = request.params.goalId; 
      let userId = authData.user.id;

      const getGoalQuery = {
        text: `SELECT * from goal where id=$1`,
        values: [goalId]
      }

      const isCheckDayExists = {
        text: `SELECT EXISTS 
                (SELECT * from day 
                where goal=$1 and day_no=$2 and is_checked=true)`,
        values: [goalId, dayNumber]  
      }

      const getNewDateQuery = {
        text: `SELECT day_no, day_date, is_checked FROM day 
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

      pool
        .query(getGoalQuery)
        // --- is goal id valid ---
        .then(results => {
          const isGoalExists = results.rows.length > 0;          
          if (isGoalExists) {
            const row = results.rows[0];
            if (dayNumber > row.days)
              return response.status(422).json({ message: `This goal is for ${row.days} day(s)` })  
            return pool.query(isCheckDayExists)  
          }
          else 
            return response.status(404).json({ message: `Goal not found with id:${goalId}` })
        })
        .catch(err => response.status(500).json({ message: `Error isGoalExists: ${err}` }))
        // ------------------------

        // --- is day already checked ---
        .then(results => {
          const isCheckDayExists = results.rows[0]['exists']; 
          if (!isCheckDayExists)
            return pool.query(getNewDateQuery)
          else 
            return response.status(409).json({ message: `Day already checked` })    
        })
        .catch(err => response.status(500).json({ message: `Error isCheckDayExists: ${err}` }))
        // ------------------------------

        // --- get new date query ---
        .then(results => {
          
          if (results.rows.length > 0) {
            
            const row = results.rows[0];
            const dayNo = row.day_no;
            const dayDate = row.day_date;
            const isLastDayChecked = row.is_checked;

            if (isLastDayChecked) {
              if (dayNumber !== dayNo + 1) {
                return response.status(422).json({ message: `Expected day number: ${dayNo + 1}` })
              }              
            } else {
              if (dayNumber !== dayNo) {
                return response.status(422).json({ message: `Expected day number: ${dayNo}` })
              }
            }

            let newDayDate 
              = moment(dayDate, "DD-MM-YYYY")
                  .add(1, 'days')
                  .toDate();            

            const createNewGoalDayQuery = {
              text: `INSERT INTO day
                  (goal, day_no, day_date, is_checked)
                  VALUES ($1, $2, $3, $4) 
                  RETURNING *`,
              values: [goalId, dayNumber, newDayDate, true]
            }

            return Promise.all([
              pool.query(updateGoalInfoQuery), 
              pool.query(createNewGoalDayQuery)          
            ])      

          } else {

            if (dayNumber !== 1) {
              return response.status(422).json({ message: `Expected day number: 1` })
            }

            const getGoalQuery = {
              text: `SELECT start_date from goal 
                      WHERE id=$1`,
              values: [goalId]
            }

            pool
              .query(getGoalQuery)
              .then(results => {
                if (results) {
                  let row = results.rows[0];
                  let newDayDate = row.start_date;
                  
                  const createNewGoalDayQuery = {
                    text: `INSERT INTO day
                        (goal, day_no, day_date, is_checked)
                        VALUES ($1, $2, $3, $4) 
                        RETURNING *`,
                    values: [goalId, dayNumber, newDayDate, true]
                  }

                  return Promise.all([
                    pool.query(updateGoalInfoQuery), 
                    pool.query(createNewGoalDayQuery)          
                  ])
                } else {
                  return response.status(500).json({ message: `Goal not found` })
                }
              })
              .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
          }     

        })
        .catch(err => response.status(500).json({ message: `Error getNewDateQuery: ${err}` }))
        // --------------------------

        // --- goal day creation & update goals ---
        .then(results => {
          pool
            .query(getGoalQuery)
            .then(results => {
              let row = results.rows[0];
              row = addExtraParamsInGoalObject(row);
              return response.status(201).json(row)
            })
            .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
        })
        .catch(err => response.status(500).json({ message: `Error createNewGoalDayQuery: ${err}` }))
        // -------------------------
    })    
  },

  missADayWithoutDate (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      let { dayNumber } = request.body; 

      dayNumber = parseInt(dayNumber);

      if (dayNumber === NaN) {
        return response.status(422).json({ message: `Invalid day number format` })
      }

      let goalId = request.params.goalId; 
      let userId = authData.user.id;

      const getGoalQuery = {
        text: `SELECT * from goal where id=$1`,
        values: [goalId]
      }

      const isCheckDayExists = {
        text: `SELECT EXISTS 
                (SELECT * from day 
                where goal=$1 and day_no=$2 and is_checked=true)`,
        values: [goalId, dayNumber]  
      }

      const getNewDateQuery = {
        text: `SELECT day_no, day_date, is_checked FROM day 
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

      pool
        .query(getGoalQuery)
        // --- is goal id valid ---
        .then(results => {
          const isGoalExists = results.rows.length > 0;          
          if (isGoalExists) {
            const row = results.rows[0];
            if (dayNumber > row.days)
              return response.status(422).json({ message: `This goal is for ${row.days} day(s)` })  
            return pool.query(isCheckDayExists)  
          }
          else 
            return response.status(404).json({ message: `Goal not found with id:${goalId}` })
        })
        .catch(err => response.status(500).json({ message: `Error isGoalExists: ${err}` }))
        // ------------------------

        // --- is day already checked ---
        .then(results => {
          const isCheckDayExists = results.rows[0]['exists']; 
          if (!isCheckDayExists)
            return pool.query(getNewDateQuery)
          else 
            return response.status(409).json({ message: `Day already checked` })    
        })
        .catch(err => response.status(500).json({ message: `Error isCheckDayExists: ${err}` }))
        // ------------------------------

        // --- get new date query ---
        .then(results => {
          
          if (results.rows.length > 0) {
            
            const row = results.rows[0];
            const dayNo = row.day_no;
            const dayDate = row.day_date;
            const isLastDayChecked = row.is_checked;

            if (isLastDayChecked) {
              if (dayNumber !== dayNo + 1) {
                return response.status(422).json({ message: `Expected day number: ${dayNo + 1}` })
              }              
            } else {
              if (dayNumber !== dayNo) {
                return response.status(422).json({ message: `Expected day number: ${dayNo}` })
              }
            }

            let newDayDate 
              = moment(dayDate, "DD-MM-YYYY")
                  .add(1, 'days')
                  .toDate();            

            const createNewGoalDayQuery = {
              text: `INSERT INTO day
                  (goal, day_no, day_date, is_checked)
                  VALUES ($1, $2, $3, $4) 
                  RETURNING *`,
              values: [goalId, dayNumber, newDayDate, false]
            }

            return Promise.all([
              // pool.query(updateGoalInfoQuery), 
              pool.query(createNewGoalDayQuery)          
            ])      

          } else {

            if (dayNumber !== 1) {
              return response.status(422).json({ message: `Expected day number: 1` })
            }

            const getGoalQuery = {
              text: `SELECT start_date from goal 
                      WHERE id=$1`,
              values: [goalId]
            }

            pool
              .query(getGoalQuery)
              .then(results => {
                if (results) {
                  let row = results.rows[0];
                  let newDayDate = row.start_date;
                  
                  const createNewGoalDayQuery = {
                    text: `INSERT INTO day
                        (goal, day_no, day_date, is_checked)
                        VALUES ($1, $2, $3, $4) 
                        RETURNING *`,
                    values: [goalId, dayNumber, newDayDate, false]
                  }

                  return Promise.all([
                    // pool.query(updateGoalInfoQuery), 
                    pool.query(createNewGoalDayQuery)          
                  ])
                } else {
                  return response.status(500).json({ message: `Goal not found` })
                }
              })
              .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
          }     

        })
        .catch(err => response.status(500).json({ message: `Error getNewDateQuery: ${err}` }))
        // --------------------------

        // --- goal day creation & update goals ---
        .then(results => {
          pool
            .query(getGoalQuery)
            .then(results => {
              let row = results.rows[0];
              row = addExtraParamsInGoalObject(row);
              return response.status(201).json(row)
            })
            .catch(err => response.status(500).json({ message: `Error getGoalQuery: ${err}` }))
        })
        .catch(err => response.status(500).json({ message: `Error createNewGoalDayQuery: ${err}` }))
        // -------------------------
    })    
  },

  addContent (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    jwt.verify(request.token, JWTSECRETKEY, (err, authData) => {
      
      if (err) return response.status(401).json({ message: 'Token seems to be invalid' })

      let { content } = request.body; 

      let dayId = request.params.dayId; 
      let userId = authData.user.id;

      const isDayExists = {
        text: `SELECT EXISTS
                (SELECT * FROM day WHERE id=$1)`,
        values: [dayId]
      }

      const updateContentInDayQuery = {
        text: `UPDATE day 
                SET content=$1
                WHERE id=$2`,
        values: [content, dayId]
      }

      pool
        .query(isDayExists)
        .then(results => {
          const isDayExists = results.rows[0]['exists']; 
          if (isDayExists)
            return pool.query(updateContentInDayQuery)
          else 
            return response.status(404).json({ message: `Day not found` })
        })
        .catch(err => response.status(500).json({ message: `Error isDayExists: ${err}` }))

        .then(results => {
          return response.status(200).json()
        })
        .catch(err => response.status(500).json({ message: `Error updateContentInDayQuery: ${err}` }))
    })    
  },

  updateGoal (request, response) {},

  deleteGoal (request, response) {},


}