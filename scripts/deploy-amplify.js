import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline';
import {
  AmplifyClient,
  CreateAppCommand,
  CreateBranchCommand,
  CreateDeploymentCommand,
  StartDeploymentCommand,
  GetAppCommand,
  GetJobCommand,
  ListAppsCommand,
  ListBranchesCommand
} from '@aws-sdk/client-amplify';

const APP_NAME = 'de-fynd-c30';
const BRANCH_NAME = 'main';
let temporaryZipPath;

function promptInput(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function parseAwsCliCredentials() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const credPath = path.join(home, '.aws', 'credentials');
  const confPath = path.join(home, '.aws', 'config');
  const creds = {};

  if (fs.existsSync(credPath)) {
    const lines = fs.readFileSync(credPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('aws_access_key_id')) {
        creds.accessKeyId = trimmed.split('=')[1]?.trim();
      }
      if (trimmed.startsWith('aws_secret_access_key')) {
        creds.secretAccessKey = trimmed.split('=')[1]?.trim();
      }
    }
  }

  if (fs.existsSync(confPath)) {
    const lines = fs.readFileSync(confPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('region')) {
        creds.region = trimmed.split('=')[1]?.trim();
      }
    }
  }

  return creds;
}

async function resolveCredentials() {
  // Check CLI flags: --access-key <key> --secret-key <secret> --region <reg>
  const args = process.argv.slice(2);
  let accessKeyId = '';
  let secretAccessKey = '';
  let region = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--access-key' && args[i + 1]) accessKeyId = args[i + 1];
    if (args[i] === '--secret-key' && args[i + 1]) secretAccessKey = args[i + 1];
    if (args[i] === '--region' && args[i + 1]) region = args[i + 1];
  }

  // Check process.env
  accessKeyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  secretAccessKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  region = region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  // Check .env.aws or .env.local
  if (!accessKeyId || !secretAccessKey) {
    const awsEnv = parseDotEnv(path.resolve(process.cwd(), '.env.aws'));
    const localEnv = parseDotEnv(path.resolve(process.cwd(), '.env.local'));
    accessKeyId = accessKeyId || awsEnv.AWS_ACCESS_KEY_ID || localEnv.AWS_ACCESS_KEY_ID;
    secretAccessKey = secretAccessKey || awsEnv.AWS_SECRET_ACCESS_KEY || localEnv.AWS_SECRET_ACCESS_KEY;
    region = region || awsEnv.AWS_REGION || localEnv.AWS_REGION;
  }

  // Check ~/.aws/credentials
  if (!accessKeyId || !secretAccessKey) {
    const cliCreds = parseAwsCliCredentials();
    accessKeyId = accessKeyId || cliCreds.accessKeyId;
    secretAccessKey = secretAccessKey || cliCreds.secretAccessKey;
    region = region || cliCreds.region;
  }

  // Prompt if still missing
  if (!accessKeyId) {
    accessKeyId = await promptInput('Enter AWS Access Key ID: ');
  }
  if (!secretAccessKey) {
    secretAccessKey = await promptInput('Enter AWS Secret Access Key: ');
  }
  if (!region) {
    const defaultRegion = 'ap-south-1';
    const chosen = await promptInput(`Enter AWS Region [default: ${defaultRegion}]: `);
    region = chosen || defaultRegion;
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials missing. Please provide AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
  }

  return { accessKeyId, secretAccessKey, region };
}

