// 개요(index.qmd) — 각 페이지 카드에 현재 수치를 붙인다. 자료가 없으면 그 줄만 비운다.
(async function () {
  const {STATE_KO, esc, md, usd} = window.CT;
  const get = f => fetch("data/" + f).then(r => r.ok ? r.json() : null).catch(() => null);
  const [visits, party, ads, fec, cal] = await Promise.all(
    ["visits.json", "party_news.json", "ads.json", "ads_fec.json", "calendar.json"].map(get));
  const set = (id, html) => { document.getElementById(id).innerHTML = html; };
  const today = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10); // 미 동부 기준 근사(선거 일정 페이지와 같은 방식)
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const ago7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);

  document.getElementById("stamp").textContent = `수집 기준 ${visits?.as_of || "—"}`;
  // 1면 띠: 오늘(한국 날짜)·선거일까지 남은 날(11/3, 계산값)·핵심 수치 4개
  const kst = new Date(Date.now() + 9 * 3600e3), kd = kst.toISOString().slice(0, 10);
  const dday = Math.round((Date.parse("2026-11-03") - Date.parse(kd)) / 864e5);
  document.getElementById("today").textContent =
    `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${"일월화수목금토"[kst.getUTCDay()]}요일 · 선거일(11월 3일)까지 ${dday}일`;
  const kpi = (n, label) => `<div class="kpi"><b>${n}</b><span>${label}</span></div>`;
  const held = visits ? visits.visits.filter(x => x.status === "held").length : "—";
  const debates = cal ? cal.events.filter(e => e.kind === "debate" && e.date && e.date >= today && e.date <= in14 && !["cancelled", "declined", "proposed"].includes(e.status)).length : "—";
  const ie = fec ? Object.values(fec.races).reduce((a, x) => a + x.pro_D + x.pro_R, 0) : null;
  document.getElementById("kpis").innerHTML = kpi(held, "주요 인물 현장 방문(진행)") + kpi(debates, "앞으로 2주 후보 토론") +
    kpi(ie == null ? "—" : usd(ie), "외곽단체 신고 지출(FEC)") + kpi(ads ? ads.items.length : "—", "수집된 광고 사건");

  if (visits) {
    const v = visits.visits, c = s => v.filter(x => x.status === s).length;
    const wk = v.filter(x => x.status === "held" && x.date && x.date >= ago7 && x.date <= today).length;
    set("n-map", `방문 ${v.length}건 — 진행 ${c("held")} · 예고 ${c("planned")} · 미확인 ${c("unconfirmed")}<br>최근 7일 진행 ${wk}건`);
  }
  if (party) set("n-party", `${party.items.length}건 — 공화 ${party.items.filter(n => n.party === "R").length} · 민주 ${party.items.filter(n => n.party === "D").length}`);
  if (fec) {
    const r = Object.values(fec.races), d = r.reduce((a, x) => a + x.pro_D, 0), g = r.reduce((a, x) => a + x.pro_R, 0);
    set("n-ads", `FEC 외곽 지출 — 민주 우호 ${usd(d)} · 공화 우호 ${usd(g)} (${fec.as_of} 조회)<br>일일 광고 사건 ${ads ? ads.items.length : 0}건`);
  }
  if (cal) {
    const up = cal.events.filter(e => e.date && e.date >= today && e.date <= in14 && !["cancelled", "declined", "proposed"].includes(e.status));
    const deb = up.filter(e => e.kind === "debate").sort((a, b) => a.date.localeCompare(b.date));
    set("n-cal", `앞으로 2주 일정 ${up.length}건, 그중 토론 ${deb.length}건` +
      (deb.length ? `<br>다음 토론: ${deb.slice(0, 2).map(e => `${md(e.date)} ${STATE_KO[e.state] || e.state} ${esc(e.title_ko || "")}`).join(" · ")}` : ""));
  }
  const first = document.querySelector("#listing-recent tbody tr");  // Quarto가 목록 id 앞에 listing-을 붙인다
  if (first) {
    const td = first.querySelectorAll("td");
    set("n-brief", `최신: ${td[0]?.textContent.trim() || ""} ${esc(td[1]?.textContent.trim() || "")}`);
  }
})();
