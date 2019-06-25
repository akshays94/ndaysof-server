const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt'); 

const { check, validationResult } = require('express-validator');

const pool = require('../db-config.js');

const SALT_ROUNDS = 10;
const JWTSECRETKEY = process.env.JWTSECRETKEY;

module.exports = {

  register (request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    const { firstname, lastname, email, password } = request.body;

    isEmailAlreadyExistsQuery = {
      text: `SELECT EXISTS
        (SELECT * FROM users WHERE email=$1)`,
      values: [email] 
    }

    pool
      .query(isEmailAlreadyExistsQuery)
      .then(results => {

        const isEmailAlreadyExists = results.rows[0]['exists'];

        if (isEmailAlreadyExists) {
          return response
              .status(500)
              .json({ message: 'Email already exists' });
        } else {

          return bcrypt.hash(password, SALT_ROUNDS)

        }

      })
      .catch(err => response.status(500).json({ message: `Error isEmailAlreadyExistsQuery: ${err}` }))

      .then(hash => {

        createNewUserQuery = {
          text: `INSERT INTO users
              (firstname, lastname, email, password)
              VALUES ($1, $2, $3, $4)`,
          values: [firstname, lastname, email, hash]
        }

        pool
          .query(createNewUserQuery)
          .then(results => 
                response
                  .status(201)
                  .json({
                    message: `User added`
                  }))
          .catch(err => response.status(500).json({ message: `Error createNewUserQuery: ${err}` }))

      })
      .catch(err => response.status(500).json({ message: `Error bcryptHash: ${err}` }))

  },

  login: (request, response) => {

    const errors = validationResult(request);
    if (!errors.isEmpty())
      return response.status(422).json({ errors: errors.array() });

    const { email, password } = request.body;

    console.log(email, password)

    const getUserQuery = {
      text: `SELECT id, firstname, lastname, email, password
          FROM users
          WHERE is_active=true AND email=$1`,
      values: [email]
    }

    pool
      .query(getUserQuery)
      .then(results => {

        const isRowsReturned = results.rows.length > 0;

        if (!isRowsReturned) {
          return response
              .status(401)
              .json({
                message: 'Email ID not found'
              });
        } else {

          const user = results.rows[0];

          const markAllPreviousLoginLogInactiveQuery = {
            text: `UPDATE user_login_log 
                SET is_active=false 
                WHERE user_id=$1`,
            values: [user.id]   
          }

          bcrypt
            .compare(password, user.password)
            .then(result => {

              if (result) {
                
                jwt.sign({ user }, JWTSECRETKEY, (err, token) => {

                  const insertLoginLogQuery = {
                    text: `INSERT INTO user_login_log
                        (user_id, token)
                        VALUES ($1, $2)
                        RETURNING id`,
                    values: [user.id, token]    
                  }

                  pool
                    .query(markAllPreviousLoginLogInactiveQuery)
                    .then(results => 
                    
                        pool.query(insertLoginLogQuery))
                    
                    .catch(err => response.status(500).json({ message: `Error markAllPreviousLoginLogInactiveQuery: ${err}` }))

                    .then(results => 
                        response
                          .json({
                            message: 'Login Successful',
                            token,
                            loginLogId: results.rows[0].id,
                            user: {
                              email: user.email,
                              name: `${user.firstname} ${user.lastname}`,
                              firstname: user.firstname
                            }
                          }))
                    .catch(err => response.status(500).json({ message: `Error insertLoginLogQuery: ${err}` }))

                });

              } else {
                return response.status(401).json({ message: 'Password does not match' })
              }

            })
            .catch(err => response.status(500).json({ message: `Error bcrypt compare: ${err}` }))

        }

      })
      .catch(err => response.status(500).json({ message: `Error getUserQuery: ${err}` }))

  },

}