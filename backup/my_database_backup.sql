--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4 (Debian 16.4-1.pgdg120+2)
-- Dumped by pg_dump version 16.4 (Debian 16.4-1.pgdg120+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: notify_post_update(); Type: FUNCTION; Schema: public; Owner: myuser
--

CREATE FUNCTION public.notify_post_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
          PERFORM pg_notify('post_updates', 'Post updated');
          RETURN NEW;
        END;
        $$;


ALTER FUNCTION public.notify_post_update() OWNER TO myuser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blog; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.blog (
    blog_id numeric NOT NULL,
    user_id text NOT NULL,
    blog_title text,
    blog_text text,
    blog_tag text,
    blog_createat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blog_updateat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    blog_file text,
    blog_attitude numeric DEFAULT 1,
    blog_fixedurl text
);


ALTER TABLE public.blog OWNER TO myuser;

--
-- Name: blog_tag; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.blog_tag (
    blog_tag_id text NOT NULL,
    blog_tag_text text
);


ALTER TABLE public.blog_tag OWNER TO myuser;

--
-- Name: blogs_blog_tags; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.blogs_blog_tags (
    blog_id numeric NOT NULL,
    blog_tag_id text NOT NULL
);


ALTER TABLE public.blogs_blog_tags OWNER TO myuser;

--
-- Name: drive; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.drive (
    file_id text NOT NULL,
    user_id text NOT NULL,
    file_size numeric,
    file_format character varying,
    file_createat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_updateat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_attitude numeric DEFAULT 1
);


ALTER TABLE public.drive OWNER TO myuser;

--
-- Name: post; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.post (
    post_id numeric NOT NULL,
    user_id text NOT NULL,
    post_text text,
    post_createat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    post_updateat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    post_tag text,
    post_file text,
    post_attitude numeric DEFAULT 1
);


ALTER TABLE public.post OWNER TO myuser;

--
-- Name: post_tag; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.post_tag (
    post_tag_id text NOT NULL,
    post_tag_text text
);


ALTER TABLE public.post_tag OWNER TO myuser;

--
-- Name: posts_post_tags; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.posts_post_tags (
    post_id numeric NOT NULL,
    post_tag_id text NOT NULL
);


ALTER TABLE public.posts_post_tags OWNER TO myuser;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    session_key character varying(255) NOT NULL,
    expires timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO myuser;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO myuser;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.settings (
    settings_key text NOT NULL,
    settings_value text NOT NULL
);


ALTER TABLE public.settings OWNER TO myuser;

--
-- Name: task; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.task (
    task_id numeric NOT NULL,
    task_text text,
    task_category_text text,
    task_attitude numeric DEFAULT 0,
    task_createat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    task_updateat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    task_limitat timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.task OWNER TO myuser;

--
-- Name: task_category; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.task_category (
    task_category_id numeric NOT NULL,
    task_category_text text,
    task_createat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    task_updateat timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.task_category OWNER TO myuser;

--
-- Name: tasks-task_categories; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public."tasks-task_categories" (
    task_id numeric NOT NULL,
    task_category_id numeric NOT NULL
);


ALTER TABLE public."tasks-task_categories" OWNER TO myuser;

--
-- Name: user; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public."user" (
    user_id text NOT NULL,
    user_password text NOT NULL,
    user_salt text,
    user_birth date DEFAULT '1970-01-01'::date,
    user_icon text,
    user_mail text,
    user_attitude numeric DEFAULT 0,
    user_prof text,
    user_createat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_updateat timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_failcount smallint NOT NULL,
    user_token text,
    CONSTRAINT user_user_id_check CHECK (((length(user_id) <= 30) AND (user_id ~ '^[a-zA-Z0-9_]+$'::text)))
);


ALTER TABLE public."user" OWNER TO myuser;

--
-- Name: user_user_failcount_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.user_user_failcount_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_user_failcount_seq OWNER TO myuser;

--
-- Name: user_user_failcount_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.user_user_failcount_seq OWNED BY public."user".user_failcount;


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: user user_failcount; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public."user" ALTER COLUMN user_failcount SET DEFAULT nextval('public.user_user_failcount_seq'::regclass);


--
-- Data for Name: blog; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.blog (blog_id, user_id, blog_title, blog_text, blog_tag, blog_createat, blog_updateat, blog_file, blog_attitude, blog_fixedurl) FROM stdin;
\.


--
-- Data for Name: blog_tag; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.blog_tag (blog_tag_id, blog_tag_text) FROM stdin;
\.


--
-- Data for Name: blogs_blog_tags; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.blogs_blog_tags (blog_id, blog_tag_id) FROM stdin;
\.


--
-- Data for Name: drive; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.drive (file_id, user_id, file_size, file_format, file_createat, file_updateat, file_attitude) FROM stdin;
file-1729227907066-398183705	myuser	2335	.png	2024-10-18 05:05:07.092068	2024-10-18 05:05:07.092068	1
file-1729302535337-257620832	myuser	2335	.png	2024-10-19 01:48:55.352705	2024-10-19 01:48:55.352705	1
file-1729302780901-814424877	myuser	2335	.png	2024-10-19 01:53:00.911586	2024-10-19 01:53:00.911586	1
file-1729390571771-699009304	myuser	1780688	.png	2024-10-20 02:16:11.817271	2024-10-20 02:16:11.817271	1
file-1729390576996-57669228	myuser	1993475	.jpg	2024-10-20 02:16:17.025252	2024-10-20 02:16:17.025252	1
\.


--
-- Data for Name: post; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.post (post_id, user_id, post_text, post_createat, post_updateat, post_tag, post_file, post_attitude) FROM stdin;
20241019015307593798	myuser	画像テスト	2024-10-19 01:53:07.284105	2024-10-19 01:53:07.284105	none_data	{"file-1729302780901-814424877"}	1
20241011103421559642	myuser	test	2024-10-11 10:34:21.897234	2024-10-11 10:34:21.897234	none_data	\N	1
20241011135510435059	myuser	test2	2024-10-11 13:55:10.107621	2024-10-11 13:55:10.107621	none_data	\N	1
20241011135821073367	myuser	test3	2024-10-11 13:58:22.423026	2024-10-11 13:58:22.423026	none_data	\N	1
20241011140544727674	myuser	test4	2024-10-11 14:05:45.009396	2024-10-11 14:05:45.009396	none_data	\N	1
20241013033215687057	myuser	test6 #test_tag1 #test_tag2	2024-10-13 03:32:15.163319	2024-10-13 03:32:15.163319	none_data	\N	1
20241013033344636677	myuser	test5 #tag1 #tag2	2024-10-13 03:33:44.614244	2024-10-13 03:33:44.614244	none_data	\N	1
20241013034056794992	myuser	test5 #tag1 #tag2	2024-10-13 03:40:56.676356	2024-10-13 03:40:56.676356	none_data	\N	1
20241013034250310294	myuser	test5 #tag1 #tag2	2024-10-13 03:42:50.75071	2024-10-13 03:42:50.75071	none_data	\N	1
20241013034552373075	myuser	test5 #tag1 #tag2	2024-10-13 03:45:52.885537	2024-10-13 03:45:52.885537	{"#サンプル","#タグ1","#タグ2"}	\N	1
20241013034944426667	myuser	test5 #tag1 #tag2	2024-10-13 03:49:44.499033	2024-10-13 03:49:44.499033	{"#tag1","#tag2"}	\N	1
20241013034952323905	myuser	test5	2024-10-13 03:49:52.609129	2024-10-13 03:49:52.609129	\N	\N	1
20241013035152802585	myuser	test5	2024-10-13 03:51:52.437665	2024-10-13 03:51:52.437665	none_data	\N	1
20241013040349109525	myuser	test6	2024-10-13 04:03:49.393488	2024-10-13 04:03:49.393488	none_data	\N	1
20241014045108985039	myuser	2024/10/1413:51	2024-10-14 04:51:08.947611	2024-10-14 04:51:08.947611	none_data	\N	1
20241015123230716718	myuser	今日の進捗：画像投稿APIを実装することが出来た。\nそのうちやること：画像閲覧APIを実装する	2024-10-15 12:32:30.165553	2024-10-15 12:32:30.165553	none_data	\N	1
20241015123240045140	myuser	改行の\nテスト	2024-10-15 12:32:40.940098	2024-10-15 12:32:40.940098	none_data	\N	1
20241015123253580842	myuser	改行のテスト	2024-10-15 12:32:53.27124	2024-10-15 12:32:53.27124	none_data	\N	1
20241015123349634171	myuser	WSのテスト	2024-10-15 12:33:49.886096	2024-10-15 12:33:49.886096	none_data	\N	1
20241015123400912037	myuser	WSテスト2	2024-10-15 12:34:00.338648	2024-10-15 12:34:00.338648	none_data	\N	1
20241015123415139528	myuser	WSテストその3	2024-10-15 12:34:15.906442	2024-10-15 12:34:15.906442	none_data	\N	1
20241015123456952824	myuser	WSテストその4	2024-10-15 12:34:56.64802	2024-10-15 12:34:56.64802	none_data	\N	1
20241015124109848514	myuser	ああああああ	2024-10-15 12:41:09.973983	2024-10-15 12:41:09.973983	none_data	\N	1
20241015124113267572	myuser	ああああああ	2024-10-15 12:41:13.29399	2024-10-15 12:41:13.29399	none_data	\N	1
20241015124124274795	myuser	ああああ	2024-10-15 12:41:24.954137	2024-10-15 12:41:24.954137	none_data	\N	1
20241015124328056834	myuser	ああああああああああああああああ	2024-10-15 12:43:28.613077	2024-10-15 12:43:28.613077	none_data	\N	1
20241015124336843621	myuser	っっっっっっっっっっr	2024-10-15 12:43:36.632879	2024-10-15 12:43:36.632879	none_data	\N	1
20241015124653092237	myuser	ああああああああああ	2024-10-15 12:46:53.489743	2024-10-15 12:46:53.489743	none_data	\N	1
20241015124728820064	myuser	あああああああああああ	2024-10-15 12:47:28.607521	2024-10-15 12:47:28.607521	none_data	\N	1
20241015124753614128	myuser	あああああああ	2024-10-15 12:47:53.992287	2024-10-15 12:47:53.992287	none_data	\N	1
20241015124758916934	myuser	あああああ	2024-10-15 12:47:58.45708	2024-10-15 12:47:58.45708	none_data	\N	1
20241015124605443961	myuser	あああああ	2024-10-15 12:46:05.305068	2024-10-15 12:46:05.305068	none_data	\N	1
20241015124613769877	myuser	ああああ	2024-10-15 12:46:13.380569	2024-10-15 12:46:13.380569	none_data	\N	1
20241015124621752372	myuser	っっっっっっっt	2024-10-15 12:46:21.877357	2024-10-15 12:46:21.877357	none_data	\N	1
20241015124626061892	myuser	あああああああ	2024-10-15 12:46:26.317764	2024-10-15 12:46:26.317764	none_data	\N	1
20241015124640694711	myuser	あああああああああ	2024-10-15 12:46:40.063073	2024-10-15 12:46:40.063073	none_data	\N	1
20241015124904285101	myuser	あああああ	2024-10-15 12:49:04.417545	2024-10-15 12:49:04.417545	none_data	\N	1
20241015124909955455	myuser	っっっっっっっr	2024-10-15 12:49:09.413231	2024-10-15 12:49:09.413231	none_data	\N	1
20241015124915331183	myuser	111111111	2024-10-15 12:49:15.991711	2024-10-15 12:49:15.991711	none_data	\N	1
20241015124930748287	myuser	ああああああ	2024-10-15 12:49:30.37796	2024-10-15 12:49:30.37796	none_data	\N	1
20241020015846611598	myuser	テスト\n#タグテスト\n	2024-10-20 01:58:46.658248	2024-10-20 01:58:46.658248	#タグテスト	\N	1
20241020021618887796	myuser		2024-10-20 02:16:18.24032	2024-10-20 02:16:18.24032	none_data	{"file-1729390571771-699009304","file-1729390576996-57669228"}	1
20241027003427744712	myuser	ElasticSarchのテスト	2024-10-27 00:34:27.705911	2024-10-27 00:34:27.705911	none_data	\N	1
20241110002908569765	myuser	新規投稿のテスト\n改行\n#タグテスト	2024-11-10 00:29:08.77789	2024-11-10 00:29:08.77789	#タグテスト	\N	1
20241110003433863372	myuser	Date unavailable問題の修正を検証する。	2024-11-10 00:34:33.365081	2024-11-10 00:34:33.365081	none_data	\N	1
20241110015255152734	myuser	Server-Sent Events	2024-11-10 01:52:55.115353	2024-11-10 01:52:55.115353	none_data	\N	1
20241110021022696354	myuser	Server-Sent Eventsのテスト2	2024-11-10 02:10:22.29557	2024-11-10 02:10:22.29557	none_data	\N	1
20241110021100808508	myuser	Server-Sent Eventsのテスト3	2024-11-10 02:11:00.570034	2024-11-10 02:11:00.570034	none_data	\N	1
20241110032856708190	myuser	Server-Sent Eventsのテスト4	2024-11-10 03:28:56.949547	2024-11-10 03:28:56.949547	none_data	\N	1
20241110032927982512	myuser	Server-Sent Eventsのテスト5	2024-11-10 03:29:27.948904	2024-11-10 03:29:27.948904	none_data	\N	1
20241113144533711734	myuser	実装予定\n- サイトマップ\n- SEO\n- 設定テーブルのAPI\n- 設定ページのフロントエンド\n- SSE切断時の通知\n- Noticeのコンポーネント化\n- 左のボタンに色変化で現在地が分かるように\n- 日次のRSS生成\n- Misskey等へのRSS投稿or連動投稿機能\n- X、Misskeyの投稿インポート\n- Postsテーブル改修\n- ブログ機能の実装\n- DiaryのPostカードにあるハンバーガーメニューが新規投稿UIの背後に隠れる問題\n- DiaryのPostカードにURLを貼った時に正常にパースしてリンクが張られる機能\n- Diaryの新規投稿時にタグが維持される機能\n- Diaryの右側にタグクラウドを設置する実装\n- 検索機能に日時指定を追加する実装\n- Diaryにおけるスクロール位置が進む・戻るボタン後であっても維持される実装\n- 非ログインユーザーにも新規投稿という文字が見えてしまう問題の修正	2024-11-13 14:45:33.465108	2024-11-13 14:45:33.465108	none_data	\N	1
20241113145416034433	myuser	実装しないもの\n- リアクションやコメントの機能\n- アクセスカウンタ\n- その他の自己顕示欲や炎上に繋がるあれこれ\n- 広告関連の機能\n- 他人と繋がる機能（発信限定）\n\n＊他に利用者（自鯖にホストする人）が現れたら、全く別名の、繋がるためだけの何かを作るかもしれないけど、それはあまりに皮算用なので。Fedi投稿もいずれ対応するけど、そこについたリアクションも各々のクライアントなりで見てくださいね、にする予定。	2024-11-13 14:54:16.627168	2024-11-13 14:54:16.627168	none_data	\N	1
20241115054940016567	myuser	間違ったり分からなかったりする問題にぶつかると、自己の存在が否定された気持ちになるので勉強やゲームは苦しみがある。。\n\nBFが好きなのも集団戦＋ヒーラー職がある、っていうところで競争から逃れられるのでやってるし。	2024-11-15 05:49:40.670274	2024-11-15 05:49:40.670274	none_data	\N	1
20241121003214501086	myuser	これ行ってみたい、、、\n\nガスト、1990円のフレンチコース！　ミシュラン獲得進藤シェフ監修 - グルメ Watch\nhttps://gourmet.watch.impress.co.jp/docs/news/1641034.html	2024-11-21 00:32:14.724722	2024-11-21 00:32:14.724722	none_data	\N	1
20241121003215171554	myuser	これ行ってみたい、、、\n\nガスト、1990円のフレンチコース！　ミシュラン獲得進藤シェフ監修 - グルメ Watch\nhttps://gourmet.watch.impress.co.jp/docs/news/1641034.html	2024-11-21 00:32:15.6088	2024-11-21 00:32:15.6088	none_data	\N	1
\.


--
-- Data for Name: post_tag; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.post_tag (post_tag_id, post_tag_text) FROM stdin;
タグテスト	#タグテスト
タグ	#タグ
\.


--
-- Data for Name: posts_post_tags; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.posts_post_tags (post_id, post_tag_id) FROM stdin;
20241020015846611598	タグテスト
20241110002908569765	タグテスト
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.sessions (id, user_id, session_key, expires, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.settings (settings_key, settings_value) FROM stdin;
setup.json_ver	0.1
site_explanation	誰とも繋がらないプライベートなマイクロブログ
site_fabicon_url	null
admin_email	null
admin_X_account	null
admin_fedi_account	null
admin_bluesky_account	null
admin_vrchat_account	null
admin_github_account	null
admin_steam_account	null
admin_youtube_account	null
admin_discord_account	null
admin_homepage	null
litemode_1st_color	null
litemode_2nd_color	null
litemode_back_color	null
darkmode_2nd_color	null
darkmode_1st_color	null
darkmode_back_color	null
pined_page_name_A	null
pined_page_url_A	null
pined_page_name_B	null
pined_page_url_B	null
pined_page_name_C	null
pined_page_url_C	null
pined_page_name_D	null
pined_page_url_D	null
pined_page_name_E	null
pined_page_url_E	null
pined_page_name_F	null
pined_page_url_F	null
pined_page_name_G	null
pined_page_url_G	null
pined_page_name_H	null
pined_page_url_H	null
pined_page_name_I	null
pined_page_url_I	null
pined_page_name_J	null
pined_page_url_J	null
site_title	Wallog
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.task (task_id, task_text, task_category_text, task_attitude, task_createat, task_updateat, task_limitat) FROM stdin;
\.


--
-- Data for Name: task_category; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.task_category (task_category_id, task_category_text, task_createat, task_updateat) FROM stdin;
\.


--
-- Data for Name: tasks-task_categories; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public."tasks-task_categories" (task_id, task_category_id) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public."user" (user_id, user_password, user_salt, user_birth, user_icon, user_mail, user_attitude, user_prof, user_createat, user_updateat, user_failcount, user_token) FROM stdin;
myuser	mypassword	salt	\N	none_data	none_data	\N	none_data	2024-10-02 02:34:08.115	2024-10-02 02:34:08.115	1	none_data
\.


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: user_user_failcount_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.user_user_failcount_seq', 1, false);


--
-- Name: blog blog_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.blog
    ADD CONSTRAINT blog_pkey PRIMARY KEY (blog_id);


--
-- Name: blog_tag blog_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.blog_tag
    ADD CONSTRAINT blog_tag_pkey PRIMARY KEY (blog_tag_id);


--
-- Name: blogs_blog_tags blogs_blog_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.blogs_blog_tags
    ADD CONSTRAINT blogs_blog_tags_pkey PRIMARY KEY (blog_id, blog_tag_id);


--
-- Name: drive drive_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.drive
    ADD CONSTRAINT drive_pkey PRIMARY KEY (file_id);


--
-- Name: post post_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.post
    ADD CONSTRAINT post_pkey PRIMARY KEY (post_id);


--
-- Name: post_tag post_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.post_tag
    ADD CONSTRAINT post_tag_pkey PRIMARY KEY (post_tag_id);


--
-- Name: posts_post_tags posts_post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.posts_post_tags
    ADD CONSTRAINT posts_post_tags_pkey PRIMARY KEY (post_id, post_tag_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_session_key_key; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_key_key UNIQUE (session_key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (settings_key);


--
-- Name: task_category task_category_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.task_category
    ADD CONSTRAINT task_category_pkey PRIMARY KEY (task_category_id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (task_id);


--
-- Name: tasks-task_categories tasks-task_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public."tasks-task_categories"
    ADD CONSTRAINT "tasks-task_categories_pkey" PRIMARY KEY (task_id, task_category_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);


--
-- Name: sessions_expires_idx; Type: INDEX; Schema: public; Owner: myuser
--

CREATE INDEX sessions_expires_idx ON public.sessions USING btree (expires);


--
-- Name: sessions_session_key_idx; Type: INDEX; Schema: public; Owner: myuser
--

CREATE INDEX sessions_session_key_idx ON public.sessions USING btree (session_key);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: myuser
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: post post_update_trigger; Type: TRIGGER; Schema: public; Owner: myuser
--

CREATE TRIGGER post_update_trigger AFTER INSERT OR UPDATE ON public.post FOR EACH ROW EXECUTE FUNCTION public.notify_post_update();


--
-- Name: blogs_blog_tags blogs_blog_tags_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.blogs_blog_tags
    ADD CONSTRAINT blogs_blog_tags_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blog(blog_id);


--
-- Name: blogs_blog_tags blogs_blog_tags_blog_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.blogs_blog_tags
    ADD CONSTRAINT blogs_blog_tags_blog_tag_id_fkey FOREIGN KEY (blog_tag_id) REFERENCES public.blog_tag(blog_tag_id);


--
-- Name: posts_post_tags posts_post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.posts_post_tags
    ADD CONSTRAINT posts_post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.post(post_id);


--
-- Name: posts_post_tags posts_post_tags_post_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.posts_post_tags
    ADD CONSTRAINT posts_post_tags_post_tag_id_fkey FOREIGN KEY (post_tag_id) REFERENCES public.post_tag(post_tag_id);


--
-- Name: tasks-task_categories tasks-task_categories_task_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public."tasks-task_categories"
    ADD CONSTRAINT "tasks-task_categories_task_category_id_fkey" FOREIGN KEY (task_category_id) REFERENCES public.task_category(task_category_id);


--
-- Name: tasks-task_categories tasks-task_categories_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public."tasks-task_categories"
    ADD CONSTRAINT "tasks-task_categories_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.task(task_id);


--
-- PostgreSQL database dump complete
--

