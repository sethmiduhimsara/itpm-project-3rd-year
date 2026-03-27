const express = require('express')
const cors = require('cors')
require('dotenv').config()
const connectDB = require('./config/db')
const { seedAdmin } = require('./controllers/authController')
const { protect } = require('./middleware/authMiddleware')

const dns = require('node:dns')
dns.setServers(['1.1.1.1', '8.8.8.8'])

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static('uploads'))

// Connect DB → then seed admin
connectDB()
  .then(() => seedAdmin())
  .catch(err => {
    console.error('❌ DB connection failed:', err.message)
    process.exit(1)
  })

// ── Public routes (no auth needed) ──────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))

// ── Protected routes (must be logged in) ────────────────────────────────────
app.use('/api/posts',         protect, require('./routes/posts'))
app.use('/api/resources',     protect, require('./routes/resources'))
app.use('/api/help-requests', protect, require('./routes/helpRequests'))
app.use('/api/activities',    protect, require('./routes/activities'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
