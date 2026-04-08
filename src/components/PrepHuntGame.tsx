import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   PREP HUNT  —  drag / tap objects to reveal hidden pills
   Lovable-ready: single default export, zero external deps
   ═══════════════════════════════════════════════════════════════ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── PrEP Pill oval ────────────────────────────────────────────
function Pill({ bright }) {
  return (
    <div style={{
      width: 26, height: 13, borderRadius: 13,
      background: bright
        ? "radial-gradient(ellipse at 38% 35%,#e0f7fa 0%,#80deea 42%,#00acc1 100%)"
        : "radial-gradient(ellipse at 38% 35%,#b3e5fc 0%,#29b6f6 46%,#0277bd 100%)",
      boxShadow: bright
        ? "0 0 16px 5px rgba(41,182,246,0.8),inset 0 1px 2px rgba(255,255,255,0.5)"
        : "0 1px 4px rgba(0,0,0,0.6),inset 0 1px 1px rgba(255,255,255,0.38)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:"13%", left:"15%", width:"25%", height:"40%",
        background:"rgba(255,255,255,0.52)", borderRadius:"50%", transform:"rotate(-28deg)", filter:"blur(1px)" }}/>
      <div style={{ position:"absolute", top:"45%", left:"8%", right:"8%", height:1,
        background:"rgba(255,255,255,0.22)" }}/>
    </div>
  );
}

// ─── Object sprite ─────────────────────────────────────────────
function Sprite({ type, w, h, color, label }) {
  const S = { width:"100%", height:"100%", position:"relative", overflow:"hidden" };
  const grad = (a, b, deg=160) =>
    `linear-gradient(${deg}deg,${a} 0%,${b} 100%)`;

  if (type === "book") return (
    <div style={{ ...S, background: grad(color, color+"bb"), borderRadius: 3,
      border: `2px solid ${color}77`, boxShadow: `inset -3px 0 5px rgba(0,0,0,0.28)` }}>
      <div style={{ position:"absolute", left:4, top:4, bottom:4, width:3,
        background:"rgba(255,255,255,0.22)", borderRadius:2 }}/>
      <div style={{ position:"absolute", top:"28%", left:9, right:5, height:2,
        background:"rgba(255,255,255,0.18)", borderRadius:1 }}/>
      <div style={{ position:"absolute", top:"50%", left:9, right:9, height:2,
        background:"rgba(255,255,255,0.12)", borderRadius:1 }}/>
      {label && <div style={{ position:"absolute", bottom:4, left:9, right:4,
        fontSize:7, color:"rgba(255,255,255,0.45)", fontFamily:"monospace",
        overflow:"hidden", whiteSpace:"nowrap" }}>{label}</div>}
    </div>
  );

  if (type === "pile") return (
    <div style={S}>
      {[color,"#e8563a","#3d8fef","#27ae60"].map((c,i)=>(
        <div key={i} style={{ position:"absolute",
          left:`${i*5}%`, top:`${i*6}%`, width:`${96-i*5}%`, height:`${88-i*6}%`,
          borderRadius:"38% 62% 48% 52%", background:c,
          opacity:0.84-i*0.1, transform:`rotate(${i*8-6}deg)` }}/>
      ))}
    </div>
  );

  if (type === "pillow") return (
    <div style={{ ...S, background: grad("#f5f0e8","#ddd5c8"), borderRadius:14,
      border:"1.5px solid rgba(0,0,0,0.09)" }}>
      <div style={{ position:"absolute", inset:6, borderRadius:10,
        border:"1px dashed rgba(0,0,0,0.1)" }}/>
      <div style={{ position:"absolute", top:"28%", left:"14%", width:"24%", height:"36%",
        background:"rgba(255,255,255,0.38)", borderRadius:"50%", filter:"blur(3px)" }}/>
    </div>
  );

  if (type === "blanket") return (
    <div style={{ ...S, borderRadius:8,
      background:`repeating-linear-gradient(135deg,${color} 0px,${color} 14px,${color}bb 14px,${color}bb 28px)` }}>
      <div style={{ position:"absolute", inset:0,
        background:"radial-gradient(ellipse at 30% 35%,rgba(255,255,255,0.08) 0%,transparent 55%)" }}/>
    </div>
  );

  if (type === "laptop") return (
    <div style={{ ...S, background: grad("#2d3a4a","#1a2535"), borderRadius:6,
      border:"2px solid #3d5068" }}>
      <div style={{ position:"absolute", inset:4, borderRadius:3,
        background:"rgba(29,185,84,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"rgba(29,185,84,0.45)" }}/>
      </div>
      <div style={{ position:"absolute", bottom:3, left:"30%", right:"30%", height:2,
        background:"rgba(255,255,255,0.09)", borderRadius:1 }}/>
    </div>
  );

  if (type === "bag") return (
    <div style={{ ...S, background: grad(color, color+"99"), borderRadius:10,
      border:`2px solid ${color}77` }}>
      <div style={{ position:"absolute", top:-7, left:"24%", width:"52%", height:9,
        background:color, borderRadius:"4px 4px 0 0" }}/>
      <div style={{ position:"absolute", top:9, left:8, right:8, height:2,
        background:"rgba(255,255,255,0.22)", borderRadius:1 }}/>
      <div style={{ position:"absolute", bottom:9, left:"50%", transform:"translateX(-50%)",
        width:13, height:13, borderRadius:"50%",
        background:"rgba(255,255,255,0.28)", border:"1.5px solid rgba(255,255,255,0.45)" }}/>
    </div>
  );

  if (type === "backpack") return (
    <div style={{ ...S, background: grad(color, color+"aa"), borderRadius:12,
      border:`2px solid ${color}77` }}>
      <div style={{ position:"absolute", top:7, left:7, right:7, height:h*0.28,
        background:`${color}cc`, borderRadius:6, border:`1px solid ${color}55` }}/>
      <div style={{ position:"absolute", top:"56%", left:"50%", transform:"translateX(-50%)",
        width:"54%", height:"28%", background:`${color}bb`,
        borderRadius:4, border:`1px solid ${color}44` }}/>
      <div style={{ position:"absolute", top:4, left:"28%", right:"28%", height:7,
        background:"rgba(0,0,0,0.22)", borderRadius:3 }}/>
    </div>
  );

  if (type === "tshirt") return (
    <div style={S}>
      <svg viewBox="0 0 60 52" style={{ width:"100%", height:"100%" }}>
        <path d="M10,2 L0,16 L14,20 L14,50 L46,50 L46,20 L60,16 L50,2 L38,12 Q30,16 22,12 Z"
          fill={color} stroke={`${color}88`} strokeWidth="1.2"/>
        <path d="M22,12 Q30,16 38,12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2"/>
        <line x1="14" y1="30" x2="46" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
      </svg>
    </div>
  );

  if (type === "box") return (
    <div style={{ ...S, background: grad(color, color+"bb"), borderRadius:4,
      border:`1.5px solid ${color}55` }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"34%",
        background:"rgba(255,255,255,0.07)", borderBottom:`1px solid ${color}44` }}/>
      <div style={{ position:"absolute", top:"8%", left:"34%", right:"34%", height:"20%",
        background:`${color}`, border:`1.5px solid ${color}88`, borderRadius:2 }}/>
      <div style={{ position:"absolute", inset:4,
        border:"1px dashed rgba(0,0,0,0.1)", borderRadius:2 }}/>
    </div>
  );

  if (type === "towel") return (
    <div style={{ ...S, borderRadius:6,
      background:`repeating-linear-gradient(0deg,${color} 0px,${color} 5px,${color}bb 5px,${color}bb 10px)` }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:5,
        background:`${color}dd`, borderRadius:"6px 6px 0 0" }}/>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5,
        background:`${color}dd`, borderRadius:"0 0 6px 6px" }}/>
    </div>
  );

  if (type === "shampoo") return (
    <div style={S}>
      <div style={{ position:"absolute", top:0, left:"20%", width:"60%", height:"16%",
        background:color, borderRadius:"4px 4px 0 0" }}/>
      <div style={{ position:"absolute", top:"14%", left:"8%", right:"8%", bottom:0,
        background: grad(color, color+"99"),
        borderRadius:"5px 5px 4px 4px", border:`1.5px solid ${color}88` }}/>
      <div style={{ position:"absolute", top:"28%", left:"16%", width:"20%", height:"34%",
        background:"rgba(255,255,255,0.28)", borderRadius:"50%", filter:"blur(2px)" }}/>
      {label && <div style={{ position:"absolute", bottom:"18%", left:"50%",
        transform:"translateX(-50%)", fontSize:7, color:"rgba(255,255,255,0.5)",
        fontFamily:"sans-serif", whiteSpace:"nowrap" }}>{label}</div>}
    </div>
  );

  if (type === "mug") return (
    <div style={S}>
      <div style={{ position:"absolute", left:0, right:"18%", top:"10%", bottom:0,
        background: grad(color, color+"cc"),
        borderRadius:"4px 4px 8px 8px", border:`1.5px solid ${color}88` }}/>
      <div style={{ position:"absolute", right:0, top:"24%", width:"24%", height:"46%",
        border:`2px solid ${color}`, borderLeft:"none", borderRadius:"0 8px 8px 0" }}/>
      <div style={{ position:"absolute", left:"8%", top:"20%", width:"19%", height:"38%",
        background:"rgba(255,255,255,0.22)", borderRadius:"50%", filter:"blur(2px)" }}/>
    </div>
  );

  if (type === "toiletry") return (
    <div style={{ ...S, background: grad(color, color+"99"), borderRadius:8,
      border:`2px solid ${color}77` }}>
      <div style={{ position:"absolute", top:0, left:"18%", right:"18%", height:8,
        background:`${color}`, borderRadius:"0 0 8px 8px" }}/>
      <div style={{ position:"absolute", top:"38%", left:8, right:8, height:1,
        background:"rgba(255,255,255,0.2)" }}/>
      <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
        width:11, height:11, borderRadius:"50%",
        background:"rgba(255,255,255,0.32)", border:"1px solid rgba(255,255,255,0.5)" }}/>
    </div>
  );

  return (
    <div style={{ ...S, background: grad(color||"#888", (color||"#666")+"99"), borderRadius:8 }}/>
  );
}

