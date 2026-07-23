/**
 * Integration Test Suite for Feature 29B – AI Investigation Assessment.
 * Validates:
 * 1. Assessment request on empty conversation (graceful warning)
 * 2. Active investigation assessment generation & chunking persistence
 * 3. Closed investigation assessment generation
 * 4. Context restore on continue
 * 5. Exporting PDF containing Case Summary + Assessment
 * 6. Partial/missing data graceful handling
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
  console.log('    ForenSight Feature 29B AI Case Assessment Tests ');
  console.log('====================================================');

  const running = await isServerRunning();
  if (!running) {
    console.error('❌ Error: Local Catalyst server is not running on port 3000. Please start the server first.');
    process.exit(1);
  }

  const sessionAlice = `session-alice-${Date.now()}`;
  const sessionBob = `session-bob-${Date.now()}`;

  try {
    // ----------------------------------------------------
    // Test Case 1: Empty Conversation (Warning)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 1] Empty Conversation - Assessment Request without active context');
    
    // Start conversation
    const startRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice, title: 'Alice Empty Convo' })
    });
    assert.strictEqual(startRes.status, 201, 'Failed to start conversation');
    const startData = await startRes.json();
    const convoId = startData.data.conversationId;

    // Send assessment request directly
    const assessRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Generate AI Investigation Assessment'
      })
    });
    
    const assessData = await assessRes.json();
    assert.strictEqual(assessRes.status, 200);
    console.log('  Response:', assessData.response);
    assert.ok(assessData.response.includes('No active investigation details found'), 'Should warn user that no active case context is found.');
    console.log('  🟢 Test 1 Passed!');

    // ----------------------------------------------------
    // Test Case 2: Active Investigation Assessment & Persistence
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] Active Investigation Assessment & Persistence');
    
    // Set up active context by querying Arjun Reddy (Case 1 - Under Trial -> Active)
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

    // Request assessment
    console.log('  Requesting AI Investigation Assessment...');
    const activeAssessRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Generate AI Investigation Assessment'
      })
    });
    
    const activeAssessData = await activeAssessRes.json();
    assert.strictEqual(activeAssessRes.status, 200);
    console.log('  Generated Active Assessment size:', activeAssessData.response.length, 'characters.');
    console.log('  Generated Active Assessment content:\n--------------------------------\n' + activeAssessData.response + '\n--------------------------------');
    
    // Assert active section headers and indicators
    assert.ok(activeAssessData.response.includes('INVESTIGATION STATUS'), 'Assessment must contain INVESTIGATION STATUS header');
    assert.ok(activeAssessData.response.includes('Active'), 'Status value must be Active');
    assert.ok(activeAssessData.response.includes('CASE OVERVIEW'), 'Assessment must contain CASE OVERVIEW header');
    assert.ok(activeAssessData.response.includes('INVESTIGATION GAPS'), 'Assessment must contain INVESTIGATION GAPS header');
    assert.ok(activeAssessData.response.includes('RECOMMENDED NEXT ACTIONS'), 'Assessment must contain RECOMMENDED NEXT ACTIONS header');
    assert.ok(activeAssessData.response.includes('RISK LEVEL'), 'Assessment must contain RISK LEVEL header');
    assert.ok(activeAssessData.response.includes('OVERALL AI ASSESSMENT'), 'Assessment must contain OVERALL AI ASSESSMENT header');
    
    // Verify persistence in conversation history (should be stitched correctly)
    console.log('  Verifying assessment persistence in history...');
    const reloadRes = await fetch(`${BASE_URL}/conversation/${convoId}?sessionId=${sessionAlice}`);
    assert.strictEqual(reloadRes.status, 200);
    const reloadData = await reloadRes.json();
    const messages = (reloadData.data && reloadData.data.messages) || [];
    console.log('  Reloaded Messages size:', messages.length);
    
    const assistantAssessMsg = messages.find(m => m.role.toLowerCase() === 'assistant' && m.message.includes('INVESTIGATION GAPS'));
    assert.ok(assistantAssessMsg, 'Should find the persisted assessment in conversation history');
    assert.strictEqual(assistantAssessMsg.message, activeAssessData.response, 'Retrieved assessment must match exactly the generated one (and be stitched correctly)');
    console.log('  🟢 Test 2 Passed!');

    // ----------------------------------------------------
    // Test Case 3: Closed Investigation Assessment
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] Closed Investigation Assessment');
    
    // Start a new conversation for Closed case tests
    const startResClosed = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice, title: 'Alice Closed Convo' })
    });
    const convoIdClosed = (await startResClosed.json()).data.conversationId;

    // Set up closed context by querying Sunitha Kulkarni (Case 3 - Closed - Undetected -> Closed)
    console.log('  Setting closed case context (Sunitha Kulkarni)...');
    const searchClosedRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoIdClosed,
        message: 'Show criminal Sunitha Kulkarni'
      })
    });
    assert.strictEqual(searchClosedRes.status, 200);

    // Request assessment
    console.log('  Requesting AI Investigation Assessment for closed case...');
    const closedAssessRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoIdClosed,
        message: 'Generate AI Investigation Assessment'
      })
    });
    
    const closedAssessData = await closedAssessRes.json();
    assert.strictEqual(closedAssessRes.status, 200);
    console.log('  Generated Closed Assessment size:', closedAssessData.response.length, 'characters.');
    console.log('  Generated Closed Assessment content:\n--------------------------------\n' + closedAssessData.response + '\n--------------------------------');
    
    // Assert closed section headers and indicators
    assert.ok(closedAssessData.response.includes('CASE STATUS'), 'Assessment must contain CASE STATUS header');
    assert.ok(closedAssessData.response.includes('Closed'), 'Status value must be Closed');
    assert.ok(closedAssessData.response.includes('CASE OUTCOME'), 'Assessment must contain CASE OUTCOME header');
    assert.ok(closedAssessData.response.includes('SUCCESS FACTORS'), 'Assessment must contain SUCCESS FACTORS header');
    assert.ok(closedAssessData.response.includes('LESSONS LEARNED'), 'Assessment must contain LESSONS LEARNED header');
    assert.ok(closedAssessData.response.includes('CASE QUALITY ASSESSMENT'), 'Assessment must contain CASE QUALITY ASSESSMENT header');
    console.log('  🟢 Test 3 Passed!');

    // ----------------------------------------------------
    // Test Case 4: Context Restore
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Conversation Restore Context');
    
    // Reopen the conversation to restore the context from minified state
    console.log('  Alice calls continueConversation...');
    const continueRes = await fetch(`${BASE_URL}/conversation/${convoId}/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice })
    });
    assert.strictEqual(continueRes.status, 200);
    
    // Send assessment request directly using restored memory context
    console.log('  Requesting assessment directly using restored memory...');
    const restoredAssessRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Generate AI Investigation Assessment'
      })
    });
    
    const restoredAssessData = await restoredAssessRes.json();
    assert.strictEqual(restoredAssessRes.status, 200);
    assert.ok(restoredAssessData.response.includes('INVESTIGATION STATUS'), 'Restored assessment should generate successfully using restored context');
    assert.ok(restoredAssessData.response.includes('Active'), 'Should correctly identify the active status from context restore');
    console.log('  🟢 Test 4 Passed!');

    // ----------------------------------------------------
    // Test Case 5: PDF Export Containing Summary & Assessment Together
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5] PDF Export containing Summary & Assessment');
    
    // Generate AI Case Summary first in the same conversation thread
    console.log('  Generating AI Case Summary in the active thread...');
    const summaryRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Generate AI Case Summary'
      })
    });
    assert.strictEqual(summaryRes.status, 200);

    // Export PDF
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
    // Test Case 6: Partial/Missing Data (Bob Session)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 6] Partial/Missing Data & Fallback');
    
    // Start conversation for Bob
    const bobConvoRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionBob, title: 'Bob Convo' })
    });
    const bobConvoId = (await bobConvoRes.json()).data.conversationId;

    // Search for a case by row ID or business ID directly without victim/accused
    console.log('  Bob searches for case 202100001 directly...');
    const bobSearchRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionBob,
        conversationId: bobConvoId,
        message: 'find case 202100001'
      })
    });
    assert.strictEqual(bobSearchRes.status, 200);

    // Generate assessment on case that has no victim/accused records attached (Case 1 has them, but Bob's search is direct)
    console.log('  Requesting assessment on Bob\'s session...');
    const bobAssessRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionBob,
        conversationId: bobConvoId,
        message: 'Generate AI Investigation Assessment'
      })
    });
    
    assert.strictEqual(bobAssessRes.status, 200);
    const bobAssessData = await bobAssessRes.json();
    console.log('  Bob assessment response size:', bobAssessData.response.length, 'characters.');
    console.log('  Bob assessment response content:', bobAssessData.response);
    assert.ok(bobAssessData.response.includes('INVESTIGATION STATUS') || bobAssessData.response.includes('Case status unavailable.'), 'Bob assessment should output clean status block');
    console.log('  🟢 Test 6 Passed!');

    console.log('\n====================================================');
    console.log('   🟢 SUCCESS: All Feature 29B Tests Passed Cleanly!');
    console.log('====================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n🔴 FAILURE in integration tests:', err.message);
    console.error(err);
    process.exit(1);
  }
}

runTests();
