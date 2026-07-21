import catalyst from 'zcatalyst-sdk-node';

async function testLookup() {
  try {
    const app = catalyst.initialize();
    
    console.log('--- Fetching ReligionMaster ---');
    let zcql1 = app.zcql();
    let religions = await zcql1.executeZCQLQuery('SELECT ROWID, ReligionID, ReligionName FROM ReligionMaster');
    console.log('ReligionMaster Rows:', JSON.stringify(religions.slice(0, 3), null, 2));

    console.log('\n--- Fetching CasteMaster ---');
    let zcql2 = app.zcql();
    let castes = await zcql2.executeZCQLQuery('SELECT ROWID, caste_master_id, caste_master_name FROM CasteMaster');
    console.log('CasteMaster Rows:', JSON.stringify(castes.slice(0, 3), null, 2));

    console.log('\n--- Fetching ComplainantDetails ---');
    let zcql3 = app.zcql();
    let complainants = await zcql3.executeZCQLQuery('SELECT ROWID, ReligionID, CasteID FROM ComplainantDetails LIMIT 5');
    console.log('ComplainantDetails Rows:', JSON.stringify(complainants, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

testLookup();
