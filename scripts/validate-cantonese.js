#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'data/cantonese.js');
const mirrorPath = path.join(root, 'aliyun-function/public/data/cantonese.js');
assert.ok(fs.existsSync(sourcePath), '缺少粤语学习内容文件');
assert.ok(fs.existsSync(mirrorPath), '缺少部署镜像中的粤语内容文件');
const source = fs.readFileSync(sourcePath, 'utf8');
assert.equal(source, fs.readFileSync(mirrorPath, 'utf8'), '粤语内容与部署镜像不一致');

const context = {window: {}};
vm.createContext(context);
vm.runInContext(source, context, {filename: sourcePath});
const subject = context.window.XUEBA_CANTONESE?.buildSubject();
assert.ok(subject, '粤语内容没有提供学科数据');
assert.equal(subject.units.length, 5, '应有 5 个儿童日常主题');
assert.ok(subject.units.every(unit => unit.items.length === 8), '每个主题应有 8 张卡');
assert.equal(subject.cards.length, 40, '应有 40 张学习卡');
assert.equal(subject.questions.length, 120, '每张卡应配 3 道不同形式的题');

const phrases = new Set();
for (const unit of subject.units) {
  for (const item of unit.items) {
    assert.ok(!phrases.has(item.phrase), `重复粤语词句：${item.phrase}`);
    phrases.add(item.phrase);
    assert.match(item.jyutping, /^[a-z]+[1-6]( [a-z]+[1-6])*$/, `${item.phrase} 粤拼格式错误`);
    assert.ok(item.meaning && item.scene, `${item.phrase} 缺少解释或场景`);
  }
}
assert.ok(subject.cards.every(card => card.back.includes('粤拼：') && card.back.includes('场景：')));

const ids = new Set();
const stems = new Set();
const types = new Map();
for (const q of subject.questions) {
  assert.ok(q.id && !ids.has(q.id), `题目 ID 重复：${q.id}`);
  assert.ok(q.q && !stems.has(q.q), `题干重复：${q.q}`);
  ids.add(q.id); stems.add(q.q);
  assert.equal(q.o.length, 4, `${q.id} 选项数错误`);
  assert.equal(new Set(q.o).size, 4, `${q.id} 选项重复`);
  assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id} 答案索引错误`);
  assert.ok(q.explain && q.explain.includes(q.o[q.a]), `${q.id} 解析没有说出正确答案`);
  assert.ok(q.lv === 1 || q.lv === 2, `${q.id} 超过启蒙难度`);
  if(q.type !== 'meaning') assert.ok(!q.audioText, `${q.id} 的朗读可能泄露答案`);
  if(q.type === 'scene' || q.type === 'reverse') assert.ok(!q.q.includes(q.o[q.a]), `${q.id} 题干泄露答案`);
  types.set(q.type, (types.get(q.type) || 0) + 1);
}
assert.equal(types.get('meaning'), 40);
assert.equal(types.get('reverse'), 40);
assert.equal(types.get('scene'), 40);

const thanks = subject.units.flatMap(unit => unit.items).filter(item => ['唔该','多谢'].includes(item.phrase));
assert.equal(thanks.length, 2);
assert.notEqual(thanks[0].meaning, thanks[1].meaning, '两种感谢方式不能解释成同一个答案');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mirrorHtml = fs.readFileSync(path.join(root, 'aliyun-function/public/index.html'), 'utf8');
assert.equal(html, mirrorHtml, '首页与部署镜像不一致');
const setupContext={curSubject:'cantonese',getSubjectLevel:()=>1,maxAccessibleLevel:()=>2,
  renderChips(){},go(){}};
vm.createContext(setupContext);
const setupSource=html.slice(html.indexOf('function openSetup(){'),html.indexOf('function renderChips(){'));
vm.runInContext(`let setupLv; let setupCount; let setupCustom; ${setupSource}`,setupContext);
setupContext.openSetup();
assert.equal(vm.runInContext('setupLv',setupContext),'all','粤语默认应混合识读与场景题');
const gradeContext={};
vm.createContext(gradeContext);
vm.runInContext(html.slice(html.indexOf('function baseGradeBand('),html.indexOf('// 命中这些关键词的题目')),gradeContext);
for(const level of [1,2]) {
  assert.deepEqual(Array.from(gradeContext.baseGradeBand('cantonese',level)),[0,6],'粤语启蒙不应被学校年级筛掉');
}
assert.ok(html.includes('data/cantonese.js?v=cantonese-20260926'));
assert.ok(html.includes('adaptive-engine.js?v=cantonese-20260926'));
assert.ok(html.includes('data/curriculum-enhancements.js?v=cantonese-20260926'));
assert.ok(/FREE_SUBJECTS[^\n]*"cantonese"/.test(html));
const curriculum = fs.readFileSync(path.join(root, 'data/curriculum-enhancements.js'), 'utf8');
assert.match(curriculum, /SUBJECT_ORDER[^\n]*"cantonese"/);
assert.equal(curriculum, fs.readFileSync(path.join(root, 'aliyun-function/public/data/curriculum-enhancements.js'), 'utf8'));
const adaptive = fs.readFileSync(path.join(root, 'adaptive-engine.js'), 'utf8');
assert.equal(adaptive, fs.readFileSync(path.join(root, 'aliyun-function/public/adaptive-engine.js'), 'utf8'));

// 手机只装了普通话语音时，不应把普通话声音当成粤语示范。
const spoken=[];
let voices=[{lang:'zh-CN',name:'Mandarin'}];
const synthesis={getVoices:()=>voices,cancel(){},speak:utterance=>spoken.push(utterance)};
const speechContext={window:{speechSynthesis:synthesis},speechSynthesis:synthesis,
  SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  store:{sound:true},curSubject:'cantonese',
  document:{getElementById:()=>({classList:{contains:()=>false}})}};
vm.createContext(speechContext);
const speechSource=html.slice(html.indexOf('let usVoice=null'),html.indexOf('// 朗读当前学习卡片'));
vm.runInContext(speechSource,speechContext);
speechContext.speak('你好','zh-HK');
assert.equal(spoken.length,0,'缺少粤语语音时不能朗读成普通话');
voices=[...voices,{lang:'zh-HK',name:'Cantonese'}];
speechContext.pickVoices();
speechContext.speak('你好','zh-HK');
assert.equal(spoken.length,1);
assert.equal(spoken[0].voice.lang,'zh-HK');
console.log('粤语学习校验通过：40 张卡、120 道题、粤拼格式、选项与部署镜像。');
