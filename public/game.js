const CDN='https://lichess1.org/assets/_RjIHGH/piece/cburnett/';
const PSRC={wK:'wK.svg',wQ:'wQ.svg',wR:'wR.svg',wB:'wB.svg',wN:'wN.svg',wP:'wP.svg',bK:'bK.svg',bQ:'bQ.svg',bR:'bR.svg',bB:'bB.svg',bN:'bN.svg',bP:'bP.svg'};
const socket=io();
let G,MY_COLOR='w',GAME_ACTIVE=false,ROOM_ID=null,DEPTH_UI=1;

function setDepUI(d,btn){DEPTH_UI=d;['dep1','dep2','dep3'].forEach(function(id){var b=document.getElementById(id);if(b){b.classList.remove('active');}});btn.classList.add('active');}
function createRoom(mode){socket.emit('create_room',{mode:mode,depth:DEPTH_UI});}
function joinRoom(){var code=document.getElementById('room-input').value.trim().toUpperCase();if(!code){setMsg('Inserisci un codice.','err');return;}socket.emit('join_room',code);}
function setMsg(txt,type){var el=document.getElementById('msg');if(!el)return;el.textContent=txt;el.className=type||'';}
function leaveGame(){location.reload();}

function showGame(){
  document.getElementById('lobby').style.display='none';
  document.getElementById('game').style.display='flex';
  document.getElementById('myname').textContent=MY_COLOR==='w'?'Tu (Bianco)':'Tu (Nero)';
  document.getElementById('bname').textContent=MY_COLOR==='w'?'Avversario (Nero)':'Avversario (Bianco)';
}

socket.on('room_created',function(data){
  MY_COLOR=data.color;ROOM_ID=data.roomId;
  document.getElementById('room-code').textContent=data.roomId;
  showGame();
  setMsg('Stanza creata!','ok');
});
socket.on('room_joined',function(data){
  MY_COLOR=data.color;ROOM_ID=data.roomId;
  document.getElementById('room-code').textContent=data.roomId;
  showGame();
});
socket.on('game_start',function(data){
  console.log('game_start ricevuto',data);
  GAME_ACTIVE=true;
  document.getElementById('room-info').textContent=data&&data.mode==='engine'?'Giochi vs Stockfish!':'Partita iniziata!';
  resetGame();
});
socket.on('opponent_move',function(move){applyOpponentMove(move);});
socket.on('engine_move',function(data){
  console.log('engine_move:',data.move);
  var m=data.move;
  var fc=m.charCodeAt(0)-97;
  var fr=8-parseInt(m[1]);
  var tc=m.charCodeAt(2)-97;
  var tr=8-parseInt(m[3]);
  var promo=m[4]?m[4].toUpperCase():null;
  applyEngineMove(fr,fc,tr,tc,promo);
});
socket.on('opponent_left',function(){GAME_ACTIVE=false;document.getElementById('st').innerHTML='<span style="color:#f87171">Avversario disconnesso.</span>';});
socket.on('error',function(msg){setMsg(msg,'err');});

