/* 인스트림 광고(가상) — 프리롤/미드롤/엔드카드를 플레이어 위에 덮어서 보여준다.
   하단 왼쪽: '광고 · N초 남음', 오른쪽: '광고 없이 시청하려면' ↔ 'premium 구독하기' + 그 아래 큰 파란 '🛒 장바구니 담기 (오직 M+!에서만)'(B8).
   건너뛰기는 없음(시안 기준). 상품·가격·할인율은 모두 가상, 장바구니는 실제로 담기지 않음.
   테스트 편의: URL 에 ?adsec=2 를 붙이면 모든 광고 길이를 2초로 줄인다. 교육용 비영리 테스트 페이지 */
(function () {
  const App = window.App;
  let cfg = null;
  const load = async () => cfg || (cfg = await (await fetch("data/ads.json?v=1")).json());
  const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return h; };
  const CART = '<svg viewBox="0 0 24 24" width="1.5em" height="1.5em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="1.6em" height="1.6em" fill="none" stroke="#1d8a55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';

  /* host: .player 요소, kind: preroll|midroll|endcard, c: 작품. 광고가 끝나면 resolve */
  App.playAd = async function (host, kind, c) {
    const conf = await load();
    const sec = Number(new URLSearchParams(location.search).get("adsec")) || conf.durations[kind];
    const list = conf.ads.filter((a) => a.kind === kind);
    const n = Number(App.SS.get("ad_n") || 0); App.SS.set("ad_n", String(n + 1));
    const ad = list[(hash(c.id) + n) % list.length];
    const L = App.Logger;
    return new Promise((resolve) => {
      const ov = document.createElement("div");
      ov.className = "ad-ov"; ov.dataset.kind = kind;
      ov.innerHTML = `<img class="ad-img" src="${ad.image}" alt="광고: ${App.esc(ad.name)}">
        <div class="ad-left"><span class="ad-time">광고 <i>·</i> <b>${sec}초</b> 남음</span></div>
        <button type="button" class="ad-prem" aria-label="광고 없이 시청하려면 premium 구독하기"><span class="t1"><b>광고 없이</b> 시청하려면</span><span class="t2"><i class="lg"></i>premium 구독하기</span></button>
        <button type="button" class="ad-cart-b" aria-label="장바구니 담기 (오직 M+!에서만)"><span class="ic">🛒</span><span class="tx"><b>장바구니 담기</b><small>(오직 M+!에서만)</small></span></button>
        <div class="ad-toast" role="status" hidden>${CHECK}<p>장바구니에 담았어요.<br>(교육용: 실제 담기 없음)</p></div>`;
      host.appendChild(ov);
      const fit = () => { ov.style.fontSize = Math.max(11, Math.min(22, host.clientWidth * 0.0215)) + "px"; };
      fit(); const ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro) ro.observe(host);
      L.log("ad_impression", { target_id: ad.id, value: kind, section: c.id });

      let left = sec, swap = 0, done = false;
      const timeB = ov.querySelector(".ad-time b"), prem = ov.querySelector(".ad-prem");
      const tick = setInterval(() => {
        left -= 1; timeB.textContent = Math.max(left, 0) + "초";
        if (left % 3 === 0) { swap ^= 1; prem.classList.toggle("alt", !!swap); }   // 문구가 번갈아 바뀜
        if (left <= 0) finish("complete");
      }, 1000);
      function finish(how) {
        if (done) return; done = true;
        clearInterval(tick); if (ro) ro.disconnect(); ov.remove();
        if (how === "complete") L.log("ad_complete", { target_id: ad.id, value: kind, section: c.id });
        resolve(how);
      }
      /* B8 장바구니 CTA: 광고 내내 오른쪽 아래 큰 파란 버튼, 한 광고에서 한 번만 담기고 '담기 완료 ✓'로 바뀜 */
      const cart = ov.querySelector(".ad-cart-b"), toast = ov.querySelector(".ad-toast");
      cart.addEventListener("click", () => {
        L.log("cart_cta_click", { target_id: ad.id, value: kind, section: c.id });
        if (cart.classList.contains("done")) return;
        cart.classList.add("done"); cart.setAttribute("aria-disabled", "true");
        cart.querySelector(".tx").innerHTML = "<b>담기 완료 ✓</b><small>(오직 M+!에서만)</small>";
        L.log("cart_add", { target_id: ad.id, value: kind, section: c.id });
        toast.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (toast.hidden = true), 3200);
      });
      /* premium 구독 화면으로 이동 */
      prem.addEventListener("click", () => {
        L.log("premium_cta_click", { target_id: ad.id, value: kind, section: c.id });
        location.href = "premium.html?from=ad_" + kind + "&id=" + encodeURIComponent(c.id);
      });
      host._adCancel = () => finish("cancel");
    });
  };
})();