// ─── Draggable room object ──────────────────────────────────────
function RoomObj({ obj, onStart, onMove, onEnd, containerRef, found, onCollect }) {
  const dragging = useRef(false);
  const origin   = useRef({ x:0, y:0 });

  const xy = (e) => e.touches
    ? { cx: e.touches[0].clientX, cy: e.touches[0].clientY }
    : { cx: e.clientX,            cy: e.clientY };

  const pointerDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    const { cx, cy } = xy(e);
    origin.current = { x: cx - obj.dx, y: cy - obj.dy };
    onStart(obj.id);
  };

  const pointerMove = useCallback((e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const { cx, cy } = xy(e);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = cx - origin.current.x;
    const ny = cy - origin.current.y;
    onMove(obj.id,
      clamp(nx, -obj.w * 0.6, rect.width  + obj.w * 0.6),
      clamp(ny, -obj.h * 0.4, rect.height + obj.h * 0.6));
  }, [obj.id, obj.w, obj.h]);

  const pointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    onEnd(obj.id);
  }, [obj.id]);

  useEffect(() => {
    window.addEventListener("mousemove", pointerMove, { passive:false });
    window.addEventListener("mouseup",   pointerUp);
    window.addEventListener("touchmove", pointerMove, { passive:false });
    window.addEventListener("touchend",  pointerUp);
    return () => {
      window.removeEventListener("mousemove", pointerMove);
      window.removeEventListener("mouseup",   pointerUp);
      window.removeEventListener("touchmove", pointerMove);
      window.removeEventListener("touchend",  pointerUp);
    };
  }, [pointerMove, pointerUp]);

  const REVEAL_DIST = 52;
  const moved   = Math.hypot(obj.dx, obj.dy);
  const revealed = obj.hasPill && !found && moved > REVEAL_DIST;

  const pillLeft = obj.x + (obj.w - 26) / 2;
  const pillTop  = obj.y + (obj.h - 13) / 2;

  return (
    <>
      {/* shadow beneath pill spot */}
      {obj.hasPill && (
        <div style={{
          position:"absolute", left:pillLeft, top:pillTop,
          width:26, height:13, borderRadius:13,
          background:"rgba(0,0,0,0.5)", filter:"blur(4px)", zIndex:5,
          opacity: revealed ? 0.9 : 0, transition:"opacity 0.25s",
          pointerEvents:"none",
        }}/>
      )}

      {/* pill */}
      {obj.hasPill && (
        <div
          onClick={revealed ? () => onCollect(obj.id) : undefined}
          style={{
            position:"absolute", left:pillLeft, top:pillTop,
            zIndex:6, cursor: revealed ? "pointer" : "default",
            opacity: found ? 0 : revealed ? 1 : 0,
            transform: found ? "scale(0)" : revealed ? "scale(1)" : "scale(0.3)",
            transition:"opacity 0.28s,transform 0.28s",
            pointerEvents: revealed && !found ? "auto" : "none",
          }}
        >
          <Pill bright={revealed}/>
        </div>
      )}

      {/* object */}
      <div
        onMouseDown={pointerDown}
        onTouchStart={pointerDown}
        style={{
          position:"absolute",
          left:  obj.x + obj.dx,
          top:   obj.y + obj.dy,
          width: obj.w, height: obj.h,
          zIndex: obj.z ?? 10,
          cursor: "grab",
          userSelect:"none", touchAction:"none",
          filter: obj.active
            ? "brightness(1.18) drop-shadow(0 8px 14px rgba(0,0,0,0.65))"
            : "drop-shadow(0 2px 5px rgba(0,0,0,0.5))",
          transform: obj.active ? "scale(1.06) rotate(-1.5deg)" : "scale(1) rotate(0deg)",
          transition: obj.active ? "none" : "transform 0.22s,filter 0.22s",
          willChange:"transform",
        }}
      >
        <Sprite type={obj.type} w={obj.w} h={obj.h} color={obj.color} label={obj.label}/>
      </div>
    </>
  );
}

// ─── Canvas room background ─────────────────────────────────────
function RoomCanvas({ id, W, H }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,W,H);
    [paintBedroom, paintWardrobe, paintBathroom][id]?.(ctx,W,H);
  }, [id,W,H]);
  return <canvas ref={ref} width={W} height={H}
    style={{ position:"absolute", inset:0, display:"block", zIndex:1 }}/>;
}

