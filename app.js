
const workouts = [
  {
    id:"upper", title:"Day 1 — Upper", subtitle:"Chest, back, delts and arms", duration:"60–70 min",
    exercises:[
      ["Incline Dumbbell Press",3,6,10,"1–2","120"],
      ["Chest-Supported Row",3,8,12,"1–2","120"],
      ["Machine Chest Press",2,8,12,"1–2","90"],
      ["Neutral-Grip Lat Pulldown",2,8,12,"1–2","90"],
      ["Cable Lateral Raise",3,12,20,"0–1","60"],
      ["Rear Delt Pec Deck",2,12,20,"0–1","60"],
      ["Bayesian Cable Curl",2,10,15,"1","60"],
      ["Overhead Cable Triceps Extension",2,10,15,"1","60"]
    ]
  },
  {
    id:"lower", title:"Day 2 — Lower", subtitle:"Quads, hamstrings, calves and abs", duration:"50–65 min",
    exercises:[
      ["Leg Press",3,8,12,"1–2","150"],
      ["Romanian Deadlift",2,6,10,"2","150"],
      ["Leg Extension",2,10,15,"1","90"],
      ["Seated or Lying Leg Curl",3,10,15,"1","90"],
      ["Standing Calf Raise",3,8,15,"1","90"],
      ["Cable Crunch",2,10,15,"1–2","60"]
    ]
  },
  {
    id:"topup", title:"Day 3 — Upper + Lower Top-up", subtitle:"Second weekly stimulus with lower fatigue", duration:"55–65 min",
    exercises:[
      ["Machine Shoulder Press",2,8,12,"1–2","120"],
      ["Pec Deck or Cable Fly",3,10,15,"1","90"],
      ["Single-Arm Cable Pulldown",3,10,15,"1","90"],
      ["Light Leg Press",2,12,15,"2","120"],
      ["Seated Leg Curl",2,12,15,"1–2","90"],
      ["Cable Lateral Raise",3,12,20,"0–1","60"],
      ["Preacher or Machine Curl",3,8,12,"0–1","60"],
      ["Rope Pressdown",3,10,15,"0–1","60"]
    ]
  }
];

const STORAGE_KEY="matthijs_hypertrophy_v1";
let state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"sessions":[],"bodyweight":[]}');
let activeWorkout=null;
let timerInterval=null;

function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }

function renderWorkouts(){
  const root=document.getElementById("workoutList");
  root.innerHTML="";
  workouts.forEach(w=>{
    const last=state.sessions.filter(s=>s.workoutId===w.id).slice(-1)[0];
    const div=document.createElement("div");
    div.className="card workout-card";
    div.innerHTML=`<div><div class="eyebrow">${w.duration}</div><h3>${w.title}</h3><p>${w.subtitle}${last?`<br>Last completed: ${new Date(last.date).toLocaleDateString()}`:""}</p></div>
    <button class="start-btn" data-id="${w.id}">Start</button>`;
    root.appendChild(div);
  });
  document.querySelectorAll(".start-btn").forEach(b=>b.onclick=()=>openWorkout(b.dataset.id));
}

function latestExerciseHistory(name){
  for(let i=state.sessions.length-1;i>=0;i--){
    const ex=state.sessions[i].exercises.find(e=>e.name===name);
    if(ex) return ex;
  }
  return null;
}

function openWorkout(id){
  activeWorkout=workouts.find(w=>w.id===id);
  document.getElementById("modalEyebrow").textContent=activeWorkout.duration;
  document.getElementById("modalTitle").textContent=activeWorkout.title;
  document.getElementById("sessionMeta").textContent="Enter weight, reps and RIR. Your data stays on this device.";
  const root=document.getElementById("exerciseContainer"); root.innerHTML="";
  activeWorkout.exercises.forEach((e,idx)=>{
    const [name,sets,min,max,rir,rest]=e;
    const prev=latestExerciseHistory(name);
    const card=document.createElement("div"); card.className="exercise";
    card.innerHTML=`<div class="exercise-head"><div><h4>${name}</h4><div class="prescription">${sets} sets • ${min}–${max} reps • ${rir} RIR</div>
      <div class="previous">${prev?`Previous: ${prev.sets.map(s=>`${s.weight||"-"} kg × ${s.reps||"-"}`).join(" · ")}`:"No previous entry"}</div></div></div>
      <div class="sets" data-ex="${idx}"></div>
      <div class="exercise-actions"><button class="small-btn timer-btn" data-seconds="${rest}">Start ${Math.floor(rest/60)}:${String(rest%60).padStart(2,"0")} rest</button></div>`;
    const setRoot=card.querySelector(".sets");
    for(let s=0;s<sets;s++){
      const row=document.createElement("div"); row.className="set-row";
      row.innerHTML=`<span>${s+1}</span><input inputmode="decimal" placeholder="kg" data-field="weight"><input inputmode="numeric" placeholder="reps" data-field="reps"><input inputmode="decimal" placeholder="RIR" data-field="rir">`;
      setRoot.appendChild(row);
    }
    root.appendChild(card);
  });
  document.querySelectorAll(".timer-btn").forEach(b=>b.onclick=()=>startTimer(+b.dataset.seconds));
  document.getElementById("workoutModal").classList.remove("hidden");
}

