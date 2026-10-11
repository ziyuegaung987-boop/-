// Thirty hand-directed scenes, painted with Canvas so each level has its own backdrop.
// Palette: sky top, horizon, distant land, middle land, foreground, highlight.
const art = [
  ['#d5e9e8','#fff0d0','#a9c8c0','#6e9e9c','#396b72','#e9b17f','willow'],
  ['#b7dde6','#f6ead6','#95b9bd','#648f9b','#376b78','#e8a477','bridge'],
  ['#edd7a7','#fff1d2','#c9b891','#968d73','#61796e','#f6cb6f','boat'],
  ['#cce1dd','#f7e4cb','#a9bfc0','#7f9f9f','#4b7182','#de9a71','eaves'],
  ['#8daeb8','#d7d6cc','#728f98','#527783','#315b6c','#f2d6b6','rain'],
  ['#f3d7d5','#fff1d9','#d6c5b7','#a6a99b','#577f7b','#eea4ab','blossom'],
  ['#b6d7d1','#e5edda','#9cbaba','#618f96','#3d7180','#e2b784','river'],
  ['#df9d83','#f4d8aa','#ba9d9a','#8c7e8c','#4b6880','#ffe1a5','ferry'],
  ['#d0d6cf','#f3e5c8','#a4b7b9','#6d9599','#3e7181','#e8a983','twins'],
  ['#b7cfdb','#fff0d6','#9bbfbd','#698e9e','#416c80','#fff0b9','cloudgate'],
  ['#b8d9d5','#eaf2dc','#a7c8b9','#638b8d','#3b6969','#d9eedc','pine'],
  ['#d5e8dc','#faf0cf','#aabfba','#7c9e9c','#4e7378','#e8be7c','bells'],
  ['#aeced2','#f4e8d8','#9bb6bb','#718da5','#526e82','#f4f2e5','cloudsea'],
  ['#657b99','#c3bac2','#677594','#475979','#344365','#efdbb0','thunder'],
  ['#cc9fae','#f7d1a5','#a989aa','#796e9a','#514f7f','#ffe0ac','swirl'],
  ['#a4c2bf','#e8dfcc','#819fa5','#5a8489','#385d70','#e3c3ab','pines'],
  ['#b2dad5','#e8f2df','#83adaf','#5b8798','#376e87','#e5ffff','falls'],
  ['#9bbabf','#eddbbf','#7b9da9','#577c91','#355b77','#eee0b3','canyon'],
  ['#9faac5','#e9d7d1','#7f91b2','#566e95','#394f7a','#f2d7c6','peaks'],
  ['#b9cfce','#fff0cd','#9eb6b3','#7190a0','#4b7287','#fff1cc','temple'],
  ['#202a53','#596994','#35436d','#27335d','#192c53','#ffd890','fireflies'],
  ['#273258','#7b82af','#4d5b88','#344675','#223961','#f8e4b4','moonbridge'],
  ['#3e416e','#9b80ae','#675d99','#464c87','#292f6b','#f8caa7','starfield'],
  ['#252c58','#615d91','#414b83','#303d71','#202e5b','#f5c8a9','meteor'],
  ['#182c55','#516a99','#2b5489','#26416e','#173a69','#f9e4a8','constellation'],
  ['#23385f','#548a9a','#386e89','#2b527b','#174264','#a3e6d4','aurora'],
  ['#323862','#917da9','#5d638f','#414877','#2d3a71','#ffe9b2','galaxy'],
  ['#1e2a57','#665c91','#444a83','#2b3b75','#1e2f65','#f2c9c3','doublemeteor'],
  ['#525a84','#b4a0ad','#7c80a7','#5e6f9d','#3c5880','#ffe0ad','predawn'],
  ['#789cb3','#f9d8b5','#a0a8b8','#718b9e','#41697e','#fff0ba','observatory'],
];
export const scenePalette = level => art[level.id - 1];

