#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const deployed = fs.readFileSync(path.join(root, 'aliyun-function/public/index.html'), 'utf8');
const section = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `找不到学习卡代码：${start}`);
  return source.slice(from, to);
};

const makeElement = () => ({style: {}, classList: {add() {}, remove() {}}, textContent: '', innerHTML: '', onclick: null});
const elements = Object.fromEntries(['learnBar', 'learnCard', 'learnNext', 'learnReview', 'learnCount'].map(id => [id, makeElement()]));
const saved = new Map();
const context = {
  document: {getElementById: id => elements[id], createElement: makeElement},
  localStorage: {getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value)},
  store: {grade: 4}, activeProfile: {id: 'test-child'}, curSubject: 'geography',
  DATA: {geography: {cards: Array.from({length: 12}, (_, i) => ({front: `问题${i + 1}`, back: `答案${i + 1}`, tag: '地理', lv: 1}))}},
  hasPremiumAccess: () => true, maxAccessibleLevel: () => 5, levelText: lv => `L${lv}`,
  go: id => {context.screen = id;}, openSetup: () => {context.setupOpened = true;},
  spoken: [], speak: (...args) => context.spoken.push(args),
};
vm.createContext(context);
vm.runInContext(section('const EN = {', 'function englishLv('), context);
vm.runInContext(section('function wordCard(', 'function idiomStudyCard('), context);
vm.runInContext(section('const LEARN_BATCH_SIZE=6;', '// 朗读：中文用'), context);
vm.runInContext(section('function speakCard(){', '// 朗读当前测试题'), context);

for (const cat of vm.runInContext('Object.keys(EN)', context)) {
  for (const [en, zh, emoji] of vm.runInContext(`EN[${JSON.stringify(cat)}]`, context)) {
    const {mean} = context.englishWordCard(en, zh, emoji, cat);
    assert.match(mean, /例句：.+[.!]/, `${cat}/${en} 缺少可读例句`);
    assert.doesNotMatch(mean, /undefined|\ba [aeiou]/i, `${cat}/${en} 例句有拼接错误`);
  }
}

assert.match(context.englishWordCard('elephant', '大象', '🐘', '动物').mean, /I see an elephant\./);
assert.match(context.englishWordCard('strawberry', '草莓', '🍓', '水果').mean, /I like strawberries\./);
assert.match(context.englishWordCard('shoes', '鞋', '👟', '衣物').mean, /I have shoes\./);
assert.doesNotMatch(context.englishWordCard('head', '头', '🗣️', '身体').mean, /I know this word/);

context.startLearn();
assert.equal(context.screen, 'learnScreen');
assert.equal(vm.runInContext('learnCards.length', context), 6, '每轮只学 6 张');
assert.match(elements.learnCount.textContent, /1\s*\/\s*6/);
assert.match(elements.learnCard.innerHTML, /问题1/);
assert.doesNotMatch(elements.learnCard.innerHTML, /答案1/, '揭晓前不能泄露答案');
assert.match(elements.learnNext.textContent, /看答案/);
context.speakCard();
assert.doesNotMatch(context.spoken.at(-1)[0], /答案1/, '揭晓前朗读不能泄露答案');

elements.learnNext.onclick();
assert.match(elements.learnCard.innerHTML, /答案1/);
assert.equal(elements.learnReview.style.display, 'block');
context.speakCard();
assert.match(context.spoken.at(-1)[0], /答案1/);
elements.learnReview.onclick();
assert.match(elements.learnCard.innerHTML, /问题2/);
assert.doesNotMatch(elements.learnCard.innerHTML, /答案2/);

for (let i = 2; i <= 6; i++) {
  elements.learnNext.onclick(); // 揭晓
  elements.learnNext.onclick(); // 我会了
}
assert.match(elements.learnCount.textContent, /再练/);
assert.match(elements.learnCard.innerHTML, /问题1/, '标记再练的卡片应回看一次');
elements.learnNext.onclick();
elements.learnNext.onclick();
assert.equal(context.setupOpened, true, '完成本轮后进入现有测验入口');
assert.equal(saved.get('xueba_learn_cursor_test-child_geography_all'), '6');

context.setupOpened = false;
context.startLearn();
assert.match(elements.learnCard.innerHTML, /问题7/, '下一轮接着学，不能总从第一张开始');
assert.equal(source, deployed, 'GitHub Pages 与部署镜像必须同步');
console.log('学习卡校验通过：先想后看、6 张一轮、再练一次、学习进度和英语例句。');
