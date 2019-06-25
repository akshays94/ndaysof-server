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

const authRoutes = require('./routes/auth')
app.use('/auth', authRoutes)

app.listen(3000, () => {
	console.log('Server running!')
})