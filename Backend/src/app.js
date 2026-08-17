const express = require('express');
const aiRoutes = require('./routes/ai.routes');
const authRoutes = require('./routes/auth.routes');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('CodeMind AI Backend is running');
});

// Routes
app.use('/ai', aiRoutes);
app.use('/auth', authRoutes);

module.exports = app;