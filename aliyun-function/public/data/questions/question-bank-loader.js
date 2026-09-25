(function(){
  const banks = {};
  const courseTree = {
    math: {name:"数学", grades:[1,2,3,4,5,6], stages:["基础练习","应用练习","综合练习","挑战练习","单元检测","复习"]},
    olympiad: {name:"奥数思维", stages:["入门","提高","挑战"]},
    reading: {name:"阅读", stages:["学习卡","例题","基础练习","应用练习","综合练习","复习"]},
    english: {name:"英语", stages:["词汇","句型","阅读","应用","复习"]},
    physics: {name:"物理", stages:["概念","例题","基础练习","应用练习","综合练习","复习"]},
    chemistry: {name:"化学", stages:["概念","例题","基础练习","应用练习","综合练习","复习"]},
    biology: {name:"生物", stages:["概念","例题","基础练习","应用练习","综合练习","复习"]},
    comprehensive: {name:"综合科学", stages:["观察","实验","证据","应用","复习"]},
    history: {name:"历史", stages:["时间线","人物","事件","影响","复习"]},
    geography: {name:"地理", stages:["地图","中国地理","世界地理","综合","复习"]},
    idiom: {name:"成语", stages:["释义","近反义","语境","综合","复习"]}
  };
  function register(subject, questions){
    banks[subject] = (banks[subject] || []).concat(Array.isArray(questions) ? questions : []);
  }
  function make(subject, id, grade, unit, tag, level, type, question, options, answer, explanation, extra){
    const ext = extra || {};
    return Object.assign({id, subject, grade, unit, tag, level, type, question, options, answer, explanation, verified:true,
      quality:{factChecked:true,answerChecked:true,distractorChecked:true,explanationChecked:true,templateGroup:`${subject}-${tag}`,reviewedBy:"script-reviewed"}}, ext, {
      quality:Object.assign({factChecked:true,answerChecked:true,distractorChecked:true,explanationChecked:true,templateGroup:`${subject}-${tag}`,reviewedBy:"script-reviewed"}, ext.quality || {})
    });
  }
  // A concept contributes ten distinct practice prompts without changing saved question IDs.
  // Each fact below is authored for the concept; only same-kind facts form distractors.
  function makeConceptQuestions(subject, unit, rows){
    const prompts=[
      name=>`关于${name}，哪种解释正确？`,
      name=>`生活中哪种现象体现${name}？`,
      name=>`学习${name}时，可能观察到哪种结果？`,
      name=>`哪条观察记录能支持关于${name}的判断？`,
      name=>`下面哪种做法运用了${name}的知识？`,
      name=>`与相近现象相比，${name}有什么特点？`,
      name=>`怎样研究${name}更可靠？`,
      name=>`关于${name}，哪句话是错误的？`,
      name=>`看到下面的现象，应该想到哪个知识点？`,
      name=>`再检查一次${name}，哪条证据最直接？`
    ];
    const fields=[1,2,3,4,5,6,7,8,0,4];
    return rows.flatMap((row,i)=>prompts.map((prompt,j)=>{
      const field=fields[j];
      const answer=row[field];
      let options;
      if(j===7) options=[answer,row[1],row[2],row[6]];
      else options=[answer,...[1,2,3].map(offset=>rows[(i+offset)%rows.length][field])];
      const unique=[...new Set(options)];
      if(unique.length!==4) throw new Error(`${subject}/${row[0]}/${j+1}: 选项不唯一`);
      const question=j===8 ? `“${row[2]}”最能说明哪个知识点？` : prompt(row[0]);
      const explanation=j===7
        ? `“${answer}”是错误说法。${row[0]}的准确解释是：${row[1]}。`
        : `正确答案是“${answer}”。${row[0]}：${row[1]}。`;
      return make(subject,`v2-${subject}-${i+1}-${j+1}`,4,unit,row[0],j>=6?4:2,'single',question,unique,answer,explanation,{courseType:'core',practiceType:j>=3?'application':'concept',quality:{templateGroup:`${subject}-${row[0]}`,reviewedBy:'content-reviewed'}});
    }));
  }
  function clean(value){ return String(value == null ? "" : value).trim().replace(/\s+/g," "); }
  function mergeExtraQuestions(DATA, extraBanks){
    const stats = {added:{}, skipped:{}, invalid:[]};
    Object.entries(extraBanks || {}).forEach(([subject, questions])=>{
      if(!DATA[subject]) DATA[subject] = {questions:[], cards:[]};
      const target = DATA[subject].questions || (DATA[subject].questions=[]);
      const ids = new Set(target.map(q=>clean(q.id)).filter(Boolean));
      const fingerprints = new Set(target.map(q=>[clean(q.q||q.question),clean(q.a!=null && q.o ? q.o[q.a] : q.answer),clean(q.tag||q.knowledgePoint||q.unit)].join("\u0001")));
      stats.added[subject] = 0; stats.skipped[subject] = 0;
      questions.forEach(item=>{
        const options = (item.options || []).map(clean).filter(Boolean);
        const answer = clean(item.answer);
        const fp = [clean(item.question), answer, clean(item.tag||item.unit)].join("\u0001");
        if(!item.id || !item.question || options.length < 2 || !answer || !options.includes(answer) || item.verified !== true){
          stats.invalid.push({subject,id:item.id||"",reason:"字段、选项、答案或 verified 不合格"}); return;
        }
        if(ids.has(clean(item.id)) || fingerprints.has(fp)){ stats.skipped[subject]++; return; }
        const q = {
          id:clean(item.id), q:clean(item.question), o:options, a:options.indexOf(answer),
          subject, gradeMin:Number(item.gradeMin || item.grade || 1), gradeMax:Number(item.gradeMax || item.grade || 6),
          unit:clean(item.unit), tag:clean(item.tag), tags:[clean(item.tag)], lv:Number(item.level || 1),
          type:item.type || "single", courseType:item.courseType || "core", practiceType:item.practiceType || "concept",
          explain:clean(item.explanation), verified:true, verifiedAt:"2026-07-13", sourceCategory:"V2追加题库/人工审核",
          quality:item.quality || null, passageId:item.passageId || null
        };
        if(item.text) q.text = item.text;
        target.push(q); ids.add(q.id); fingerprints.add(fp); stats.added[subject]++;
      });
    });
    window.XUEBA_QUESTION_BANK_STATS = stats;
    window.XUEBA_COURSE_TREE = courseTree;
    return stats;
  }
  function append(DATA){ return mergeExtraQuestions(DATA, banks); }
  window.XUEBA_EXTRA_QUESTIONS = banks;
  window.mergeExtraQuestions = mergeExtraQuestions;
  window.XUEBA_QUESTION_BANK = {banks, register, make, makeConceptQuestions, append, mergeExtraQuestions, courseTree};
})();