function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function line(ctx,points,color,width=2){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))ctx.lineTo(x,y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function polygon(ctx,points,color){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))ctx.lineTo(x,y);ctx.closePath();ctx.fillStyle=color;ctx.fill()}
function hills(ctx,w,h,color,y,seed){ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,y);for(let x=0;x<=w+w/5;x+=w/5){ctx.quadraticCurveTo(x+w/10,y-h*(.06+((seed+x/w*7)%3)*.025),x+w/5,y+Math.sin(seed+x/w*11)*h*.018)}ctx.lineTo(w,h);ctx.fillStyle=color;ctx.fill()}
function cloud(ctx,x,y,s,color){ellipse(ctx,x,y,42*s,12*s,color);ellipse(ctx,x-18*s,y-6*s,23*s,13*s,color);ellipse(ctx,x+14*s,y-9*s,27*s,17*s,color)}
function roof(ctx,x,y,s,wall,tile){ctx.fillStyle=wall;ctx.fillRect(x-38*s,y,76*s,75*s);polygon(ctx,[[x-53*s,y+4*s],[x,y-29*s],[x+53*s,y+4*s]],tile);line(ctx,[[x-56*s,y+4*s],[x+56*s,y+4*s]],tile,3*s);ctx.fillStyle=tile;ctx.fillRect(x-9*s,y+29*s,18*s,42*s)}
function bridge(ctx,x,y,s,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-130*s,y);ctx.quadraticCurveTo(x,y-100*s,x+130*s,y);ctx.lineTo(x+130*s,y+15*s);ctx.quadraticCurveTo(x,y-70*s,x-130*s,y+15*s);ctx.fill();line(ctx,[[x-125*s,y-4*s],[x-70*s,y-47*s],[x,y-65*s],[x+70*s,y-47*s],[x+125*s,y-4*s]],color,4*s)}
function pine(ctx,x,y,s,dark){polygon(ctx,[[x,y-85*s],[x-45*s,y+20*s],[x+45*s,y+20*s]],dark);polygon(ctx,[[x,y-110*s],[x-36*s,y-15*s],[x+36*s,y-15*s]],dark);ctx.fillStyle=dark;ctx.fillRect(x-4*s,y+15*s,8*s,35*s)}
function star(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,radius=i%2?r*.23:r;ctx.lineTo(x+Math.cos(a)*radius,y+Math.sin(a)*radius)}ctx.closePath();ctx.fill()}
function tower(ctx,x,y,s,color){ctx.fillStyle=color;ctx.fillRect(x-16*s,y-75*s,32*s,100*s);for(let i=0;i<3;i++)polygon(ctx,[[x-34*s,y-(i*25+20)*s],[x,y-(i*25+48)*s],[x+34*s,y-(i*25+20)*s]],color)}

