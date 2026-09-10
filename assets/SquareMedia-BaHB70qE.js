import{c,r as o,j as s,ac as p}from"./index-B7wELxAx.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=c("BadgeCheck",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=c("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=c("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]),x=({src:r,name:l,className:d})=>{const n=o.useRef(null);o.useLayoutEffect(()=>{const e=n.current;if(!e)return;let t=0;const i=()=>{const a=e.clientHeight;a&&Math.abs(parseFloat(e.style.width||"0")-a)>1&&(e.style.width=`${a}px`)},h=new ResizeObserver(()=>{cancelAnimationFrame(t),t=requestAnimationFrame(i)});return h.observe(e),i(),()=>{h.disconnect(),cancelAnimationFrame(t)}},[]);const m=l.split(" ").map(e=>e[0]).filter(Boolean).slice(0,2).join("").toUpperCase();return s.jsx("div",{ref:n,className:p("relative shrink-0 self-stretch overflow-hidden rounded-2xl bg-surface-inset",d),children:r?s.jsx("img",{src:r,alt:"",className:"absolute inset-0 h-full w-full object-cover"}):s.jsx("div",{className:"absolute inset-0 grid place-items-center bg-ink text-[1.5rem] font-bold text-canvas",children:m||"P"})})};export{k as B,u as C,f as S,x as a};
