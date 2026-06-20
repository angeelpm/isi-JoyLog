// Prototype: do password hashing (bcrypt) and stateless auth (JWT) work
// the way auth-service will rely on them?
// Run: npm install && node test.mjs   (from this folder)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = 'prototype-secret';

// 1. Hash a password and verify it
const hash = bcrypt.hashSync('my-password', bcrypt.genSaltSync(10));
const matches = bcrypt.compareSync('my-password', hash);
const rejectsWrong = !bcrypt.compareSync('wrong-password', hash);

if (!matches || !rejectsWrong || hash === 'my-password') {
    console.error('FAIL: bcrypt hash/verify did not behave as expected');
    process.exit(1);
}
console.log('PASS: bcrypt hashes a password and verifies it correctly, rejects wrong ones');

// 2. Sign a JWT and verify it
const token = jwt.sign({ id: 'user-1', username: 'angel' }, SECRET, { expiresIn: '1h' });
const decoded = jwt.verify(token, SECRET);

if (decoded.id !== 'user-1' || decoded.username !== 'angel') {
    console.error('FAIL: JWT did not round-trip the payload correctly');
    process.exit(1);
}
console.log('PASS: JWT sign/verify round-trips the payload correctly');

// 3. An expired token must be rejected
const expired = jwt.sign({ id: 'user-1' }, SECRET, { expiresIn: -1 });
try {
    jwt.verify(expired, SECRET);
    console.error('FAIL: expired JWT was accepted');
    process.exit(1);
} catch {
    console.log('PASS: expired JWT is correctly rejected');
}
