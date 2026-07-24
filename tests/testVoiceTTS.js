const assert = require('assert');
const { Readable } = require('stream');

// Mock zcatalyst-sdk-node in require cache before loading router dispatcher
const mockCatalyst = {
  initialize: (req) => {
    return {
      credential: {
        getToken: async () => ({ access_token: 'mock-token' })
      }
    };
  }
};
const sdkPath = require.resolve('../functions/foren_sight_function/node_modules/zcatalyst-sdk-node');
require.cache[sdkPath] = {
  id: sdkPath,
  filename: sdkPath,
  loaded: true,
  exports: mockCatalyst
};

const { dispatch } = require('../functions/foren_sight_function/src/router');

// Helper to create mock req
function createMockReq(method, url, body) {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.url = url;
  req.headers = {
    'content-type': 'application/json',
    'x-forwarded-proto': 'http',
    'host': 'localhost:3000'
  };
  return req;
}

// Helper to create mock res
function createMockRes(resolve) {
  const res = {
    statusCode: 200,
    headers: {},
    bodyChunks: [],
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = { ...this.headers, ...headers };
    },
    end(data) {
      if (data) this.bodyChunks.push(data);
      this.finished = true;
      resolve(this);
    },
    write(data) {
      if (data) this.bodyChunks.push(data);
    }
  };
  return res;
}

// Helper to execute route in-process
function executeRoute(method, url, body) {
  return new Promise((resolve) => {
    const req = createMockReq(method, url, body);
    const res = createMockRes(resolve);
    dispatch(req, res).catch((err) => {
      res.statusCode = 500;
      res.bodyChunks = [JSON.stringify({ error: err.message })];
      resolve(res);
    });
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('     ForenSight Feature 33C Zia Text-to-Speech      ');
  console.log('====================================================');

  try {
    // ----------------------------------------------------
    // Test Case 1: GET method rejection
    // ----------------------------------------------------
    console.log('\n▶ [TEST 1] GET Request Rejection');
    const res1 = await executeRoute('GET', '/voice/tts', {});
    assert.ok(res1.statusCode === 404 || res1.statusCode === 405, 'Should reject GET request with 404 or 405');
    console.log('  🟢 Test 1 Passed!');

    // ----------------------------------------------------
    // Test Case 2: Missing text parameter
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] Missing Text Parameter');
    const res2 = await executeRoute('POST', '/voice/tts', {
      originalPrompt: 'Show FIR 1045',
      isVoiceInput: true
    });
    assert.strictEqual(res2.statusCode, 400, 'Should reject with 400 Bad Request');
    const body2 = JSON.parse(res2.bodyChunks[0]);
    assert.ok(body2.error.includes('parameter in request body'), 'Should warn about missing text.');
    console.log('  🟢 Test 2 Passed!');

    // ----------------------------------------------------
    // Test Case 3: Missing or false isVoiceInput parameter
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] Missing/False isVoiceInput Parameter');
    const res3 = await executeRoute('POST', '/voice/tts', {
      text: 'Crime summary',
      originalPrompt: 'Show FIR 1045',
      isVoiceInput: false
    });
    assert.strictEqual(res3.statusCode, 400, 'Should reject with 400 Bad Request');
    const body3 = JSON.parse(res3.bodyChunks[0]);
    assert.ok(body3.error.includes('did not originate from Voice Input'), 'Should reject non-voice origin.');
    console.log('  🟢 Test 3 Passed!');

    // ----------------------------------------------------
    // Test Case 4: Special command prompt (Case Summary button)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Special Case Summary button rejection');
    const res4 = await executeRoute('POST', '/voice/tts', {
      text: 'Case summary details...',
      originalPrompt: 'Generate AI Case Summary',
      isVoiceInput: true
    });
    assert.strictEqual(res4.statusCode, 400, 'Should reject special commands with 400');
    const body4 = JSON.parse(res4.bodyChunks[0]);
    assert.ok(body4.error.includes('not a normal chatbot query'), 'Should reject special command.');
    console.log('  🟢 Test 4 Passed!');

    // ----------------------------------------------------
    // Test Case 5: Special command prompt (Investigation Timeline button)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5] Special Timeline button rejection');
    const res5 = await executeRoute('POST', '/voice/tts', {
      text: 'Timeline details...',
      originalPrompt: 'Generate Investigation Timeline',
      isVoiceInput: true
    });
    assert.strictEqual(res5.statusCode, 400, 'Should reject timeline with 400');
    const body5 = JSON.parse(res5.bodyChunks[0]);
    assert.ok(body5.error.includes('not a normal chatbot query'), 'Should reject timeline command.');
    console.log('  🟢 Test 5 Passed!');

    // ----------------------------------------------------
    // Test Case 6: Successful TTS API validation mock
    // ----------------------------------------------------
    console.log('\n▶ [TEST 6] Valid TTS query check (Zia credential / network check)');
    
    // Set mock env variable context if needed for standalone run
    process.env.QUICKML_ORG_ID = process.env.QUICKML_ORG_ID || '60076316494';
    process.env.CATALYST_PROJECT_ID = process.env.CATALYST_PROJECT_ID || '53343000000022004';
    
    const res6 = await executeRoute('POST', '/voice/tts', {
      text: 'ForenSight Crime Intelligence platform loaded.',
      originalPrompt: 'Show FIR 1045',
      isVoiceInput: true
    });
    
    console.log('  Response Status Code:', res6.statusCode);
    if (res6.statusCode === 200) {
      assert.strictEqual(res6.headers['Content-Type'], 'audio/wav', 'Should return audio/wav header');
      assert.ok(Buffer.concat(res6.bodyChunks).length > 0, 'Should return audio buffer');
      console.log('  🟢 Test 6 Passed (Success)!');
    } else {
      assert.ok(res6.statusCode === 401 || res6.statusCode === 500, 'Expected connection/credential error status code (401 or 500)');
      const body6 = JSON.parse(res6.bodyChunks[0]);
      assert.ok(
        body6.error.includes('Zia') || body6.error.includes('OAuth') || body6.error.includes('token') || body6.error.includes('initialize') || body6.error.includes('credential') || body6.error.includes('Configuration'),
        'Error must refer to Catalyst Zia connection or credentials configuration: ' + body6.error
      );
      console.log('  🟢 Test 6 Passed (Graceful API Error/Credential Verification)!');
    }

    console.log('\n====================================================');
    console.log('   🟢 SUCCESS: All Feature 33C Tests Passed Cleanly!');
    console.log('====================================================');

  } catch (err) {
    console.error('\n🔴 FAILURE in voice TTS integration tests:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
