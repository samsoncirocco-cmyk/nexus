const { buildContext } = require('./dist/index.js');

async function main() {
  console.log('Fetching context...');
  try {
    const context = await buildContext({
      emailCount: 3,
      taskCount: 3,
      analysisCount: 2
    });
    console.log('Context snapshot:', JSON.stringify(context, null, 2));
  } catch (err) {
    console.error('Error fetching context:', err);
  }
}

main();
