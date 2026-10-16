import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal-page";
import { CONTACT_EMAIL, LEGAL_UPDATED, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: "利用規約 | のこす" };

export default function TermsPage() {
  return (
    <LegalPage title="利用規約" updated={LEGAL_UPDATED}>
      <p>
        この利用規約（以下「本規約」）は、「のこす」（以下「本サービス」）の利用条件を定めるものです。本サービスを使うことで、本規約に同意したものとみなします。
      </p>
      <Section title="1. 本サービスについて">
        <p>本サービスは、{OPERATOR_NAME}（以下「運営者」）が個人で運営しています。中古車の掲載ページのURLから、価格や写真などを読み取り、ご自身のアカウントに保存できます。</p>
      </Section>
      <Section title="2. 現状のまま提供します">
        <p>本サービスは、現状のまま提供します。内容が正確であることや、いつでも使えること、お使いの目的に合うことは、保証しません。予告なく、機能の変更、一時停止、終了をすることがあります。</p>
      </Section>
      <Section title="3. 掲載情報の権利">
        <p>保存される掲載情報（文章、写真など）の著作権や権利は、元の掲載サイトや、それぞれの権利者に帰属します。本サービスは、ご自身が個人的に閲覧・記録する目的でのみお使いください。保存した内容を、無断で公開したり、転載したりしないでください。</p>
      </Section>
      <Section title="4. 禁止事項">
        <ul className="list-disc space-y-1 pl-5">
          <li>法令や公序良俗に反する行為。</li>
          <li>本サービスや、元の掲載サイトに過度な負荷をかける行為（大量の自動アクセスなど）。</li>
          <li>他の人のアカウントを使う行為や、不正にアクセスする行為。</li>
          <li>保存した情報を、営利目的で再配布する行為。</li>
          <li>本サービスの運営を妨げる行為や、他の人に迷惑をかける行為。</li>
        </ul>
        <p>これらに当たると判断したときは、運営者は、利用の停止やデータの削除をすることがあります。</p>
      </Section>
      <Section title="5. 免責">
        <ul className="list-disc space-y-1 pl-5">
          <li>読み取った価格、状態、修復歴などは、元の掲載の内容と違うことがあります。車の購入や契約の前には、必ず元の掲載や販売店で確認してください。</li>
          <li>元のサイトの仕様変更などで、読み取れなくなることがあります。</li>
          <li>データの消失や、本サービスの利用で生じた損害について、運営者に故意または重大な過失がある場合を除き、責任を負いません。大切な情報は、別にも控えておくことをおすすめします。</li>
        </ul>
      </Section>
      <Section title="6. 個人情報の取り扱い">
        <p>個人情報の取り扱いは、<a href="/privacy" className="underline" style={{ color: "#E4682C" }}>プライバシーポリシー</a>に従います。</p>
      </Section>
      <Section title="7. 規約の変更">
        <p>運営者は、必要に応じて本規約を変更できます。変更後に本サービスを使い続けた場合は、変更に同意したものとみなします。</p>
      </Section>
      <Section title="8. 準拠法と連絡先">
        <p>本規約は、日本法に従います。ご質問は、下記へご連絡ください。</p>
        <p>運営者: {OPERATOR_NAME}<br />メール: {CONTACT_EMAIL}</p>
      </Section>
    </LegalPage>
  );
}
