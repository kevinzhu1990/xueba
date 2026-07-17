(function(){
  const stages=["知识卡","例题","基础练习","应用练习","综合练习","单元检测","复习"],out=[];
  const units=["数与计算","图形与几何","统计与概率","解决问题","分数与小数","综合实践"];
  for(let grade=1;grade<=6;grade++)units.forEach((unit,i)=>out.push({id:`math-g${grade}-s${i<3?1:2}-unit${i+1}-kp1`,subject:"math",grade,semester:i<3?1:2,unit,knowledgePoint:`${grade}年级${unit}核心知识`,prerequisites:i? [units[i-1]]:[],stages,order:grade*10+i}));
  window.XUEBA_DETAILED_CURRICULUM=window.XUEBA_DETAILED_CURRICULUM||{};window.XUEBA_DETAILED_CURRICULUM.math=out;
})();
