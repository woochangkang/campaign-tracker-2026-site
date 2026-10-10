// 공용: 주 이름·FIPS·선거 종류·출처 링크
window.CT = (function () {
  const STATE_KO = {AL:"앨라배마",AK:"알래스카",AZ:"애리조나",AR:"아칸소",CA:"캘리포니아",CO:"콜로라도",CT:"코네티컷",DE:"델라웨어",FL:"플로리다",GA:"조지아",HI:"하와이",ID:"아이다호",IL:"일리노이",IN:"인디애나",IA:"아이오와",KS:"캔자스",KY:"켄터키",LA:"루이지애나",ME:"메인",MD:"메릴랜드",MA:"매사추세츠",MI:"미시간",MN:"미네소타",MS:"미시시피",MO:"미주리",MT:"몬태나",NE:"네브래스카",NV:"네바다",NH:"뉴햄프셔",NJ:"뉴저지",NM:"뉴멕시코",NY:"뉴욕",NC:"노스캐롤라이나",ND:"노스다코타",OH:"오하이오",OK:"오클라호마",OR:"오리건",PA:"펜실베이니아",RI:"로드아일랜드",SC:"사우스캐롤라이나",SD:"사우스다코타",TN:"테네시",TX:"텍사스",UT:"유타",VT:"버몬트",VA:"버지니아",WA:"워싱턴",WV:"웨스트버지니아",WI:"위스콘신",WY:"와이오밍",DC:"워싱턴DC",US:"전국"};
  const FIPS = {"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};
  const RACE_KO = {senate:"상원", house:"하원", governor:"주지사", multiple:"복수", party_general:"당 일반"};
  const PARTY_KO = {R:"공화", D:"민주", I:"무소속"};
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const md = d => d ? d.slice(5).replace("-", "/") : "—";
  const TIER_KO = {news:"언론", party:"당", campaign:"캠프", government:"정부", official:"공식", secondary:"2차"};
  const srcLinks = srcs => (srcs || []).map(s => s.url
    ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.outlet || "링크")}</a>${s.tier && s.tier !== "news" ? ` <span class="tier tier-${s.tier}">${TIER_KO[s.tier] || s.tier}</span>` : ""}`
    : `${esc(s.outlet || "")}${s.via ? `<div class="sub">${esc(s.via)}</div>` : ""}`).join(" · ");
  const raceLabel = (race, district) => district ? `${RACE_KO[race] || race} ${esc(district)}` : (RACE_KO[race] || race || "");
  // 달러 금액 → 한국어 단위(억·만 달러). 원 단위가 아니라 달러다.
  const usd = n => n == null ? "—" : n >= 1e8 ? `${(n / 1e8).toLocaleString("ko", {maximumFractionDigits: 2})}억 달러`
    : n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString("ko")}만 달러` : `${Math.round(n).toLocaleString("ko")}달러`;
  return {STATE_KO, FIPS, RACE_KO, PARTY_KO, TIER_KO, esc, md, srcLinks, raceLabel, usd};
})();
