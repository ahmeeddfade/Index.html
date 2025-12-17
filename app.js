/* ===== CONFIG ===== */
const CHANNELS_URL = "channels.json";
const STORAGE_KEY  = "elahmad_tv_state";
const EXIT_DELAY   = 2000;

/* ===== ELEMENTS ===== */
const video   = document.getElementById("player");
const overlay = document.getElementById("overlay");
const list    = document.getElementById("channels");
const splash  = document.getElementById("splash");
const loading = document.getElementById("loading");

/* ===== STATE ===== */
let hls        = null;
let channels   = [];
let index      = 0;
let hideTimer  = null;
let backCount  = 0;
let backTimer  = null;

/* ===== STORAGE ===== */
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ index }));
}

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(Number.isInteger(s?.index)) index = s.index;
  }catch{}
}

/* ===== PLAYER ===== */
function play(url){
  loading?.classList.add("show");

  if(hls){
    hls.destroy();
    hls = null;
  }

  if(Hls.isSupported()){
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 60,
      maxBufferLength: 30,
      maxBufferSize: 50 * 1000 * 1000
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, ()=>{
      loading?.classList.remove("show");
      hideSplash();
      video.play().catch(()=>{});
    });

  }else{
    video.src = url;
    loading?.classList.remove("show");
    hideSplash();
    video.play().catch(()=>{});
  }
}

/* ===== UI ===== */
function hideSplash(){
  if(splash && !splash.classList.contains("hide")){
    setTimeout(()=> splash.classList.add("hide"), 3000);
  }
}

function showOverlay(){
  overlay.classList.remove("hide");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(()=> overlay.classList.add("hide"), 5000);
}

function focus(){
  [...list.children].forEach(c=>c.classList.remove("active"));

  const card = list.children[index];
  if(!card) return;

  card.classList.add("active");
  card.scrollIntoView({
    behavior:"smooth",
    inline:"center",
    block:"nearest"
  });

  play(channels[index].stream);
  saveState();
}

/* ===== LOAD CHANNELS ===== */
fetch(CHANNELS_URL)
.then(r=>r.json())
.then(data=>{
  channels = data.channels || [];
  loadState();

  list.style.direction = "ltr"; // ✅ تصحيح الاتجاه

  channels.forEach((ch,i)=>{
    const d = document.createElement("div");
    d.className = "card";
    d.tabIndex = 0;

    d.innerHTML = `
      <img src="${ch.logo}" loading="lazy">
      <span>${ch.name}</span>
    `;

    // ✅ دعم اللمس والضغط
    d.addEventListener("click", ()=>{
      index = i;
      focus();
      showOverlay();
    });

    d.addEventListener("keydown", e=>{
      if(e.key==="Enter"){
        index=i;
        focus();
      }
    });

    list.appendChild(d);
  });

  focus();
  showOverlay();
});

/* ===== REMOTE CONTROL ===== */
document.addEventListener("keydown", e=>{
  switch(e.key){

    case "ArrowRight":
      index = (index + 1) % channels.length;
      focus();
      showOverlay();
      break;

    case "ArrowLeft":
      index = (index - 1 + channels.length) % channels.length;
      focus();
      showOverlay();
      break;

    case "ArrowUp":
      showOverlay();
      break;

    case "Escape":
      handleBack();
      break;
  }
});

/* ===== BACK HANDLER (EXIT SAFE) ===== */
function handleBack(){
  if(!overlay.classList.contains("hide")){
    overlay.classList.add("hide");
    return;
  }

  backCount++;
  clearTimeout(backTimer);

  if(backCount === 2){
    exitApp();
  }else{
    backTimer = setTimeout(()=> backCount = 0, EXIT_DELAY);
  }
}

/* ===== EXIT CLEAN ===== */
function exitApp(){
  try{
    video.pause();
    video.src = "";
    if(hls) hls.destroy();
    hls = null;
  }catch{}

  // منع العمل بالخلفية
  document.body.innerHTML = "";
  location.replace("about:blank");
}

/* ===== TOUCH ===== */
let startX = 0;

document.addEventListener("touchstart", e=>{
  startX = e.touches[0].clientX;
  showOverlay();
});

document.addEventListener("touchend", e=>{
  const dx = e.changedTouches[0].clientX - startX;
  if(Math.abs(dx) > 60){
    index = dx < 0
      ? (index + 1) % channels.length
      : (index - 1 + channels.length) % channels.length;
    focus();
  }
});
