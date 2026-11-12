/* B6 공개 예정 — 월간 캘린더(날짜별 공개 작품 썸네일) + 날짜 선택 시 해당 작품 카드(알림 받기·공유하기) + '알림 받은 일정만 보기'.
   매주 공개 작품은 해당 요일마다 표시. 일정·작품은 모두 가상, 기준일은 접속한 날의 한국 시간(KST) 오늘. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  L.log("page_view", { section: "upcoming" });

  /* 오늘 = 한국 시간(KST, UTC+9) 기준 날짜. 공개일은 오늘에서 며칠 뒤로 계산해 항상 '공개 예정'으로 보이게 함 */
  const kst = new Date(Date.now() + 9 * 3600000);
  const BASE = new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()), WD = "일월화수목금토";
  const add = (off) => { const d = new Date(BASE); d.setDate(d.getDate() + off); return d; };
  const T = (title) => App.data.contents.find((c) => c.title === title);
  /* A안 공개 예정과 같은 8편: [작품, 공개일 | 매주 요일, 시각, 안내, 예약 구매] */
  const LIST = [
    [T("최후의 저격"), add(11), "오후 6시", "예약 구매하기", true],
    [T("썸 하우스"), { weekly: 2 }, "오후 11시 55분", "2기: 매주 화요일 공개"],
    [T("우리 동네 의사들"), add(24), "오후 5시", ""],
    [T("교실 밖 청춘"), { weekly: 5 }, "오후 9시", "시즌 2: 매주 금요일 공개"],
    [T("도시의 온도"), add(17), "오후 8시", ""],
    [T("검은 법정"), add(31), "오후 10시", ""],
    [T("별빛 마법학교"), add(38), "오후 4시", ""],
    [T("사이버 시티 2099"), add(45), "오후 6시", "예약 구매하기", true],
  ].filter(([c]) => c).map(([c, when, time, note, buy]) => ({ c, when, time, note, buy }));

  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const same = (a, b) => key(a) === key(b);
  const on = (item, d) => (item.when.weekly != null ? d >= BASE && d.getDay() === item.when.weekly : same(item.when, d));
  const notified = () => App.LS.get("notify_B", []);
  const MIN = new Date(BASE.getFullYear(), BASE.getMonth(), 1), MAX = new Date(BASE.getFullYear(), BASE.getMonth() + 2, 1);
  let month = new Date(MIN), sel = null, onlyNoti = false;

  const bell = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
  const share = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8 14.8 7.2M8.2 13.2l6.6 3.6"/></svg>';
  const visible = () => LIST.filter((it) => !onlyNoti || notified().includes(it.c.id));
  const dayItems = (d) => visible().filter((it) => on(it, d));
  /* 날짜 칸의 작품 점 색: 패스=패스 색, 개별구매(예약 구매)=주황, 멤버십 포함=파랑 */
  const dotColor = (c) => (c.partnerPass && App.pass(c.partnerPass) ? App.pass(c.partnerPass).color : c.access === "paid" ? "#ff6f00" : "#1a8cff");
  const label = (it, d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]}) ${it.time} 공개${it.note ? " · " + it.note : ""}`;

  function cardHTML(it, d) {
    const c = it.c, nOn = notified().includes(c.id);
    return `<article class="up-card" data-id="${c.id}">
      <a class="up-media" href="detail.html?id=${c.id}" data-open="${c.id}">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy" onerror="this.remove()">` : ""}</a>
      <div class="up-info"><div class="up-title"><h2>${esc(c.title)}</h2><p class="${it.buy ? "buy" : ""}">${esc(label(it, d))}</p></div>
        <div class="up-acts"><button data-notify="${c.id}" class="${nOn ? "on" : ""}" aria-pressed="${nOn}">${bell}<span>${nOn ? "알림 설정됨" : "알림 받기"}</span></button><button data-share="${c.id}">${share}<span>공유하기</span></button></div></div>
      <p class="up-desc">${esc(c.synopsis.replace(" (가상 작품)", ""))} ${esc(c.genres.slice(0, 2).join("·"))} 장르의 신작으로, 공개일에 맞춰 알림을 받아볼 수 있어요. (가상 소개)</p></article>`;
  }

  function render() {
    const y = month.getFullYear(), m = month.getMonth();
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push('<div class="cal-c empty"></div>');
    for (let dd = 1; dd <= days; dd++) {
      const d = new Date(y, m, dd), its = dayItems(d), k = key(d);
      cells.push(`<button class="cal-c ${same(d, BASE) ? "today" : ""} ${sel === k ? "sel" : ""} ${its.length ? "has" : ""} ${d < BASE ? "past" : ""}" data-day="${k}" aria-label="${m + 1}월 ${dd}일${its.length ? ` 공개 ${its.length}편` : ""}">
        <span class="dn">${dd}${same(d, BASE) ? "<em>오늘</em>" : ""}</span>
        <span class="evs">${its.slice(0, 3).map((it) => `<span class="ev ${notified().includes(it.c.id) ? "noti" : ""}" style="--ec:${dotColor(it.c)}" title="${esc(it.c.title)}"><i></i>${esc(it.c.title)}</span>`).join("")}${its.length > 3 ? `<small class="ev-more">+${its.length - 3}개 더</small>` : ""}</span></button>`);
    }
    /* 아래 목록: 날짜를 고르면 그날, 아니면 이번 달 전체(날짜순) */
    let list = [];
    if (sel) { const d = new Date(sel + "T00:00:00"); list = dayItems(d).map((it) => [it, d]); }
    else for (let dd = 1; dd <= days; dd++) { const d = new Date(y, m, dd); dayItems(d).forEach((it) => { if (it.when.weekly == null || !list.some(([x]) => x === it)) list.push([it, d]); }); }
    const selD = sel && new Date(sel + "T00:00:00");
    root.innerHTML = `<div class="up-wrap cal-wrap"><h1>공개 예정</h1>
      <div class="cal-head"><button class="cal-nav" data-mv="-1" ${month <= MIN ? "disabled" : ""} aria-label="이전 달">‹</button><b>${y}년 ${m + 1}월</b><button class="cal-nav" data-mv="1" ${month >= MAX ? "disabled" : ""} aria-label="다음 달">›</button>
        <label class="sw cal-only"><input type="checkbox" id="only-noti" ${onlyNoti ? "checked" : ""}><span></span> 알림 받은 일정만 보기</label></div>
      <div class="cal-grid" role="grid">${[..."일월화수목금토"].map((w, i) => `<div class="cal-w ${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${w}</div>`).join("")}${cells.join("")}</div>
      <div class="cal-list-h"><h2>${sel ? `${selD.getMonth() + 1}월 ${selD.getDate()}일 (${WD[selD.getDay()]}) 공개` : `${m + 1}월 공개 일정`}<small> ${list.length}편</small></h2>${sel ? '<button class="btn" data-all>이번 달 전체 보기</button>' : ""}</div>
      ${list.length ? `<div class="up-grid">${list.map(([it, d]) => cardHTML(it, d)).join("")}</div>` : `<p class="soon">${onlyNoti ? "알림 받은 일정이 없어요. 작품의 ‘알림 받기’를 눌러 보세요." : "이 날은 공개 예정작이 없어요."}</p>`}</div>`;
  }
  render();
  L.log("calendar_view", { section: "upcoming", value: key(month).slice(0, 7) });

  root.addEventListener("change", (e) => {
    if (e.target.id === "only-noti") { onlyNoti = e.target.checked; L.log("calendar_view", { section: "upcoming", value: "only_notified:" + (onlyNoti ? "on" : "off") }); render(); }
  });
  root.addEventListener("click", (e) => {
    const mv = e.target.closest("[data-mv]");
    if (mv) { month = new Date(month.getFullYear(), month.getMonth() + Number(mv.dataset.mv), 1); sel = null; L.log("calendar_view", { section: "upcoming", value: key(month).slice(0, 7) }); render(); return; }
    const dy = e.target.closest("[data-day]");
    if (dy) { sel = sel === dy.dataset.day ? null : dy.dataset.day; L.log("calendar_date_click", { section: "upcoming", value: dy.dataset.day }); render(); return; }
    if (e.target.closest("[data-all]")) { sel = null; render(); return; }
    const nt = e.target.closest("[data-notify]");
    if (nt) {
      const id = nt.dataset.notify, l = notified(), i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      L.log("release_notify", { target_id: id, section: "upcoming_calendar", value: i >= 0 ? "off" : "on" });
      App.LS.set("notify_B", l);
      App.toast(i >= 0 ? "알림을 해제했어요." : "공개되면 알려드릴게요. (교육용: 실제 알림은 없어요)");
      render(); return;
    }
    const sh = e.target.closest("[data-share]");
    if (sh) { L.log("share_click", { target_id: sh.dataset.share, section: "upcoming" }); App.toast("교육용 테스트 페이지에서는 공유 기능을 제공하지 않아요."); return; }
    const op = e.target.closest("[data-open]"); if (op) L.log("card_click", { target_id: op.dataset.open, section: "upcoming" });
  });
  /* 페이지를 켜 둔 채 KST 자정이 지나면 오늘 표시를 새 날짜로 */
  const todayKey = key(BASE);
  setInterval(() => { if (new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10) !== todayKey) location.reload(); }, 60000);
})();