function rr(ctx,x,y,w,h,r=4) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function paintBedroom(ctx,W,H) {
  const F = H*0.62;
  // wall
  const wg=ctx.createLinearGradient(0,0,0,F);
  wg.addColorStop(0,"#1b2838"); wg.addColorStop(1,"#243347");
  ctx.fillStyle=wg; ctx.fillRect(0,0,W,F);
  ctx.strokeStyle="rgba(255,255,255,0.022)"; ctx.lineWidth=1;
  for(let x=0;x<W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,F);ctx.stroke();}
  // baseboard
  ctx.fillStyle="#15202e"; ctx.fillRect(0,F-5,W,7);
  // floor
  const fg=ctx.createLinearGradient(0,F,0,H);
  fg.addColorStop(0,"#3a2918"); fg.addColorStop(1,"#211609");
  ctx.fillStyle=fg; ctx.fillRect(0,F,W,H-F);
  ctx.strokeStyle="rgba(255,255,255,0.04)"; ctx.lineWidth=1;
  for(let x=0;x<W;x+=22){ctx.beginPath();ctx.moveTo(x,F);ctx.lineTo(x+9,H);ctx.stroke();}
  // desk
  const dx=W*0.02,dy=F-H*0.21,dw=W*0.56,dh=9;
  const dg=ctx.createLinearGradient(dx,dy,dx,dy+40);
  dg.addColorStop(0,"#9a6030"); dg.addColorStop(1,"#6b4020");
  ctx.fillStyle=dg; rr(ctx,dx,dy,dw,dh,3); ctx.fill();
  ctx.fillStyle="#5a3515";
  ctx.fillRect(dx+12,dy+dh,10,H*0.12); ctx.fillRect(dx+dw-22,dy+dh,10,H*0.12);
  // bed frame (headboard)
  const bx=W*0.54,by=F-H*0.43,bw=W*0.45,bh=H*0.42;
  const hg2=ctx.createLinearGradient(bx,by,bx,by+bh*0.28);
  hg2.addColorStop(0,"#7b4a1e"); hg2.addColorStop(1,"#5a3412");
  ctx.fillStyle=hg2; rr(ctx,bx,by,bw,bh*0.28,6); ctx.fill();
  ctx.fillStyle="#e8ddd0"; rr(ctx,bx+4,by+bh*0.27,bw-8,bh*0.65,4); ctx.fill();
  // nightstand
  ctx.fillStyle="#7b4a1e";
  rr(ctx,W*0.54-50,F-H*0.18,46,H*0.18,4); ctx.fill();
  ctx.fillStyle="#9a6030"; ctx.fillRect(W*0.54-48,F-H*0.1,42,2);
  ctx.fillStyle="#d4a843"; ctx.beginPath();
  ctx.arc(W*0.54-26,F-H*0.06,3,0,Math.PI*2); ctx.fill();
  // window
  const wx=W*0.6,wy=H*0.04,ww=W*0.2,wh=H*0.21;
  const sg=ctx.createLinearGradient(wx,wy,wx,wy+wh);
  sg.addColorStop(0,"#0c2240"); sg.addColorStop(1,"#183860");
  ctx.fillStyle="#071220"; ctx.fillRect(wx,wy,ww,wh);
  ctx.fillStyle=sg; ctx.fillRect(wx+3,wy+3,ww-6,wh-6);
  [[wx+ww*.2,wy+wh*.2],[wx+ww*.65,wy+wh*.18],[wx+ww*.82,wy+wh*.5],[wx+ww*.35,wy+wh*.65]].forEach(([sx,sy])=>{
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(sx,sy,1.2,0,Math.PI*2); ctx.fill();
  });
  ctx.strokeStyle="#7b4a1e"; ctx.lineWidth=4; ctx.strokeRect(wx,wy,ww,wh);
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(wx+ww/2,wy);ctx.lineTo(wx+ww/2,wy+wh);ctx.stroke();
  ctx.beginPath();ctx.moveTo(wx,wy+wh/2);ctx.lineTo(wx+ww,wy+wh/2);ctx.stroke();
  // poster
  const pg=ctx.createLinearGradient(W*.22,H*.06,W*.36,H*.24);
  pg.addColorStop(0,"#7b1fa2"); pg.addColorStop(1,"#1565c0");
  ctx.fillStyle="#1a1a2a"; rr(ctx,W*.22-2,H*.06-2,W*.14+4,H*.18+4,3); ctx.fill();
  ctx.fillStyle=pg; rr(ctx,W*.22,H*.06,W*.14,H*.18,2); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.58)"; ctx.font=`bold ${H*.033}px monospace`;
  ctx.textAlign="center"; ctx.fillText("★",W*.29,H*.06+H*.18*.58);
  ctx.textAlign="left";
}

