// 광고 트래커 선거구별 하위 페이지(ads/<key>.qmd) — #race[data-race]의 키로 그린다
(async function () {
  const {STATE_KO, esc, md, usd} = window.CT;
  const A = window.ADS;
  const el = document.getElementById("race");
  const key = el.dataset.race, root = el.dataset.root;
  const [race, st] = key.split("-");
  const {daily, fec, google} = await A.load(root);
  const r = fec?.races?.[key];
  const g = google?.states?.[st];
  const items = daily.items.filter(x => A.dailyKey(x) === key);

  const card = (label, body, note) => `<div class="card"><div class="card-l">${label}</div>${body}${note ? `<div class="sub">${note}</div>` : ""}</div>`;
  const fecCard = race === "governor" ? card("FEC 독립지출", "<p>해당 없음</p>", "주지사 선거는 FEC 신고 대상이 아니다.")
    : r ? card("FEC 독립지출(집행)", A.bars(r.pro_D, r.pro_R, Math.max(r.pro_D, r.pro_R)),
        `그중 광고 매체: 민주 우호 ${usd(r.ads_D)} · 공화 우호 ${usd(r.ads_R)}${r.unaligned ? ` · 진영 미상 ${usd(r.unaligned)}` : ""}${r.independent_note ? " · 무소속 후보 지원분은 민주 쪽에 포함" : ""}`)
    : card("FEC 독립지출(집행)", "<p>신고 없음</p>", fec ? `${fec.as_of} 조회 기준` : "자료 없음");
  const res = items.filter(x => x.kind === "reservation" && x.amount_usd);
  const dailyCard = card("일일 수집 광고 사건", `<p class="big">${items.length}건</p>`,
    res.length ? `금액이 있는 예약 ${res.length}건 — 민주 ${usd(res.filter(x => x.party === "D").reduce((a, x) => a + x.amount_usd, 0))} · 공화 ${usd(res.filter(x => x.party === "R").reduce((a, x) => a + x.amount_usd, 0))} (보도·발표 기준, 중복 가능)` : "");
  const gCard = g ? card(`Google 광고 — ${STATE_KO[st]} 전체`, `<p class="big">${A.gRange(g.spend_min, g.spend_max)}</p>`,
    `한 주만 겨냥한 광고 ${g.n_ads.toLocaleString()}건. 같은 주의 다른 선거 광고도 섞여 있다.`) : card("Google 광고", "<p>자료 없음</p>");

  let html = `<p class="stamp">FEC ${fec?.as_of || "—"} 조회 · 일일 수집 ${daily.as_of || "—"}까지 · Google ${String(google?.report_updated || "—").slice(0, 10)} 갱신분 · <a href="${root}ads.html">← 광고 트래커 개요</a></p>
    <p class="legend"><span><i class="sw D"></i>민주 우호</span><span><i class="sw R"></i>공화 우호</span></p>
    <div class="cards">${fecCard}${dailyCard}${gCard}</div>`;

  if (r && r.weekly.length) {
    const wk = r.weekly.slice(-16), max = Math.max(...wk.map(w => Math.max(w.D, w.R)), 1);
    const W = 640, H = 170, bw = W / wk.length, y = v => H - 22 - (H - 34) * v / max;
    html += `<h2>주별 외곽 지출 <span class="h-sub">FEC · 지출일 기준 최근 16주</span></h2>
      <svg class="wk" viewBox="0 0 ${W} ${H}" role="img" aria-label="주별 외곽 지출">
      ${wk.map((w, i) => `<rect class="D" x="${i * bw + 2}" y="${y(w.D)}" width="${bw / 2 - 2}" height="${H - 22 - y(w.D)}"><title>${w.week} 주 민주 우호 ${usd(w.D)}</title></rect>
        <rect class="R" x="${i * bw + bw / 2}" y="${y(w.R)}" width="${bw / 2 - 2}" height="${H - 22 - y(w.R)}"><title>${w.week} 주 공화 우호 ${usd(w.R)}</title></rect>
        ${i % 2 === 0 ? `<text x="${i * bw + bw / 2}" y="${H - 6}">${md(w.week)}</text>` : ""}`).join("")}
      <text class="ymax" x="2" y="10">최대 ${usd(max)}</text></svg>
      <p class="note">최근 몇 주는 신고가 덜 들어와 작게 보인다(24/48시간 통지는 마지막 정기 보고 이후분만 포함).</p>`;
  }

  html += `<h2>광고 사건 <span class="h-sub">일일 수집 — 예약·취소·새 광고</span></h2><div class="table-wrap"><table class="log">${A.eventsTable(items, false, root)}</table></div>`;

  if (r) {
    html += `<h2>외곽 지출 위원회 <span class="h-sub">FEC · 위원회×후보×지지/반대 상위 15</span></h2>
      <div class="table-wrap"><table class="log"><tr><th>위원회</th><th>대상 후보</th><th>지지/반대</th><th>금액</th><th>매체</th><th>최근 지출</th></tr>
      ${r.top.map(l => `<tr><td class="${l.side || ""}">${esc(l.committee)}<div class="sub">${l.committee_id}${l.affiliate_of ? ` · 계열 ${l.affiliate_of}` : ""}</div></td>
        <td>${esc(l.candidate || "")}${l.party ? `<div class="sub">${esc(l.party)}</div>` : ""}</td><td>${l.so === "S" ? "지지" : l.so === "O" ? "반대" : "—"}</td>
        <td>${usd(l.total)}${l.notice_recent ? `<div class="sub">최근 통지 ${usd(l.notice_recent)}</div>` : ""}</td>
        <td class="sub">${A.mediumMix(l.by_medium)}</td><td>${md(l.last_date)}</td></tr>`).join("")}</table></div>
      <p class="note">${r.n_lines}개 줄 중 상위 15. 매체는 신고 문구로 분류해 거칠다. 같은 단체가 여러 위원회 ID로 신고하면 따로 나온다(계열 표시는 확인된 것만).</p>`;
  }

  if (g) {
    html += `<h2>Google 광고 — ${STATE_KO[st]} <span class="h-sub">검색·YouTube·디스플레이 · 정당 구분 없음</span></h2>
      <div class="table-wrap"><table class="log"><tr><th>광고주</th><th>광고 수</th><th>지출 구간</th></tr>
      ${g.top_advertisers.slice(0, 10).map(a => `<tr><td>${esc(a.name)}${a.fec_id ? `<div class="sub">FEC ${a.fec_id}</div>` : ""}</td><td>${a.n_ads}</td><td>${A.gRange(a.spend_min, a.spend_max)}</td></tr>`).join("")}</table></div>
      <h3>최근 노출된 광고</h3><div class="table-wrap"><table class="log"><tr><th>노출 기간</th><th>광고주</th><th>형식</th><th>지출 구간</th><th></th></tr>
      ${g.recent_ads.map(x => `<tr><td>${md(x.start)}~${md(x.end)}<div class="sub">${x.start.slice(0, 4)}</div></td><td>${esc(x.advertiser)}</td><td>${esc(x.type)}</td><td>${A.gRange(x.min, x.max)}</td>
        <td><a href="${esc(x.url)}" target="_blank" rel="noopener">광고 보기</a></td></tr>`).join("")}</table></div>`;
  }
  el.innerHTML = html;
})();