function mkBoard(){var b=[];for(var r=0;r<8;r++){b.push([]);for(var c=0;c<8;c++)b[r].push(null);}var bk=['R','N','B','Q','K','B','N','R'];for(var c=0;c<8;c++){b[0][c]={t:bk[c],col:'b',mv:false};b[1][c]={t:'P',col:'b',mv:false};b[6][c]={t:'P',col:'w',mv:false};b[7][c]={t:bk[c],col:'w',mv:false};}return b;}
function resetGame(){
  console.log('resetGame chiamato');
  G={b:mkBoard(),turn:'w',sel:null,mvs:[],lm:null,log:[],over:false};
  render([]);setSt();
  document.getElementById('ml').innerHTML='<span style="color:#555">-</span>';
}
function inB(r,c){return r>=0&&r<8&&c>=0&&c<8;}
function gp(b,r,c){return inB(r,c)?b[r][c]:null;}
function slide(b,r,c,dr,dc){var p=b[r][c],m=[],nr=r+dr,nc=c+dc;while(inB(nr,nc)){if(!b[nr][nc])m.push([nr,nc]);else{if(b[nr][nc].col!==p.col)m.push([nr,nc]);break;}nr+=dr;nc+=dc;}return m;}
function pseudo(b,r,c,lm){var p=b[r][c];if(!p)return[];var m=[],t=p.t,col=p.col,dir=col==='w'?-1:1;if(t==='P'){if(inB(r+dir,c)&&!b[r+dir][c])m.push([r+dir,c]);if(r===(col==='w'?6:1)&&!b[r+dir][c]&&!b[r+2*dir][c])m.push([r+2*dir,c]);var dcs=[-1,1];for(var i=0;i<dcs.length;i++){var dc=dcs[i],tp=gp(b,r+dir,c+dc);if(tp&&tp.col!==col)m.push([r+dir,c+dc]);}if(lm){var lfr=lm[0][0],lfc=lm[0][1],ltr=lm[1][0],ltc=lm[1][1],lp=b[ltr][ltc];if(lp&&lp.t==='P'&&lp.col!==col&&Math.abs(lfr-ltr)===2&&ltr===r){if(ltc===c-1)m.push([r+dir,c-1]);if(ltc===c+1)m.push([r+dir,c+1]);}}}var km=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];if(t==='N'){for(var i=0;i<km.length;i++){var tp=gp(b,r+km[i][0],c+km[i][1]);if(inB(r+km[i][0],c+km[i][1])&&(!tp||tp.col!==col))m.push([r+km[i][0],c+km[i][1]]);}}var dd=[[-1,-1],[-1,1],[1,-1],[1,1]],sd=[[-1,0],[1,0],[0,-1],[0,1]];if(t==='B'||t==='Q'){for(var i=0;i<dd.length;i++)m=m.concat(slide(b,r,c,dd[i][0],dd[i][1]));}if(t==='R'||t==='Q'){for(var i=0;i<sd.length;i++)m=m.concat(slide(b,r,c,sd[i][0],sd[i][1]));}if(t==='K'){var ad=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];for(var i=0;i<ad.length;i++){var tp=gp(b,r+ad[i][0],c+ad[i][1]);if(inB(r+ad[i][0],c+ad[i][1])&&(!tp||tp.col!==col))m.push([r+ad[i][0],c+ad[i][1]]);}var br=col==='w'?7:0;if(r===br&&c===4&&!p.mv){var rh=b[br][7];if(rh&&rh.t==='R'&&!rh.mv&&!b[br][5]&&!b[br][6])m.push([br,6]);var rq=b[br][0];if(rq&&rq.t==='R'&&!rq.mv&&!b[br][1]&&!b[br][2]&&!b[br][3])m.push([br,2]);}}return m;}
function kPos(b,col){for(var r=0;r<8;r++)for(var c=0;c<8;c++)if(b[r][c]&&b[r][c].t==='K'&&b[r][c].col===col)return[r,c];return null;}
function inChk(b,col){var kp=kPos(b,col);if(!kp)return false;var opp=col==='w'?'b':'w';for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=b[r][c];if(!p||p.col!==opp)continue;var mv=pseudo(b,r,c,null);for(var i=0;i<mv.length;i++)if(mv[i][0]===kp[0]&&mv[i][1]===kp[1])return true;}return false;}
function cloneB(b){return b.map(function(row){return row.map(function(c){return c?Object.assign({},c):null;});});}
function applyRaw(b,fr,fc,tr,tc){var p=b[fr][fc];if(p.t==='P'&&fc!==tc&&!b[tr][tc])b[p.col==='w'?tr+1:tr-1][tc]=null;if(p.t==='K'&&Math.abs(fc-tc)===2){var br=p.col==='w'?7:0;if(tc===6){b[br][5]=b[br][7];b[br][7]=null;if(b[br][5])b[br][5].mv=true;}if(tc===2){b[br][3]=b[br][0];b[br][0]=null;if(b[br][3])b[br][3].mv=true;}}b[tr][tc]=p;b[fr][fc]=null;p.mv=true;}
function legalMoves(b,r,c,lm){return pseudo(b,r,c,lm).filter(function(mv){var nb=cloneB(b);applyRaw(nb,r,c,mv[0],mv[1]);return!inChk(nb,b[r][c].col);});}
function hasAnyLegal(b,col,lm){for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=b[r][c];if(p&&p.col===col&&legalMoves(b,r,c,lm).length>0)return true;}return false;}
function chaosShuffle(b,col,excl){var pos=[],pcs=[];for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=b[r][c];if(p&&p.col===col&&p.t!=='K'&&p.t!=='P'&&!(r===excl[0]&&c===excl[1])){pos.push([r,c]);pcs.push(p);b[r][c]=null;}}for(var i=pos.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=pos[i];pos[i]=pos[j];pos[j]=tmp;}for(var i=0;i<pcs.length;i++)b[pos[i][0]][pos[i][1]]=pcs[i];var res=[];for(var i=0;i<pos.length;i++)res.push({r:pos[i][0],c:pos[i][1],piece:pcs[i]});return res;}

