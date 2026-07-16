/**
 * Unit Test Suite for Feature 13 PDF Export.
 * Mocks the Catalyst SDK/Repository layers to test the service, controller, and pdfGenerator in isolation.
 */

const assert = require('assert');
const ConversationService = require('../functions/foren_sight_function/src/services/conversation.service');
const ConversationController = require('../functions/foren_sight_function/src/controllers/conversation.controller');
const { generatePDF } = require('../functions/foren_sight_function/src/utils/pdfGenerator');

// Simple mock structure
class MockRepository {
  constructor(convoData, messagesData) {
    this.convoData = convoData;
    this.messagesData = messagesData;
  }

  async findConversationById(id) {
    if (this.convoData && String(this.convoData.ROWID) === String(id)) {
      return this.convoData;
    }
    return null;
  }

  async listMessages(id) {
    if (String(id) === '123') {
      return this.messagesData;
    }
    return [];
  }
}

async function runUnitTests() {
  console.log('====================================================');
  console.log('    ForenSight Feature 13 - Isolated Unit Tests      ');
  console.log('====================================================');

  // Test Case 1: PDF Generator compiles layout correctly
  console.log('\n▶ [UNIT TEST 1] PDF Generator compiles layout');
  const mockConvo = {
    conversationId: '123',
    sessionId: 'session-alice',
    title: 'Test Investigation',
    createdTime: '2026-07-16T08:00:00.000Z',
    messages: [
      { role: 'User', message: 'Show criminal Arjun Reddy', timestamp: '2026-07-16T08:01:00.000Z' },
      { role: 'Assistant', message: 'I have retrieved the profile.', timestamp: '2026-07-16T08:02:00.000Z' }
    ]
  };

  const pdfBuffer = await generatePDF(mockConvo);
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'PDF must start with %PDF-');
  assert.ok(pdfBuffer.length > 500, 'PDF buffer should contain valid PDF structure');
  console.log('✔ [UNIT TEST 1] Passed!');

  const mockApp = {
    zcql: () => ({}),
    datastore: () => ({})
  };

  // Test Case 2: Service layer handles missing conversation (404)
  console.log('\n▶ [UNIT TEST 2] Service returns 404 for missing conversation');
  const emptyService = new ConversationService(mockApp);
  emptyService.repository = new MockRepository(null, []);

  try {
    await emptyService.getConversationForExport('999', 'session-alice');
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.strictEqual(error.statusCode, 404, 'Expected status code 404');
    assert.match(error.message, /Conversation not found/, 'Expected conversation not found message');
  }
  console.log('✔ [UNIT TEST 2] Passed!');

  // Test Case 3: Service layer handles deleted conversation (404)
  console.log('\n▶ [UNIT TEST 3] Service returns 404 for deleted conversation');
  const deletedService = new ConversationService(mockApp);
  deletedService.repository = new MockRepository({ ROWID: '123', Status: 'DELETED', SessionID: 'session-alice' }, []);

  try {
    await deletedService.getConversationForExport('123', 'session-alice');
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.strictEqual(error.statusCode, 404, 'Expected status code 404');
    assert.match(error.message, /Conversation not found/, 'Expected conversation not found message');
  }
  console.log('✔ [UNIT TEST 3] Passed!');

  // Test Case 4: Service layer handles unauthorized export (403)
  console.log('\n▶ [UNIT TEST 4] Service returns 403 for unauthorized session');
  const unauthService = new ConversationService(mockApp);
  unauthService.repository = new MockRepository({ ROWID: '123', Status: 'ACTIVE', SessionID: 'session-alice' }, []);

  try {
    await unauthService.getConversationForExport('123', 'session-bob');
    assert.fail('Should have thrown 403 error');
  } catch (error) {
    assert.strictEqual(error.statusCode, 403, 'Expected status code 403');
    assert.match(error.message, /Session does not own/, 'Expected ownership security mismatch message');
  }
  console.log('✔ [UNIT TEST 4] Passed!');

  // Test Case 5: Service layer retrieves messages chronologically
  console.log('\n▶ [UNIT TEST 5] Service retrieves messages correctly');
  const service = new ConversationService(mockApp);
  const mockMessages = [
    { ROWID: 'm1', Role: 'User', Message: 'Hello', MsgTimestamp: '2026-07-16T08:00:00.000Z' },
    { ROWID: 'm2', Role: 'Assistant', Message: 'Hi', MsgTimestamp: '2026-07-16T08:01:00.000Z' }
  ];
  service.repository = new MockRepository({ ROWID: '123', Status: 'ACTIVE', SessionID: 'session-alice', Title: 'Hello Convo', CREATEDTIME: '2026-07-16T07:59:00.000Z' }, mockMessages);

  const data = await service.getConversationForExport('123', 'session-alice');
  assert.strictEqual(data.conversationId, '123');
  assert.strictEqual(data.messages.length, 2);
  assert.strictEqual(data.messages[0].message, 'Hello');
  assert.strictEqual(data.messages[1].message, 'Hi');
  console.log('✔ [UNIT TEST 5] Passed!');

  // Test Case 6: Controller handles success flow and headers
  console.log('\n▶ [UNIT TEST 6] Controller handleExportConversationPDF success flow');
  const controller = new ConversationController();
  controller.getService = () => ({
    getConversationForExport: async () => ({
      conversationId: '123',
      sessionId: 'session-alice',
      title: 'Hello Convo',
      createdTime: '2026-07-16T07:59:00.000Z',
      messages: mockMessages
    })
  });

  let writeHeadStatus = null;
  let writeHeadHeaders = null;
  let responseBuffer = null;

  const mockReq = {
    url: 'http://localhost:3000/server/foren_sight_function/conversation/123/export/pdf?sessionId=session-alice',
    params: { conversationId: '123' }
  };

  const mockRes = {
    writeHead: (status, headers) => {
      writeHeadStatus = status;
      writeHeadHeaders = headers;
    },
    end: (buffer) => {
      responseBuffer = buffer;
    }
  };

  await controller.handleExportConversationPDF(mockReq, mockRes);
  assert.strictEqual(writeHeadStatus, 200, 'Controller response should be 200');
  assert.strictEqual(writeHeadHeaders['Content-Type'], 'application/pdf', 'Content-Type header mismatch');
  assert.match(writeHeadHeaders['Content-Disposition'], /attachment; filename="Conversation_123.pdf"/, 'Content-Disposition mismatch');
  assert.strictEqual(responseBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'Controller response buffer not valid PDF');
  console.log('✔ [UNIT TEST 6] Passed!');

  console.log('\n====================================================');
  console.log('   🟢 SUCCESS: All Feature 13 Unit Tests Passed!     ');
  console.log('====================================================');
}

runUnitTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
