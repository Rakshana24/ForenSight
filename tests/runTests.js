/**
 * Master Unit Test Runner.
 * Executes all boundary unit tests synchronously.
 */

const runRepositoryTests = require('./repository/caseRepository.test');
const runServiceTests = require('./service/crimeService.test');
const runControllerTests = require('./controller/crimeController.test');

async function main() {
  console.log('====================================================');
  console.log('   ForenSight Crime Search Module - Test Suite      ');
  console.log('====================================================');

  try {
    await runRepositoryTests();
    console.log('----------------------------------------------------');
    await runServiceTests();
    console.log('----------------------------------------------------');
    await runControllerTests();
    
    console.log('====================================================');
    console.log('   🟢 SUCCESS: All tests passed cleanly!           ');
    console.log('====================================================');
  } catch (error) {
    console.error('====================================================');
    console.error('   🔴 FAILURE: One or more assertions failed.       ');
    console.error('====================================================');
    console.error(error);
    process.exit(1);
  }
}

main();