function boardToFen(){var b=G.b,rows=[];for(var r=0;r<8;r++){var row='',empty=0;for(var c=0;c<8;c++){var p=b[r][c];if(!p){empty++;}else{if(empty>0){row+=empty;empty=0;}var ch=p.t;row+=p.col==='w'?ch:ch.toLowerCase();}}if(empty>0)row+=empty;rows.push(row);}var cas='';var wk=b[7][4],wr1=b[7][7],wr2=b[7][0],bk=b[0][4],br1=b[0][7],br2=b[0][0];if(wk&&wk.t==='K'&&!wk.mv&&wr1&&wr1.t==='R'&&!wr1.mv)cas+='K';if(wk&&wk.t==='K'&&!wk.mv&&wr2&&wr2.t==='R'&&!wr2.mv)cas+='Q';if(bk&&bk.t==='K'&&!bk.mv&&br1&&br1.t==='R'&&!br1.mv)cas+='k';if(bk&&bk.t==='K'&&!bk.mv&&br2&&br2.t==='R'&&!br2.mv)cas+='q';if(cas==='')cas='-';var ep='-';if(G.lm){var ltr=G.lm[1][0],ltc=G.lm[1][1],lp=b[ltr][ltc];if(lp&&lp.t==='P'&&Math.abs(G.lm[0][0]-ltr)===2){var epR=lp.col==='w'?ltr+1:ltr-1;ep='abcdefgh'[ltc]+(8-epR);}}return rows.join('/')+' b '+cas+' '+ep+' 0 1';}

function execMove(fr,fc,tr,tc,chaosResult,promo){
  var b=G.b,p=b[fr][fc];if(!p)return;
  var willPr=p.t==='P'&&(tr===0||tr===7);
  var prevCap=b[tr][tc];
  applyRaw(b,fr,fc,tr,tc);
  if(promo){b[tr][tc]={t:promo,col:p.col,mv:true};}
  else if(willPr&&!chaosResult){var ch=prompt('Promuovi: Q R B N','Q');var pr=(['Q','R','B','N'].indexOf((ch||'Q').toUpperCase())>=0)?(ch||'Q').toUpperCase():'Q';b[tr][tc]={t:pr,col:p.col,mv:true};}
  var anim=[],isMyMove=!chaosResult;
  if(isMyMove){
    var chaos=chaosShuffle(b,p.col,[tr,tc]);
    anim=chaos.map(function(x){return[x.r,x.c];});
    var fen=boardToFen();
    socket.emit('move',{roomId:ROOM_ID,move:{fr:fr,fc:fc,tr:tr,tc:tc,chaos:chaos},fen:fen});
  }else{
    for(var i=0;i<chaosResult.length;i++){var x=chaosResult[i];b[x.r][x.c]=x.piece;anim.push([x.r,x.c]);}
  }
  G.lm=[[fr,fc],[tr,tc]];
  var f='abcdefgh',rk='87654321';
  var san=(p.t==='P'?'':p.t)+(p.t==='P'&&prevCap?f[fc]:'')+(prevCap?'x':'')+f[tc]+rk[tr];
  G.log.push({san:san,col:p.col});updML();
  G.turn=G.turn==='w'?'b':'w';
  render(anim);setSt();
}

