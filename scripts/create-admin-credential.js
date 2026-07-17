#!/usr/bin/env node
const crypto=require("node:crypto");
const [,,username,role="SuperAdmin",password]=process.argv;
if(!username||!password){console.error("用法: node scripts/create-admin-credential.js <username> [SuperAdmin|Admin|Operator] <password>");process.exit(1);}
const salt=crypto.randomBytes(16).toString("hex");
const passwordHash=crypto.pbkdf2Sync(password,salt,120000,32,"sha256").toString("hex");
console.log(JSON.stringify([{id:crypto.randomUUID(),username,role,salt,passwordHash,enabled:true}],null,2));
