#!/usr/bin/env node
const fs=require("fs"), vm=require("vm"), path=require("path");
const root=path.resolve(__dirname,"..");
const files=["question-bank-loader.js","math-extra-v2.js","olympiad-extra-v2.js","reading.js","english.js","physics.js","chemistry.js","biology.js","comprehensive-extra-v2.js","history-extra-v2.js","geography-extra-v2.js","idiom.js"];
const ctx={window:{}}; vm.createContext(ctx);
for(const file of files){const p=path.join(root,"data/questions",file);if(!fs.existsSync(p)){console.error(`缺少文件: ${file}`);process.exitCode=1;continue;}vm.runInContext(fs.readFileSync(p,"utf8"),ctx,{filename:p});}
const banks=ctx.window.XUEBA_EXTRA_QUESTIONS||{};
const errors=[], warnings=[], banned=["待补充","示例题","placeholder","TODO","xxxx","暂无"];
const seenIds=new Set(),seenText=new Set(),optionPatterns=new Map();
for(const [subject,items] of Object.entries(banks)){
  const localIds=new Set(),localText=new Set();
  for(const q of items){
    const text=String(q.question||"").trim();
    if(!q.id||!text||!q.unit||!q.tag||!q.subject||!q.grade||!q.level||!q.type||!Array.isArray(q.options)||q.options.length!==4||!q.answer||!q.explanation||q.verified!==true) errors.push(`${subject}/${q.id||"?"}: 必填字段不完整或选项不是4个`);
    if(new Set((q.options||[]).map(String)).size !== (q.options||[]).length) errors.push(`${subject}/${q.id}: 选项重复`);
    if(!(q.options||[]).includes(q.answer)) errors.push(`${subject}/${q.id}: answer 不在 options 中`);
    if((q.options||[]).filter(x=>String(x)===String(q.answer)).length!==1) errors.push(`${subject}/${q.id}: 正确答案不唯一`);
    const quality=q.quality||{};
    ["factChecked","answerChecked","distractorChecked","explanationChecked"].forEach(k=>{if(quality[k]!==true)errors.push(`${subject}/${q.id}: quality.${k} 未通过`);});
    if(!quality.templateGroup||!quality.reviewedBy) errors.push(`${subject}/${q.id}: 缺少质量分组或审核标记`);
    if(String(q.explanation).length<8) errors.push(`${subject}/${q.id}: 解析过短`);
    if(localIds.has(q.id)||seenIds.has(q.id)) errors.push(`${subject}/${q.id}: ID 重复`);
    if(localText.has(text)||seenText.has(text)) errors.push(`${subject}/${q.id}: 题干重复`);
    if(banned.some(word=>(JSON.stringify(q)||"").toLowerCase().includes(word.toLowerCase()))) errors.push(`${subject}/${q.id}: 含占位内容`);
    localIds.add(q.id); localText.add(text); seenIds.add(q.id); seenText.add(text);
    if(subject==="math" && q.unit==="三位数乘两位数"){
      const m=text.match(/(\d+)\s*[×x*]\s*(\d+)/);if(!m||+m[1]<100||+m[1]>999||+m[2]<10||+m[2]>99)errors.push(`${subject}/${q.id}: 三位数乘两位数标签与题干不一致`);
    }
    if(subject==="math" && q.unit==="除数是两位数的除法"){
      const m=text.match(/(\d+)\s*÷\s*(\d+)/);if(!m||+m[2]<10||+m[2]>99)errors.push(`${subject}/${q.id}: 两位数除法标签与题干不一致`);
    }
    if(subject==="math"){
      const m=text.match(/^(\d+)\s*([+\-×x÷])\s*(\d+)\s*=\s*\?$/);
      if(m){const a=+m[1],b=+m[3],expected=m[2]==="+"?a+b:m[2]==="-"?a-b:m[2]==="÷"?a/b:a*b;if(String(expected)!==String(q.answer))errors.push(`${subject}/${q.id}: 算式答案错误`);if(m[2]==="÷"&&b===0)errors.push(`${subject}/${q.id}: 除数为0`);}
    }
    if(subject==="math" && q.unit.includes("分数")){
      const m=String(q.answer).match(/^(\d+)\/(\d+)$/);if(!m||+m[2]===0||+m[1]>+m[2])errors.push(`${subject}/${q.id}: 分数条件不成立`);
    }
    if(subject==="olympiad" && q.tag==="鸡兔同笼"){
      const m=text.match(/共有(\d+)只/), r=text.match(/兔有(\d+)只/);if(r&&m&&+r[1]>+m[1])errors.push(`${subject}/${q.id}: 兔子数量超过动物总数`);
    }
    if(subject==="olympiad" && q.tag==="火柴棒" && !text.includes("共用边"))errors.push(`${subject}/${q.id}: 火柴棒题缺少共用边条件`);
    if(subject==="english"){
      if(text.startsWith("What does") && text.includes("mean") && q.answer===text.match(/[“"]([^”"]+)[”"]/)?.[1])errors.push(`${subject}/${q.id}: 词义题答案不能仍是英文单词`);
      if(text.includes("用英语怎么说") && !/^[A-Za-z ]+$/.test(q.answer))errors.push(`${subject}/${q.id}: 中译英答案不是英文`);
      if(q.passageId && !q.text)errors.push(`${subject}/${q.id}: 英语阅读题缺少原文`);
    }
    if(subject==="reading" && (!q.passageId||!q.text))errors.push(`${subject}/${q.id}: 阅读题缺少 passageId 或原文`);
    const optionKey=(q.options||[]).map(String).join("\u0001");optionPatterns.set(optionKey,(optionPatterns.get(optionKey)||0)+1);
  }
  const groups={};items.forEach(q=>{const key=q.quality?.templateGroup||"unknown";groups[key]=(groups[key]||0)+1;});
  Object.entries(groups).forEach(([group,count])=>{if(count>20)warnings.push(`${subject}: 模板分组 ${group} 有 ${count} 题，请人工复核重复率`);});
  console.log(`${subject}: ${items.length} 题`);
  if(["math","olympiad","geography","history","comprehensive"].includes(subject)&&items.length<100) errors.push(`${subject}: 新增题少于 100 题`);
}
if(!banks.geography || !["北京","石家庄","太原","沈阳","长春","哈尔滨","南京","杭州","合肥","福州","南昌","济南","郑州","武汉","长沙","广州","海口","成都","贵阳","昆明","西安","兰州","西宁","呼和浩特","南宁","拉萨","银川","乌鲁木齐","重庆","上海","香港","澳门","台北"].every(cap=>Object.values(banks.geography||{}).some(q=>q.answer===cap))) errors.push("geography: 34 个省级行政区省会覆盖不完整");
optionPatterns.forEach((count,key)=>{if(count>10)warnings.push(`选项组合重复 ${count} 次：${key.slice(0,80)}`);});
warnings.forEach(e=>console.warn(`警告: ${e}`));
if(errors.length){console.error(`校验失败，共 ${errors.length} 项`);errors.slice(0,50).forEach(e=>console.error(`- ${e}`));process.exit(1);}
console.log("题库校验通过：字段、答案、数学条件、英语语义、阅读原文、质量标记和题量均符合要求。");