function paintWardrobe(ctx,W,H) {
  const F=H*0.62;
  const wg=ctx.createLinearGradient(0,0,0,F);
  wg.addColorStop(0,"#291a10"); wg.addColorStop(1,"#3d2a1c");
  ctx.fillStyle=wg; ctx.fillRect(0,0,W,F);
  ctx.fillStyle="rgba(255,210,130,0.038)";
  for(let y=16;y<F;y+=28) for(let x=14;x<W;x+=28){
    ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle="#1e100a"; ctx.fillRect(0,F-5,W,7);
  const fg=ctx.createLinearGradient(0,F,0,H);
  fg.addColorStop(0,"#c4a870"); fg.addColorStop(1,"#a08850");
  ctx.fillStyle=fg; ctx.fillRect(0,F,W,H-F);
  ctx.strokeStyle="rgba(0,0,0,0.1)"; ctx.lineWidth=1;
  for(let x=0;x<W;x+=36){ctx.beginPath();ctx.moveTo(x,F);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=F;y<H;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // wardrobe body
  const wdg=ctx.createLinearGradient(W*.01,0,W*.42,0);
  wdg.addColorStop(0,"#6b3d1e"); wdg.addColorStop(.5,"#8b5a2b"); wdg.addColorStop(1,"#5a3012");
  ctx.fillStyle=wdg; rr(ctx,W*.01,H*.04,W*.40,F-H*.05,5); ctx.fill();
  ctx.strokeStyle="#a0682d"; ctx.lineWidth=2;
  ctx.strokeRect(W*.025,H*.055,W*.175,F-H*.065);
  ctx.strokeRect(W*.215,H*.055,W*.175,F-H*.065);
  [W*.198,W*.218].forEach(kx=>{ ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.arc(kx,F/2,4,0,Math.PI*2); ctx.fill(); });
  // inside wardrobe — dark + hanging clothes
  ctx.fillStyle="rgba(0,0,0,0.45)"; rr(ctx,W*.025,H*.055,W*.175,F-H*.065,2); ctx.fill();
  const hc=["#e74c3c","#3498db","#f39c12","#9b59b6","#1abc9c"];
  hc.forEach((c,i)=>{
    const hx=W*.04+i*W*.027;
    ctx.strokeStyle="#c0a060"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(hx+5,H*.08); ctx.lineTo(hx+5,H*.12); ctx.stroke();
    ctx.fillStyle=c; ctx.globalAlpha=0.82;
    ctx.beginPath();
    ctx.moveTo(hx,H*.12);
    ctx.bezierCurveTo(hx-5,H*.16,hx+2,H*.22,hx+5,H*.24);
    ctx.bezierCurveTo(hx+8,H*.22,hx+15,H*.16,hx+10,H*.12);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha=1;
  });
  // mirror
  const mxs=W*.44,mys=H*.04,mws=W*.17,mhs=H*.38;
  ctx.fillStyle="#4a2c0e"; rr(ctx,mxs-4,mys-4,mws+8,mhs+8,7); ctx.fill();
  const mg=ctx.createLinearGradient(mxs,mys,mxs+mws,mys+mhs);
  mg.addColorStop(0,"rgba(180,220,255,0.22)"); mg.addColorStop(.5,"rgba(210,240,255,0.32)"); mg.addColorStop(1,"rgba(150,200,240,0.16)");
  ctx.fillStyle=mg; rr(ctx,mxs,mys,mws,mhs,3); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.13)";
  ctx.beginPath(); ctx.moveTo(mxs+mws*.1,mys+8); ctx.lineTo(mxs+mws*.35,mys+8);
  ctx.lineTo(mxs+mws*.22,mys+mhs*.65); ctx.lineTo(mxs,mys+mhs*.65); ctx.closePath(); ctx.fill();
  // shelf
  ctx.fillStyle="#6b3d1e"; ctx.fillRect(W*.60,F-H*.26,W*.38,8);
  ctx.fillStyle="#5a3012";
  ctx.fillRect(W*.62,F-H*.26+8,8,H*.13); ctx.fillRect(W*.94,F-H*.26+8,8,H*.13);
}

function paintBathroom(ctx,W,H) {
  const F=H*0.62;
  ctx.fillStyle="#d0e8ec"; ctx.fillRect(0,0,W,F);
  ctx.strokeStyle="rgba(140,180,192,0.4)"; ctx.lineWidth=1;
  for(let x=0;x<W;x+=38){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,F);ctx.stroke();}
  for(let y=0;y<F;y+=38){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  [[76,76],[152,38],[266,114],[38,190]].forEach(([tx,ty])=>{
    ctx.fillStyle="rgba(172,198,206,0.35)"; ctx.fillRect(tx,ty,37,37);
  });
  ctx.fillStyle="#9bb8bc"; ctx.fillRect(0,F-4,W,6);
  ctx.fillStyle="#b0c8c4"; ctx.fillRect(0,F,W,H-F);
  ctx.strokeStyle="rgba(88,118,114,0.22)"; ctx.lineWidth=0.8;
  for(let x=0;x<W;x+=24){ctx.beginPath();ctx.moveTo(x,F);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=F;y<H;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // bathtub
  ctx.fillStyle="#f0f4f5";
  ctx.beginPath();
  ctx.moveTo(W*.02,F-H*.06); ctx.quadraticCurveTo(W*.02,F-H*.22,W*.06,F-H*.22);
  ctx.lineTo(W*.44,F-H*.22); ctx.quadraticCurveTo(W*.48,F-H*.22,W*.48,F-H*.06);
  ctx.lineTo(W*.48,H*.02); ctx.quadraticCurveTo(W*.48,0,W*.44,0);
  ctx.lineTo(W*.06,0); ctx.quadraticCurveTo(W*.02,0,W*.02,H*.02);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle="#cdd8dc"; ctx.lineWidth=2; ctx.stroke();
  const wt=ctx.createLinearGradient(W*.03,F-H*.14,W*.03,F-H*.01);
  wt.addColorStop(0,"rgba(100,180,220,0.26)"); wt.addColorStop(1,"rgba(60,140,190,0.45)");
  ctx.fillStyle=wt; rr(ctx,W*.04,F-H*.14,W*.42,H*.14,4); ctx.fill();
  // taps
  ctx.fillStyle="#95a5a6";
  ctx.fillRect(W*.16,F-H*.24,7,16); ctx.fillRect(W*.28,F-H*.24,7,16);
  ctx.beginPath();ctx.arc(W*.163,F-H*.24,5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(W*.283,F-H*.24,5,0,Math.PI*2);ctx.fill();
  // sink counter
  ctx.fillStyle="#dde8ea"; ctx.fillRect(W*.52,F-H*.17,W*.28,10);
  ctx.fillStyle="#eef4f6"; rr(ctx,W*.53,F-H*.17,W*.26,H*.17,8); ctx.fill();
  ctx.strokeStyle="#cdd8dc"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle="#9ab2b6"; ctx.beginPath(); ctx.arc(W*.66,F-H*.04,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#95a5a6"; ctx.fillRect(W*.645,F-H*.19,6,18);
  ctx.beginPath(); ctx.arc(W*.648,F-H*.19,5,0,Math.PI*2); ctx.fill();
  // toilet
  ctx.fillStyle="#eef4f5";
  rr(ctx,W*.74,F-H*.24,W*.22,H*.1,4); ctx.fill();
  ctx.strokeStyle="#cdd8dc"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(W*.85,F-H*.1,W*.1,H*.1,0,0,Math.PI*2);
  ctx.fillStyle="#f2f8f9"; ctx.fill(); ctx.strokeStyle="#cdd8dc"; ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════
//  BUILD SCENE OBJECTS
// ═══════════════════════════════════════════════════════════════
function makeObjects(sceneId, W, H) {
  const F = H * 0.62;
  const desk = F - H * 0.21;

  const o = (id,type,color,x,y,w,h,z,extra={}) => ({
    id, type, color,
    x: Math.round(x), y: Math.round(y),
    w: Math.round(w), h: Math.round(h),
    z, dx:0, dy:0, active:false,
    hasPill: false, ...extra,
  });

  if (sceneId === 0) return [
    // --- pill 1 hidden under book stack ---
    o("book_a","book","#e53935", W*.06, desk-H*.14, 36,H*.14, 14, { hasPill:true, label:"Novel" }),
    o("book_b","book","#fb8c00", W*.12, desk-H*.12, 30,H*.12, 13, { label:"Manga" }),
    o("book_c","book","#43a047", W*.17, desk-H*.16, 34,H*.16, 15, { label:"Guide" }),
    // --- pill 2 hidden under clothes pile ---
    o("pile_a","pile",  "#5e35b1", W*.03, F+H*.03,  W*.23,H*.10, 12, { hasPill:true }),
    o("shirt_a","tshirt","#1e88e5",W*.05, F+H*.07,  W*.18,H*.09, 11),
    o("shirt_b","tshirt","#00897b",W*.08, F+H*.10,  W*.15,H*.08, 10),
    // --- pill 3 hidden under pillow ---
    o("pillow","pillow","#eceff1", W*.57, F-H*.38,  W*.20,H*.12, 15, { hasPill:true }),
    o("blanket","blanket","#c62828",W*.54, F-H*.27, W*.44,H*.27, 13),
    // distractors
    o("laptop","laptop","#263238", W*.34, desk-H*.13, 66,H*.13, 11),
    o("bag_a",  "bag",  "#f9a825", W*.33, desk-H*.10, 48,H*.10, 10),
    o("mug_a",  "mug",  "#4dd0e1", W*.57, desk-H*.09, 32,H*.09, 10),
  ];

  if (sceneId === 1) return [
    // --- pill 1 hidden under backpack ---
    o("bpack_a","backpack","#4a148c", W*.05, F-H*.27, 62,H*.27, 12, { hasPill:true }),
    o("box_a",  "box",    "#e8dcc8", W*.04, F-H*.12, 54,H*.12, 11),
    // --- pill 2 hidden under clothes pile ---
    o("pile_b","pile",  "#880e4f", W*.26, F+H*.03, W*.26,H*.11, 13, { hasPill:true }),
    o("shirt_c","tshirt","#2e7d32",W*.28, F+H*.07, W*.19,H*.09, 12),
    o("shirt_d","tshirt","#0277bd",W*.32, F+H*.10, W*.16,H*.08, 11),
    // --- pill 3 hidden under toiletry bag on shelf ---
    o("tbag_a","toiletry","#c8e6c9", W*.61, F-H*.27, 58,H*.13, 14, { hasPill:true }),
    o("shamp_a","shampoo","#f57f17",W*.60, F-H*.35, 30,H*.17, 12, { label:"CARE" }),
    o("shamp_b","shampoo","#1565c0",W*.68, F-H*.33, 28,H*.15, 11, { label:"WASH" }),
    // distractors
    o("bag_b",  "bag",  "#ad1457", W*.14, F-H*.15, 50,H*.13, 10),
    o("box_b",  "box",  "#f5f5f5", W*.52, F-H*.16, 56,H*.14, 10),
  ];

  // bathroom
  return [
    // --- pill 1 hidden under towel pile ---
    o("towel_a","towel","#1565c0", W*.04, F+H*.02, W*.29,H*.11, 12, { hasPill:true }),
    o("towel_b","towel","#1b5e20", W*.06, F+H*.08, W*.22,H*.09, 11),
    // --- pill 2 hidden under toiletry bag ---
    o("tbag_b","toiletry","#fce4ec", W*.41, F-H*.22, 60,H*.14, 14, { hasPill:true }),
    o("shamp_c","shampoo","#6a1b9a",W*.40, F-H*.33, 28,H*.16, 12, { label:"FOAM" }),
    o("shamp_d","shampoo","#e65100",W*.48, F-H*.31, 26,H*.14, 11, { label:"DEEP" }),
    // --- pill 3 hidden under backpack ---
    o("bpack_b","backpack","#004d40",W*.67, F-H*.30, 64,H*.30, 13, { hasPill:true }),
    o("towel_c","towel","#b71c1c",  W*.65, F+H*.02, W*.29,H*.09, 11),
    // distractors
    o("mug_b",  "mug",   "#fafafa", W*.32, F-H*.32, 34,H*.10, 10),
    o("bag_c",  "bag",   "#f9a825", W*.17, F-H*.24, 54,H*.15, 10),
  ];
}

// ═══════════════════════════════════════════════════════════════
//  SCENE META
// ═══════════════════════════════════════════════════════════════
const SCENES = [
  { emoji:"🛏️", nameTH:"ห้องนอน",      nameEN:"Bedroom",       time:60,
    th:"ตื่นมาต้องกิน PrEP แต่ยาหาย!\nลองขยับของในห้องรกนี้...",
    en:"Wake up — PrEP is gone!\nDrag things aside to find it.",
    hintTH:"ลองขยับหมอน หนังสือ หรือกองเสื้อผ้า",
    hintEN:"Try moving pillows, books or clothes" },
  { emoji:"👗", nameTH:"โซนตู้เสื้อผ้า", nameEN:"Wardrobe Zone",  time:50,
    th:"เจอแล้วฉาก 1! ยาอีก 3 เม็ดหายในโซนตู้เสื้อผ้า\nรีบค้นก่อนออกบ้าน!",
    en:"Scene 1 clear! 3 more pills hiding here.\nSearch before you leave!",
    hintTH:"ลองขยับกระเป๋า กล่อง หรือกองเสื้อ",
    hintEN:"Move bags, boxes or clothes piles" },
  { emoji:"🚿", nameTH:"ห้องน้ำ",        nameEN:"Bathroom",      time:45,
    th:"ฉากสุดท้าย! ยาวางไว้ในห้องน้ำ...\nพลิกทุกอย่างให้เจอ!",
    en:"Final round! Pills left in the bathroom.\nFlip everything to win!",
    hintTH:"ลองขยับผ้าเช็ดตัว กระเป๋า หรือขวดน้ำยา",
    hintEN:"Move towels, bags or shampoo bottles" },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
export default function PrepHuntGame() {
  const [screen,   setScreen]   = useState("title");
  const [sceneIdx, setSceneIdx] = useState(0);
  const [objects,  setObjects]  = useState([]);
  const [found,    setFound]    = useState(new Set());
  const [time,     setTime]     = useState(60);
  const [paused,   setPaused]   = useState(true);
  const [intro,    setIntro]    = useState(true);
  const [banner,   setBanner]   = useState(null);
  const [flash,    setFlash]    = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintId,   setHintId]   = useState(null);
  const [xp,       setXp]       = useState(0);
  const [sz,       setSz]       = useState({ w:390, h:540 });

  const contRef  = useRef(null);
  const timerRef = useRef(null);
  const urgRef   = useRef({});

  // measure
  useEffect(() => {
    const measure = () => {
      if (contRef.current) {
        const r = contRef.current.getBoundingClientRect();
        setSz({ w:Math.round(r.width), h:Math.round(r.height) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contRef.current) ro.observe(contRef.current);
    return () => ro.disconnect();
  }, [screen]);

  // rebuild on scene change
  useEffect(() => {
    if (screen !== "game" || sz.w < 100) return;
    setObjects(makeObjects(sceneIdx, sz.w, sz.h));
    setFound(new Set());
    setHintUsed(false);
    setHintId(null);
    urgRef.current = {};
  }, [sceneIdx, sz.w, sz.h, screen]);

  // timer
  useEffect(() => {
    if (paused || screen !== "game") return;
    timerRef.current = setInterval(() => {
      setTime(t => {
        const n = t - 1;
        if (n === 20 && !urgRef.current[20]) { urgRef.current[20]=true; flash2("⚡ เหลือ 20 วิ! เร็วเข้า! · 20 sec left!"); }
        if (n === 10 && !urgRef.current[10]) { urgRef.current[10]=true; flash2("🚨 10 วินาที!! ด่วน!! · 10 sec HURRY!!"); }
        if (n <= 0) { clearInterval(timerRef.current); setScreen("lose"); }
        return n;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [paused, screen]);

  const flash2 = (msg, dur=2800) => { setBanner(msg); setTimeout(()=>setBanner(null),dur); };

  const pillObjs = objects.filter(o => o.hasPill);
  const totalPills = pillObjs.length;

  // drag
  const onStart = useCallback((id) =>
    setObjects(p=>p.map(o=>o.id===id?{...o,active:true}:o)),[]);
  const onMove  = useCallback((id,nx,ny) =>
    setObjects(p=>p.map(o=>o.id===id?{...o,dx:nx,dy:ny}:o)),[]);
  const onEnd   = useCallback((id) =>
    setObjects(p=>p.map(o=>o.id===id?{...o,active:false}:o)),[]);

  const onCollect = useCallback((id) => {
    setFound(prev => {
      const next = new Set(prev).add(id);
      setFlash(true); setTimeout(()=>setFlash(false),240);
      const msgs=["","🔍 เจอ 1 เม็ด! Found 1!","🔥 เจอ 2 เม็ด! 2 down!","⭐ ครบ 3 เม็ด!! All 3!!"];
      flash2(msgs[next.size]||"✅", 1700);
      if (next.size >= totalPills) {
        clearInterval(timerRef.current);
        setPaused(true);
        setXp(p=>p+33);
        setTimeout(()=>{
          if (sceneIdx >= 2) { setScreen("win"); }
          else {
            setSceneIdx(i=>i+1);
            setTime(SCENES[sceneIdx+1].time);
            setPaused(true);
            setIntro(true);
          }
        }, 700);
      }
      return next;
    });
  }, [totalPills, sceneIdx]);

  const startScene = () => { setIntro(false); setPaused(false); };

  const beginGame = () => {
    clearInterval(timerRef.current);
    setSceneIdx(0); setXp(0); setTime(SCENES[0].time);
    setPaused(true); setIntro(true); setScreen("game");
  };

  const resetGame = () => {
    clearInterval(timerRef.current);
    setScreen("title"); setSceneIdx(0); setXp(0);
    setObjects([]); setFound(new Set());
    setTime(60); setPaused(true); setIntro(true);
  };

  const doHint = () => {
    if (hintUsed||paused) return;
    setHintUsed(true);
    const first = pillObjs.find(o=>!found.has(o.id));
    if (first) {
      setHintId(first.id);
      const sc = SCENES[sceneIdx];
      flash2(`💡 ${sc.hintTH} · ${sc.hintEN}`, 4000);
      setTimeout(()=>setHintId(null), 4000);
    }
  };

  const sc = SCENES[sceneIdx];
  const danger = time <= 10;

  // ── CSS ──────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;700;900&family=Sarabun:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    @keyframes floatY{0%,100%{transform:translateY(0);}50%{transform:translateY(-9px);}}
    @keyframes flashFade{0%,100%{opacity:0;}35%{opacity:1;}}
    @keyframes slideD{from{opacity:0;transform:translateX(-50%) translateY(-16px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
    @keyframes popIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.84);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}
    @keyframes shimmer{0%{left:-70%;}100%{left:130%;}}
    @keyframes tickD{0%,100%{transform:scale(1);}50%{transform:scale(1.16);}}
    @keyframes hintGlow{0%,100%{box-shadow:0 0 0 3px rgba(255,213,79,0.45);}50%{box-shadow:0 0 0 10px rgba(255,213,79,0.12),0 0 22px rgba(255,213,79,0.28);}}
    @keyframes trophy{from{opacity:0;transform:rotate(-20deg) scale(0.35);}to{opacity:1;transform:rotate(0) scale(1);}}
    @keyframes xpBounce{0%{transform:scale(0);}65%{transform:scale(1.14);}100%{transform:scale(1);}}
    @keyframes pillAppear{0%{transform:scale(0) rotate(-20deg);}70%{transform:scale(1.2) rotate(3deg);}100%{transform:scale(1) rotate(0deg);}}
  `;

  const WRAP = {
    fontFamily:"'Kanit','Sarabun',sans-serif",
    width:"100%", maxWidth:430, margin:"0 auto",
    minHeight:"100dvh", display:"flex", flexDirection:"column",
    position:"relative", overflow:"hidden", background:"#0d1117",
    WebkitUserSelect:"none", userSelect:"none",
  };

  // ── TITLE ────────────────────────────────────────────────────
  if (screen === "title") return (
    <div style={WRAP}>
      <style>{CSS}</style>
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",padding:"28px 22px",gap:14,textAlign:"center",
        background:"radial-gradient(ellipse at 50% -10%,#0e2a48 0%,#0d1117 60%)" }}>

        <div style={{ background:"#7c3aed",color:"#fff",fontWeight:900,fontSize:13,
          letterSpacing:3,padding:"5px 18px",borderRadius:20,
          boxShadow:"0 0 18px rgba(124,58,237,0.5)" }}>testD</div>

        <div style={{ animation:"floatY 2.5s ease-in-out infinite" }}>
          <div style={{ width:72,height:36,borderRadius:36,
            background:"radial-gradient(ellipse at 38% 35%,#b3e5fc 0%,#29b6f6 46%,#0277bd 100%)",
            boxShadow:"0 4px 22px rgba(41,182,246,0.55),inset 0 2px 3px rgba(255,255,255,0.38)",
            position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:"12%",left:"15%",width:"25%",height:"40%",
              background:"rgba(255,255,255,0.52)",borderRadius:"50%",transform:"rotate(-28deg)",filter:"blur(2px)" }}/>
            <div style={{ position:"absolute",top:"46%",left:"8%",right:"8%",height:1,
              background:"rgba(255,255,255,0.22)" }}/>
          </div>
        </div>

        <div>
          <h1 style={{ fontWeight:900,fontSize:"clamp(28px,8.5vw,50px)",lineHeight:1.05,
            color:"#fff",letterSpacing:-0.5 }}>
            หา <span style={{ color:"#29b6f6" }}>PrEP</span><br/>ให้เจอ!
          </h1>
          <p style={{ marginTop:6,fontSize:14,color:"rgba(255,255,255,0.5)",
            fontFamily:"'Sarabun',sans-serif",lineHeight:1.7 }}>
            <strong style={{ color:"#ffd54f" }}>ลาก/ขยับของ</strong> เพื่อเปิดเผยยาที่ซ่อนอยู่ข้างใต้<br/>
            <span style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>Drag objects away to reveal hidden pills, then tap to collect</span>
          </p>
        </div>

        <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center" }}>
          {[["🛏️","ห้องนอน","60s"],["👗","ตู้เสื้อผ้า","50s"],["🚿","ห้องน้ำ","45s"]].map(([e,l,t])=>(
            <div key={l} style={{ background:"rgba(255,255,255,0.055)",
              border:"1px solid rgba(255,255,255,0.11)",borderRadius:14,
              padding:"7px 14px",fontSize:13,color:"rgba(255,255,255,0.72)",
              display:"flex",alignItems:"center",gap:6,fontFamily:"'Sarabun',sans-serif" }}>
              <span>{e}</span><span>{l}</span>
              <span style={{ color:"#ffd54f",fontSize:11 }}>⏱{t}</span>
            </div>
          ))}
        </div>

        <div style={{ background:"rgba(255,213,79,0.09)",border:"1px solid rgba(255,213,79,0.26)",
          borderRadius:12,padding:"9px 18px",fontSize:13,color:"#ffd54f",
          fontFamily:"'Sarabun',sans-serif" }}>
          ⭐ เจอครบทุกฉาก = <strong>+100 XP</strong> · 3 ฉาก 9 เม็ด
        </div>

        <button onClick={beginGame} style={{ background:"linear-gradient(135deg,#0288d1,#7c3aed)",
          color:"#fff",border:"none",borderRadius:50,padding:"15px 44px",
          fontSize:20,fontWeight:900,cursor:"pointer",width:"100%",maxWidth:300,
          boxShadow:"0 4px 24px rgba(41,182,246,0.38)",
          position:"relative",overflow:"hidden",fontFamily:"'Kanit',sans-serif" }}>
          <span style={{ position:"absolute",top:0,left:"-70%",width:"55%",height:"100%",
            background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
            animation:"shimmer 2.2s ease infinite" }}/>
          🎮 เริ่มเลย! Start!
        </button>
      </div>
    </div>
  );

  // ── GAME ─────────────────────────────────────────────────────
  if (screen === "game") return (
    <div style={WRAP}>
      <style>{CSS}</style>

      {flash && (
        <div style={{ position:"fixed",inset:0,background:"rgba(41,182,246,0.22)",
          zIndex:999,pointerEvents:"none",animation:"flashFade 0.25s ease" }}/>
      )}

      {banner && (
        <div style={{ position:"fixed",top:68,left:"50%",
          background:danger?"rgba(244,67,54,0.93)":"rgba(13,26,44,0.93)",
          color:"#fff",borderRadius:30,padding:"9px 22px",fontSize:14,fontWeight:700,
          zIndex:400,animation:"slideD 0.22s ease",backdropFilter:"blur(10px)",
          maxWidth:"88%",textAlign:"center",
          border:`1px solid ${danger?"rgba(255,100,80,0.4)":"rgba(41,182,246,0.3)"}`,
          fontFamily:"'Sarabun',sans-serif",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
          {banner}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:"rgba(0,0,0,0.68)",backdropFilter:"blur(14px)",
        padding:"10px 16px",display:"flex",alignItems:"center",
        justifyContent:"space-between",
        borderBottom:"1px solid rgba(255,255,255,0.065)",
        position:"sticky",top:0,zIndex:60,width:"100%" }}>

        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          <span style={{ fontSize:18 }}>{sc.emoji}</span>
          <div>
            <div style={{ fontWeight:700,fontSize:13,color:"#29b6f6",lineHeight:1 }}>
              ฉาก {sceneIdx+1}/3
            </div>
            <div style={{ fontSize:11,color:"rgba(255,255,255,0.38)",
              fontFamily:"'Sarabun',sans-serif" }}>{sc.nameTH}</div>
          </div>
        </div>

        <div style={{ display:"flex",gap:6,alignItems:"center" }}>
          {pillObjs.map(o=>(
            <div key={o.id} style={{
              width:22, height:11, borderRadius:11,
              background:found.has(o.id)
                ?"linear-gradient(90deg,#29b6f6,#0288d1)"
                :"rgba(255,255,255,0.1)",
              border:`1px solid ${found.has(o.id)?"#29b6f6":"rgba(255,255,255,0.16)"}`,
              boxShadow:found.has(o.id)?"0 0 8px rgba(41,182,246,0.7)":"none",
              transition:"all 0.28s",
              animation:found.has(o.id)?"pillAppear 0.45s ease":"none",
            }}/>
          ))}
        </div>

        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10,color:"rgba(255,255,255,0.38)",
            fontFamily:"'Sarabun',sans-serif" }}>เหลือ</div>
          <div style={{ fontWeight:900,fontSize:28,lineHeight:1,
            color:danger?"#f44336":"#ffd54f",
            animation:danger?"tickD 0.5s ease infinite":"none" }}>
            {time}
          </div>
        </div>
      </div>

      {/* SCENE AREA */}
      <div ref={contRef} style={{ flex:1,position:"relative",width:"100%",
        overflow:"hidden",minHeight:360,touchAction:"none" }}>
        <RoomCanvas id={sceneIdx} W={sz.w} H={sz.h}/>

        <div style={{ position:"absolute",inset:0,zIndex:2 }}>
          {objects.map(obj=>(
            <RoomObj
              key={obj.id} obj={obj}
              onStart={onStart} onMove={onMove} onEnd={onEnd}
              containerRef={contRef}
              found={found.has(obj.id)}
              onCollect={onCollect}
            />
          ))}

          {/* hint glow */}
          {hintId && (() => {
            const o = objects.find(x=>x.id===hintId);
            if (!o) return null;
            return (
              <div style={{ position:"absolute",
                left:o.x+o.dx, top:o.y+o.dy, width:o.w, height:o.h,
                borderRadius:8,pointerEvents:"none",zIndex:50,
                animation:"hintGlow 1s ease-in-out infinite" }}/>
            );
          })()}
        </div>

        {/* INTRO OVERLAY */}
        {intro && (
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",
            backdropFilter:"blur(9px)",zIndex:80,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ background:"linear-gradient(145deg,#182536,#0d1a28)",
              border:"1.5px solid rgba(41,182,246,0.32)",borderRadius:22,
              padding:"24px 22px",textAlign:"center",maxWidth:310,
              animation:"popIn 0.3s ease",boxShadow:"0 10px 50px rgba(0,0,0,0.65)" }}>
              <div style={{ fontSize:40,marginBottom:8 }}>{sc.emoji}</div>
              <h3 style={{ color:"#29b6f6",fontWeight:900,fontSize:20,marginBottom:10 }}>
                {sc.nameTH} · {sc.nameEN}
              </h3>
              <p style={{ fontSize:14,color:"rgba(255,255,255,0.8)",lineHeight:1.82,
                whiteSpace:"pre-line",fontFamily:"'Sarabun',sans-serif",marginBottom:6 }}>
                {sc.th}
              </p>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.35)",
                fontFamily:"'Sarabun',sans-serif",marginBottom:16 }}>{sc.en}</p>
              <div style={{ background:"rgba(255,213,79,0.09)",
                border:"1px solid rgba(255,213,79,0.24)",
                borderRadius:10,padding:"8px 12px",fontSize:13,color:"#ffd54f",
                fontFamily:"'Sarabun',sans-serif",marginBottom:16,lineHeight:1.6 }}>
                ⏱ {sc.time}s · ลาก/ขยับของ เพื่อเผย <strong style={{ color:"#29b6f6" }}>3 เม็ด</strong><br/>
                <span style={{ fontSize:11,color:"rgba(255,255,255,0.35)" }}>
                  Drag objects — pill appears underneath — tap to collect
                </span>
              </div>
              <button onClick={startScene} style={{ background:"linear-gradient(135deg,#0288d1,#7c3aed)",
                color:"#fff",border:"none",borderRadius:30,padding:"13px 32px",
                fontSize:17,fontWeight:900,cursor:"pointer",width:"100%",
                fontFamily:"'Kanit',sans-serif" }}>
                {["🔍 ค้นหาเลย! Let's Go!","👀 ค้นต่อ! Keep Going!","🚿 ฉากสุดท้าย! Final!"][sceneIdx]}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HINT */}
      <div style={{ padding:"10px 16px",display:"flex",justifyContent:"center",
        background:"rgba(0,0,0,0.42)",borderTop:"1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={doHint} disabled={hintUsed||paused}
          style={{ background:hintUsed?"rgba(255,255,255,0.03)":"rgba(255,213,79,0.09)",
            border:`1px solid ${hintUsed?"rgba(255,255,255,0.07)":"rgba(255,213,79,0.35)"}`,
            color:hintUsed?"rgba(255,255,255,0.22)":"#ffd54f",
            borderRadius:30,padding:"8px 24px",fontSize:14,
            cursor:hintUsed?"not-allowed":"pointer",
            fontFamily:"'Sarabun',sans-serif",fontWeight:600,transition:"all 0.2s" }}>
          {hintUsed ? "💡 ใช้ใบ้ไปแล้ว / Hint Used" : "💡 ขอใบ้ Hint (1x)"}
        </button>
      </div>
    </div>
  );

  // ── WIN ──────────────────────────────────────────────────────
  if (screen === "win") return (
    <div style={WRAP}>
      <style>{CSS}</style>
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"flex-start",padding:"32px 20px",gap:14,
        background:"radial-gradient(ellipse at 50% 0%,#0a2040 0%,#0d1117 65%)",
        textAlign:"center",overflowY:"auto" }}>
        <div style={{ fontSize:64,animation:"trophy 0.65s cubic-bezier(0.34,1.56,0.64,1) both" }}>🏆</div>
        <h2 style={{ fontWeight:900,fontSize:30,lineHeight:1.15,
          color:"#29b6f6",textShadow:"0 0 28px rgba(41,182,246,0.5)" }}>
          เจอครบ 9 เม็ด!<br/>
          <span style={{ fontSize:18,color:"rgba(255,255,255,0.45)" }}>Found All 9 Pills!</span>
        </h2>
        <div style={{ animation:"xpBounce 0.5s 0.15s both",
          background:"linear-gradient(135deg,#ffd54f,#f57f17)",color:"#1a0800",
          borderRadius:50,padding:"12px 36px",fontWeight:900,fontSize:26,
          boxShadow:"0 0 28px rgba(255,213,79,0.45)" }}>⭐ +100 XP</div>
        <p style={{ fontSize:15,color:"rgba(255,255,255,0.68)",lineHeight:1.85,
          fontFamily:"'Sarabun',sans-serif",maxWidth:330 }}>
          เก่งมาก! ไม่ยอมพลาด PrEP แม้แต่เม็ดเดียว 💪<br/>
          <span style={{ color:"rgba(255,255,255,0.35)",fontSize:13 }}>
            Amazing — never miss a dose. Keep that streak!
          </span>
        </p>
        <p style={{ fontWeight:800,fontSize:15,color:"#29b6f6",
          fontFamily:"'Sarabun',sans-serif" }}>
          🔗 ต่อยอดกับบริการจริง · Real services
        </p>
        <ServiceCards />
        <button onClick={resetGame} style={{ background:"transparent",
          border:"1.5px solid rgba(255,255,255,0.16)",color:"rgba(255,255,255,0.45)",
          borderRadius:30,padding:"10px 28px",fontSize:15,cursor:"pointer",
          width:"100%",maxWidth:300,fontFamily:"'Sarabun',sans-serif",marginTop:4 }}>
          🔄 เล่นอีกครั้ง · Play Again
        </button>
      </div>
    </div>
  );

  // ── LOSE ─────────────────────────────────────────────────────
  if (screen === "lose") return (
    <div style={WRAP}>
      <style>{CSS}</style>
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"flex-start",padding:"32px 20px",gap:14,
        background:"radial-gradient(ellipse at 50% 0%,#200808 0%,#0d1117 65%)",
        textAlign:"center",overflowY:"auto" }}>
        <div style={{ fontSize:62 }}>⏰</div>
        <h2 style={{ fontWeight:900,fontSize:30,lineHeight:1.15,color:"#f44336" }}>
          หมดเวลา!<br/>
          <span style={{ fontSize:18,color:"rgba(255,255,255,0.4)" }}>Time's Up!</span>
        </h2>
        <div style={{ position:"relative",width:160,height:70,margin:"4px 0" }}>
          {[[8,8,22],[30,32,-12],[58,6,38],[82,28,-22],[50,46,10]].map(([x,y,r],i)=>(
            <div key={i} style={{ position:"absolute",left:`${x}%`,top:`${y}%`,
              width:24,height:12,borderRadius:12,
              background:"radial-gradient(ellipse at 38% 35%,#b3e5fc 0%,#29b6f6 46%,#0277bd 100%)",
              boxShadow:"0 1px 4px rgba(0,0,0,0.4)",transform:`rotate(${r}deg)`,opacity:0.62 }}/>
          ))}
        </div>
        <p style={{ fontSize:15,color:"rgba(255,255,255,0.7)",lineHeight:1.85,
          fontFamily:"'Sarabun',sans-serif",maxWidth:330 }}>
          หายาในชีวิตจริงก็ยาก —{" "}
          <strong style={{ color:"#29b6f6" }}>ให้เราช่วยหาให้</strong> 💊<br/>
          <span style={{ color:"rgba(255,255,255,0.35)",fontSize:13 }}>
            Can't find PrEP IRL? testD connects you.
          </span>
        </p>
        <ServiceCards lose />
        <div style={{ display:"flex",gap:10,width:"100%",maxWidth:340,marginTop:4 }}>
          <button onClick={resetGame} style={{ flex:1,background:"transparent",
            border:"1.5px solid rgba(255,255,255,0.16)",color:"rgba(255,255,255,0.45)",
            borderRadius:30,padding:"10px 0",fontSize:14,cursor:"pointer",
            fontFamily:"'Sarabun',sans-serif" }}>🔄 ลองอีก</button>
          <button onClick={()=>setScreen("services")} style={{ flex:1.4,
            background:"rgba(41,182,246,0.09)",
            border:"1.5px solid rgba(41,182,246,0.32)",color:"#29b6f6",
            borderRadius:30,padding:"10px 0",fontSize:14,cursor:"pointer",
            fontFamily:"'Sarabun',sans-serif",fontWeight:700 }}>🏥 ดูบริการทั้งหมด</button>
        </div>
      </div>
    </div>
  );

  if (screen === "services") return (
    <div style={WRAP}>
      <style>{CSS}</style>
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        padding:"28px 20px",gap:14,
        background:"radial-gradient(ellipse at 50% 0%,#0a1628 0%,#0d1117 65%)",
        overflowY:"auto",textAlign:"center" }}>
        <div style={{ background:"#7c3aed",color:"#fff",fontWeight:900,fontSize:13,
          letterSpacing:3,padding:"5px 18px",borderRadius:20 }}>testD</div>
        <div style={{ fontSize:48 }}>💊</div>
        <h2 style={{ fontWeight:900,fontSize:26,color:"#29b6f6",lineHeight:1.2 }}>
          บริการของเรา<br/>
          <span style={{ fontSize:14,color:"rgba(255,255,255,0.35)",fontWeight:400 }}>
            All anonymous · ไม่ระบุตัวตน
          </span>
        </h2>
        <ServiceCards all />
        <button onClick={resetGame} style={{ background:"transparent",
          border:"1.5px solid rgba(255,255,255,0.16)",color:"rgba(255,255,255,0.42)",
          borderRadius:30,padding:"10px 28px",fontSize:15,cursor:"pointer",
          fontFamily:"'Sarabun',sans-serif",marginTop:4 }}>
          🎮 เล่นอีกครั้ง · Play Again
        </button>
      </div>
    </div>
  );

  return null;
}

// ─── Service cards ──────────────────────────────────────────────
function ServiceCards({ lose, all }) {
  const win_items = [
    { icon:"💊", th:"จองนัดรับ PrEP",           en:"Book PrEP appointment",   sub:"ฟรีบางกลุ่ม · Free for eligible" },
    { icon:"🧪", th:"นัดตรวจ HIV",              en:"Book HIV test",            sub:"Walk-in หรือนัดล่วงหน้า" },
    { icon:"📦", th:"ขอชุดตรวจที่บ้าน",        en:"Home self-test kit",        sub:"ส่งฟรี ไม่ระบุชื่อ" },
    ...(all ? [{ icon:"💬", th:"ปรึกษาออนไลน์นิรนาม", en:"Anonymous consultation", sub:"100% Anonymous" }] : []),
  ];
  const lose_items = [
    { icon:"📍", th:"หาคลินิก PrEP ใกล้ฉัน",  en:"Find PrEP clinic near me",  sub:"ง่าย รวดเร็ว · Fast" },
    { icon:"💬", th:"ปรึกษาเจ้าหน้าที่นิรนาม", en:"Anonymous counselor chat",  sub:"ไม่ระบุชื่อ · No name needed" },
    { icon:"📦", th:"ขอชุดตรวจที่บ้าน",        en:"Request home test kit",      sub:"ส่งถึงบ้าน · Delivered" },
  ];
  const items = lose ? lose_items : win_items;
  return (
    <div style={{ background:"rgba(255,255,255,0.03)",
      border:"1px solid rgba(41,182,246,0.16)",
      borderRadius:18,padding:"14px 12px",width:"100%",maxWidth:360 }}>
      {items.map((item,i)=>(
        <button key={i}
          onClick={()=>alert(`🔗 ${item.th}\n${item.en}\n\n→ Coming soon in testD!`)}
          style={{ background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.065)",
            borderRadius:12,padding:"11px 14px",
            marginBottom:i<items.length-1?8:0,
            display:"flex",alignItems:"center",gap:12,
            cursor:"pointer",width:"100%",textAlign:"left",
            transition:"background 0.18s",color:"inherit" }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(41,182,246,0.08)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
          <span style={{ fontSize:26,flexShrink:0 }}>{item.icon}</span>
          <span style={{ flex:1 }}>
            <strong style={{ display:"block",fontSize:14,color:"#fff",
              marginBottom:2,fontFamily:"'Sarabun',sans-serif" }}>{item.th}</strong>
            <small style={{ fontSize:12,color:"rgba(255,255,255,0.35)",
              fontFamily:"'Sarabun',sans-serif" }}>{item.en} · {item.sub}</small>
          </span>
          <span style={{ color:"rgba(255,255,255,0.22)",fontSize:16 }}>›</span>
        </button>
      ))}
    </div>
  );
}
