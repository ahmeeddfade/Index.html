/* ===== CONFIG ===== */
const CHANNELS_URL = "channels.json";
const STORAGE_KEY = "elahmad_tv_state";

/* ===== ELEMENTS ===== */
const video   = document.getElementById("player");
const overlay = document.getElementById("overlay");
const list    = document.getElementById("channels");
const splash  = document.getElementById("splash");
const loading = document.getElementById("loading");

/* ===== STATE ===== */
let hls = null;
let channels = [];
let index = 0;
let hideTimer = null;

/* ===== UTILS ===== */
const saveState = () =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({index}));

const loadState = () => {
  try{
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(s?.index !== undefined) index = s.index;
  }catch{}
};

/* ===== PLAYER ===== */
function play(url){
  loading.classList.add("show");

  if(hls){hls.destroy();hls=null}

  if(Hls.isSupported()){
    hls = new Hls({
      lowLatencyMode:true,
      backBufferLength:60
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED,()=>{
      loading.classList.remove("show");
      hideSplash();
    });
  }else{
    video.src = url;
    loading.classList.remove("show");
    hideSplash();
  }

  video.muted = false;
  video.volume = 1;
  video.play().catch(()=>{});
}

/* ===== UI ===== */
function hideSplash(){
  if(!splash.classList.contains("hide")){
    setTimeout(()=>splash.classList.add("hide"),3000);
  }
}

function showOverlay(){
  overlay.classList.remove("hide");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(()=>overlay.classList.add("hide"),5000);
}

function focus(){
  [...list.children].forEach(c=>c.classList.remove("active"));
  const card = list.children[index];
  if(card){
    card.classList.add("active");
    card.scrollIntoView({inline:"center"});
    play(channels[index].stream);
    saveState();
  }
}

/* ===== LOAD CHANNELS ===== */
fetch(CHANNELS_URL)
.then(r=>r.json())
.then(data=>{
  channels = data.channels;
  loadState();

  channels.forEach(ch=>{
    const d = document.createElement("div");
    d.className="card";
    d.innerHTML = `
      <img src="${ch.logo}">
      <span>${ch.name}</span>
    `;
    list.appendChild(d);
  });

  focus();
  showOverlay();
});

/* ===== REMOTE ===== */
document.addEventListener("keydown",e=>{
  switch(e.key){
    case "ArrowRight":
      index=(index+1)%channels.length; focus(); showOverlay(); break;
    case "ArrowLeft":
      index=(index-1+channels.length)%channels.length; focus(); showOverlay(); break;
    case "ArrowUp":
      showOverlay(); break;
    case "Escape":
      if(!overlay.classList.contains("hide")) overlay.classList.add("hide");
      else window.close();
      break;
  }
});

/* ===== TOUCH ===== */
let startX=0;
document.addEventListener("touchstart",e=>{
  startX=e.touches[0].clientX;
  showOverlay();
});
document.addEventListener("touchend",e=>{
  const d=e.changedTouches[0].clientX-startX;
  if(Math.abs(d)>60){
    index = d<0 ? (index+1)%channels.length : (index-1+channels.length)%channels.length;
    focus();
  }
});