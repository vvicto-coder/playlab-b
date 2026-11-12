/* B안 카테고리 페이지 — 상단 '카테고리' 목록에서 세부 장르를 누르면 열리는 작품 모음(category.html?c=로맨스).
   가상 데이터에는 제작 국가가 없어서, 국가별 카테고리는 아래 REGION 규칙(패스 브랜드 → 국가, 그 외는 작품 ID 고정 배정)으로 나눈다.
   교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }

  const cat = new URLSearchParams(location.search).get("c") || "";
  const C = App.data.contents;
  /* 제작 국가(가상 규칙): 패스 브랜드 성격 → 국가, PLAYLAB 오리지널 → 한국, 나머지는 작품 ID 로 고정 배정 */
  const PASS_REGION = { star: "미국", sonyx: "미국", moa: "중화권", jwave: "일본", lounge: "일본" };
  const SPREAD = ["한국", "미국", "한국", "유럽", "미국", "한국"];
  const region = (c) => PASS_REGION[c.partnerPass] || (App.isOriginal(c) ? "한국" : SPREAD[parseInt(c.id.slice(1), 10) % SPREAD.length]);
  const movie = (c) => c.format === "movie";
  const tv = (c) => c.format === "series" && c.type !== "애니메이션";
  const genre = (...gs) => (c) => c.genres.some((g) => gs.includes(g)) || gs.includes(c.type);
  const RULES = {
    "외국 영화": (c) => movie(c) && region(c) !== "한국",
    "한국 영화": (c) => movie(c) && region(c) === "한국",
    "미국 영화": (c) => movie(c) && region(c) === "미국",
    "유럽 영화": (c) => movie(c) && region(c) === "유럽",
    "중화권 영화": (c) => movie(c) && region(c) === "중화권",
    "외국 TV 프로그램": (c) => tv(c) && region(c) !== "한국",
    "한국 TV 프로그램": (c) => tv(c) && region(c) === "한국",
    "영문 자막": (c) => region(c) === "미국" || region(c) === "유럽",
    "드라마": genre("드라마"), "애니메이션": genre("애니메이션"), "키즈": genre("키즈", "유아", "동요", "동화"),
    "스릴러": genre("스릴러"), "공포": genre("공포", "오컬트"), "액션": genre("액션"), "다큐멘터리": genre("다큐멘터리"),
    "범죄": genre("범죄", "수사물"), "가족": genre("가족"), "코미디": genre("코미디", "로맨틱 코미디"), "판타지": genre("판타지"),
    "로맨스": genre("로맨스", "로맨틱 코미디"), "어드벤처": genre("어드벤처"),
  };
  const rule = RULES[cat];
  document.title = `${cat || "카테고리"} · PLAYLAB B안`;
  L.log("page_view", { section: "category", value: cat });
  if (!rule) { root.innerHTML = `<div class="page"><p>‘${esc(cat)}’ 카테고리를 찾을 수 없어요.</p><p><a class="btn" href="index.html">홈으로</a></p></div>`; return; }

  const all = C.filter(rule);
  const SORTS = [["reco", "추천순"], ["new", "최신순"], ["rating", "평점순"]];
  let sort = "reco";
  const sorted = () => sort === "reco" ? App.P.rank(all)
    : all.slice().sort(sort === "new" ? (a, z) => z.year - a.year || a.id.localeCompare(z.id) : (a, z) => z.rating - a.rating || a.id.localeCompare(z.id));
  const card = (c) => `<a class="card" href="detail.html?id=${c.id}" data-id="${c.id}"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${App.tagHTML(c)}<div class="ctitle">${esc(c.title)}</div></div>
    <small class="ct-meta">${esc(c.type)} · ${c.year} · <em class="acc ${App.accessKind(c)}">${esc(App.accessLabel(c))}</em></small></a>`;

  function render() {
    root.innerHTML = `<div class="ct-wrap"><div class="ct-head"><a class="ct-back" href="javascript:history.back()" aria-label="뒤로">←</a><h1>${esc(cat)}</h1><span class="ct-n">${all.length}편</span></div>
      <div class="ct-sort" role="tablist">${SORTS.map(([k, t]) => `<button role="tab" data-sort="${k}" class="${sort === k ? "on" : ""}" aria-selected="${sort === k}">${t}</button>`).join("")}</div>
      ${all.length ? `<div class="ct-grid">${sorted().map(card).join("")}</div>` : '<p class="soon big">이 카테고리에 해당하는 작품이 아직 없어요.</p>'}</div>`;
  }
  render();

  root.addEventListener("click", (e) => {
    const s = e.target.closest("[data-sort]");
    if (s) { sort = s.dataset.sort; L.log("tab_click", { section: "category:" + cat, value: "sort_" + sort }); render(); return; }
    const cd = e.target.closest(".card");
    if (cd) L.log("card_click", { target_id: cd.dataset.id, section: "category:" + cat });
  });
})();
