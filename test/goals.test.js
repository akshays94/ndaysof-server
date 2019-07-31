const request = require('supertest');
const app = require('../app');
const pool = require('../db-config.js');


const goalsQuery = { text: `SELECT * from goal` };
    console.log(pool)

pool.connect()
  .then(client => {
    return client
      .query(goalsQuery)
      .then(results => console.log(`results ${results}`))
      .catch(err => console.log(`ERR ${err}`))
  })
  .catch(err => console.log('ERR1', err))

describe('Testing routes', () => {
  
  beforeAll(() => {
  });

  afterAll((done) => {

    // const deleteUsersQuery = { text: `DELETE from users` };
    // const deleteGoalsQuery = { text: `DELETE from goal` };
    // const deleteUserLoginLogQuery = { text: `DELETE from user_login_log` };
    // const deleteDaysQuery = { text: `DELETE from day` };

    // Promise.all([
    //   pool.query(deleteUsersQuery),
    //   pool.query(deleteUserLoginLogQuery),
    //   pool.query(deleteGoalsQuery),
    //   pool.query(deleteDaysQuery)
    // ])
    // .then(results => console.log('Test database cleaned!'))
    // .catch(err => console.log(`Error while cleaning test db: ${err}`))

    // pool.connect()
    //   .then(client => console.log('clinet', client))
    //   .catch(err => console.log('errrrrr', err))

    // const goalsQuery = { text: `SELECT * from goal` };
    // console.log(pool)

    // pool.connect()
    //   .then(client => {
    //     return client
    //       .query(goalsQuery)
    //       .then(results => console.log(`results ${results}`))
    //       .catch(err => console.log(`ERR ${err}`))
    //   })
    //   .catch(err => console.log('ERR1', err))

  });

  it.skip('GET base path', done => {
    // return request(app).get('/')
    //   .then(response => {
    //     expect(response.statusCode).toBe(200);
    //     expect(typeof response.body).toBe('object');
    //     expect(response.body).toHaveProperty('message');
    //     done();
    //   });
  });

});

// http://www.albertgao.xyz/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/
// https://jestjs.io/docs/en/testing-frameworks