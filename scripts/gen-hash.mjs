import bcrypt from 'bcryptjs';

// 36-character password: memorable word segments + symbols + numbers
const tempPass = 'Houdini#Lock$2026!Secure@Admin#Key99';
const hash = bcrypt.hashSync(tempPass, 12);
console.log('HASH:' + hash);
console.log('PASS:' + tempPass);
console.log('LEN:' + tempPass.length);
