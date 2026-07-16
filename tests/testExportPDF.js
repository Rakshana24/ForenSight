/**
 * Automated Test Suite for Feature 13 – Export Conversation to PDF.
 * Validates endpoint routing, HTTP status codes, PDF formatting, security owner checks,
 * soft-deleted conversation handling, and multi-page page generation.
 */

const { spawn } = require('child_process');
const path = require('path');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000/server/foren_sight_function';

// Helper to check if the local Catalyst server is running on port 3000
async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

// Helper to poll the server until it starts
async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerRunning()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// Helper to count pages in PDFKit output
function getPDFPageCount(buffer) {
  const pdfString = buffer.toString('binary');
  // Match "/Type /Page" or "/Type/Page"
  const matches = pdfString.match(/\/Type\s*\/Page\b/g) || [];
  return matches.length;
}

async function runTests() {
  console.log('====================================================');
  console.log('       ForenSight Feature 13 PDF Export Tests        ');
  console.log('====================================================');

  let serverProcess = null;
  const spawnedServer = !(await isServerRunning());

  if (spawnedServer) {
    console.log('🚀 Local Catalyst server is not running. Starting it now...');
    serverProcess = spawn('catalyst', ['serve'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      stdio: 'inherit'
    });

    const started = await waitForServer();
    if (!started) {
      console.error('❌ Failed to start Catalyst server on port 3000.');
      if (serverProcess) serverProcess.kill('SIGINT');
      process.exit(1);
    }
    console.log('🟢 Local Catalyst server started successfully!');
  } else {
    console.log('ℹ️ Using already running local Catalyst server on port 3000.');
  }

  const sessionAlice = `session-alice-${Date.now()}`;
  const sessionBob = `session-bob-${Date.now()}`;

  try {
    // ----------------------------------------------------
    // Test Case 1: Start Conversation and Export Valid PDF
    // ----------------------------------------------------
    console.log('\n▶ [TEST 1] Start Conversation and Export Valid PDF');
    
    // Start conversation
    const startRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice, title: 'Alice Investigation Report' })
    });
    assert.strictEqual(startRes.status, 201, 'Failed to start conversation');
    const startData = await startRes.json();
    const convoId = startData.data.conversationId;
    console.log(`  Created Conversation ID: ${convoId}`);

    // Send chat message to populate conversation history
    console.log('  Sending chat message...');
    const chatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: convoId,
        message: 'Show criminal Arjun Reddy'
      })
    });
    assert.strictEqual(chatRes.status, 200, 'Chat request failed');
    console.log('  Chat message added.');

    // Export PDF
    console.log('  Exporting conversation as PDF...');
    const exportRes = await fetch(`${BASE_URL}/conversation/${convoId}/export/pdf?sessionId=${sessionAlice}`);
    assert.strictEqual(exportRes.status, 200, 'Export request failed');
    
    // Verify headers
    const contentType = exportRes.headers.get('content-type');
    const contentDisposition = exportRes.headers.get('content-disposition');
    assert.match(contentType, /application\/pdf/, 'Incorrect Content-Type header');
    assert.match(contentDisposition, /attachment; filename="Conversation_/, 'Incorrect Content-Disposition header');
    assert.match(contentDisposition, new RegExp(convoId), 'Filename does not contain conversation ID');

    // Verify PDF Magic Bytes
    const pdfBuffer = Buffer.from(await exportRes.arrayBuffer());
    const magicBytes = pdfBuffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(magicBytes, '%PDF-', 'Buffer is not a valid PDF file');
    
    const pages = getPDFPageCount(pdfBuffer);
    console.log(`  PDF Size: ${pdfBuffer.length} bytes, Pages: ${pages}`);
    assert.ok(pages >= 1, 'PDF must contain at least 1 page');
    console.log('✔ [TEST 1] Passed!');

    // ----------------------------------------------------
    // Test Case 2: Export Empty Conversation (No Messages)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] Export Empty Conversation');
    
    const emptyStartRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice, title: 'Empty Investigation' })
    });
    assert.strictEqual(emptyStartRes.status, 201, 'Failed to start empty conversation');
    const emptyStartData = await emptyStartRes.json();
    const emptyConvoId = emptyStartData.data.conversationId;

    const emptyExportRes = await fetch(`${BASE_URL}/conversation/${emptyConvoId}/export/pdf?sessionId=${sessionAlice}`);
    assert.strictEqual(emptyExportRes.status, 200, 'Empty export request failed');
    
    const emptyPdfBuffer = Buffer.from(await emptyExportRes.arrayBuffer());
    assert.strictEqual(emptyPdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'Empty buffer is not a valid PDF');
    console.log(`  Empty PDF Size: ${emptyPdfBuffer.length} bytes`);
    console.log('✔ [TEST 2] Passed!');

    // ----------------------------------------------------
    // Test Case 3: Unauthorized Export (Security Mismatch)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] Unauthorized Export (Bob trying to export Alice\'s conversation)');
    
    const unauthorizedRes = await fetch(`${BASE_URL}/conversation/${convoId}/export/pdf?sessionId=${sessionBob}`);
    assert.strictEqual(unauthorizedRes.status, 403, 'Expected 403 Forbidden for unauthorized session ID');
    
    const unauthorizedData = await unauthorizedRes.json();
    assert.match(unauthorizedData.error, /Security Mismatch/, 'Expected Security Mismatch error message');
    console.log('✔ [TEST 3] Passed!');

    // ----------------------------------------------------
    // Test Case 4: Export Deleted Conversation
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Export Soft-Deleted Conversation');
    
    // Soft-delete the empty conversation
    const deleteRes = await fetch(`${BASE_URL}/conversation/${emptyConvoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice })
    });
    assert.strictEqual(deleteRes.status, 200, 'Failed to delete conversation');
    console.log(`  Soft-deleted Conversation ID: ${emptyConvoId}`);

    // Try exporting it
    const deletedExportRes = await fetch(`${BASE_URL}/conversation/${emptyConvoId}/export/pdf?sessionId=${sessionAlice}`);
    assert.strictEqual(deletedExportRes.status, 404, 'Expected 404 Not Found for deleted conversation');
    
    const deletedExportData = await deletedExportRes.json();
    assert.match(deletedExportData.error, /Conversation not found/, 'Expected conversation not found error');
    console.log('✔ [TEST 4] Passed!');

    // ----------------------------------------------------
    // Test Case 5: Large Conversation / Multi-page PDF
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5] Export Large Conversation / Multi-page PDF');
    
    const largeStartRes = await fetch(`${BASE_URL}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionAlice, title: 'Large Investigation Record' })
    });
    const largeStartData = await largeStartRes.json();
    const largeConvoId = largeStartData.data.conversationId;

    // Send a very large message (repeating long paragraph to force multiple pages)
    console.log('  Adding very large message to conversation...');
    const longParagraph = 'Investigator notes: The suspect was spotted moving west down Sector 4. They were carrying documents that link them to the case. '.repeat(60);
    const largeChatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionAlice,
        conversationId: largeConvoId,
        message: longParagraph
      })
    });
    assert.strictEqual(largeChatRes.status, 200, 'Large chat request failed');

    // Export PDF and verify page count
    const largeExportRes = await fetch(`${BASE_URL}/conversation/${largeConvoId}/export/pdf?sessionId=${sessionAlice}`);
    assert.strictEqual(largeExportRes.status, 200, 'Large export request failed');
    
    const largePdfBuffer = Buffer.from(await largeExportRes.arrayBuffer());
    const largePages = getPDFPageCount(largePdfBuffer);
    console.log(`  Large PDF Size: ${largePdfBuffer.length} bytes, Pages: ${largePages}`);
    assert.ok(largePages > 1, `Expected multi-page PDF (pages > 1), but got ${largePages} page(s)`);
    console.log('✔ [TEST 5] Passed!');

    console.log('\n====================================================');
    console.log('   🟢 SUCCESS: All Feature 13 Integration Tests Passed! ');
    console.log('====================================================');
  } catch (error) {
    console.error('\n====================================================');
    console.error('   🔴 FAILURE: One or more assertions failed.       ');
    console.error('====================================================');
    console.error(error);
    process.exit(1);
  } finally {
    // Gracefully terminate the spawned local server
    if (serverProcess) {
      console.log('\nStopping spawned local Catalyst server...');
      serverProcess.kill('SIGINT');
    }
  }
}

runTests();
