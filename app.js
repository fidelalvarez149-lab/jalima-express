// JALIMA EXPRESS - primera versión. Configura Firebase en el objeto siguiente.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REEMPLAZA_CON_TU_API_KEY",
  authDomain: "REEMPLAZA.firebaseapp.com",
  projectId: "REEMPLAZA",
  storageBucket: "REEMPLAZA.appspot.com",
  messagingSenderId: "REEMPLAZA",
  appId: "REEMPLAZA"
};
const configured = !Object.values(firebaseConfig).some(v => String(v).includes("REEMPLAZA"));
const $ = id => document.getElementById(id);
const statusNames = {pending:"Pendiente", in_route:"En reparto", delivered:"Entregado"};
let auth, db, currentUser=null, userProfile=null, allOrders=[], activeFilter="pending", unsubscribeOrders=null, myPosition=null;

if (!configured) $("setupNotice").classList.remove("hidden");
else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app); db = getFirestore(app);
  onAuthStateChanged(auth, async user => {
    currentUser=user;
    $("authPanel").classList.toggle("hidden",!!user);
    $("appPanel").classList.toggle("hidden",!user);
    $("logoutBtn").classList.toggle("hidden",!user);
    if (!user) { if(unsubscribeOrders) unsubscribeOrders(); return; }
    const profileRef=doc(db,"users",user.uid);
    const profileSnap=await getDoc(profileRef);
    if(!profileSnap.exists()){
      // Primera cuenta creada queda como administradora. Las demás quedan como repartidoras.
      const firstAccount = (await getDoc(doc(db,"appMeta","bootstrap"))).exists()===false;
      userProfile={role:firstAccount?"admin":"delivery",email:user.email};
      await setDoc(profileRef,userProfile);
      if(firstAccount) await setDoc(doc(db,"appMeta","bootstrap"),{owner:user.uid});
    } else userProfile=profileSnap.data();
    $("userRole").textContent = userProfile.role==="admin" ? "Administrador / recepción de pedidos" : "Repartidor";
    $("newOrderPanel").classList.toggle("hidden",userProfile.role!=="admin");
    $("welcomeTitle").textContent=userProfile.role==="admin"?"Panel de recepción":"Panel del repartidor";
    $("connectionState").textContent="Conectado";
    listenOrders();
  });
}

$("authForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!configured) return;
  $("authMessage").textContent="Ingresando…";
  try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);$("authMessage").textContent="";}
  catch(err){$("authMessage").textContent=authError(err);}
});
$("registerBtn").addEventListener("click",async()=>{
  if(!configured)return;
  try{await createUserWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);$("authMessage").textContent="Cuenta creada. La primera cuenta será administradora; las siguientes serán repartidoras.";}
  catch(err){$("authMessage").textContent=authError(err);}
});
$("logoutBtn").addEventListener("click",()=>signOut(auth));
function authError(err){return err.code==="auth/email-already-in-use"?"Ese correo ya está registrado.":err.code==="auth/weak-password"?"La contraseña debe tener al menos 6 caracteres.":"No se pudo completar. Revisa el correo, la contraseña y la configuración de Firebase.";}

