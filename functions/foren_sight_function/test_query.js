const dotenv = require('dotenv');
const catalyst = require('zcatalyst-sdk-node');
dotenv.config();

const app = catalyst.initialize({ project_id: process.env.CATALYST_PROJECT_ID });

async function run() {
  const zcql = app.zcql();
  try {
    const res = await zcql.executeZCQLQuery("SELECT * FROM Accused LIMIT 1");
    console.log("Accused keys:", Object.keys(res[0].Accused));
  } catch(e) { console.error("Accused:", e.message); }
  try {
    const res = await zcql.executeZCQLQuery("SELECT * FROM Victim LIMIT 1");
    console.log("Victim keys:", Object.keys(res[0].Victim));
  } catch(e) { console.error("Victim:", e.message); }
  try {
    const res = await zcql.executeZCQLQuery("SELECT * FROM CaseMaster LIMIT 1");
    console.log("CaseMaster keys:", Object.keys(res[0].CaseMaster));
  } catch(e) { console.error("CaseMaster:", e.message); }
}
run();
