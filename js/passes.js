/* B2 내 이용권 — 멤버십 + 스포츠 패스 + 파트너 패스 6종을 한 화면에(보유/미보유 · 가격 · 대표작 3편 · 모의 가입).
   요금·브랜드·작품은 모두 가상, 실제 구독·결제 없음. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  let S;
  try { await App.load(); S = await (await fetch("data/sports.json?v=1")).json(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  const from = new URLSearchParams(location.search).get("from") || "direct";
  L.log("pass_hub_view", { section: "passes", value: from });

  const C = App.data.contents;
  const top3 = (f) => C.filter(f).sort((a, z) => z.rating - a.rating || a.id.localeCompare(z.id)).slice(0, 3);
  const thumbs = (list) => `<div class="ps-th">${list.map((c) => `<a href="detail.html?id=${c.id}" data-id="${c.id}"><span class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : ""}</span><small>${esc(c.title)}</small></a>`).join("")}</div>`;
  const own = (id) => App.ownsPass(id);
  const badge = (id) => `<span class="ps-own ${own(id) ? "on" : ""}">${own(id) ? "✓ 이용 중" : "미보유"}</span>`;

  const memberTop = top3((c) => App.isFree(c) && App.isOriginal(c));
  const sportVids = S.videos.slice(0, 3);
  const leagues = Object.fromEntries(S.leagues.map((l) => [l.id, l.name]));

  root.innerHTML = `<div class="ps-wrap">
    <h1>내 이용권</h1>
    <p class="ps-lead">멤버십·스포츠 패스·파트너 패스로 <b>무엇을 볼 수 있는지</b> 한 화면에서 확인하세요. <small>(교육용: 요금은 가상이며 실제 결제는 없어요)</small></p>
    <div class="ps-legend"><span><i class="lg member"></i>멤버십 포함 → 바로 재생</span><span><i class="lg pass"></i>○○ 패스 필요 → 패스 구독</span><span><i class="lg paid"></i>개별구매 4,500원 → 작품별 구매</span></div>

    <h2 class="ps-h">① 멤버십</h2>
    <article class="ps-card big member" id="membership" data-pass="membership">
      <header><span class="ps-mark m">M+</span><div><b>PLAYLAB 멤버십</b><small>오리지널 · 무료 콘텐츠 전 회차 재생</small></div>${badge("membership")}</header>
      <ul class="ps-ben"><li>‘멤버십 포함’ 작품 전 회차 바로 재생</li><li>오직 PLAYLAB에서 오리지널 시리즈·영화</li><li>파트너 패스·스포츠 패스는 멤버십에 더해 선택 구독</li></ul>
      ${thumbs(memberTop)}</article>

    <h2 class="ps-h">② 스포츠 패스</h2>
    <article class="ps-card big sports" id="sports" data-pass="sports">
      <header><span class="ps-mark s">SPORTS</span><div><b>스포츠 패스</b><small>가상 리그 라이브 · 하이라이트 무제한</small></div>${badge("sports")}</header>
      <div class="ps-th">${sportVids.map((v) => `<a href="sports.html" data-sport="${v.id}"><span class="thumb"><img src="assets/sports/${esc(v.img)}.jpg" alt="" loading="lazy"></span><small>${esc(v.title)}<br><em>${esc(leagues[v.league] || "")}</em></small></a>`).join("")}</div>
      <div class="ps-acts"><a class="btn gray" href="sports-benefits.html" data-sports-go>혜택 보기</a><button class="btn buy" data-sports-join>패스 가입하기</button></div></article>

    <h2 class="ps-h">③ 파트너 패스 6종 <small>멤버십과 별도로 구독</small></h2>
    <div class="ps-grid">${App.data.passes.map((p) => `<article class="ps-card" id="pass-${p.id}" data-pass="${p.id}" style="--bc:${p.color}">
        <header><span class="ps-mark" style="background:${p.color}">${esc(p.brand)}</span><div><b>${esc(p.name)}</b><small>${esc(p.desc || p.tagline)}</small></div>${badge(p.id)}</header>
        <p class="ps-price"><b>${p.price.toLocaleString("ko-KR")}원</b>/월 <small>· 대표작 ${C.filter((c) => c.partnerPass === p.id).length}편</small></p>
        ${thumbs(top3((c) => c.partnerPass === p.id))}
        <div class="ps-acts"><a class="btn gray" href="brand.html?p=${p.id}" data-brand="${p.id}">브랜드관 보기</a><button class="btn buy" data-join="${p.id}">패스 가입하기</button></div></article>`).join("")}</div>
    <p class="ps-fine">※ 교육용 테스트 페이지로 실제 구독·결제는 진행되지 않습니다. 모든 브랜드·작품·가격은 가상입니다.</p></div>`;

  const hash = location.hash.slice(1);
  if (hash) { const el = document.getElementById(hash); if (el) { el.classList.add("focus"); setTimeout(() => el.scrollIntoView({ block: "center" }), 50); } }

  root.addEventListener("click", (e) => {
    const j = e.target.closest("[data-join]");
    if (j) { L.log("pass_detail_view", { value: j.dataset.join, section: "passes_join" }); App.openPassSheet(j.dataset.join); return; }
    const br = e.target.closest("[data-brand]");
    if (br) { L.log("pass_detail_view", { value: br.dataset.brand, section: "passes_brand" }); return; }
    if (e.target.closest("[data-sports-join]")) { L.log("membership_modal_join", { value: "pass:sports", section: "passes" }); App.toast("교육용 페이지입니다. 실제 구독·결제는 진행되지 않아요."); return; }
    if (e.target.closest("[data-sports-go],[data-sport]")) { L.log("pass_detail_view", { value: "sports", section: "passes" }); return; }
    const a = e.target.closest("[data-id]");
    if (a) { L.log("card_click", { target_id: a.dataset.id, section: "passes:" + a.closest("[data-pass]").dataset.pass }); }
  });
})();
