// 광고 트래커 개요(ads.qmd)
(async function () {
  const {STATE_KO, esc, md, usd} = window.CT;
  const A = window.ADS;
  const {daily, fec, google, pages} = await A.load("");
  const pageSet = new Set(pages.pages.map(p => p.key));
  const link = (k, text) => pageSet.has(k) ? `<a href="ads/${k}.html">${text}</a>` : text;
  const evCount = {};
  daily.items.forEach(x => { const k = A.dailyKey(x); if (k) evCount[k] = (evCount[k] || 0) + 1; });

  document.getElementById("stamp").textContent = [
    `일일 수집 ${daily.items.length}건(${daily.as_of || "—"}까지)`,
    fec ? `FEC ${fec.as_of} 조회` : "FEC 자료 없음",
    google ? `Google 보고서 ${String(google.report_updated || "").slice(0, 10)} 갱신분` : "Google 자료 없음",
  ].join(" · ");

  // 선거별 FEC
  function drawRaces() {
    const rr = document.querySelector("input[name=rr]:checked").value, rn = +document.querySelector("input[name=rn]:checked").value;
    const tb = document.getElementById("races");
    if (!fec) { tb.innerHTML = "<tr><td>FEC 자료가 아직 없습니다(매일 갱신).</td></tr>"; return; }
    const rows = Object.entries(fec.races).filter(([, r]) => rr === "all" || r.race === rr).slice(0, rn);
    const max = Math.max(...rows.map(([, r]) => Math.max(r.pro_D, r.pro_R)), 1);
    tb.innerHTML = `<tr><th>선거</th><th style="min-width:14em">민주 우호 / 공화 우호</th><th>광고 매체 비중</th><th>최근 신고</th><th>일일 사건</th></tr>` +
      rows.map(([k, r]) => `<tr><td>${link(k, A.raceTitle(k))}${r.independent_note ? `<div class="sub">무소속 후보 지원분을 민주 쪽에 포함</div>` : ""}</td>
        <td>${A.bars(r.pro_D, r.pro_R, max)}</td>
        <td class="sub">${A.mediumMix(r.by_medium)}</td><td>${md(r.last_date)}</td><td>${evCount[k] || ""}</td></tr>`).join("");
  }
  document.querySelectorAll("#rf input").forEach(i => i.addEventListener("change", drawRaces)); drawRaces();
  if (fec) document.getElementById("fecnote").textContent =
    `${fec.provenance_note} 원자료 ${fec.counts.raw.toLocaleString()}행 중 ${fec.counts.kept.toLocaleString()}행 사용` +
    (fec.warnings.length ? ` · 날짜 오류 의심 ${fec.warnings.length}건은 금액에 넣되 주별 추이에서 뺐다.` : ".");

  // 주지사 — 일일 수집만
  const gov = Object.entries(evCount).filter(([k]) => k.startsWith("governor-")).sort((a, b) => b[1] - a[1]);
  document.getElementById("gov").innerHTML = gov.length
    ? `<p>${gov.map(([k, n]) => `${link(k, A.raceTitle(k))} ${n}건`).join(" · ")}</p>`
    : `<p class="note">아직 수집된 주지사 선거 광고 사건이 없습니다.</p>`;

  // 일일 사건
  function drawEvents() {
    const f = {party: [], kind: []};
    document.querySelectorAll("#ef input:checked").forEach(i => f[i.dataset.f].push(i.value));
    const items = daily.items.filter(x => f.party.includes(x.party || "I") && f.kind.includes(x.kind)).slice(0, 60);
    document.getElementById("events").innerHTML = A.eventsTable(items, true, "");
  }
  document.querySelectorAll("#ef input").forEach(i => i.addEventListener("change", drawEvents)); drawEvents();

  // Google 주별
  if (google) {
    const st = Object.entries(google.states).sort((a, b) => b[1].spend_max - a[1].spend_max).slice(0, 25);
    document.getElementById("gstates").innerHTML = `<tr><th>주</th><th>광고 수</th><th>지출 구간</th><th>상위 광고주</th></tr>` +
      st.map(([s, x]) => `<tr><td>${link(`senate-${s}`, STATE_KO[s] || s)}</td><td>${x.n_ads.toLocaleString()}</td><td>${A.gRange(x.spend_min, x.spend_max)}</td>
        <td class="sub">${x.top_advertisers.slice(0, 3).map(a => esc(a.name)).join(" · ")}</td></tr>`).join("");
    document.getElementById("gnote").textContent = `${google.provenance_note} 여러 주·전국 타깃 광고 ${google.multi_state.n_ads.toLocaleString()}건(${A.gRange(google.multi_state.min, google.multi_state.max)})은 주별 표에 없다.` +
      (google.excluded_advertisers?.length ? ` 상업 광고주 제외: ${google.excluded_advertisers.join(", ")}.` : "");
  } else document.getElementById("gstates").innerHTML = "<tr><td>Google 자료가 아직 없습니다(매일 갱신).</td></tr>";

  // 상위 위원회
  if (fec) document.getElementById("comms").innerHTML = `<tr><th>위원회</th><th>합계</th><th>민주 우호 / 공화 우호</th><th>주요 선거</th></tr>` +
    fec.committees.slice(0, 20).map(c => `<tr><td>${esc(c.name)}<div class="sub">${c.committee_id}${c.affiliate_of ? ` · 계열 ${c.affiliate_of}` : ""}</div></td>
      <td>${usd(c.total)}</td><td>${c.D ? `<span class="D-t">${usd(c.D)}</span>` : ""}${c.D && c.R ? " / " : ""}${c.R ? `<span class="R-t">${usd(c.R)}</span>` : ""}</td>
      <td class="sub">${Object.keys(c.races).slice(0, 4).map(k => link(k, A.raceTitle(k))).join(" · ")}</td></tr>`).join("");

  // 하위 페이지 목록
  document.getElementById("pcrit").textContent = `기준: ${pages.criteria || ""}`;
  const groups = {senate: "상원", governor: "주지사", house: "하원"};
  document.getElementById("plinks").innerHTML = Object.entries(groups).map(([g, label]) => {
    const ps = pages.pages.filter(p => p.key.startsWith(g + "-"));
    return ps.length ? `<div><b>${label}</b> ${ps.map(p => `<a href="ads/${p.key}.html">${esc(p.title)}</a>`).join(" · ")}</div>` : "";
  }).join("");
})();
