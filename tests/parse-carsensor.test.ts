import assert from "node:assert/strict";
import test from "node:test";
import { canonicalCarsensorUrl, isCarsensorPhotoUrl } from "../lib/carsensor-url";
import { yenFromManDisplay } from "../lib/format";
import { parseCarsensorHtml } from "../lib/parse-carsensor";

const sample = `<!doctype html><html><head>
<title>プリウスの中古車詳細 | 中古車なら【カーセンサー】</title>
<script type="application/ld+json">[{"@type":"Product","name":"プリウス","color":"真珠白","brand":[{"@type":"Thing","name":"トヨタ"},{"@type":"Thing","name":"プリウス"}],"offers":[{"@type":"Offer","price":"2880000"}]}]</script>
</head><body>
<h1>トヨタ プリウス 2.0 G ナビ（パールホワイト）</h1>
<div class="totalPrice"><p class="totalPrice__price"><span>299</span><span>.8</span>万円</p><p class="totalPrice__expense">（諸費用11.8万円含む）</p></div>
<div class="basePrice"><p class="basePrice__price" content="2,880,000"><span>288</span><span>.0</span>万円</p></div>
<div class="specWrap">
  <div class="specWrap__box"><p class="specWrap__box__title">年式</p><p class="specWrap__box__num">2024</p><p class="specWrap__boxEraName">(R06)</p></div>
  <div class="specWrap__box"><p class="specWrap__box__title">走行距離</p><p class="specWrap__box__num">1.5</p><p class="specWrap__boxUnit">万km</p></div>
  <div class="specWrap__box"><p class="specWrap__box__title">修復歴</p><p class="specWrap__boxDetail">なし</p></div>
</div>
<div id="js-photoBox">
  <img id="js-mainPhoto" data-photo="https://ccsrpcma.carsensor.net/CSphoto/bkkn/628/577/UT1/UT1_001L.JPG" alt="本体">
  <a data-photo="https://ccsrpcma.carsensor.net/CSphoto/bkkn/628/577/UT1/UT1_001L.JPG" data-caption="フロント" data-title="本体写真"></a>
  <a data-photo="https://ccsrpcma.carsensor.net/CSphoto/bkkn/628/577/UT1/UT1_002L.JPG" data-caption="室内" data-title="本体写真"></a>
  <a data-photo="https://evil.example/CSphoto/secret.jpg" data-caption="no"></a>
</div>
<section>
  <h2 id="sec-joutai" class="title3">状態<span>(トヨタ プリウス)</span></h2>
  <table><tbody>
    <tr><th>年式(初度登録年)<a data-popup="help">?</a></th><td>2024(R06)</td><th>ワンオーナー</th><td>○</td></tr>
    <tr><th>修復歴</th><td>なし</td><th>禁煙車</th><td>○</td></tr>
  </tbody></table>
</section>
<section>
  <h2 id="sec-plan" class="title3">購入プラン内容<span>(トヨタ)</span></h2>
  <table>
    <thead><tr><th>&nbsp;</th><th>基本プラン</th><th>Aプラン</th></tr></thead>
    <tbody>
      <tr><th>支払総額（税込）</th><td><span>299</span><span>.8</span>万円</td><td>300.9万円</td></tr>
    </tbody>
  </table>
</section>
<section>
  <h2 class="title3">メーカー認定中古車情報</h2>
  <table><tbody><tr><th>保証</th><td>1年</td></tr></tbody></table>
</section>
<div class="equipmentList__category">
  <h3 class="equipmentList__title">安全装備</h3>
  <ul>
    <li class="equipmentList__item equipmentList__item--active">衝突被害軽減ブレーキ</li>
    <li class="equipmentList__item">パーキングアシスト</li>
  </ul>
</div>
<div class="sideDetailInfo__contents">
  <p>販売店名：<a href="/shop/kanagawa/1/?BKKN=AU7204587050">ウエインズトヨタ神奈川</a></p>
  <p>住所：神奈川県横須賀市佐原１－１－２</p>
</div>
<p class="shopComment">きれいな状態です。</p>
</body></html>`;

test("accepts a carsensor detail url and a bare vehicle id", () => {
  assert.deepEqual(canonicalCarsensorUrl("https://www.carsensor.net/usedcar/detail/au7204587050/index.html?vos=1"), {
    id: "AU7204587050",
    url: "https://www.carsensor.net/usedcar/detail/AU7204587050/index.html",
  });
  assert.equal(canonicalCarsensorUrl("AU123456")?.id, "AU123456");
  assert.equal(canonicalCarsensorUrl("https://example.com/usedcar/detail/AU123456/index.html"), null);
  assert.equal(isCarsensorPhotoUrl("https://ccsrpcma.carsensor.net/CSphoto/bkkn/a.jpg"), true);
  assert.equal(isCarsensorPhotoUrl("https://example.com/CSphoto/a.jpg"), false);
});

test("reads yen amounts written as 万円", () => {
  assert.equal(yenFromManDisplay("299.8万円"), 2998000);
  assert.equal(yenFromManDisplay("応談"), null);
});

test("parses a detail page into price, specs, photos, and shop", () => {
  const result = parseCarsensorHtml(sample, "https://www.carsensor.net/usedcar/detail/AU7204587050/index.html");
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.listing.id, "AU7204587050");
  assert.equal(result.listing.maker, "トヨタ");
  assert.equal(result.listing.model, "プリウス");
  assert.equal(result.listing.totalPrice, "299.8万円");
  assert.equal(result.listing.priceYen, 2998000);
  assert.equal(result.listing.highlights.find((item) => item.label === "走行距離")?.value, "1.5万km");
  assert.equal(result.listing.photos.length, 2);
  assert.equal(result.listing.photos[0]?.caption, "フロント");
  assert.equal(result.listing.photos[1]?.caption, "室内");
  assert.equal(result.listing.shopName, "ウエインズトヨタ神奈川");
  assert.equal(result.listing.shopAddress, "神奈川県横須賀市佐原１－１－２");
  assert.equal(result.listing.shopUrl, "https://www.carsensor.net/shop/kanagawa/1/?BKKN=AU7204587050");
  const condition = result.listing.sections.find((section) => section.id === "sec-joutai");
  assert.equal(condition?.rows.find((row) => row.label === "ワンオーナー")?.values[0], "○");
  const plan = result.listing.sections.find((section) => section.id === "sec-plan");
  assert.deepEqual(plan?.columns, ["基本プラン", "Aプラン"]);
  assert.equal(plan?.rows[0]?.values[0], "299.8万円");
  assert.equal(result.listing.equipment[0]?.items[0]?.equipped, true);
  assert.equal(result.listing.equipment[0]?.items[1]?.equipped, false);
  assert.equal(result.listing.qualityComment, "きれいな状態です。");
});

test("recognizes a listing that has already ended", () => {
  const html = "<title>中古車ID：AU0000000001（掲載終了）</title><h1>中古車ID：AU0000000001（掲載終了）の中古車詳細情報</h1>";
  const result = parseCarsensorHtml(html, "AU0000000001");
  assert.deepEqual(result, {
    status: "ended",
    id: "AU0000000001",
    title: "中古車ID：AU0000000001（掲載終了）の中古車詳細情報",
  });
});
