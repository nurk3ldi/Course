const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { initDB } = require('./db');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await initDB();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error(error);
    }
};

startServer();