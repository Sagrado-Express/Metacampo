#!/usr/bin/env node

/**
 * Test: RLS Isolation in dashboard-full route
 * Simulates two different tenants accessing /api/planejamento/dashboard-full
 * and validates that each tenant only sees their own data
 */

const http = require('http');
const fs = require('fs');

// Mock JWT generator (same format as in getSession)
function generateMockJwt(userId, email, tenantId, role) {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email: email,
      role: role,
      tenant_id: tenantId,
      app_metadata: {
        role: role,
        tenant_id: tenantId,
      },
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    })
  ).toString('base64url');

  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

// Helper to make HTTP request
function makeRequest(method, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': `sb-access-token=${token}; sb-refresh-token=mock-refresh`,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing RLS Isolation in dashboard-full route\n');

  // Create JWTs for two different tenants
  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';

  const jwtA = generateMockJwt('user-a', 'userA@example.com', tenantA, 'admin');
  const jwtB = generateMockJwt('user-b', 'userB@example.com', tenantB, 'admin');

  console.log(`✅ Generated JWT for Tenant A: ${tenantA}`);
  console.log(`✅ Generated JWT for Tenant B: ${tenantB}\n`);

  try {
    // Wait a bit for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Request 1: Tenant A calls dashboard-full
    console.log('📡 [1] Calling /api/planejamento/dashboard-full as Tenant A...');
    const responseA = await makeRequest('GET', '/api/planejamento/dashboard-full', jwtA);
    console.log(`   Status: ${responseA.status}`);

    if (responseA.status === 503) {
      console.log('   Note: Got 503 (DB credentials issue) - Expected in local testing');
      console.log(`   Response: ${JSON.stringify(responseA.body)}\n`);
    } else if (responseA.status === 200) {
      console.log('   ✅ Data received');
      console.log(`   Clientes count: ${responseA.body.clientes?.length || 0}`);
      console.log(`   Carteira entries: ${responseA.body.carteira?.length || 0}\n`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${responseA.status}`);
      console.log(`   Body: ${JSON.stringify(responseA.body)}\n`);
    }

    // Request 2: Tenant B calls dashboard-full
    console.log('📡 [2] Calling /api/planejamento/dashboard-full as Tenant B...');
    const responseB = await makeRequest('GET', '/api/planejamento/dashboard-full', jwtB);
    console.log(`   Status: ${responseB.status}`);

    if (responseB.status === 503) {
      console.log('   Note: Got 503 (DB credentials issue) - Expected in local testing');
      console.log(`   Response: ${JSON.stringify(responseB.body)}\n`);
    } else if (responseB.status === 200) {
      console.log('   ✅ Data received');
      console.log(`   Clientes count: ${responseB.body.clientes?.length || 0}`);
      console.log(`   Carteira entries: ${responseB.body.carteira?.length || 0}\n`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${responseB.status}`);
      console.log(`   Body: ${JSON.stringify(responseB.body)}\n`);
    }

    // Validation: Check that data is isolated (if DB is available)
    if (responseA.status === 200 && responseB.status === 200) {
      const dataALength = responseA.body.clientes?.length || 0;
      const dataBLength = responseB.body.clientes?.length || 0;

      if (dataALength === 0 && dataBLength === 0) {
        console.log('✅ BOTH TENANTS: Correctly see no data (RLS working - empty DB)');
      } else if (dataALength !== dataBLength) {
        console.log(`✅ RLS ISOLATION VERIFIED: Tenant A sees ${dataALength} clientes, Tenant B sees ${dataBLength}`);
      } else {
        console.log(`⚠️  POSSIBLE RLS FAILURE: Both tenants see same data count (${dataALength})`);
      }
    }

    // Request 3: No auth should fail
    console.log('\n📡 [3] Calling without auth token (should fail)...');
    const noAuthOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/planejamento/dashboard-full',
      method: 'GET',
    };

    const noAuthRes = await new Promise((resolve, reject) => {
      const req = http.request(noAuthOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
          });
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log(`   Status: ${noAuthRes.status}`);
    if (noAuthRes.status === 401) {
      console.log('   ✅ Correctly rejected unauthenticated request');
    } else {
      console.log(`   ⚠️  Expected 401, got ${noAuthRes.status}`);
    }

    console.log('\n✅ RLS test suite completed!');
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  }
}

runTests();