function jiangnan(ctx,w,h,p,level,t,d){
  const [,,far,mid,front,accent,motif]=p,waterY=h*.76;
  hills(ctx,w,h,far,h*.60,level.id);hills(ctx,w,h,mid,h*.71,level.id+3);
  ctx.fillStyle=front;ctx.fillRect(0,waterY,w,h-waterY);
  const shift=(d*.07)%(w*.12);
  for(let i=0;i<7;i++){const x=(i+.2)*w/6-shift;line(ctx,[[x,waterY+h*.035+(i%3)*h*.05],[x+w*.08,waterY+h*.035+(i%3)*h*.05]],accent+'80',2)}
  for(let i=0;i<4;i++)roof(ctx,(i+.6)*w/4-shift*.4,h*(.61+(i%2)*.055),.48+(i%2)*.14,far,mid);
  if(motif==='willow'||motif==='blossom'){
    const x=w*.87,y=h*.34;line(ctx,[[x,h*.78],[x-18,h*.37],[x-58,y]],front,11);
    for(let i=0;i<13;i++){const ax=x-80+i*12,by=y-32+(i%4)*8;line(ctx,[[x-45,y-20],[ax,by],[ax-12,h*(.46+(i%3)*.04)]],motif==='blossom'?front:mid,2.5);if(motif==='blossom')for(let j=0;j<3;j++)ellipse(ctx,ax+(j-1)*9,by+(j%2)*7,6,4,accent)}
  }
  if(motif==='bridge'||motif==='twins'){bridge(ctx,w*.56,waterY-h*.01,.85,front);if(motif==='twins')bridge(ctx,w*.13,waterY+h*.05,.47,mid)}
  if(motif==='boat'||motif==='ferry'){const x=w*(motif==='boat'?.55:.7),y=waterY+h*.11;polygon(ctx,[[x-77,y],[x+82,y],[x+53,y+24],[x-42,y+24]],front);line(ctx,[[x,y],[x,y-95]],front,3);polygon(ctx,[[x+5,y-91],[x+56,y-21],[x+5,y-21]],accent)}
  if(motif==='eaves'||motif==='rain'){polygon(ctx,[[0,0],[w*.32,0],[w*.37,h*.17],[0,h*.10]],front);for(let i=0;i<6;i++)line(ctx,[[w*(i*.06),h*.08],[w*(i*.06+.02),h*.2]],front,3)}
  if(motif==='river'){ctx.fillStyle=far;ctx.beginPath();ctx.moveTo(w*.62,waterY);ctx.bezierCurveTo(w*.8,h*.82,w*.2,h*.91,w*.37,h);ctx.lineTo(w*.85,h);ctx.bezierCurveTo(w*.66,h*.91,w,h*.84,w*.79,waterY);ctx.fill()}
  if(motif==='cloudgate'){tower(ctx,w*.72,h*.69,1,front);cloud(ctx,w*.38,h*.41,1.3,'#fffcf0b5')}
  if(motif==='ferry')for(let i=0;i<5;i++)line(ctx,[[w*.17+i*25,waterY-20],[w*.17+i*25,waterY+35]],front,4);
  if(motif==='twins')for(let i=0;i<2;i++){const x=w*(.35+i*.32),y=h*(.25+i*.08);polygon(ctx,[[x,y-18],[x+16,y],[x,y+18],[x-16,y]],accent);line(ctx,[[x,y+18],[x-8,y+75]],front,1)}
  if(motif==='rain')ctx.fillStyle='#e9f6f57a',ctx.fillRect(0,waterY,w,h-waterY);
}
function shanhai(ctx,w,h,p,level,t,d){
  const [,,far,mid,front,accent,motif]=p;
  polygon(ctx,[[0,h*.73],[w*.21,h*.31],[w*.45,h*.74],[w*.64,h*.22],[w,h*.72],[w,h],[0,h]],far);
  polygon(ctx,[[0,h*.94],[w*.32,h*.42],[w*.57,h*.92],[w*.79,h*.34],[w,h*.76],[w,h],[0,h]],mid);
  polygon(ctx,[[0,h*.82],[w*.17,h*.67],[w*.38,h],[w*.77,h*.67],[w,h*.82],[w,h],[0,h]],front);
  const x=w*(.65-(d*.00004)% .12),y=h*.67;
  if(motif==='pine'||motif==='pines'||motif==='bells'){for(let i=0;i<5;i++)pine(ctx,w*(i*.25)-20,h*(.72+(i%2)*.1),.65+(i%3)*.2,front)}
  if(motif==='bells'){for(let i=0;i<4;i++){const bx=w*(.3+i*.13),by=h*(.22+i%2*.05);line(ctx,[[bx,0],[bx,by]],front,1);polygon(ctx,[[bx-9,by],[bx+9,by],[bx+12,by+19],[bx-12,by+19]],accent);ellipse(ctx,bx,by+20,4,3,front)}}
  if(motif==='cloudsea'||motif==='temple'){for(let i=0;i<4;i++)cloud(ctx,w*(i*.29),h*(.66+(i%2)*.09),1.4,'#fffaf0b8')}
  if(motif==='thunder'){line(ctx,[[w*.7,h*.19],[w*.64,h*.37],[w*.75,h*.36],[w*.66,h*.57]],accent,5);cloud(ctx,w*.68,h*.19,1.4,front)}
  if(motif==='swirl'||motif==='canyon'){for(let i=0;i<4;i++){const y=h*(.22+i*.12);ctx.beginPath();ctx.moveTo(w*.48,y);ctx.bezierCurveTo(w*.61,y-25,w*.74,y+22,w*.91,y-8);ctx.strokeStyle=accent+'af';ctx.lineWidth=2+i*.3;ctx.stroke()}}
  if(motif==='falls'){ctx.fillStyle=accent+'b5';ctx.beginPath();ctx.moveTo(w*.64,h*.39);ctx.quadraticCurveTo(w*.61,h*.69,w*.57,h);ctx.lineTo(w*.71,h);ctx.quadraticCurveTo(w*.66,h*.66,w*.68,h*.39);ctx.fill()}
  if(motif==='peaks'){for(let i=0;i<2;i++)polygon(ctx,[[w*(.20+i*.52),h*.22],[w*(.02+i*.52),h*.77],[w*(.38+i*.52),h*.77]],accent+'99')}
  if(motif==='temple'){tower(ctx,x,y,.9,front);line(ctx,[[x-45,y+25],[x+45,y+25]],accent,4)}
  if(motif==='pine'||motif==='pines')for(let i=0;i<9;i++)ellipse(ctx,w*(i*.12),h*(.78+(i%3)*.05),3,3,accent+'a8');
}
function xinghe(ctx,w,h,p,level,t,d){
  const [,,far,mid,front,accent,motif]=p;
  for(let i=0;i<48;i++){const x=((i*137+level.id*71)%997)/997*w,y=((i*83+level.id*29)%663)/663*h*.72,r=i%9===0?2.1:1.1;ellipse(ctx,x,y,r,r,i%7===0?accent:'#fff7d3a9')}
  hills(ctx,w,h,far,h*.70,level.id);hills(ctx,w,h,mid,h*.82,level.id+4);
  ctx.fillStyle=front;ctx.fillRect(0,h*.86,w,h*.14);
  if(motif==='fireflies'||motif==='starfield'){for(let i=0;i<16;i++){const x=((i*53+31)%97)/97*w,y=h*(.45+((i*17)%31)/100);ellipse(ctx,x,y,2+(i%3),2+(i%3),accent)}}
  if(motif==='moonbridge'||motif==='predawn'){ellipse(ctx,w*.72,h*.24,h*.115,h*.115,accent);ellipse(ctx,w*.75,h*.21,h*.105,h*.105,p[0]);bridge(ctx,w*.46,h*.83,.85,front)}
  if(motif==='meteor'||motif==='doublemeteor'){for(let i=0;i<(motif==='meteor'?3:6);i++){const x=w*(.23+i*.13),y=h*(.15+(i%3)*.14);line(ctx,[[x,y],[x-w*.08,y+h*.06]],accent,2);star(ctx,x,y,4,accent)}}
  if(motif==='constellation'){for(let i=0;i<6;i++){const x=w*(.23+i*.12),y=h*(.41+Math.sin(i*2)*.11);if(i)line(ctx,[[w*(.23+(i-1)*.12),h*(.41+Math.sin((i-1)*2)*.11)],[x,y]],accent+'a3',1);star(ctx,x,y,6,accent)}}
  if(motif==='aurora'||motif==='galaxy'){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-w*.1,h*(.29+i*.09));ctx.bezierCurveTo(w*.2,h*(.01+i*.05),w*.6,h*(.45+i*.05),w*1.1,h*(.14+i*.07));ctx.strokeStyle=(motif==='aurora'?'#9debd279':'#eac2ec65');ctx.lineWidth=h*.07;ctx.stroke()}}
  if(motif==='observatory'){ellipse(ctx,w*.70,h*.77,w*.12,h*.17,front);ctx.fillStyle=front;ctx.fillRect(w*.57,h*.75,w*.26,h*.16);ellipse(ctx,w*.70,h*.30,h*.07,h*.07,accent);for(let i=0;i<7;i++)line(ctx,[[w*.7,h*.3],[w*(.3+i*.12),h*.61]],accent+'52',1)}
  if(motif==='fireflies'||motif==='starfield'||motif==='galaxy')for(let i=0;i<12;i++)line(ctx,[[w*(i*.09),h*.88],[w*(i*.09+.01),h*.80-(i%3)*h*.025]],front,2);
}

export function paintScene(ctx,w,h,level,time=0,distance=0){
  const p=scenePalette(level);if(!p)return;
  ctx.save();const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,p[0]);sky.addColorStop(.78,p[1]);sky.addColorStop(1,p[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  if(level.world!==3){ellipse(ctx,w*(level.id%3===0?.72:.80),h*(level.id%4===0?.17:.24),h*.083,h*.083,p[5]+'c9');for(let i=0;i<3;i++)cloud(ctx,w*(.15+i*.31)-(distance*.025)%(w*.1),h*(.18+(i%2)*.12),.7+i*.14,'#fffdf3a0')}
  if(level.world===1)jiangnan(ctx,w,h,p,level,time,distance);
  else if(level.world===2)shanhai(ctx,w,h,p,level,time,distance);
  else xinghe(ctx,w,h,p,level,time,distance);
  const glaze=ctx.createLinearGradient(0,0,0,h);glaze.addColorStop(0,'#ffffff0a');glaze.addColorStop(.7,'#ffffff00');glaze.addColorStop(1,'#173c4a26');ctx.fillStyle=glaze;ctx.fillRect(0,0,w,h);
  ctx.restore();
}
