require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const morgan = require('morgan');

const app = express();
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_DURATION) });
const PORT = process.env.PORT || 3000;

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr'));

const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
    next();
};

const limiter = rateLimit({
    windowMs: 60 * 1000, 
    max: parseInt(process.env.RATE_LIMIT), 
    message: 'Too many requests, please try again later.',
    statusCode: 429,
    headers: true,
});

app.use('/proxy', authenticate);  
app.use('/proxy', limiter);

app.get('/proxy', async (req, res) => {
  const cacheKey = req.originalUrl;

  if (cache.has(cacheKey)) {
    console.log('Serving from cache');
    return res.json(cache.get(cacheKey));
  }

  try {
    const response = await axios.get(`${process.env.API_URL}`);

    cache.set(cacheKey, response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from API:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from external API' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
