const dotenv = require('dotenv');
const catalyst = require('zcatalyst-sdk-node');
dotenv.config();

const app = catalyst.initialize({ project_id: process.env.CATALYST_PROJECT_ID });
// using the express app method if it works

async function run() {
  // wait we don't have request here.
}
