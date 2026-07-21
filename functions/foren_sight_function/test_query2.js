const dotenv = require('dotenv');
const catalyst = require('zcatalyst-sdk-node');
dotenv.config();

const app = catalyst.initialize({ project_id: process.env.CATALYST_PROJECT_ID });

async function run() {
  const zcql = app.zcql();
  try {
    const res = await zcql.executeZCQLQuery("SELECT * FROM Complainant LIMIT 1");
    console.log("Complainant keys:", Object.keys(res[0].Complainant));
    console.log("Complainant row:", JSON.stringify(res[0].Complainant, null, 2));
  } catch(e) { console.error("Complainant:", e.message); }
}
run();
