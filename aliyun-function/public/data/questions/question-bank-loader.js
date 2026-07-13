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
    return Object.assign({id, subject, grade, unit, tag, level, type, question, options, answer, explanation, verified:true}, extra || {});
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
          explain:clean(item.explanation), verified:true, verifiedAt:"2026-07-13", sourceCategory:"V2追加题库/人工审核"
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
  window.XUEBA_QUESTION_BANK = {banks, register, make, append, mergeExtraQuestions, courseTree};
})();
