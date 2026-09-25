#!/usr/bin/env node
// Checks content regressions that structural question-bank validation cannot detect.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = {window: {}};
vm.createContext(context);
for (const file of ['question-bank-loader.js', 'math-extra-v2.js', 'olympiad-extra-v2.js', 'reading.js', 'english.js', 'physics.js', 'chemistry.js', 'biology.js', 'idiom.js', 'comprehensive-extra-v2.js', 'history-extra-v2.js', 'geography-extra-v2.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'data/questions', file), 'utf8'), context, {filename: file});
}
const banks = context.window.XUEBA_EXTRA_QUESTIONS;
const errors = [];
const seed=Object.fromEntries(Object.keys(banks).map(subject=>[subject,{questions:[{id:'legacy-question',q:'旧题',o:['是','否'],a:0,tag:'旧知识点'}]}]));
const firstAppend=context.window.XUEBA_QUESTION_BANK.append(seed);
for(const [subject,questions] of Object.entries(banks)) {
  if(seed[subject].questions[0].id!=='legacy-question' || seed[subject].questions.length!==questions.length+1 || firstAppend.added[subject]!==questions.length) errors.push(`${subject}: 追加题库改变旧题顺序或漏题`);
}
const secondAppend=context.window.XUEBA_QUESTION_BANK.append(seed);
if(Object.values(secondAppend.added).some(count=>count!==0)) errors.push('题库重复加载产生重复题');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (indexHtml.includes('水在0度结冰、100度沸腾')) errors.push('旧科学题缺少标准大气压和纯水前提');
if (indexHtml.includes('地球是什么形状？", o:["方形","圆形"')) errors.push('地球形状题把平面圆形当成球体');
const curriculumSource=fs.readFileSync(path.join(root,'data/curriculum-enhancements.js'),'utf8');
if (curriculumSource.includes('后面三个 0 不读')) errors.push('5080000 的读数解析把四个尾零说成三个');
if (curriculumSource.includes('闻未知气味时应该怎么做？')) errors.push('未知气味题鼓励学生直接接触未知物质');
const byId = (subject, id) => banks[subject].find(q => q.id === id);

for (let i = 1; i <= 20; i++) {
  const summary=byId('reading',`v2-reading-${i}-1`);
  const order = byId('reading', `v2-reading-${i}-3`);
  const inference = byId('reading', `v2-reading-${i}-4`);
  const vocabulary = byId('reading', `v2-reading-${i}-5`);
  if (summary.answer===inference.answer) errors.push(`${summary.id}: 主要内容与材料启示没有区分`);
  if (!/(先|首先|然后|接着|最后|之后|之前)/.test(order.answer)) errors.push(`${order.id}: 顺序题答案没有交代先后`);
  if (!inference.explanation.includes(inference.answer)) errors.push(`${inference.id}: 推断题解析没有说明答案依据`);
  if (vocabulary.answer === vocabulary.question.match(/“([^”]+)”/)?.[1]) errors.push(`${vocabulary.id}: 词义题用原词作答案`);
}
if (byId('reading','v2-reading-6-4').answer==='街道路线') errors.push('地图短文把一个名词当作阅读启示');
if (banks.reading.some(q => q.text.includes('第二盆放在了阴暗处'))) errors.push('阅读材料把缺少光照当成种子未萌发的确定原因');
for (const subject of ['physics', 'chemistry', 'biology', 'idiom']) {
  for (let i = 1; i <= 10; i++) {
    const prefix = `v2-${subject}-${i}-`;
    const group = banks[subject].filter(q => q.id.startsWith(prefix));
    if (new Set(group.map(q => q.answer)).size < 4) errors.push(`${prefix}: 同一知识点的答案过度重复`);
    if (group.some(q => q.options.some(o => /只存在于月球|与科学无关|与生命无关|与物质无关|形容速度很慢/.test(o)))) errors.push(`${prefix}: 选项包含无效干扰项`);
  }
}
for (let i=1;i<=10;i++) {
  const usage=byId('idiom',`v2-idiom-${i}-2`);
  const word=usage.tag;
  if (usage.options.some(option=>!option.includes(word))) errors.push(`${usage.id}: 用法题选项未全部包含目标成语`);
}
for (let i = 1; i <= 20; i++) {
  const group=banks.comprehensive.filter(q=>q.id.startsWith(`v2-science-${i}-`));
  if (new Set(group.map(q=>q.answer)).size < 4) errors.push(`v2-science-${i}-: 科学探究五题重复考同一个答案`);
}
for (const q of banks.history.filter(q=>/-4$/.test(q.id))) {
  if (q.question.includes('按时间线整理')) errors.push(`${q.id}: 时间线题的答案不是时间顺序`);
}
const southAfrica=banks.geography.find(q=>q.id==='v2-geo-country-27');
if (southAfrica && !southAfrica.question.includes('行政首都')) errors.push('南非首都题没有区分行政、立法和司法首都');
const russia=banks.geography.find(q=>q.id==='v2-geo-continent-15');
if (russia && russia.answer!=='亚洲和欧洲') errors.push('俄罗斯跨洲题误把它归为单一大洲');
for (const q of banks.english.filter(q => q.id.includes('spelling-'))) {
  if (q.question.toLowerCase().includes(q.answer.toLowerCase())) errors.push(`${q.id}: 题干泄露正确拼写`);
}
for (const q of banks.english.filter(q => q.id.includes('sentence-'))) {
  if (/set \d+/i.test(q.question)) errors.push(`${q.id}: 句型题使用无意义编号代替学习情境`);
}
if (errors.length) {
  console.error(`学习内容校验失败：${errors.length} 项`);
  errors.slice(0, 25).forEach(e => console.error(`- ${e}`));
  process.exit(1);
}
console.log('学习内容校验通过：阅读题型、知识点答案多样性、干扰项与英语拼写题。');
