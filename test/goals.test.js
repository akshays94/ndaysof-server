const request = require('supertest');
const app = require('../app');

describe('Testing routes', () => {
  
  it.only('GET base path', done => {
    return request(app).get('/')
      .then(response => {
        expect(response.statusCode).toBe(200);
        expect(typeof response.body).toBe('object');
        expect(response.body).toHaveProperty('message');
        done();
      });
  });

  it('checks something 1', () => {})

  it('checks something 2', () => {})

});

// http://www.albertgao.xyz/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/
// https://jestjs.io/docs/en/testing-frameworks