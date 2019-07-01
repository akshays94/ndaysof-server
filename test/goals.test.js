const request = require('supertest');
const app = require('../app');

describe('Testing routes', () => {
  
  test('GET base path', done => {
    
    return request(app).get('/')
      .then(response => {
        expect(response.statusCode).toBe(200);
        done();
      });

  })

})