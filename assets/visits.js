(async function () {
  const {STATE_KO, FIPS, RACE_KO, esc, md, srcLinks, raceLabel} = window.CT;
  const STATUS_KO = {held:"진행", planned:"예고", unconfirmed:"예고 후 미확인", cancelled:"취소"};
  const PARTY_COLOR = {R:"#c92a2a", D:"#1971c2", I:"#7a5c99"}; // us_elections 팔레트
  const R = 7; // 원 크기는 하나 — 인물 구분은 이름 선택으로 한다

  const [vd, fd] = await Promise.all([
    fetch("data/visits.json").then(r => r.json()),
    fetch("data/figures.json").then(r => r.json()),
  ]);
  const FIG = Object.fromEntries(fd.figures.map(f => [f.key, f]));
  const pkey = v => v.figure || "x:" + (v.who_en || "?");
  const visits = vd.visits.map(v => ({...v, fig: FIG[v.figure] || null, pk: pkey(v)}));
  document.getElementById("stamp").textContent =
    `기준: ${vd.as_of} 수집까지 · 방문 ${visits.length}건 · 9/1~10/7은 상원 일일 브리핑에서 이관(상원 감시주 위주)`;

  const dateLabel = v => v.date ? md(v.date) : "날짜 미상";
  const who = v => v.fig ? `${esc(v.fig.name_ko)} <span class="role">${esc(v.fig.title_ko)}</span>` : esc(v.who_en || "");
  const cands = v => esc((v.candidates || []).join(", ") || "—");
  const nameOf = k => k.startsWith("x:") ? k.slice(2) : FIG[k].name_ko;

  // ---- 인물 선택: 명단(core·other) + 명단 밖 인물, 방문 수 표시
  const count = {}; visits.forEach(v => count[v.pk] = (count[v.pk] || 0) + 1);
  const groups = [
    {id: "R", label: "공화", keys: fd.figures.filter(f => f.party === "R" && f.layer === "core").map(f => f.key)},
    {id: "D", label: "민주", keys: fd.figures.filter(f => f.party === "D" && f.layer === "core").map(f => f.key)},
    {id: "O", label: "기타 전국 인사", keys: [...fd.figures.filter(f => f.layer === "other").map(f => f.key),
      ...[...new Set(visits.filter(v => !v.fig).map(v => v.pk))]]},
  ];
  const partyOf = k => k.startsWith("x:") ? (visits.find(v => v.pk === k) || {}).party : FIG[k].party;
  const selected = new Set(groups.flatMap(g => g.keys)); // 기본: 전원 선택 — 민주 지도부 방문이 적을 때 첫 화면이 한쪽 당만 보이지 않게
  const picker = document.getElementById("people");
  picker.innerHTML = `<div class="pk-btns">
      <button data-a="all">전체</button><button data-a="R">공화만</button><button data-a="D">민주만</button><button data-a="none">해제</button>
      <label class="pk-only"><input type="checkbox" id="onlyVisited" checked> 방문 기록 있는 인물만 보기</label></div>` +
    groups.map(g => `<div class="pk-group"><span class="pk-label">${g.label}</span>${g.keys.some(k => count[k]) ? "" : `<span class="pk-empty">방문 기록 없음 (${g.keys.length}명)</span>`}${g.keys.map(k => {
      const f = FIG[k], n = count[k] || 0;
      return `<label class="chip ${partyOf(k) || ""}${n ? "" : " zero"}" title="${esc(f ? f.title_ko : "명단 밖 인물")}">
        <input type="checkbox" value="${esc(k)}"${selected.has(k) ? " checked" : ""}> ${esc(nameOf(k))}<span class="n">${n}</span></label>`;
    }).join("")}</div>`).join("");
  const chipInputs = [...picker.querySelectorAll(".chip input")];
  const sync = () => chipInputs.forEach(i => i.checked = selected.has(i.value));
  const applyOnly = () => picker.classList.toggle("only-visited", document.getElementById("onlyVisited").checked);
  picker.addEventListener("change", e => {
    if (e.target.id === "onlyVisited") return applyOnly();
    if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
    draw();
  });
  picker.querySelectorAll(".pk-btns button").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.a, all = groups.flatMap(g => g.keys);
    selected.clear();
    if (a === "all") all.forEach(k => selected.add(k));
    if (a === "R" || a === "D") all.filter(k => partyOf(k) === a).forEach(k => selected.add(k));
    sync(); draw();
  }));
  applyOnly();

  // ---- 지도 (d3 Albers USA, states-albers-10m은 이미 투영된 좌표)
  const W = 975, H = 610;
  const svg = d3.select("#map").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img");
  const proj = d3.geoAlbersUsa().scale(1300).translate([W / 2, H / 2]);
  const geoPath = d3.geoPath();
  let statePaths = null, stateLabels = null;
  const gStates = svg.append("g"), gStateText = svg.append("g").attr("class", "st-labels");
  const gMarks = svg.append("g"), gCity = svg.append("g").attr("class", "city-labels");
  // 북동부 작은 주는 중심점 대신 바다 쪽으로 빼서 쓴다
  const NUDGE = {RI: [22, 10], CT: [10, 18], DE: [20, 4], MD: [28, 14], NJ: [18, 6], MA: [24, -6], NH: [14, -22], VT: [-10, -24], DC: [26, 26]};
  try {
    const topo = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json").then(r => r.json());
    const feats = topojson.feature(topo, topo.objects.states).features;
    statePaths = gStates.selectAll("path").data(feats).join("path").attr("d", geoPath).attr("class", "st");
    stateLabels = gStateText.selectAll("text").data(feats.filter(f => FIPS[f.id])).join("text")
      .attr("x", f => geoPath.centroid(f)[0] + (NUDGE[FIPS[f.id]] || [0, 0])[0])
      .attr("y", f => geoPath.centroid(f)[1] + (NUDGE[FIPS[f.id]] || [0, 0])[1]);
  } catch (e) { console.warn("주 경계 로드 실패", e); }
  const pop = document.getElementById("pop");

  function active() {
    const f = {status: [], race: []};
    document.querySelectorAll("#filters input:checked").forEach(i => f[i.dataset.f].push(i.value));
    return visits.filter(v => selected.has(v.pk) && f.status.includes(v.status) && f.race.includes(v.race));
  }

  function showPop(v) {
    pop.innerHTML = `<b>${who(v)}</b> · ${dateLabel(v)}${v.date_note ? ` <span class="sub">(${esc(v.date_note)})</span>` : ""}<br>
      ${esc(v.city_ko || v.city)}, ${STATE_KO[v.state]} → ${cands(v)} <span class="race">${raceLabel(v.race, v.district)}</span>
      · ${esc(v.event_type_ko || "")} · <i>${STATUS_KO[v.status]}</i>
      ${v.message_ko ? `<div class="pop-msg">${esc(v.message_ko)}</div>` : ""}<div class="pop-src">${srcLinks(v.sources)}</div>`;
  }

  function draw() {
    const vs = active();
    const per = {}; vs.forEach(v => per[v.state] = (per[v.state] || 0) + 1);
    const mx = Math.max(1, ...Object.values(per));
    if (statePaths) statePaths.style("fill", d => { const n = per[FIPS[d.id]] || 0; return n ? d3.interpolateRgb("#e3e8ef", "#9fb0c6")(n / mx) : "#f1f2f4"; });
    // 주 이름: 방문 있는 주는 한글, 나머지는 약자(흐리게)
    if (stateLabels) stateLabels.attr("class", f => per[FIPS[f.id]] ? "on" : "off")
      .attr("x", f => geoPath.centroid(f)[0] + (NUDGE[FIPS[f.id]] || [0, 0])[0])
      .attr("y", f => geoPath.centroid(f)[1] + (NUDGE[FIPS[f.id]] || [0, 0])[1]).attr("text-anchor", "middle")
      .text(f => per[FIPS[f.id]] ? STATE_KO[FIPS[f.id]] : FIPS[f.id]);
    gMarks.selectAll("*").remove(); gCity.selectAll("*").remove();
    const seen = {}, cityDone = {};
    vs.filter(v => v.geo).forEach(v => {
      const xy = proj([v.geo.lon, v.geo.lat]); if (!xy) return;
      const k = `${v.geo.lat},${v.geo.lon}`; const n = seen[k] = (seen[k] || 0) + 1;
      const ang = (n - 1) * 2.1, rr = n > 1 ? 11 : 0;
      const c = PARTY_COLOR[v.party] || "#666";
      gMarks.append("circle").attr("cx", xy[0] + rr * Math.cos(ang)).attr("cy", xy[1] + rr * Math.sin(ang))
        .attr("r", R).attr("stroke", c).attr("stroke-width", 2)
        .attr("fill", c).attr("fill-opacity", v.status === "held" ? 0.75 : 0.08)
        .attr("stroke-dasharray", v.status === "unconfirmed" ? "3 3" : v.status === "cancelled" ? "1 3" : null)
        .attr("class", "mk").on("mouseenter click", () => showPop(v))
        .append("title").text(`${v.fig ? v.fig.name_ko : v.who_en} · ${dateLabel(v)} · ${v.city_ko || v.city}`);
      if (!cityDone[k]) {  // 같은 도시는 이름 한 번
        cityDone[k] = 1;
        gCity.append("text").datum({x: xy[0], y: xy[1]}).text(v.city_ko || v.city);
      }
    });
    placeLabels();
    pop.innerHTML = '<span class="sub">원을 누르거나 마우스를 올리면 행사 내용이 여기 나옵니다.</span>';
    const nogeo = vs.filter(v => !v.geo);
    document.getElementById("nogeo").textContent = nogeo.length
      ? `지도에 없는 ${nogeo.length}건(도시 미상): ` + nogeo.map(v => `${nameOf(v.pk)}–${STATE_KO[v.state]}`).join(", ") + " — 아래 표 참조"
      : "";
    drawMatrix(vs); drawLog(vs);
  }

  // ---- 글자 겹침 회피: 원·이미 놓은 글자와 겹치지 않는 자리를 후보 순서대로 고른다
  function placeLabels() {
    const boxes = [];
    gMarks.selectAll("circle").each(function () {
      const c = this; boxes.push({x: +c.getAttribute("cx") - R, y: +c.getAttribute("cy") - R, w: 2 * R, h: 2 * R});
    });
    const box = el => { const r = el.getBBox(); return {x: r.x - 1, y: r.y - 1, w: r.width + 2, h: r.height + 2}; };
    const hit = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const fit = (el, cands) => {
      for (const [x, y, anchor] of cands) {
        el.setAttribute("x", x); el.setAttribute("y", y); el.setAttribute("text-anchor", anchor);
        const bb = box(el);
        if (!hit(bb)) { boxes.push(bb); return; }
      }
      const [x, y, anchor] = cands[0];  // 다 겹치면 첫 후보 자리에 둔다
      el.setAttribute("x", x); el.setAttribute("y", y); el.setAttribute("text-anchor", anchor);
      boxes.push(box(el));
    };
    gCity.selectAll("text").each(function (d) {
      const o = R + 4;
      fit(this, [[d.x + o, d.y + 4, "start"], [d.x - o, d.y + 4, "end"], [d.x, d.y - o - 2, "middle"], [d.x, d.y + o + 9, "middle"],
                 [d.x + o, d.y + 16, "start"], [d.x - o, d.y - 8, "end"]]);
    });
    if (stateLabels) stateLabels.filter(".on").each(function (f) {
      const [cx, cy] = geoPath.centroid(f), n = NUDGE[FIPS[f.id]] || [0, 0], x = cx + n[0], y = cy + n[1];
      this.removeAttribute("transform");
      fit(this, [[x, y, "middle"], [x, y + 18, "middle"], [x, y - 18, "middle"], [x, y + 34, "middle"], [x, y - 34, "middle"], [x + 30, y, "middle"], [x - 30, y, "middle"]]);
    });
  }

  document.getElementById("legend").innerHTML =
    `<span><i class="dot" style="background:${PARTY_COLOR.R};border-color:${PARTY_COLOR.R}"></i>공화</span>
     <span><i class="dot" style="background:${PARTY_COLOR.D};border-color:${PARTY_COLOR.D}"></i>민주</span>
     <span><i class="dot solid"></i>진행</span><span><i class="dot hollow"></i>예고</span>
     <span><i class="dot dashed"></i>예고 후 미확인</span><span>주 색: 방문 수</span>`;

  function drawMatrix(vs) {
    const races = Object.keys(RACE_KO);
    const keys = [...new Set(vs.map(v => v.pk))];
    const order = k => k.startsWith("x:") ? 999 : fd.figures.findIndex(f => f.key === k);
    const rows = keys.sort((a, b) => order(a) - order(b)).map(k => {
      const mine = vs.filter(v => v.pk === k);
      const st = Object.entries(mine.reduce((a, v) => (a[v.state] = (a[v.state] || 0) + 1, a), {}))
        .sort((a, b) => b[1] - a[1]).map(([s, n]) => `${STATE_KO[s]}${n > 1 ? " " + n : ""}`).join(", ");
      const title = k.startsWith("x:") ? "" : FIG[k].title_ko;
      return `<tr><th class="${partyOf(k)}">${esc(nameOf(k))} <span class="role">${esc(title)}</span></th>${races.map(r => `<td>${mine.filter(v => v.race === r).length || ""}</td>`).join("")}<td><b>${mine.length}</b></td><td class="states">${st}</td></tr>`;
    }).join("");
    document.getElementById("matrix").innerHTML =
      `<tr><th>인물</th>${races.map(r => `<th>${RACE_KO[r]}</th>`).join("")}<th>계</th><th>방문한 주</th></tr>` +
      (rows || `<tr><td colspan="8">선택한 조건의 방문 없음</td></tr>`);
  }

  function drawLog(vs) {
    const sorted = [...vs].sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
    document.getElementById("log").innerHTML =
      `<tr><th>날짜</th><th>주</th><th>도시</th><th>인물</th><th>선거</th><th>지원 후보</th><th>행사</th><th>상태</th><th>내용</th><th>출처</th></tr>` +
      sorted.map(v => `<tr class="st-${v.status}">
        <td>${dateLabel(v)}${v.date_note ? `<div class="sub">${esc(v.date_note)}</div>` : ""}</td>
        <td>${STATE_KO[v.state]}</td><td>${esc(v.city_ko || v.city || "—")}</td>
        <td class="${v.party}">${who(v)}</td><td>${raceLabel(v.race, v.district)}</td><td>${cands(v)}</td>
        <td>${esc(v.event_type_ko || "")}</td><td>${STATUS_KO[v.status]}</td>
        <td>${esc(v.message_ko || "")}</td><td>${srcLinks(v.sources)}</td></tr>`).join("");
  }

  document.querySelectorAll("#filters input").forEach(i => i.addEventListener("change", draw));
  draw();
})();
