/**
 * PIKIT Sepolia Deployment Script
 * Deploys: MockUSDC, PikitQuest, PikitVault
 * Uses: ethers v6, solc, dotenv
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('ERROR: DEPLOYER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

// We try multiple RPCs in order — stop at the first one that works
const RPC_CANDIDATES = [
  process.env.SEPOLIA_RPC_URL,
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://rpc2.sepolia.org',
].filter(Boolean);

const CONTRACTS_DIR  = path.resolve(__dirname, '../contracts');
const PUBLIC_JS_DIR  = path.resolve(__dirname, '../public/js');

// ---------------------------------------------------------------------------
// Solidity compilation helpers
// ---------------------------------------------------------------------------
function readContract(name) {
  return fs.readFileSync(path.join(CONTRACTS_DIR, `${name}.sol`), 'utf8');
}

function compile(contracts) {
  // contracts: { 'ContractName': sourceCode, ... }
  const sources = {};
  for (const [name, source] of Object.entries(contracts)) {
    sources[`${name}.sol`] = { content: source };
  }

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length > 0) {
      console.error('Solidity compilation errors:');
      fatal.forEach(e => console.error(' ', e.formattedMessage));
      process.exit(1);
    }
    // print warnings only
    output.errors
      .filter(e => e.severity === 'warning')
      .forEach(e => console.warn('[warn]', e.formattedMessage));
  }

  const result = {};
  for (const fileName of Object.keys(output.contracts)) {
    for (const [contractName, contractData] of Object.entries(output.contracts[fileName])) {
      result[contractName] = {
        abi:      contractData.abi,
        bytecode: '0x' + contractData.evm.bytecode.object,
      };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Provider selection — find a working RPC
// ---------------------------------------------------------------------------
async function getProvider() {
  for (const url of RPC_CANDIDATES) {
    console.log(`Trying RPC: ${url}`);
    try {
      const provider = new ethers.JsonRpcProvider(url);
      const network  = await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      if (network.chainId !== 11155111n) {
        console.warn(`  Chain ID mismatch: expected 11155111, got ${network.chainId}`);
        continue;
      }
      console.log(`  Connected to Sepolia via ${url}`);
      return provider;
    } catch (err) {
      console.warn(`  Failed (${err.message})`);
    }
  }
  throw new Error('All RPC endpoints failed. Check your network connection.');
}

// ---------------------------------------------------------------------------
// Deploy helper — wraps deploy + wait with a single retry on timeout
// ---------------------------------------------------------------------------
async function deployContract(factory, args, label) {
  console.log(`\nDeploying ${label}...`);
  let contract;
  try {
    contract = await factory.deploy(...args);
  } catch (err) {
    throw new Error(`${label} deploy tx failed: ${err.message}`);
  }

  console.log(`  Tx hash: ${contract.deploymentTransaction().hash}`);
  console.log('  Waiting for confirmation...');

  try {
    await Promise.race([
      contract.waitForDeployment(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('confirmation timeout')), 120000)),
    ]);
  } catch (err) {
    throw new Error(`${label} confirmation failed: ${err.message}`);
  }

  const address = await contract.getAddress();
  console.log(`  ${label} deployed at: ${address}`);
  return { contract, address };
}

// ---------------------------------------------------------------------------
// File output helpers
// ---------------------------------------------------------------------------
function updateQuestAbi(questAddress) {
  const filePath = path.join(PUBLIC_JS_DIR, 'quest-abi.js');
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /CONTRACT_ADDRESS:\s*'0x[0-9a-fA-F]*'/,
    `CONTRACT_ADDRESS: '${questAddress}'`
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\nUpdated ${filePath}`);
}

function writeVaultAbi(vaultAddress, mockUsdcAddress, vaultAbi, mockUsdcAbi) {
  const filePath = path.join(PUBLIC_JS_DIR, 'vault-abi.js');
  const content = `// PikitVault Contract ABI — Sepolia testnet
// Auto-generated by scripts/deploy.js
window.PIKIT_VAULT = {
  CONTRACT_ADDRESS: '${vaultAddress}',
  MOCK_USDC_ADDRESS: '${mockUsdcAddress}',
  CHAIN_ID: 11155111, // Sepolia

  // Deposit:  1 USDC (1_000_000 units) = 10,000 credits
  // Withdraw: 10,500 credits = 1 USDC
  DEPOSIT_RATE: 10000,
  WITHDRAW_RATE: 10500,

  ABI: ${JSON.stringify(vaultAbi, null, 2)},

  MOCK_USDC_ABI: ${JSON.stringify(mockUsdcAbi, null, 2)}
};
`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created ${filePath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== PIKIT Sepolia Deployment ===\n');

  // 1. Compile all contracts
  console.log('Compiling contracts...');
  const compiled = compile({
    MockUSDC:   readContract('MockUSDC'),
    PikitQuest: readContract('PikitQuest'),
    PikitVault: readContract('PikitVault'),
  });
  console.log('  Compiled: MockUSDC, PikitQuest, PikitVault');

  // 2. Connect
  const provider = await getProvider();
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`\nDeployer address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
  if (balance < ethers.parseEther('0.01')) {
    console.warn('WARNING: Balance is low. You may need more Sepolia ETH from a faucet.');
  }

  // 3. Deploy MockUSDC
  const mockUsdcFactory = new ethers.ContractFactory(
    compiled.MockUSDC.abi,
    compiled.MockUSDC.bytecode,
    wallet
  );
  const { contract: mockUsdc, address: mockUsdcAddress } =
    await deployContract(mockUsdcFactory, [], 'MockUSDC');

  // 4. Deploy PikitQuest
  const questFactory = new ethers.ContractFactory(
    compiled.PikitQuest.abi,
    compiled.PikitQuest.bytecode,
    wallet
  );
  const { address: questAddress } =
    await deployContract(questFactory, [], 'PikitQuest');

  // 5. Deploy PikitVault(mockUsdcAddress)
  const vaultFactory = new ethers.ContractFactory(
    compiled.PikitVault.abi,
    compiled.PikitVault.bytecode,
    wallet
  );
  const { contract: vault, address: vaultAddress } =
    await deployContract(vaultFactory, [mockUsdcAddress], 'PikitVault');

  // 6. Mint 1,000,000 USDC (6 decimals) to vault for liquidity
  console.log('\nMinting 1,000,000 USDC to vault...');
  const mintAmount = ethers.parseUnits('1000000', 6); // 1_000_000 * 10^6
  const mintTx = await mockUsdc.mint(vaultAddress, mintAmount);
  console.log(`  Mint tx: ${mintTx.hash}`);
  await mintTx.wait();
  const vaultBalance = await mockUsdc.balanceOf(vaultAddress);
  console.log(`  Vault USDC balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);

  // 7. Write ABI files
  console.log('\nWriting ABI files...');
  updateQuestAbi(questAddress);
  writeVaultAbi(vaultAddress, mockUsdcAddress, compiled.PikitVault.abi, compiled.MockUSDC.abi);

  // 8. Summary
  console.log('\n=== Deployment Complete ===');
  console.log(`  MockUSDC    : ${mockUsdcAddress}`);
  console.log(`  PikitQuest  : ${questAddress}`);
  console.log(`  PikitVault  : ${vaultAddress}`);
  console.log('\nSepolia Explorer:');
  console.log(`  https://sepolia.etherscan.io/address/${mockUsdcAddress}`);
  console.log(`  https://sepolia.etherscan.io/address/${questAddress}`);
  console.log(`  https://sepolia.etherscan.io/address/${vaultAddress}`);
}

main().catch(err => {
  console.error('\nDeployment failed:', err.message);
  process.exit(1);
});
