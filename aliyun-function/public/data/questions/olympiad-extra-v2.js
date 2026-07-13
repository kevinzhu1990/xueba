(function(){
  const B=window.XUEBA_QUESTION_BANK,out=[];
  const opts=(answer,wrong)=>{const a=[String(answer)];wrong.map(String).forEach(x=>{if(!a.includes(x))a.push(x);});while(a.length<4)a.push(`${a.length}-${String(answer)}`);return a;};
  const add=(id,unit,tag,level,question,answer,wrong,ex)=>out.push(B.make("olympiad",`v2-olympiad-${id}`,4,unit,tag,level,"single",question,opts(answer,wrong),String(answer),ex,{courseType:"thinking",practiceType:level>=4?"reasoning":"application"}));
  for(let i=1;i<=10;i++){const n=3+i;add(`pattern-${i}`,"入门","找规律",2,`找规律：${n}, ${n+3}, ${n+6}, 下一项是？`,n+9,[n+8,n+10,n+12],"相邻两项每次增加3。");}
  for(let i=1;i<=10;i++){const n=20+i*5;add(`clever-${i}`,"入门","巧算",2,`${n-1}+${n}+${n+1} 最适合怎样算？`,`3×${n}`,[`${n}×2`,`3×${n+1}`,`${n-1}×3`],"首尾相加等于中间数的两倍，三个数的和就是中间数的3倍。");}
  for(let i=1;i<=10;i++){const front=2+i,back=3+i;add(`queue-${i}`,"入门","排队",2,`小朋友前面有${front}人，后面有${back}人，一共有多少人？`,front+back+1,[front+back,front+back+2,front*back],"排队人数要把小朋友本人也算进去。");}
  for(let i=1;i<=10;i++){const gap=4+i;add(`plant-${i}`,"提高","植树",3,`一条路有${gap}个间隔，两端都种树，需要几棵？`,gap+1,[gap,gap+2,gap-1],"两端都种时，树的棵数比间隔数多1。");}
  for(let i=1;i<=10;i++){const rabbits=2+i,animals=8+i%3;add(`chicken-${i}`,"提高","鸡兔同笼",4,`鸡兔同笼共${animals}只，兔有${rabbits}只，共有多少条腿？`,animals*2+rabbits*2,[animals*2+rabbits,animals*4,animals+rabbits*2],"鸡每只2条腿，兔每只4条腿，分开计算后相加。");}
  for(let i=1;i<=10;i++){const age=6+i;add(`age-${i}`,"提高","年龄问题",4,`小明今年${age}岁，爸爸比他大28岁，爸爸今年几岁？`,age+28,[age+18,age+20,28-age],"年龄差不会随时间改变，所以直接相加。");}
  for(let i=1;i<=10;i++){const p=3+i;add(`cycle-${i}`,"提高","周期",4,`红、黄、蓝${p}次循环，第${p*3+2}个颜色是什么？`,"黄",["红","蓝","绿"],"完整循环后余数为2，对应第二个颜色黄。");}
  for(let i=1;i<=10;i++){const cost=10+i,profit=3+i;add(`profit-${i}`,"提高","盈亏",4,`物品成本${cost}元，卖出赚${profit}元，售价是多少？`,cost+profit,[cost-profit,cost+profit+1,profit],"售价=成本+利润。");}
  for(let i=1;i<=10;i++){const n=10+i;add(`logic-${i}`,"挑战","逻辑推理",5,`甲比乙多${n}分，乙比丙多5分，甲比丙多多少分？`,n+5,[n,n-5,n+10],"两个差值可以沿着关系链相加。");}
  for(let i=1;i<=10;i++){const sticks=5+i;add(`match-${i}`,"挑战","火柴棒",5,`用${sticks}根火柴摆出正方形，每边至少需要几根？`,Math.ceil(sticks/4),[Math.floor(sticks/4),sticks-4,2],"先把总数平均分给四条边，再向上取整理解最少数量。");}
  B.register("olympiad",out);
})();
