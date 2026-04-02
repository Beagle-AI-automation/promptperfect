#!/usr/bin/env node
/**
 * Test script for the n8n workflow
 * This simulates what the n8n workflow does
 */

const API_URL = 'http://localhost:3000/api/optimize-sync';

async function testWorkflow() {
  console.log('🧪 Testing PromptPerfect n8n Workflow...\n');

  const testPayload = {
    prompt: 'Write a blog post about AI',
    mode: 'better',
    provider: 'gemini',
    version: 'v1'
  };

  console.log('📤 Sending request:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    // Check if fetch is available (Node 18+)
    if (typeof fetch === 'undefined') {
      console.error('❌ fetch is not available in this Node.js version');
      console.log('   You need Node.js 18+ or install node-fetch');
      console.log('   Run: npm install node-fetch');
      console.log('\n💡 Alternative: Test directly in n8n after importing the workflow');
      process.exit(1);
    }

    console.log('🔄 Connecting to PromptPerfect API...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received!\n');
    
    // Extract results (same as n8n Code node)
    const results = {
      original_prompt: data.rawText ? data.rawText.split('---EXPLANATION---')[0].replace(/---SCORE---\d+---/g, '').trim() : '',
      optimized_prompt: data.optimizedText || '',
      explanation: data.explanation || '',
      changes: data.changes || '',
      mode: testPayload.mode,
      provider: data.provider || testPayload.provider,
      model: data.model || ''
    };

    console.log('📊 Extracted Results:');
    console.log('━'.repeat(60));
    console.log(`\n🔤 Original Prompt:\n${results.original_prompt || testPayload.prompt}`);
    console.log(`\n✨ Optimized Prompt:\n${results.optimized_prompt.substring(0, 200)}...`);
    console.log(`\n💡 Explanation:\n${results.explanation.substring(0, 150)}...`);
    if (results.changes) {
      console.log(`\n📝 Changes:\n${results.changes.substring(0, 150)}...`);
    }
    console.log(`\n🏷️  Mode: ${results.mode}`);
    console.log(`🤖 Provider: ${results.provider}`);
    console.log(`📦 Model: ${results.model}`);
    console.log('\n━'.repeat(60));
    console.log('\n🎉 n8n workflow test successful!');
    console.log('\n💡 Next steps:');
    console.log('   1. Import examples/n8n-optimize-prompt.json into n8n');
    console.log('   2. Update the URL in "Set Input Parameters" node');
    console.log('   3. Click "Test workflow" to run it');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.log('   ❌ Cannot connect to PromptPerfect');
      console.log('   → Make sure PromptPerfect is running:');
      console.log('     cd promptperfect');
      console.log('     npm run dev');
      console.log('   → Check that you see "ready" in the terminal');
      console.log('   → Verify http://localhost:3000 is accessible');
    } else if (error.message.includes('500')) {
      console.log('   ❌ Server error - check PromptPerfect logs');
      console.log('   → Verify GOOGLE_API_KEY is set in .env');
      console.log('   → Check terminal running npm run dev for errors');
    } else if (error.message.includes('timeout')) {
      console.log('   ❌ Request timed out');
      console.log('   → API might be slow or stuck');
      console.log('   → Try restarting: Ctrl+C then npm run dev');
    } else {
      console.log('   → Error details:', error.message);
      console.log('   → Check that the API is accessible at', API_URL);
    }
    
    console.log('\n📝 Quick Test:');
    console.log('   Open http://localhost:3000 in your browser');
    console.log('   If it loads, the server is running!');
    console.log('\n💡 You can still use the n8n workflow:');
    console.log('   1. Make sure PromptPerfect is running');
    console.log('   2. Import the workflow into n8n');
    console.log('   3. Test directly in n8n (more reliable)');
    
    process.exit(1);
  }
}

testWorkflow();
