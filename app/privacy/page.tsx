import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal-page";
import { CONTACT_EMAIL, LEGAL_UPDATED, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: "プライバシーポリシー | のこす" };

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updated={LEGAL_UPDATED}>
      <p>
        「のこす」（以下「本サービス」）は、中古車の掲載ページを自分のアカウントに残すためのサービスです。{OPERATOR_NAME}（以下「運営者」）は、本サービスで扱う情報を、次のとおり大切に取り扱います。
      </p>
      <Section title="1. 取得する情報">
        <ul className="list-disc space-y-1 pl-5">
          <li>ログインに使う情報: Google、X、Yahoo! JAPAN、LINE の各アカウントの識別子（ID）、メールアドレス（メールでログインした場合、または取得できた場合）。</li>
          <li>LINE の公式アカウント「のこす」をご利用の場合: LINE のユーザー識別子と、送っていただいたメッセージ（URL など）。</li>
          <li>ご自身で保存した情報: 中古車の掲載情報（車名、価格、年式、走行距離、装備、販売店など）、写真、メモ、状態の管理情報。</li>
          <li>サービスの動作に必要な情報: ログイン状態を保つための Cookie など。</li>
        </ul>
        <p>各サービスから取得する項目は、ログインに必要な最小限です。パスワードは取得しません。</p>
      </Section>
      <Section title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>本サービスの提供（掲載の保存、表示、毎朝の掲載状況の確認、LINE への返信）。</li>
          <li>ご本人であることの確認（ログイン）。</li>
          <li>不具合の調査と、サービスの改善。</li>
        </ul>
      </Section>
      <Section title="3. 第三者への提供">
        <p>法令に基づく場合を除き、取得した情報を本人の同意なく第三者に提供することはありません。広告のために情報を使うこともありません。</p>
        <p>ただし、ご自身が「Xで共有」を操作した車については、車名、年式、価格、写真、装備、元の掲載ページへのリンクを載せた共有ページができ、そのURLを知っている人が見られます。メモと販売店・出品者の情報は載せません。共有は、いつでも止められます。</p>
      </Section>
      <Section title="4. 保存先と委託先">
        <p>本サービスは、次の事業者のサービスを利用して情報を取り扱います。これらは、サービスの運用を委託する先であり、情報の提供とは異なります。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Cloudflare（R2）: 保存した掲載情報と写真の保管。</li>
          <li>Vercel: 本サービスの動作（ホスティング）。</li>
          <li>Clerk: Google・X・メールでのログインの管理。</li>
          <li>LINE: LINE ログインと、公式アカウントでのやり取り。</li>
          <li>Yahoo! JAPAN: Yahoo! JAPAN ID でのログイン（提供を開始した場合）。</li>
        </ul>
        <p>これらの事業者は、日本国外にサーバーを置いている場合があります。各事業者のプライバシーポリシーも、あわせてご確認ください。</p>
      </Section>
      <Section title="5. 情報の管理と保管期間">
        <p>情報は、不正なアクセスや漏えいを防ぐよう、適切に管理します。保存した情報は、ご利用を続けている間、保管します。削除を依頼されたときは、合理的な期間内に削除します。</p>
      </Section>
      <Section title="6. 開示・訂正・削除のご依頼">
        <p>ご自身の情報の開示、訂正、削除を希望される場合は、下記へご連絡ください。ご本人であることを確認したうえで対応します。</p>
        <p>運営者: {OPERATOR_NAME}<br />メール: {CONTACT_EMAIL}</p>
      </Section>
      <Section title="7. 改定">
        <p>必要に応じて、この内容を改定します。大きな変更があるときは、本サービス上でお知らせします。</p>
      </Section>
    </LegalPage>
  );
}
