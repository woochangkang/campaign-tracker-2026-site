// 광고 트래커 공용: 라벨·자료 불러오기·표 렌더러 (개요 ads.qmd와 하위 ads/*.qmd가 함께 쓴다)
window.ADS = (function () {
  const {STATE_KO, esc, md, srcLinks, usd} = window.CT;
  const KIND = {reservation: "예약", cancel: "취소·감액", launch: "새 광고"};
  const MEDIUM = {tv: "TV", streaming: "스트리밍", digital: "디지털", radio: "라디오", mixed: "복합", unknown: "미상",
                  media_other: "미디어 구매(매체 미상)", mail: "우편", text_phone: "문자·전화", field: "현장", other: "기타"};
  const ISSUE = {economy: "경제", inflation: "물가", immigration: "이민", abortion: "낙태", healthcare: "의료", crime: "범죄",
                 taxes: "세금", energy: "에너지", democracy: "민주주의", trump: "트럼프", character: "인물 공격", local: "지역 현안", other: "기타"};
  const SPONSOR = {campaign: "캠프", party: "당 위원회", super_pac: "슈퍼팩", outside_other: "외곽단체"};
  const BASIS = {reservation: "예약", press: "보도"};

  async function load(root) {
    const get = f => fetch(root + "data/" + f).then(r => r.ok ? r.json() : null).catch(() => null);
    const [daily, fec, google, pages] = await Promise.all(
      ["ads.json", "ads_fec.json", "ads_google.json", "ads_pages.json"].map(get));
    return {daily: daily || {items: []}, fec, google, pages: pages || {pages: []}};
  }

  // 선거 키(senate-GA, house-NY-17, governor-PA) ↔ 일일 항목
  function dailyKey(x) {
    if (x.race === "house" && x.district) {
      const [st, dd] = x.district.split("-");
      return `house-${st}-${/^\d+$/.test(dd) ? dd.padStart(2, "0") : dd}`;
    }
    return ["senate", "governor"].includes(x.race) ? `${x.race}-${x.state}` : null;
  }
  function raceTitle(key) {
    const [race, st, dd] = key.split("-");
    if (race === "house") return `${STATE_KO[st] || st} ${/^\d+$/.test(dd) ? +dd : "전역"}구 하원`;
    return `${STATE_KO[st] || st} ${({senate: "상원", governor: "주지사"})[race]}`;
  }

  // 민주/공화 우호 막대 한 쌍 — max 기준 길이
  // 막대 길이 = (칸 폭 − 금액 라벨 폭) × 비율 → 가장 긴 막대도 라벨이 잘리지 않는다
  const bar = (side, v, max) => `<div class="adbar"><span class="b ${side}" style="width:calc((100% - 7.5em) * ${max ? (v / max).toFixed(4) : 0})"></span><em>${usd(v)}</em></div>`;
  const bars = (d, r, max) => bar("D", d, max) + bar("R", r, max);

  function eventsTable(items, showRace, root) {
    const head = `<tr><th>날짜</th><th>광고주</th>${showRace ? "<th>선거</th>" : ""}<th>종류·매체</th><th>내용</th><th>금액</th><th>출처</th></tr>`;
    if (!items.length) return head + `<tr><td colspan="${showRace ? 7 : 6}">아직 수집된 광고 사건이 없습니다.</td></tr>`;
    return head + items.map(x => {
      const k = dailyKey(x);
      const race = k ? `<a href="${root}ads/${k}.html">${raceTitle(k)}</a>` : esc(x.state || "");
      const amt = x.amount_usd == null ? "" : `${usd(x.amount_usd)}${x.amount_basis ? `<div class="sub">${BASIS[x.amount_basis] || x.amount_basis}</div>` : ""}` +
        (x.claim ? ` <span class="tier tier-party">주장</span>` : "");
      const issues = (x.issues || []).map(i => `<span class="race">${ISSUE[i] || i}</span>`).join(" ");
      return `<tr><td>${md(x.date)}</td><td class="${x.party || ""}">${esc(x.sponsor)}${x.sponsor_type ? `<div class="sub">${SPONSOR[x.sponsor_type]}</div>` : ""}</td>
        ${showRace ? `<td>${race}</td>` : ""}<td>${KIND[x.kind] || x.kind}<div class="sub">${MEDIUM[x.medium] || ""}</div></td>
        <td><b>${esc(x.headline_ko)}</b>${x.message_ko ? `<div class="sub">${esc(x.message_ko)}</div>` : ""}${issues ? `<div>${issues}</div>` : ""}
        ${x.creative_url ? `<div><a href="${esc(x.creative_url)}" target="_blank" rel="noopener">광고 보기</a></div>` : ""}</td>
        <td>${amt}</td><td>${srcLinks(x.sources)}</td></tr>`;
    }).join("");
  }

  const mediumMix = (bm, keys) => {
    const tot = Object.values(bm || {}).reduce((a, b) => a + b, 0);
    if (!tot) return "";
    return Object.entries(bm).filter(([m]) => !keys || keys.includes(m)).slice(0, 3)
      .map(([m, v]) => `${MEDIUM[m] || m} ${Math.round(100 * v / tot)}%`).join(" · ");
  };

  const gRange = (lo, hi) => `${usd(lo)} ~ ${usd(hi)}`;

  return {KIND, MEDIUM, ISSUE, SPONSOR, load, dailyKey, raceTitle, bars, eventsTable, mediumMix, gRange};
})();
