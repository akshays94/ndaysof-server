'use strict'

const cors = require('cors')
const morgan = require('morgan')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()

app.use(morgan('combined'))

app.use(cors())

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (request, response) => {
	response.json({
		message: 'Welcome to NDaysOf API'
	})
})

const authRoutes = require('./app/auth/routes')
const goalRoutes = require('./app/goals/routes')

app.use('/auth', authRoutes)
app.use('/goals', goalRoutes)

module.exports = app;