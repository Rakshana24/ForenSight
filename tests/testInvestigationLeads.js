/**
 * Integration Test Suite for Feature 32A — AI Investigation Lead Recommendation.
 * Validates:
 * 1. Request on empty conversation (graceful warning)
 * 2. Active case leads recommendation (e.g. AI INVESTIGATION LEADS, Priority)
 * 3. Leads persistence in conversation history
 * 4. Conversation restore context and re-query leads
 * 5. PDF export containing investigation leads
 * 6. QuickML failure local fallback check
 * 7. Insufficient details handler (returns 'Insufficient investigation information...')
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000/server/foren_sight_function';

// Helper to check if the local Catalyst server is running
async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

// Helper to count pages in PDF
function getPDFPageCount(buffer) {
  const pdfString = buffer.toString('binary');
  const matches = pdfString.match(/\/Type\s*\/Page\b/g) || [];
  return matches.length;
}

async function runTests() {
  console.log('====================================================');
  console.log('  ForenSight Feature 32A AI Investigation Leads Tests ');
  console.log('====================================================');

  const running = await isServerRunning();
  if (!running) {
    console.error('❌ Error: Local Catalyst server is not running on port 3000. Please start the server first.');
    process.exit(1);
  }

  const sessionAlice = `session-alice-${Date.now()}`;

  try {
    // ----------------------------------------------------
    // Test Case 1: Empty Conversation (Graceful warning)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 1] Empty Conversation - Leads without active context');
    
    // Start conversation
    const startRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice, title: 'Alice Leads Convo' })
    });
    assert.strictEqual(startRes.status, 201, 'Failed to start conversation');
    const startData = await startRes.json();
    const convoId = startData.data.conversationId;

    // Send leads request directly
    const leadsRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Recommend Investigation Leads'
      })
    });
    
    const leadsData = await leadsRes.json();
    assert.strictEqual(leadsRes.status, 200);
    console.log('  Response:', leadsData.response);
    assert.ok(leadsData.response.includes('No active investigation details found'), 'Should warn user that no active case context is found.');
    console.log('  🟢 Test 1 Passed!');

    // ----------------------------------------------------
    // Test Case 2: Active Case & Leads Generation
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] Active Case & Leads Generation');
    
    // Set up active context by querying Arjun Reddy
    console.log('  Setting active case context (Arjun Reddy)...');
    const searchRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Show criminal Arjun Reddy'
      })
    });
    assert.strictEqual(searchRes.status, 200);

    // Request Leads
    console.log('  Requesting AI Investigation Leads...');
    const recommendationsRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Recommend Investigation Leads'
      })
    });

    assert.strictEqual(recommendationsRes.status, 200);
    const recommendationsData = await recommendationsRes.json();
    console.log(`  Leads response size: ${recommendationsData.response.length} characters.`);
    console.log('  Leads Content:\n', recommendationsData.response);

    assert.ok(recommendationsData.response.includes('AI INVESTIGATION LEADS'), 'Must contain AI INVESTIGATION LEADS header');
    assert.ok(recommendationsData.response.includes('Reason'), 'Must contain Reason label');
    assert.ok(recommendationsData.response.includes('Expected Impact'), 'Must contain Expected Impact label');
    assert.ok(recommendationsData.response.includes('Priority'), 'Must contain Priority label');
    assert.ok(recommendationsData.response.includes('OVERALL AI RECOMMENDATION'), 'Must contain OVERALL AI RECOMMENDATION header');
    console.log('  🟢 Test 2 Passed!');

    // ----------------------------------------------------
    // Test Case 3: History & Persistence
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] Verification of Persistence in Conversation History');
    
    const reloadRes = await fetch(`${BASE_URL}/conversation/${convoId}?sessionId=${sessionAlice}`);
    assert.strictEqual(reloadRes.status, 200);
    
    const reloadData = await reloadRes.json();
    const messages = (reloadData.data && reloadData.data.messages) || [];
    const persistedMsg = messages.find(m => m.role.toLowerCase() === 'assistant' && m.message.includes('AI INVESTIGATION LEADS'));
    assert.ok(persistedMsg, 'Investigation Leads response must be saved to history');
    assert.strictEqual(persistedMsg.message, recommendationsData.response, 'Persisted leads must match exact generated response');
    console.log('  🟢 Test 3 Passed!');

    // ----------------------------------------------------
    // Test Case 4: Conversation Restore
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Conversation Restore Context');
    
    console.log('  Restoring session context...');
    const continueRes = await fetch(`${BASE_URL}/conversation/${convoId}/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice })
    });
    assert.strictEqual(continueRes.status, 200);
    
    console.log('  Requesting leads directly using restored memory...');
    const restoredRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Recommend Investigation Leads'
      })
    });
    
    const restoredData = await restoredRes.json();
    assert.strictEqual(restoredRes.status, 200);
    console.log('  Restored Response:', restoredData.response);
    assert.ok(restoredData.response.includes('AI INVESTIGATION LEADS'), 'Restored leads recommender should execute successfully');
    console.log('  🟢 Test 4 Passed!');

    // ----------------------------------------------------
    // Test Case 5: PDF Export Containing Leads
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5] PDF Export containing Investigation Leads');
    
    console.log('  Exporting conversation as PDF...');
    const exportRes = await fetch(`${BASE_URL}/conversation/${convoId}/export/pdf?sessionId=${sessionAlice}`);
    assert.strictEqual(exportRes.status, 200, 'Export failed');
    
    const arrayBuffer = await exportRes.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    assert.strictEqual(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'PDF must start with %PDF- header');
    const pages = getPDFPageCount(pdfBuffer);
    console.log(`  PDF Exported successfully. Size: ${pdfBuffer.length} bytes, Pages: ${pages}`);
    assert.ok(pages > 0, 'PDF must contain pages');
    console.log('  🟢 Test 5 Passed!');

    // ----------------------------------------------------
    // Test Case 6: Local Fallback check
    // ----------------------------------------------------
    console.log('\n▶ [TEST 6] QuickML Failure Local Fallback Check');
    assert.ok(
      recommendationsData.response.includes('[Local Fallback Recommendation]') || 
      recommendationsData.response.includes('Leads are compiled from case characteristics'), 
      'Should trigger local fallback logic formatting successfully.'
    );
    console.log('  🟢 Test 6 Passed!');

    // ----------------------------------------------------
    // Test Case 7: Insufficient Data check
    // ----------------------------------------------------
    console.log('\n▶ [TEST 7] Insufficient Case Details Check');
    
    const sessionBad = `session-bad-${Date.now()}`;
    // Start convo
    const badStartRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionBad, title: 'Bad Convo' })
    });
    const badConvoData = await badStartRes.json();
    const badConvoId = badConvoData.data.conversationId;

    // Request Leads on mock case
    console.log('  Requesting leads on mock case...');
    const badLeadsRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionBad,
        conversationId: badConvoId,
        message: 'Recommend Investigation Leads for mock case 999999'
      })
    });
    const badLeadsData = await badLeadsRes.json();
    console.log('  Bad Case Response:', badLeadsData.response);
    assert.ok(badLeadsData.response.includes('Insufficient investigation information'), 'Should return insufficient info message.');
    console.log('  🟢 Test 7 Passed!');

    console.log('\n====================================================');
    console.log('   🟢 SUCCESS: All Feature 32A Tests Passed Cleanly!');
    console.log('====================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n🔴 FAILURE in integration tests:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
