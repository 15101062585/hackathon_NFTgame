const { MerkleTree } = require('merkletreejs');
const { ethers } = require('ethers');

// 使用与 Solidity 完全相同的地址格式
const addresses = [
  '0x0000000000000000000000000000000000000001', // owner
  '0x0000000000000000000000000000000000000002', // user1
  '0x0000000000000000000000000000000000000003', // user2
  '0x0000000000000000000000000000000000000004'  // user3
];

console.log('Generating Merkle tree for exact Solidity addresses:');
addresses.forEach(addr => console.log('  ', addr));

// 创建叶子节点 - 使用与 Solidity 完全相同的编码
const leaves = addresses.map(addr => {
  // 使用 ethers 的 abi.encodePacked 等效方法
  return ethers.solidityPackedKeccak256(['address'], [addr]);
});

// 构建 Merkle 树
const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });

const root = tree.getHexRoot();
console.log('\n=== Exact Merkle Tree Data ===');
console.log('Merkle Root:', root);

console.log('\n=== Exact Proofs ===');
addresses.forEach((address, index) => {
  const leaf = leaves[index];
  const proof = tree.getHexProof(leaf);
  console.log(`\nAddress: ${address}`);
  console.log('Leaf:', leaf);
  console.log('Proof:', proof);
  console.log('Proof Length:', proof.length);
  
  // 验证证明
  const isValid = tree.verify(proof, leaf, root);
  console.log('Valid:', isValid);
});

console.log('\n=== Exact Solidity Test Code ===');
console.log('// Replace these values in your test contract:');
console.log('bytes32 public constant MERKLE_ROOT = ' + root + ';');
console.log('');

// 只生成 user1 和 user2 的证明（白名单用户）
const user1Index = 1; // user1
const user2Index = 2; // user2

console.log('// User1 Proof (address 0x0000000000000000000000000000000000000002)');
const user1Proof = tree.getHexProof(leaves[user1Index]);
console.log('user1Proof = new bytes32[](' + user1Proof.length + ');');
user1Proof.forEach((p, i) => {
  console.log('user1Proof[' + i + '] = ' + p + ';');
});

console.log('\n// User2 Proof (address 0x0000000000000000000000000000000000000003)');
const user2Proof = tree.getHexProof(leaves[user2Index]);
console.log('user2Proof = new bytes32[](' + user2Proof.length + ');');
user2Proof.forEach((p, i) => {
  console.log('user2Proof[' + i + '] = ' + p + ';');
});

console.log('\n=== Verification Check ===');
// 验证 user1 和 user2 的证明
const user1Leaf = leaves[user1Index];
const user2Leaf = leaves[user2Index];

const user1Valid = tree.verify(user1Proof, user1Leaf, root);
const user2Valid = tree.verify(user2Proof, user2Leaf, root);

console.log('User1 proof valid:', user1Valid);
console.log('User2 proof valid:', user2Valid);

if (!user1Valid || !user2Valid) {
  console.log('ERROR: Generated proofs are invalid!');
  process.exit(1);
}