function listenOrders(){
  if(unsubscribeOrders)unsubscribeOrders();
  const q=query(collection(db,"orders"),orderBy("createdAt","desc"));
  unsubscribeOrders=onSnapshot(q,snap=>{
    allOrders=snap.docs.map(d=>({id:d.id,...d.data()}));
    $("connectionState").textContent="Sincronizado";
    renderOrders();
  },err=>{$("connectionState").textContent="Error de conexión";console.error(err);});
}
$("locateAddressBtn").addEventListener("click",()=>{
  if(!navigator.geolocation){$("orderMessage").textContent="Este navegador no permite ubicación.";return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    $("lat").value=pos.coords.latitude.toFixed(6);$("lng").value=pos.coords.longitude.toFixed(6);
    $("orderMessage").textContent="Ubicación agregada.";
  },()=>{$("orderMessage").textContent="No se pudo obtener la ubicación. Permite el acceso en el navegador.";},{enableHighAccuracy:true,timeout:12000});
});
$("orderForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!currentUser)return;
  const order={customer:$("customer").value.trim(),phone:$("phone").value.trim(),address:$("address").value.trim(),details:$("details").value.trim(),amount:Number($("amount").value),deliveryFee:Number($("deliveryFee").value),lat:$("lat").value?Number($("lat").value):null,lng:$("lng").value?Number($("lng").value):null,status:"pending",createdAt:serverTimestamp(),createdBy:currentUser.uid};
  try{await addDoc(collection(db,"orders"),order);$("orderForm").reset();$("deliveryFee").value="0";$("orderMessage").textContent="¡Pedido enviado! Ya aparece en los dispositivos conectados.";}
  catch(err){$("orderMessage").textContent="No se pudo enviar. Revisa la conexión y las reglas de Firestore.";console.error(err);}
});
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  activeFilter=btn.dataset.filter;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===btn));renderOrders();
}));
function renderOrders(){
  let orders=allOrders.filter(o=>activeFilter==="all"||o.status===activeFilter);
  const box=$("ordersList");box.innerHTML="";
  if(!orders.length){box.innerHTML='<p class="hint">No hay pedidos en esta categoría.</p>';return;}
  orders.forEach(o=>{
    const el=document.createElement("article");el.className="order";
    const total=(Number(o.amount||0)+Number(o.deliveryFee||0)).toFixed(2);
    el.innerHTML=`<div class="row"><h3>${escapeHtml(o.customer||"Cliente")}</h3><span class="status">${statusNames[o.status]||"Pendiente"}</span></div>
      <p><b>Teléfono:</b> ${escapeHtml(o.phone||"")}</p><p><b>Dirección:</b> ${escapeHtml(o.address||"")}</p>
      <p><b>Pedido:</b> ${escapeHtml(o.details||"")}</p><p><b>Total a cobrar:</b> C$ ${total}</p>
      <div class="orderActions">
        ${o.lat!=null&&o.lng!=null?`<button class="secondary mapBtn">Abrir mapa</button>`:""}
        ${o.status==="pending"?'<button class="routeBtn">Marcar en reparto</button>':""}
        ${o.status==="in_route"?'<button class="doneBtn">Marcar entregado</button>':""}
      </div>`;
    if(o.lat!=null&&o.lng!=null)el.querySelector(".mapBtn").addEventListener("click",()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`,"_blank"));
    const routeBtn=el.querySelector(".routeBtn");if(routeBtn)routeBtn.addEventListener("click",()=>changeStatus(o.id,"in_route"));
    const doneBtn=el.querySelector(".doneBtn");if(doneBtn)doneBtn.addEventListener("click",()=>changeStatus(o.id,"delivered"));
    box.appendChild(el);
  });
}
async function changeStatus(id,status){try{await updateDoc(doc(db,"orders",id),{status,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});}catch(e){alert("No se pudo actualizar el pedido.");}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

$("sortRouteBtn").addEventListener("click",()=>{
  const targets=allOrders.filter(o=>o.status!=="delivered"&&Number.isFinite(o.lat)&&Number.isFinite(o.lng));
  if(!targets.length){alert("Agrega latitud y longitud a los pedidos para ordenar la ruta.");return;}
  if(!navigator.geolocation){alert("Este navegador no permite ubicación.");return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    myPosition={lat:pos.coords.latitude,lng:pos.coords.longitude};
    let here=myPosition, remaining=[...targets], sorted=[];
    while(remaining.length){remaining.sort((a,b)=>distance(here,a)-distance(here,b));const next=remaining.shift();sorted.push(next);here={lat:next.lat,lng:next.lng};}
    const box=$("ordersList");box.innerHTML='<p class="hint"><b>Orden sugerido de ruta</b> · Desde tu ubicación actual, usando la distancia geográfica aproximada.</p>';
    sorted.forEach((o,i)=>{const el=document.createElement("article");el.className="order";el.innerHTML=`<h3>${i+1}. ${escapeHtml(o.customer)}</h3><p>${escapeHtml(o.address)}</p><p>${statusNames[o.status]||"Pendiente"}</p><button class="secondary">Navegar a este destino</button>`;el.querySelector("button").onclick=()=>window.open(`https://www.google.com/maps/dir/?api=1&origin=${myPosition.lat},${myPosition.lng}&destination=${o.lat},${o.lng}`,"_blank");box.appendChild(el);});
  },()=>alert("Permite la ubicación para ordenar la ruta."),{enableHighAccuracy:true,timeout:12000});
});
function distance(a,b){const r=x=>x*Math.PI/180, dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

$("saveSettingsBtn").addEventListener("click",()=>{
  const name=$("businessName").value.trim()||"JALIMA EXPRESS",color=$("businessColor").value;
  localStorage.setItem("jalimaName",name);localStorage.setItem("jalimaColor",color);applySettings();
  const file=$("logoFile").files[0];if(file){const reader=new FileReader();reader.onload=()=>{localStorage.setItem("jalimaLogo",reader.result);applySettings();};reader.readAsDataURL(file);}
});
function applySettings(){const name=localStorage.getItem("jalimaName")||"JALIMA EXPRESS",color=localStorage.getItem("jalimaColor")||"#f47721",logo=localStorage.getItem("jalimaLogo")||"./icon.svg";$("brandName").textContent=name;document.documentElement.style.setProperty("--accent",color);$("brandLogo").src=logo;$("businessName").value=name;$("businessColor").value=color;}
applySettings();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
