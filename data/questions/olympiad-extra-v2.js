(function(){
  const B=window.XUEBA_QUESTION_BANK,out=[];
  const unique=(a,w)=>{const out=[String(a)];w.map(String).forEach(x=>{if(!out.includes(x))out.push(x);});while(out.length<4)out.push(out.length+"-"+a);return out;};
  const add=(id,unit,tag,level,q,a,w,ex)=>out.push(B.make("olympiad","v2-olympiad-"+id,4,unit,tag,level,"single",q,unique(a,w),String(a),ex,{courseType:"thinking",practiceType:level>=4?"reasoning":"application"}));
  for(let i=1;i<=10;i++){const n=3+i;add("pattern-"+i,"入门","找规律",2,"找规律："+n+", "+(n+3)+", "+(n+6)+", 下一项是？",n+9,[n+8,n+10,n+12],"相邻两项每次增加3。");}
  for(let i=1;i<=10;i++){const n=20+i*5;add("clever-"+i,"入门","巧算",2,(n-1)+"+"+n+"+"+(n+1)+" 最适合怎样算？","3×"+n,[n+"×2","3×"+(n+1),(n-1)+"×3"],"首尾相加等于中间数的两倍，三个数的和就是中间数的3倍。");}
  for(let i=1;i<=10;i++){const front=2+i,back=3+i;add("queue-"+i,"入门","排队",2,"小朋友前面有"+front+"人，后面有"+back+"人，一共有多少人？",front+back+1,[front+back,front+back+2,front*back],"排队人数要把小朋友本人也算进去。");}
  for(let i=1;i<=10;i++){const gap=4+i;add("plant-"+i,"提高","植树",3,"一条路有"+gap+"个间隔，两端都种树，需要几棵？",gap+1,[gap,gap+2,gap-1],"两端都种时，树的棵数比间隔数多1。");}
  const chicken=[[12,32,4],[15,42,6],[18,48,6],[20,56,8],[9,22,2]];
  chicken.forEach(([total,legs,rabbits],i)=>{const chickens=total-rabbits;add("chicken-forward-"+(i+1),"提高","鸡兔同笼",4,"鸡和兔共有"+total+"只，共有"+legs+"条腿。兔有几只？",rabbits,[rabbits-1,rabbits+1,chickens],"假设全是鸡："+total+"×2="+(total*2)+"条腿；实际多出"+(legs-total*2)+"条腿；每只兔比鸡多2条腿；兔有"+(legs-total*2)+"÷2="+rabbits+"只；鸡有"+total+"-"+rabbits+"="+chickens+"只。");});
  [[7,5],[8,4],[6,9],[11,3],[5,7]].forEach(([chickens,rabbits],i)=>{const total=chickens+rabbits,legs=chickens*2+rabbits*4;add("chicken-reverse-"+(i+1),"提高","鸡兔同笼",4,"鸡有"+chickens+"只，兔有"+rabbits+"只，一共有多少条腿？",legs,[total*2,legs-2,legs+2],"鸡有"+chickens+"×2="+(chickens*2)+"条腿，兔有"+rabbits+"×4="+(rabbits*4)+"条腿，合计"+legs+"条。");});
  [[8,4],[10,5],[12,6],[14,7],[16,8]].forEach(([total,rabbits],i)=>{const extra=rabbits*2,legs=total*2+extra,chickens=total-rabbits;add("chicken-difference-"+(i+1),"提高","鸡兔同笼",4,"鸡兔共有"+total+"只。假设全是鸡，比实际少"+extra+"条腿，兔有几只？",rabbits,[rabbits-1,rabbits+1,chickens],"假设全是鸡："+total+"×2条腿；实际多"+extra+"条腿；每只兔多2条腿，所以兔有"+extra+"÷2="+rabbits+"只，鸡有"+chickens+"只。");});
  for(let i=1;i<=10;i++){const age=6+i;add("age-"+i,"提高","年龄问题",4,"小明今年"+age+"岁，爸爸比他大28岁，爸爸今年几岁？",age+28,[age+18,age+20,28-age],"年龄差不会随时间改变，所以直接相加。");}
  for(let i=1;i<=10;i++){const p=3+i;add("cycle-"+i,"提高","周期",4,"红、黄、蓝循环，第"+(p*3+2)+"个颜色是什么？","黄",["红","蓝","绿"],"完整循环后余数为2，对应第二个颜色黄。");}
  for(let i=1;i<=10;i++){const cost=10+i,profit=3+i;add("profit-"+i,"提高","盈亏",4,"物品成本"+cost+"元，卖出赚"+profit+"元，售价是多少？",cost+profit,[cost-profit,cost+profit+1,profit],"售价=成本+利润。");}
  for(let i=1;i<=10;i++){const n=10+i;add("logic-"+i,"挑战","逻辑推理",5,"甲比乙多"+n+"分，乙比丙多5分，甲比丙多多少分？",n+5,[n,n-5,n+10],"两个差值可以沿着关系链相加。");}
  for(let n=1;n<=10;n++)add("match-"+n,"挑战","火柴棒",5,"用火柴棒摆"+n+"个首尾相连、共用边的正方形，需要多少根？",3*n+1,[4*n,3*n,3*n+2],"第1个正方形需要4根；每增加1个相连正方形只增加3根，所以需要4+3×("+n+"-1)="+(3*n+1)+"根。");
  B.register("olympiad",out);
})();
