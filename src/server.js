'use strict';

const createApp = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`Aku SuperHub listening on http://${HOST}:${PORT}`);
});
