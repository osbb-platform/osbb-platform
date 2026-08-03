import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogCard } from "@/src/modules/site/components/blocks/BlogCard";
import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { Breadcrumbs } from "@/src/modules/site/components/layout/Breadcrumbs";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { QuoteBlock } from "@/src/modules/site/components/ui/QuoteBlock";
import { Section } from "@/src/modules/site/components/ui/Section";
import {
  getSitePost,
  sitePosts,
} from "@/src/modules/site/data/siteContent";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const quorumArticleSlug =
  "kvorum-za-ploshcheyu-yak-ne-zirvaty-zbory";

export function generateStaticParams() {
  return sitePosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getSitePost(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} — OSBB Platform`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { slug } = await params;
  const post = getSitePost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = sitePosts
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  return (
    <main id="main">
      <Breadcrumbs
        items={[
          {
            label: "Блог",
            href: ROUTES.site.blog,
          },
          {
            label: post.title,
          },
        ]}
      />

      <article className="osbb-article">
        <header className="osbb-container osbb-article__header">
          <p className="osbb-eyebrow">{post.category}</p>
          <h1>{post.title}</h1>

          <div className="osbb-article__meta">
            <time dateTime={post.publishedAt}>
              {post.publishedLabel}
            </time>
            <span>OSBB Platform</span>
          </div>

          <p className="osbb-lead">{post.excerpt}</p>
        </header>

        {post.slug === quorumArticleSlug ? (
          <div className="osbb-container osbb-article__layout">
            <aside className="osbb-article__toc">
              <strong>У статті</strong>

              <nav aria-label="Зміст статті">
                <a href="#wrong-count">Чому кворум рахують неправильно</a>
                <a href="#calculation">Приклад розрахунку</a>
                <a href="#no-contact">Якщо власники не на зв’язку</a>
                <a href="#agenda">Порядок денний</a>
                <a href="#protocol">Після зборів: протокол</a>
              </nav>
            </aside>

            <div className="osbb-article__prose">
              <p>
                Збори співвласників зривають не через конфлікти. Найчастіше
                причина буденна: у день зборів виявляється, що кворуму
                немає, а порахувати його заздалегідь ніхто не спробував.
                Далі — перенесення, нові оголошення, втрачений місяць і
                відчуття, що будинок не може ухвалити навіть просте рішення.
              </p>

              <p>
                Кворум на загальних зборах співвласників рахується не за
                кількістю присутніх людей, а за площею, якою вони володіють.
                Це проста арифметика, але вона змінює саму підготовку зборів:
                важливо не скільки сусідів прийде, а чиї квартири разом
                дадуть потрібну частку площі будинку.
              </p>

              <h2 id="wrong-count">
                Чому голови рахують кворум неправильно
              </h2>

              <p>
                Типова помилка — рахувати за квартирами. У будинку 98
                квартир, прийшло 55 власників, здається, що більшість є.
                Але якщо серед відсутніх — власники великих трикімнатних
                квартир і нежитлових приміщень на першому поверсі, за
                площею більшості може не бути.
              </p>

              <p>
                Друга помилка — вважати, що одна квартира дає один голос.
                Якщо квартира у спільній власності, кожен співвласник
                розпоряджається своєю часткою площі. Двоє власників однієї
                квартири можуть проголосувати по-різному, і кожна частка
                врахується окремо.
              </p>

              <h2 id="calculation">Що потрібно порахувати до зборів</h2>

              <ul>
                <li>
                  Загальну площу всіх приміщень будинку — і житлових, і
                  нежитлових.
                </li>
                <li>
                  Площу, яка припадає на кожну квартиру та приміщення.
                </li>
                <li>
                  Частку площі, яку разом дають власники, що вже
                  підтвердили участь.
                </li>
                <li>
                  Скільки площі не вистачає до кворуму — і чиї це квартири.
                </li>
              </ul>

              <QuoteBlock>
                <p>
                  Підготовка зборів — це не оголошення на дверях. Це список
                  власників, площа і розуміння, кого не вистачає.
                </p>
              </QuoteBlock>

              <p>
                Візьмемо будинок загальною площею 4 820 м². Порахуємо, як
                накопичується частка площі, коли підтверджують участь
                власники різних груп приміщень.
              </p>

              <div className="osbb-article-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Група приміщень</th>
                      <th>Площа</th>
                      <th>Частка будинку</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>Однокімнатні квартири</td>
                      <td>1 120 м²</td>
                      <td>23,2%</td>
                    </tr>
                    <tr>
                      <td>Двокімнатні квартири</td>
                      <td>1 860 м²</td>
                      <td>38,6%</td>
                    </tr>
                    <tr>
                      <td>Трикімнатні квартири</td>
                      <td>1 520 м²</td>
                      <td>31,5%</td>
                    </tr>
                    <tr>
                      <td>Нежитлові приміщення</td>
                      <td>320 м²</td>
                      <td>6,7%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                З таблиці видно головне: без власників двокімнатних квартир
                кворум не збереться навіть за участі всіх інших груп. Саме
                з ними варто починати роботу, а не з тими, до кого простіше
                дійти.
              </p>

              <h2 id="no-contact">
                Що робити, якщо частина власників не виходить на зв’язок
              </h2>

              <p>
                Ситуація стандартна: квартира є, власник живе в іншому
                місті або за кордоном, телефон у списку правління
                десятирічної давнини. Тут допомагає послідовність, а не
                поспіх.
              </p>

              <ol>
                <li>
                  Оновіть список власників і контактів до розсилки
                  оголошення, а не після.
                </li>
                <li>
                  Надішліть порядок денний заздалегідь, а не в останні дні:
                  людині за кордоном потрібен час.
                </li>
                <li>
                  Фіксуйте, хто підтвердив участь, і рахуйте площу після
                  кожного підтвердження.
                </li>
                <li>
                  Тримайте окремий перелік «не вийшли на зв’язок» — це
                  задача на наступні тижні, а не аварія в день зборів.
                </li>
              </ol>

              <div className="osbb-article__notice">
                <strong>Важливо</strong>
                <p>
                  Порядок скликання зборів, форма повідомлення
                  співвласників і оформлення рішень визначені законом і
                  статутом вашого ОСББ. Перед зборами перевірте строки
                  повідомлення і формулювання питань порядку денного за
                  своїм статутом.
                </p>
              </div>

              <h2 id="agenda">Порядок денний вирішує більше, ніж здається</h2>

              <p>
                Розмите питання зриває збори так само надійно, як
                відсутність кворуму. Формулювання «обговорити ремонт
                покрівлі» не дає результату: обговорили — і що? Питання
                має бути таким, щоб на нього можна було відповісти «за»
                або «проти».
              </p>

              <p>
                Порівняйте два формулювання. «Питання ремонту покрівлі» —
                і «Затвердити ремонт покрівлі над під’їздом №3 у межах
                затвердженого кошторису із залученням підрядника за
                результатами відбору». Друге можна поставити на
                голосування, перше — ні.
              </p>

              <h2 id="protocol">Після зборів: протокол і доступ до нього</h2>

              <p>
                Рішення, яке ніхто не бачив, живе недовго. Через півроку
                співвласники не пам’ятають, що саме ухвалили, а через рік
                не можуть знайти протокол. Тому корисно тримати протоколи,
                звіти й кошториси там, де їх знайде будь-який співвласник
                без дзвінка голові.
              </p>

              <p>
                Практика проста: після кожних зборів протокол має з’явитись
                у доступному місці протягом кількох днів, а не «коли буде
                час». Це знімає половину майбутніх питань і суперечок.
              </p>
            </div>
          </div>
        ) : (
          <div className="osbb-container">
            <div className="osbb-article__prose osbb-article__prose--short">
              <p>{post.excerpt}</p>

              <p className="osbb-note">
                Для цього маршруту в наданому HTML-прототипі немає повного
                тексту статті. Сторінка використовує затверджений шаблон і
                централізовані метадані без вигаданого матеріалу.
              </p>
            </div>
          </div>
        )}
      </article>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Кабінет будинку</Eyebrow>
          <h2>Усі рішення зборів — в одному місці</h2>

          <p className="osbb-lead osbb-lead--deep">
            Порядок денний, хід голосування, підсумкові відсотки і протокол
            PDF доступні кожному співвласнику за 6-значним кодом.
          </p>

          <Link
            className="osbb-btn osbb-btn--primary osbb-article__demo-link"
            href={ROUTES.site.demo}
          >
            Подивитись демо-кабінет
          </Link>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Читайте також</Eyebrow>
          <h2>Схожі матеріали</h2>
        </div>

        <div className="osbb-blog-grid osbb-blog-grid--related">
          {relatedPosts.map((relatedPost) => (
            <BlogCard key={relatedPost.slug} post={relatedPost} />
          ))}
        </div>
      </Section>

      <CtaBlock
        description="Залиште контакти — зателефонуємо, покажемо кабінет і розрахуємо умови для вашого будинку. Без зобов'язань."
        eyebrow="Заявка"
        title="Підключіть свій будинок"
      />
    </main>
  );
}