function applyOpponentMove(move){
  var b=G.b;
  if(move.chaos){var opp=MY_COLOR==='w'?'b':'w';for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=b[r][c];if(p&&p.col===opp&&p.t!=='K'&&!(r===move.tr&&c===move.tc))b[r][c]=null;}}
  execMove(move.fr,move.fc,move.tr,move.tc,move.chaos||[],move.promo||null);
}

function applyEngineMove(fr,fc,tr,tc,promo){
  var b=G.b,p=b[fr][fc];if(!p)return;
  var prevCap=b[tr][tc];
  applyRaw(b,fr,fc,tr,tc);
  if(promo)b[tr][tc]={t:promo,col:'b',mv:true};
  var chaos=chaosShuffle(b,'b',[tr,tc]);
  var anim=chaos.map(function(x){return[x.r,x.c];});
  G.lm=[[fr,fc],[tr,tc]];
  var f='abcdefgh',rk='87654321';
  var p2=b[tr][tc];
  var san=(p2&&p2.t!=='P'?p2.t:'')+f[tc]+rk[tr];
  G.log.push({san:san,col:'b'});updML();
  G.turn='w';
  render(anim);setSt();
}

function render(anim){
  var el=document.getElementById('board');
  while(el.firstChild)el.removeChild(el.firstChild);
  var b=G.b,f='abcdefgh',rk='87654321';
  var animSet={};for(var i=0;i<anim.length;i++)animSet[anim[i][0]*8+anim[i][1]]=true;
  for(var r=0;r<8;r++)for(var c=0;c<8;c++){
    var dr=MY_COLOR==='b'?7-r:r;var dc=MY_COLOR==='b'?7-c:c;
    var isL=(dr+dc)%2===0;
    var sq=document.createElement('div');sq.className='sq '+(isL?'l':'d');
    if(G.lm){var lfr=G.lm[0][0],lfc=G.lm[0][1],ltr=G.lm[1][0],ltc=G.lm[1][1];if((dr===lfr&&dc===lfc)||(dr===ltr&&dc===ltc))sq.classList.add(isL?'ll':'ld');}
    if(G.sel&&G.sel[0]===dr&&G.sel[1]===dc)sq.classList.add('sel');
    var mvMatch=false;for(var i=0;i<G.mvs.length;i++)if(G.mvs[i][0]===dr&&G.mvs[i][1]===dc){mvMatch=true;break;}
    if(mvMatch)sq.classList.add(b[dr][dc]?'cap':'mv');
    var kp=kPos(b,G.turn);if(kp&&kp[0]===dr&&kp[1]===dc&&inChk(b,G.turn))sq.classList.add('chk');
    if(r===7){var s=document.createElement('span');s.className='coord fi';s.textContent=f[dc];sq.appendChild(s);}
    if(c===0){var s=document.createElement('span');s.className='coord ra';s.textContent=rk[dr];sq.appendChild(s);}
    var p=b[dr][dc];
    if(p){var img=document.createElement('img');img.src=CDN+PSRC[p.col+p.t];img.alt=p.col+p.t;if(animSet[dr*8+dc])sq.classList.add('ca');sq.appendChild(img);}
    (function(rr,cc){
    sq.addEventListener('click',function(){handleClick(rr,cc);});
    sq.addEventListener('dragstart',function(e){
      if(!GAME_ACTIVE||G.over)return;
      var p=G.b[rr][cc];
      if(!p||p.col!==MY_COLOR||G.turn!==MY_COLOR){e.preventDefault();return;}
      e.dataTransfer.setData('text/plain', rr+','+cc);
      var p=G.b[rr][cc];
      if(p){
        var dragImg=new Image();
        dragImg.src=CDN+PSRC[p.col+p.t];
        dragImg.width=56;dragImg.height=56;
        dragImg.style.position='absolute';dragImg.style.top='-100px';
        document.body.appendChild(dragImg);
        e.dataTransfer.setDragImage(dragImg,28,28);
        setTimeout(function(){document.body.removeChild(dragImg);},0);
      }
      G.sel=[rr,cc];G.mvs=legalMoves(G.b,rr,cc,G.lm);
      sq.style.opacity='0.4';
      setTimeout(function(){render([]);},0);
    });
    sq.addEventListener('dragend',function(){sq.style.opacity='1';});
    sq.addEventListener('dragover',function(e){e.preventDefault();sq.style.background='rgba(255,255,100,0.5)';});
    sq.addEventListener('dragleave',function(){sq.style.background='';});
    sq.addEventListener('drop',function(e){
      e.preventDefault();sq.style.background='';
      var data=e.dataTransfer.getData('text/plain').split(',');
      var fr=parseInt(data[0]),fc=parseInt(data[1]);
      var isTarget=false;
      for(var i=0;i<G.mvs.length;i++)if(G.mvs[i][0]===rr&&G.mvs[i][1]===cc){isTarget=true;break;}
      if(isTarget){G.sel=null;G.mvs=[];execMove(fr,fc,rr,cc,null,null);}
      else{G.sel=null;G.mvs=[];render([]);}
    });
    sq.setAttribute('draggable', G.b[rr][cc]&&G.b[rr][cc].col===MY_COLOR?'true':'false');
  })(dr,dc);
    el.appendChild(sq);
  }
  document.getElementById('dw').classList.toggle('on',G.turn===MY_COLOR);
  document.getElementById('db').classList.toggle('on',G.turn!==MY_COLOR);
}

