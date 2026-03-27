const jwt = require('jsonwebtoken')
const User = require('../models/User')

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' })

// POST /api/auth/register — students only
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' })
    if (name.trim().length < 2)
      return res.status(400).json({ message: 'Name must be at least 2 characters' })
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const exists = await User.findOne({ email: email.toLowerCase().trim() })
    if (exists) return res.status(400).json({ message: 'Email already registered' })

    const user = await User.create({ name: name.trim(), email, password, role: 'student' })
    const token = generateToken(user._id, user.role)
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// POST /api/auth/login — students and admin
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' })

    const token = generateToken(user._id, user.role)
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// Called on server startup — creates admin account if not exists
exports.seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminEmail || !adminPassword) return

    const exists = await User.findOne({ email: adminEmail.toLowerCase() })
    if (!exists) {
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      })
      console.log('✅ Admin account created')
    } else {
      // Keep admin credentials in sync with .env on every startup.
      exists.name = 'System Admin'
      exists.email = adminEmail
      exists.role = 'admin'
      exists.password = adminPassword
      await exists.save()
      console.log('✅ Admin account ready')
    }
  } catch (err) {
    console.error('Admin seed error:', err.message)
  }
}