async function main() {
  console.log('\n======================================================');
  console.log('   DE - FYND × NMIMS — AWS Amplify Deployment Engine   ');
  console.log('======================================================\n');

  const { accessKeyId, secretAccessKey, region } = await resolveCredentials();
  console.log(`[1/6] Authenticating with AWS Amplify (Region: ${region})...`);

  const client = new AmplifyClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  // 1. Build production bundle
  console.log('[2/6] Building production web application with Vite...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Package dist/ into a temporary archive without replacing user files.
  console.log('[3/6] Packaging build distribution into zip archive...');
  const zipPath = path.resolve(process.cwd(), `dist.deploy-${process.pid}.zip`);
  temporaryZipPath = zipPath;

  try {
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path dist\\* -DestinationPath '${zipPath}' -Force"`, {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('Failed to create dist.zip via Compress-Archive:', err);
    throw err;
  }

  const zipStats = fs.statSync(zipPath);
  console.log(`   Compressed size: ${(zipStats.size / 1024).toFixed(1)} KB`);

  // 3. Locate or Create Amplify App
  console.log(`[4/6] Connecting to Amplify Application "${APP_NAME}"...`);
  const listAppsRes = await client.send(new ListAppsCommand({ maxResults: 50 }));
  let app = listAppsRes.apps?.find(a => a.name === APP_NAME);

  if (!app) {
    console.log(`   App "${APP_NAME}" not found. Creating new Amplify Web App...`);
    const createAppRes = await client.send(new CreateAppCommand({
      name: APP_NAME,
      description: 'DE - FYND Perishable Stock Recovery Desk — FYND × NMIMS',
      platform: 'WEB',
      customRules: [
        {
          source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
          target: '/index.html',
          status: '200'
        }
      ]
    }));
    app = createAppRes.app;
    console.log(`   Created new Amplify App ID: ${app.appId}`);
  } else {
    console.log(`   Found existing Amplify App ID: ${app.appId}`);
  }

  const appId = app.appId;

  // 4. Ensure branch exists
  const listBranchesRes = await client.send(new ListBranchesCommand({ appId }));
  let branch = listBranchesRes.branches?.find(b => b.branchName === BRANCH_NAME);

  if (!branch) {
    console.log(`   Creating branch "${BRANCH_NAME}"...`);
    const createBranchRes = await client.send(new CreateBranchCommand({
      appId,
      branchName: BRANCH_NAME,
      stage: 'PRODUCTION'
    }));
    branch = createBranchRes.branch;
  }

  // 5. Create Deployment Slot & Upload Zip
  console.log('[5/6] Creating deployment artifact slot and uploading assets to AWS S3...');
  const createDeployRes = await client.send(new CreateDeploymentCommand({
    appId,
    branchName: BRANCH_NAME
  }));

  const { jobId, zipUploadUrl } = createDeployRes;
  if (!zipUploadUrl) {
    throw new Error('AWS Amplify did not return an upload URL for deployment.');
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const uploadRes = await fetch(zipUploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/zip',
      'Content-Length': String(zipBuffer.length)
    },
    body: zipBuffer
  });

  if (!uploadRes.ok) {
    throw new Error(`Artifact upload failed with status ${uploadRes.status}: ${uploadRes.statusText}`);
  }
  console.log('   Artifact successfully uploaded to Amplify Hosting CDN!');

  // 6. Start Deployment & Poll Job Status
  console.log('[6/6] Launching deployment job on AWS Amplify...');
  await client.send(new StartDeploymentCommand({
    appId,
    branchName: BRANCH_NAME,
    jobId
  }));

  let deployed = false;
  let attempts = 0;
  const maxAttempts = 60; // Up to 3 minutes

  process.stdout.write('   Deploying to global CDN');
  while (!deployed && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 3000));
    attempts++;
    process.stdout.write('.');

    const jobRes = await client.send(new GetJobCommand({
      appId,
      branchName: BRANCH_NAME,
      jobId
    }));

    const status = jobRes.job?.summary?.status;
    if (status === 'SUCCEED') {
      deployed = true;
      console.log('\n   Deployment successfully provisioned and published!');
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      throw new Error(`Amplify deployment ended with status: ${status}`);
    }
  }

  if (!deployed) {
    throw new Error(`Amplify deployment did not finish within ${maxAttempts * 3} seconds. Check job ${jobId} in the Amplify console.`);
  }

  // 7. Get final app domain
  const finalAppRes = await client.send(new GetAppCommand({ appId }));
  const defaultDomain = finalAppRes.app?.defaultDomain;
  const liveUrl = `https://${BRANCH_NAME}.${defaultDomain}`;

  // Clean up zip
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  } catch {}

  console.log('\n======================================================');
  console.log('   AWS AMPLIFY DEPLOYMENT COMPLETE!                   ');
  console.log('======================================================');
  console.log(`\n  Live Production URL:\n  -> ${liveUrl}\n`);
  console.log(`  App ID:      ${appId}`);
  console.log(`  Branch:      ${BRANCH_NAME}`);
  console.log(`  Region:      ${region}`);
  console.log(`  Console URL: https://${region}.console.aws.amazon.com/amplify/home?region=${region}#/${appId}`);
  console.log('======================================================\n');
}

main().catch(err => {
  if (temporaryZipPath && fs.existsSync(temporaryZipPath)) {
    fs.unlinkSync(temporaryZipPath);
  }
  console.error('\nDeployment Error:', err.message || err);
  process.exit(1);
});