function collectSession(){
  const exercises=[];
  document.querySelectorAll(".exercise").forEach((card,idx)=>{
    const name=activeWorkout.exercises[idx][0];
    const sets=[...card.querySelectorAll(".set-row")].map(row=>{
      const vals=[...row.querySelectorAll("input")].map(i=>i.value);
      return {weight:vals[0],reps:vals[1],rir:vals[2]};
    });
    exercises.push({name,sets});
  });
  return {workoutId:activeWorkout.id,title:activeWorkout.title,date:new Date().toISOString(),exercises};
}

function finishWorkout(){
  const session=collectSession();
  state.sessions.push(session); save();
  document.getElementById("workoutModal").classList.add("hidden");
  renderWorkouts(); renderProgress();
  alert("Workout saved on this phone.");
}
function resetWorkout(){ openWorkout(activeWorkout.id); }

function startTimer(seconds){
  clearInterval(timerInterval);
  const box=document.getElementById("timer"), display=document.getElementById("timerDisplay");
  box.classList.remove("hidden");
  let left=seconds;
  const paint=()=>display.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;
  paint();
  timerInterval=setInterval(()=>{
    left--; paint();
    if(left<=0){clearInterval(timerInterval); navigator.vibrate?.([200,100,200]); box.classList.add("hidden");}
  },1000);
}

function renderProgress(){
  const all={};
  state.sessions.forEach(s=>s.exercises.forEach(e=>{
    const valid=e.sets.filter(x=>x.weight&&x.reps);
    if(valid.length) all[e.name]={sets:valid,date:s.date};
  }));
  const root=document.getElementById("progressList");
  root.innerHTML=Object.keys(all).length?"":"<p class='muted'>Complete a workout to see progress here.</p>";
  Object.entries(all).forEach(([name,v])=>{
    const d=document.createElement("div"); d.className="progress-row";
    d.innerHTML=`<strong>${name}</strong><span>${v.sets.map(s=>`${s.weight} kg × ${s.reps}`).join(" · ")} • ${new Date(v.date).toLocaleDateString()}</span>`;
    root.appendChild(d);
  });
  const bh=document.getElementById("bodyweightHistory"); bh.innerHTML="";
  [...state.bodyweight].reverse().slice(0,8).forEach(x=>{
    const d=document.createElement("div"); d.innerHTML=`<span>${new Date(x.date).toLocaleDateString()}</span><strong>${x.value} kg</strong>`; bh.appendChild(d);
  });
}

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  t.classList.add("active"); document.getElementById(t.dataset.view).classList.add("active");
});
document.getElementById("closeModal").onclick=()=>document.getElementById("workoutModal").classList.add("hidden");
document.getElementById("finishWorkout").onclick=finishWorkout;
document.getElementById("resetWorkout").onclick=resetWorkout;
document.getElementById("cancelTimer").onclick=()=>{clearInterval(timerInterval);document.getElementById("timer").classList.add("hidden")};
document.getElementById("saveBodyweight").onclick=()=>{
  const input=document.getElementById("bodyweightInput");
  if(!input.value)return;
  state.bodyweight.push({value:input.value,date:new Date().toISOString()});save();input.value="";renderProgress();
};
document.getElementById("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="hypertrophy-backup.json";a.click();URL.revokeObjectURL(a.href);
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
renderWorkouts();renderProgress();
