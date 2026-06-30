const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL;

if (!API_BASE_URL) {
  console.error('FATAL: API_BASE_URL environment variable is not set');
  process.exit(1);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const owner = { owner: 'Shawon', telegram: '@ShawonXnone' };

app.get('/api/download', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing required parameter: url', ...owner });
    }

    const apiUrl = `${API_BASE_URL}/download/youtube-video`;
    const response = await axios.get(apiUrl, {
      params: { url },
      timeout: 30000,
      responseType: 'stream'
    });

    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Upstream API error',
        status: error.response.status,
        message: error.response.statusText,
        ...owner
      });
    } else if (error.request) {
      res.status(502).json({ error: 'No response from upstream API', ...owner });
    } else {
      res.status(500).json({ error: 'Internal server error', ...owner });
    }
  }
});

app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing required parameter: url', ...owner });
    }

    const apiUrl = `${API_BASE_URL}/download/youtube-video`;
    const upstream = await axios.get(apiUrl, {
      params: { url },
      timeout: 15000
    });

    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('host');
    const downloadUrl = `${protocol}://${host}/api/download?url=${encodeURIComponent(url)}`;

    res.json({
      ...owner,
      download_url: downloadUrl,
      video: upstream.data
    });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Upstream API error',
        status: error.response.status,
        message: error.response.statusText,
        ...owner
      });
    } else if (error.request) {
      res.status(502).json({ error: 'No response from upstream API', ...owner });
    } else {
      res.status(500).json({ error: 'Internal server error', ...owner });
    }
  }
});

app.get('/api', (req, res) => {
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('host');
  res.json({
    ...owner,
    name: 'YouTube Downloader API',
    version: '1.0.0',
    endpoints: {
      download: {
        path: '/api/download',
        method: 'GET',
        params: { url: 'YouTube video URL (required)' },
        description: 'Download a YouTube video/audio stream',
        example: `${protocol}://${host}/api/download?url=https://youtu.be/D8YEkMjNumE`
      },
      info: {
        path: '/api/info',
        method: 'GET',
        params: { url: 'YouTube video URL (required)' },
        description: 'Get video information without downloading',
        example: `${protocol}://${host}/api/info?url=https://youtu.be/D8YEkMjNumE`
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
