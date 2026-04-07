const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { spawnSync } = require('child_process');
const routes = require('./routes');

dotenv.config();

const ensureDatabaseInitialized = () => {
  if (String(process.env.AUTO_INIT_DB || 'true').toLowerCase() === 'false') {
    return true;
  }

  const initScript = path.join(__dirname, 'db', 'init.js');
  const result = spawnSync(process.execPath, [initScript], {
    env: process.env,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error('Startup aborted: DB initialization failed');
    return false;
  }

  return true;
};

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const port = process.env.PORT || 5000;

if (!ensureDatabaseInitialized()) {
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