function handleClick(r,c){
  if(!GAME_ACTIVE||G.over)return;if(G.turn!==MY_COLOR)return;
  var b=G.b,p=b[r][c];
  if(G.sel){
    var sr=G.sel[0],sc=G.sel[1];
    var isTarget=false;for(var i=0;i<G.mvs.length;i++)if(G.mvs[i][0]===r&&G.mvs[i][1]===c){isTarget=true;break;}
    if(isTarget){G.sel=null;G.mvs=[];execMove(sr,sc,r,c,null,null);return;}
    G.sel=null;G.mvs=[];
    if(p&&p.col===MY_COLOR){G.sel=[r,c];G.mvs=legalMoves(b,r,c,G.lm);}
  }else{if(p&&p.col===MY_COLOR){G.sel=[r,c];G.mvs=legalMoves(b,r,c,G.lm);}}
  render([]);
}

function setSt(){
  var el=document.getElementById('st');if(G.over)return;
  var isMyTurn=G.turn===MY_COLOR;
  var chk=inChk(G.b,G.turn),any=hasAnyLegal(G.b,G.turn,G.lm);
  if(!any){G.over=true;var winner=G.turn===MY_COLOR?'Vince avversario!':'Hai vinto!';el.innerHTML=chk?'<span style="color:'+(G.turn===MY_COLOR?'#f87171':'#4ade80')+'">Scaccomatto - '+winner+'</span>':'<span style="color:#4ade80">Stallo - patta</span>';return;}
  if(chk)el.innerHTML='<span style="color:#f87171">'+(isMyTurn?'Sei':'Avversario')+' in scacco!</span>';
  else el.innerHTML=isMyTurn?'<span style="color:#4ade80">Tocca a te</span>':'<span style="color:#888">Turno avversario</span>';
}

function updML(){
  var el=document.getElementById('ml');if(!G.log.length){el.innerHTML='<span style="color:#555">-</span>';return;}
  var h='';for(var i=0;i<G.log.length;i+=2){var n=Math.floor(i/2)+1,w=G.log[i],bm=G.log[i+1];h+='<div class="mr"><span class="mn">'+n+'.</span><span class="ms">'+w.san+'</span>'+(bm?'<span class="ms bm"> '+bm.san+'</span>':'')+'</div>';}
  el.innerHTML=h;el.scrollTop=el.scrollHeight;
}
