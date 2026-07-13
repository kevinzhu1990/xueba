#!/usr/bin/env node
const fs=require("fs"), vm=require("vm"), path=require("path");
const root=path.resolve(__dirname,"..");
const files=["question-bank-loader.js","math-extra-v2.js","olympiad-extra-v2.js","reading.js","english.js","physics.js","chemistry.js","biology.js","comprehensive-extra-v2.js","history-extra-v2.js","geography-extra-v2.js","idiom.js"];
const ctx={window:{}}; vm.createContext(ctx);
for(const file of files){const p=path.join(root,"data/questions",file);if(!fs.existsSync(p)){console.error(`缺少文件: ${file}`);process.exitCode=1;continue;}vm.runInContext(fs.readFileSync(p,"utf8"),ctx,{filename:p});}
const banks=ctx.window.XUEBA_EXTRA_QUESTIONS||{};
const errors=[], banned=["待补充","示例题","placeholder","TODO","xxxx","暂无"];
const seenIds=new Set(),seenText=new Set();
for(const [subject,items] of Object.entries(banks)){
  const localIds=new Set(),localText=new Set();
  for(const q of items){
    const text=String(q.question||"").trim();
    if(!q.id||!text||!q.unit||!q.tag||!q.subject||!q.grade||!q.level||!q.type||!Array.isArray(q.options)||q.options.length<4||!q.answer||!q.explanation||q.verified!==true) errors.push(`${subject}/${q.id||"?"}: 必填字段不完整`);
    if(new Set((q.options||[]).map(String)).size !== (q.options||[]).length) errors.push(`${subject}/${q.id}: 选项重复`);
    if(!(q.options||[]).includes(q.answer)) errors.push(`${subject}/${q.id}: answer 不在 options 中`);
    if(localIds.has(q.id)||seenIds.has(q.id)) errors.push(`${subject}/${q.id}: ID 重复`);
    if(localText.has(text)||seenText.has(text)) errors.push(`${subject}/${q.id}: 题干重复`);
    if(banned.some(word=>(JSON.stringify(q)||"").toLowerCase().includes(word.toLowerCase()))) errors.push(`${subject}/${q.id}: 含占位内容`);
    localIds.add(q.id); localText.add(text); seenIds.add(q.id); seenText.add(text);
  }
  console.log(`${subject}: ${items.length} 题`);
  if(["math","olympiad","geography","history","comprehensive"].includes(subject)&&items.length<100) errors.push(`${subject}: 新增题少于 100 题`);
}
if(!banks.geography || !["北京","石家庄","太原","沈阳","长春","哈尔滨","南京","杭州","合肥","福州","南昌","济南","郑州","武汉","长沙","广州","海口","成都","贵阳","昆明","西安","兰州","西宁","呼和浩特","南宁","拉萨","银川","乌鲁木齐","重庆","上海","香港","澳门","台北"].every(cap=>Object.values(banks.geography||{}).some(q=>q.answer===cap))) errors.push("geography: 34 个省级行政区省会覆盖不完整");
if(errors.length){console.error(`校验失败，共 ${errors.length} 项`);errors.slice(0,30).forEach(e=>console.error(`- ${e}`));process.exit(1);}
console.log("题库校验通过：字段、答案、重复题、占位内容和第一批题量均符合要求。");
