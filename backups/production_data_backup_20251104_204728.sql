SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ATRMPulP3cOBHkaSrfLbhLYlfTzWu2zQnMJmceGYjNBVeMefRN15wfupD3DIVgP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '169440b8-2ce8-4bab-bfe8-f2c675feb62c', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"iteniahi@gmail.com","user_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","user_phone":""}}', '2025-10-15 16:36:59.356536+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd1fb52ca-ae6d-486c-a097-d35e68e682b9', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-22 19:41:36.616092+00', ''),
	('00000000-0000-0000-0000-000000000000', '11c2a6b2-739e-48d1-ac71-d7e508a95c64', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-22 19:43:22.797648+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae2e526f-9a6e-494d-92b1-21aa78d80191', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-22 19:43:42.176956+00', ''),
	('00000000-0000-0000-0000-000000000000', '25805319-7652-4eb8-946b-a468d10654d6', '{"action":"user_confirmation_requested","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-10-22 20:21:32.687285+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e45528b6-7c85-4424-8f42-8405cbe450d8', '{"action":"user_signedup","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-10-22 20:22:19.246616+00', ''),
	('00000000-0000-0000-0000-000000000000', '5985d1ae-0f03-456e-a1e3-8eb16a63fd2a', '{"action":"login","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-22 20:23:00.064734+00', ''),
	('00000000-0000-0000-0000-000000000000', '107f8e1c-728e-43f7-bd32-a169bc8766fb', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-22 21:38:00.297866+00', ''),
	('00000000-0000-0000-0000-000000000000', '3b30fec0-bf4c-4c11-b102-25df13fb4692', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-22 21:45:04.272025+00', ''),
	('00000000-0000-0000-0000-000000000000', '5b1f6e81-54ad-41d9-81a2-6abf382eca81', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-22 22:00:43.844819+00', ''),
	('00000000-0000-0000-0000-000000000000', '01f2c5ff-7576-4ed4-ba74-a6f77682d851', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-22 22:00:43.856374+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bfdaf8ee-9ab8-4a93-b4d1-bc04b804ed2a', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-22 22:00:44.011563+00', ''),
	('00000000-0000-0000-0000-000000000000', '1b091156-0b64-4137-acab-26dd5252c15a', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-22 22:00:44.557138+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a4e574c-78ee-4848-bc22-073a07d033b3', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-22 22:02:40.472313+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae2ad98e-bb01-4ffe-925a-55c4b4683654', '{"action":"logout","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-22 22:02:47.786592+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd6f7c690-f5f6-4bfe-8067-395f01a9ec5e', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-22 22:02:50.554146+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ce16a360-95c6-41c3-8c08-d3a3579bbbfa', '{"action":"login","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-22 22:03:37.149475+00', ''),
	('00000000-0000-0000-0000-000000000000', '8e554e4d-87c9-4dc6-8f12-f71909ab9c82', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-23 08:50:48.473422+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bcc63565-dfdd-49a1-816e-7ce868431d06', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-23 08:58:01.613959+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd7118c7b-073c-40f8-8048-f5cde39ad733', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-23 18:22:18.203803+00', ''),
	('00000000-0000-0000-0000-000000000000', '48c7a898-c5c5-40ec-a92a-460c65ce8da6', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-23 18:23:07.95073+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ac47591c-7b6b-42bd-ba77-9557b2b36aa5', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-23 18:23:12.363151+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c1f247f8-c260-4b97-a8f8-e5cc7bebc31b', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-23 18:23:32.136277+00', ''),
	('00000000-0000-0000-0000-000000000000', '6d7191ca-57e8-4878-880b-14e539d6db02', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-10-23 18:28:04.309399+00', ''),
	('00000000-0000-0000-0000-000000000000', '081b09ba-7574-442c-88d1-9aeca1eb3f72', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 18:30:45.12891+00', ''),
	('00000000-0000-0000-0000-000000000000', '64329cee-13aa-44b7-8e89-2ae7531d1a0b', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 18:30:45.130492+00', ''),
	('00000000-0000-0000-0000-000000000000', 'be644386-3482-4c84-8a24-060ccc0dfbfa', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 18:30:45.252219+00', ''),
	('00000000-0000-0000-0000-000000000000', '9157b9c6-4881-461b-8d9c-e80845a15f2c', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 18:30:45.427792+00', ''),
	('00000000-0000-0000-0000-000000000000', '85bc7ada-937b-4809-90e3-ea139994ffda', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-10-23 19:59:46.133045+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b0c1de49-a9c7-4396-be2d-b9acd0302092', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 21:52:03.501043+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e73f88de-3dd7-4f04-9a0a-c0ac9d525b37', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 21:52:03.513878+00', ''),
	('00000000-0000-0000-0000-000000000000', '81e1e934-eaf7-42e1-9e6a-5c9be00163fb', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 21:53:13.951359+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd07a19a0-aa82-483e-b64f-74e4272f88de', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 21:53:13.961341+00', ''),
	('00000000-0000-0000-0000-000000000000', '64019fd2-39f1-46f6-99fb-74483c5218c5', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-23 21:53:14.141433+00', ''),
	('00000000-0000-0000-0000-000000000000', '35692c07-46f6-42ec-95d5-de782c75bc11', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-25 07:25:14.320438+00', ''),
	('00000000-0000-0000-0000-000000000000', '053c8e67-b95d-41fe-b65c-0f76b6805175', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-10-25 07:25:14.343596+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dd3f76ec-7bfb-454d-acd7-a1e4901d2b89', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 11:39:44.37916+00', ''),
	('00000000-0000-0000-0000-000000000000', '082e3d44-bec3-4ec9-bb25-e863e1f5c269', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 12:13:36.145918+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e6352a62-e210-4b3c-a308-8bce77d88b12', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 12:30:56.661641+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab2952d6-295e-4ed8-b163-8e88df6343e7', '{"action":"user_recovery_requested","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-11-02 12:31:12.105893+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f5aa677-fc38-4d60-bc01-ca2843c864b3', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 13:04:44.036395+00', ''),
	('00000000-0000-0000-0000-000000000000', '194132e2-d2c2-43fe-ac7b-e70a32252ddb', '{"action":"user_recovery_requested","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-11-02 13:04:58.621186+00', ''),
	('00000000-0000-0000-0000-000000000000', '17ebc649-f300-4605-9e7d-672b1d35c7fb', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 13:08:10.969875+00', ''),
	('00000000-0000-0000-0000-000000000000', '427862c2-60ef-4e95-8ab4-6a54b7fccf8f', '{"action":"login","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 13:10:30.779044+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a16dc655-9348-4e08-8f03-c4179f2807d2', '{"action":"user_recovery_requested","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-11-02 13:18:05.326728+00', ''),
	('00000000-0000-0000-0000-000000000000', 'abd5cf93-88d8-4874-b782-0cc5250016b1', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 13:18:25.106567+00', ''),
	('00000000-0000-0000-0000-000000000000', '8d55da77-e9c4-45ce-9243-aea7c0074bc6', '{"action":"user_confirmation_requested","actor_id":"4a268479-35aa-47ea-b6f4-5e4e557e2283","actor_username":"arinstreal@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-11-02 16:11:46.175081+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f375e58e-e5f7-404a-bd08-bf50ea3635ff', '{"action":"user_signedup","actor_id":"4a268479-35aa-47ea-b6f4-5e4e557e2283","actor_username":"arinstreal@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-11-02 16:12:23.732669+00', ''),
	('00000000-0000-0000-0000-000000000000', '5173f899-4ba0-4ffa-bacb-b59df64c6727', '{"action":"login","actor_id":"4a268479-35aa-47ea-b6f4-5e4e557e2283","actor_username":"arinstreal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 16:13:03.025238+00', ''),
	('00000000-0000-0000-0000-000000000000', '49abe82b-3d68-4aab-8685-cde8ce8fc965', '{"action":"logout","actor_id":"4a268479-35aa-47ea-b6f4-5e4e557e2283","actor_username":"arinstreal@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 16:13:11.284409+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f4227242-6d6c-4fe1-985e-8b26c6eb41f7', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 16:13:24.949536+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd2d39071-7e9d-4def-a4be-ef5491d1292b', '{"action":"user_confirmation_requested","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-11-02 16:27:59.519644+00', ''),
	('00000000-0000-0000-0000-000000000000', '48c7f396-b4c8-4b65-bb35-53168ebad53a', '{"action":"user_signedup","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-11-02 16:28:45.594936+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f2d07a5d-673d-4ceb-aa6f-d0ab3baa1d7a', '{"action":"login","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 16:28:52.065767+00', ''),
	('00000000-0000-0000-0000-000000000000', '8a1059c1-a3b0-4880-8ef8-5d49ecb75457', '{"action":"login","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 16:28:58.6394+00', ''),
	('00000000-0000-0000-0000-000000000000', '7f19f242-53a1-4c54-af6a-c5e2316c4f4f', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:44.48179+00', ''),
	('00000000-0000-0000-0000-000000000000', '05fb32dd-513f-41af-9b43-0c901c040a73', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:44.482465+00', ''),
	('00000000-0000-0000-0000-000000000000', '1bf51cf5-bd2a-427b-9d0d-4bfdeb84f1ba', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:44.602061+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab96cf59-3a52-4c00-bd51-e86cfeebfeec', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:45.013389+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f8ce7548-d02f-4752-9fa1-0ec8ae723e18', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:45.204906+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ef62c1b-d1fd-4b7d-8881-3a24dd537420', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:45.325214+00', ''),
	('00000000-0000-0000-0000-000000000000', '969b5058-6640-4a2a-a9dd-8d0b8d5f326e', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 16:29:45.760169+00', ''),
	('00000000-0000-0000-0000-000000000000', '4edb8aa8-290a-4014-a23a-9e8e4139cc7d', '{"action":"logout","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 16:46:49.374126+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a0bb4f4c-a017-4008-a49e-8edbaeae8f61', '{"action":"logout","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-11-02 16:46:50.446858+00', ''),
	('00000000-0000-0000-0000-000000000000', '43f33e23-9983-43f9-a99b-35a599f1ce1e', '{"action":"login","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 16:46:56.661397+00', ''),
	('00000000-0000-0000-0000-000000000000', '87ca55fa-0aa7-4e3c-a17b-261907a89a00', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 16:46:58.769047+00', ''),
	('00000000-0000-0000-0000-000000000000', '1fb1ad85-f31a-4831-b465-7a2292f35204', '{"action":"user_confirmation_requested","actor_id":"6d067e97-6dcb-4d0b-9a48-949c2eeb87a4","actor_username":"kkczekajowie@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-11-02 16:50:30.141167+00', ''),
	('00000000-0000-0000-0000-000000000000', '1d6bc256-24d4-472b-ae38-aa664e882769', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-02 17:09:08.410327+00', ''),
	('00000000-0000-0000-0000-000000000000', '09a32337-a27a-42b3-8959-e8c983d8812f', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 18:13:13.529366+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e7e58c4d-730a-4ae8-b814-975b3b85ec73', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 18:13:13.539149+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e908a48b-c23d-4abb-9484-55a6d609d812', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 18:13:13.579733+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fd5ac17a-3d8c-49d3-b94d-630c72d3d6f8', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 18:13:13.610759+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cab4d096-e1b8-40c3-9af5-0ddfcaf1c27b', '{"action":"token_refreshed","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 18:33:25.829185+00', ''),
	('00000000-0000-0000-0000-000000000000', '3b03c686-2e47-4f5d-9d5e-35852f4a671d', '{"action":"token_revoked","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 18:33:25.837475+00', ''),
	('00000000-0000-0000-0000-000000000000', '1cbff095-a1b4-443b-8d84-53234a87fe28', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 19:25:14.20051+00', ''),
	('00000000-0000-0000-0000-000000000000', '735d3d32-86e9-4c4a-888d-7d8f9f04e7e1', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 19:25:14.216383+00', ''),
	('00000000-0000-0000-0000-000000000000', '262254b8-9cd7-41d9-b864-821ec64e4eed', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 19:25:14.395088+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ec435d5-bc92-49cd-9d8a-52123d30173b', '{"action":"token_refreshed","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 20:47:36.034121+00', ''),
	('00000000-0000-0000-0000-000000000000', '5242104f-91f5-4416-857a-d2ea09e55d6b', '{"action":"token_revoked","actor_id":"d3e9e56f-c373-4c21-aca3-b2b4f72c49ab","actor_username":"deexos@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-02 20:47:36.047403+00', ''),
	('00000000-0000-0000-0000-000000000000', '1fd94ded-9c94-4a64-a844-7f8fe8222c4d', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 09:22:59.341315+00', ''),
	('00000000-0000-0000-0000-000000000000', '7cbfa98b-87a8-4cae-ba62-5dde7375370d', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 09:22:59.349261+00', ''),
	('00000000-0000-0000-0000-000000000000', '44cc7ccd-14a6-4a36-9875-ed1c9ab25f38', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 09:24:34.075905+00', ''),
	('00000000-0000-0000-0000-000000000000', '5cfbe780-3b1a-4da9-9376-2b0bc7e6eac3', '{"action":"token_revoked","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 09:24:34.077656+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aea77308-f1ef-479f-b47b-7d27d0e6a7d6', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 09:24:34.106655+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ea7efe81-66bb-4002-a2b8-ef8bb21cf9be', '{"action":"token_refreshed","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 09:24:34.14332+00', ''),
	('00000000-0000-0000-0000-000000000000', '69a31d52-86a1-4f87-be32-092f8cc95757', '{"action":"login","actor_id":"71dd2449-101f-4562-b01c-6b0c5552462a","actor_username":"natanielcz@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-03 09:50:27.499989+00', ''),
	('00000000-0000-0000-0000-000000000000', '57d27999-6ad5-407f-a32c-f5772395ecd5', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 11:06:34.609668+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a47279b0-5174-4515-9d0b-905543d18bce', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 11:06:34.633241+00', ''),
	('00000000-0000-0000-0000-000000000000', '6baa4b41-66ca-459b-8d5a-65993e900f39', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 12:24:00.762645+00', ''),
	('00000000-0000-0000-0000-000000000000', '87bd05b8-8bc3-4a31-a29e-ec3eea64c848', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 12:24:00.774468+00', ''),
	('00000000-0000-0000-0000-000000000000', '5a9ae45a-31c5-4c53-ac76-4d0adbe98308', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 16:58:50.564495+00', ''),
	('00000000-0000-0000-0000-000000000000', '51862d00-43a1-4f08-9885-b039e0c6be41', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-03 16:58:50.583231+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a680a092-2110-461c-9e97-2a1554d1bd16', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-04 11:30:37.204954+00', ''),
	('00000000-0000-0000-0000-000000000000', '4a8219d1-8987-4bee-bc9c-4096ca7d73db', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-04 11:30:37.227718+00', ''),
	('00000000-0000-0000-0000-000000000000', '1c98b600-8d08-4fcc-b29d-c2de4e7a6053', '{"action":"token_refreshed","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-04 13:03:01.100947+00', ''),
	('00000000-0000-0000-0000-000000000000', '686d2052-deb8-436a-8211-ffcd353bcf6c', '{"action":"token_revoked","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-11-04 13:03:01.123237+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eba8a9f4-4856-43ad-8b5f-61242f837b7f', '{"action":"login","actor_id":"f3a24edf-84a9-4e0a-ab59-40ba9e4e2008","actor_username":"iteniahi@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-04 18:24:10.754773+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") VALUES
	('a97f57af-9d28-4ae9-9b60-99dad643d8b1', '71dd2449-101f-4562-b01c-6b0c5552462a', '29309300-7237-4723-a1bf-b1bfab1ab3ef', 's256', 'QKCq0BMXQxNDyK9gaCvcSrNcDzOhTazk2B8Q8XONzDY', 'email', '', '', '2025-10-22 20:21:32.691781+00', '2025-10-22 20:22:19.253872+00', 'email/signup', '2025-10-22 20:22:19.253836+00'),
	('3a0b938b-b254-48d2-b226-b24449ce4f9a', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', 'a3056c00-45fe-4f01-9bc4-37d2d80210fb', 's256', 'wELgDgXvM7Bg54ZEpKFd8z8s1rdGthK1Q5beckKxst8', 'recovery', '', '', '2025-11-02 12:31:12.099755+00', '2025-11-02 13:04:44.067219+00', 'recovery', '2025-11-02 13:04:44.067165+00'),
	('e3fdc5eb-ad65-49b1-b658-1ec0fd623dde', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', 'bc6d3ee9-00b7-4396-8ba0-d1842968eb83', 's256', 'FX2bWxbml0c2It_y_iy88iAvydDFt4pbJCgG1eBabL8', 'recovery', '', '', '2025-11-02 13:04:58.614879+00', '2025-11-02 13:08:10.974846+00', 'recovery', '2025-11-02 13:08:10.9748+00'),
	('4d854cea-3d91-4a4e-9e62-9b2cec21cb0f', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', 'fadae82d-7b14-4847-a569-188caf8fa056', 's256', 'MWoRdsK93983LJLjjQsEY6vtrRAjaO8RQ9pyJacyMIE', 'recovery', '', '', '2025-11-02 13:18:05.318252+00', '2025-11-02 13:18:25.119101+00', 'recovery', '2025-11-02 13:18:25.116573+00'),
	('7751a38a-cf4f-497b-bfab-d1cc9e662afe', '4a268479-35aa-47ea-b6f4-5e4e557e2283', '582141de-d28d-485a-a55a-564407f5ab21', 's256', '52sam8UCqDobtwfHHCLatzIxVw9-0eezO7Rasp3kOAo', 'email', '', '', '2025-11-02 16:11:46.181548+00', '2025-11-02 16:12:23.744964+00', 'email/signup', '2025-11-02 16:12:23.744917+00'),
	('dfd3a363-97f2-4d6f-9c80-a39ec92e7ffc', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', '2f3e7850-1773-4063-990a-958ee6ee6e4c', 's256', 'lJEyW7WUvOiegfAH4UStJvqSpWcMo9rBamTFCIheC4k', 'email', '', '', '2025-11-02 16:27:59.524657+00', '2025-11-02 16:28:45.601367+00', 'email/signup', '2025-11-02 16:28:45.601312+00'),
	('e5af27ff-d09b-4eea-a7f8-7b3a17766174', '6d067e97-6dcb-4d0b-9a48-949c2eeb87a4', '92a66ab0-d606-41da-87e0-43a5adfba567', 's256', '6bEomwzDvUxTB-Hp6Zx8zGrti3IahTrg7oqazHawq7g', 'email', '', '', '2025-11-02 16:50:30.142406+00', '2025-11-02 16:50:30.142406+00', 'email/signup', NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '6d067e97-6dcb-4d0b-9a48-949c2eeb87a4', 'authenticated', 'authenticated', 'kkczekajowie@gmail.com', '$2a$10$j2ZRNIIPB.Hh7tQsCcru6eiXSNxG5sCNygzzvypWt2m90bt8D6wqS', NULL, NULL, 'pkce_9f4a2bb5bfb68085aad802cf879855ec0dd9900eafc9a00da20082bc', '2025-11-02 16:50:30.150898+00', '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"sub": "6d067e97-6dcb-4d0b-9a48-949c2eeb87a4", "email": "kkczekajowie@gmail.com", "email_verified": false, "phone_verified": false}', NULL, '2025-11-02 16:50:30.125464+00', '2025-11-02 16:50:30.973947+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '4a268479-35aa-47ea-b6f4-5e4e557e2283', 'authenticated', 'authenticated', 'arinstreal@gmail.com', '$2a$10$4kJUDb5aIQryH/fG3Ulz0eeR/MCehMg8D1nLCFIrls7gNZtGi.btO', '2025-11-02 16:12:23.734606+00', NULL, '', '2025-11-02 16:11:46.193424+00', '', NULL, '', '', NULL, '2025-11-02 16:13:03.040589+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "4a268479-35aa-47ea-b6f4-5e4e557e2283", "email": "arinstreal@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-11-02 16:11:46.132796+00', '2025-11-02 16:13:03.095639+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', 'authenticated', 'authenticated', 'iteniahi@gmail.com', '$2a$10$l2V.2Kxrh7C3Kw44r3k5L.pe55IUZ9yps4DjkwdWtY0L.1U4z7ISG', '2025-10-15 16:36:59.364901+00', NULL, '', NULL, '', '2025-11-02 13:18:05.334579+00', '', '', NULL, '2025-11-04 18:24:10.782992+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-10-15 16:36:59.334268+00', '2025-11-04 18:24:10.851378+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', 'authenticated', 'authenticated', 'deexos@gmail.com', '$2a$10$Kg2gerxaVQIIODeyChvmJejnYwQtRrGRM9t1uNx0aayiV6irgVJvu', '2025-11-02 16:28:45.596596+00', NULL, '', '2025-11-02 16:27:59.541924+00', '', NULL, '', '', NULL, '2025-11-02 16:28:58.64062+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "d3e9e56f-c373-4c21-aca3-b2b4f72c49ab", "email": "deexos@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-11-02 16:27:59.451541+00', '2025-11-02 20:47:36.074145+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '71dd2449-101f-4562-b01c-6b0c5552462a', 'authenticated', 'authenticated', 'natanielcz@gmail.com', '$2a$10$DYQfyZ/MCMfvVW6AoVcnqem.wcTixqMAnmPbqBx.0QvdKi.CZfd.S', '2025-10-22 20:22:19.24818+00', NULL, '', '2025-10-22 20:21:32.710775+00', '', NULL, '', '', NULL, '2025-11-03 09:50:27.513071+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "71dd2449-101f-4562-b01c-6b0c5552462a", "email": "natanielcz@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-10-22 20:21:32.641561+00', '2025-11-03 09:50:27.552843+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', '{"sub": "f3a24edf-84a9-4e0a-ab59-40ba9e4e2008", "email": "iteniahi@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-15 16:36:59.350905+00', '2025-10-15 16:36:59.350965+00', '2025-10-15 16:36:59.350965+00', '3d45152c-4e3f-4a29-a3a2-027aad0861f9'),
	('71dd2449-101f-4562-b01c-6b0c5552462a', '71dd2449-101f-4562-b01c-6b0c5552462a', '{"sub": "71dd2449-101f-4562-b01c-6b0c5552462a", "email": "natanielcz@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2025-10-22 20:21:32.674766+00', '2025-10-22 20:21:32.675827+00', '2025-10-22 20:21:32.675827+00', 'e87ca167-2739-4d53-a8a3-165c5aa271f8'),
	('4a268479-35aa-47ea-b6f4-5e4e557e2283', '4a268479-35aa-47ea-b6f4-5e4e557e2283', '{"sub": "4a268479-35aa-47ea-b6f4-5e4e557e2283", "email": "arinstreal@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2025-11-02 16:11:46.163221+00', '2025-11-02 16:11:46.164037+00', '2025-11-02 16:11:46.164037+00', '4113cbf3-5908-4fff-b6eb-d8e56ca08bd1'),
	('d3e9e56f-c373-4c21-aca3-b2b4f72c49ab', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', '{"sub": "d3e9e56f-c373-4c21-aca3-b2b4f72c49ab", "email": "deexos@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2025-11-02 16:27:59.494642+00', '2025-11-02 16:27:59.494715+00', '2025-11-02 16:27:59.494715+00', '57332c8e-b960-42ff-a1c5-35ed9a514880'),
	('6d067e97-6dcb-4d0b-9a48-949c2eeb87a4', '6d067e97-6dcb-4d0b-9a48-949c2eeb87a4', '{"sub": "6d067e97-6dcb-4d0b-9a48-949c2eeb87a4", "email": "kkczekajowie@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-02 16:50:30.136677+00', '2025-11-02 16:50:30.136744+00', '2025-11-02 16:50:30.136744+00', '922b52d2-4b6a-4d22-a2d5-8a0efca763fd');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id") VALUES
	('532c51a1-32af-4f6d-a01e-7653b76d058e', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', '2025-11-02 16:28:52.068898+00', '2025-11-02 16:28:52.068898+00', NULL, 'aal1', NULL, NULL, NULL, '2a06:98c0:3600::103', NULL, NULL),
	('494dec91-0f1b-4722-82cb-c5cb8087d546', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', '2025-11-02 17:09:08.430175+00', '2025-11-02 17:09:08.430175+00', NULL, 'aal1', NULL, NULL, NULL, '2a06:98c0:3600::103', NULL, NULL),
	('49687396-a008-4ee1-8b7e-cfb277aaf26f', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', '2025-11-02 16:28:58.640725+00', '2025-11-02 20:47:36.083055+00', NULL, 'aal1', NULL, '2025-11-02 20:47:36.082955', NULL, '2a06:98c0:3600::103', NULL, NULL),
	('d049b792-e8cb-484a-9f2f-0df6fd5cc666', '71dd2449-101f-4562-b01c-6b0c5552462a', '2025-11-02 16:46:56.665197+00', '2025-11-03 09:24:34.145097+00', NULL, 'aal1', NULL, '2025-11-03 09:24:34.145023', NULL, '2a06:98c0:3600::103', NULL, NULL),
	('a8443c3f-6654-4388-9e49-3e984a24f4dc', '71dd2449-101f-4562-b01c-6b0c5552462a', '2025-11-03 09:50:27.513183+00', '2025-11-03 09:50:27.513183+00', NULL, 'aal1', NULL, NULL, NULL, '2a06:98c0:3600::103', NULL, NULL),
	('07c40990-66cb-45dc-8590-31645274a2f8', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', '2025-11-02 16:46:58.769984+00', '2025-11-04 13:03:01.164376+00', NULL, 'aal1', NULL, '2025-11-04 13:03:01.163622', NULL, '2a06:98c0:3600::103', NULL, NULL),
	('1380e12a-fccd-4ba7-a576-dd70bf9bb4f5', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', '2025-11-04 18:24:10.783105+00', '2025-11-04 18:24:10.783105+00', NULL, 'aal1', NULL, NULL, NULL, '2a06:98c0:3600::103', NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('532c51a1-32af-4f6d-a01e-7653b76d058e', '2025-11-02 16:28:52.081833+00', '2025-11-02 16:28:52.081833+00', 'password', 'dc134b7d-eca7-499a-a2e2-63e1ba5eecdc'),
	('49687396-a008-4ee1-8b7e-cfb277aaf26f', '2025-11-02 16:28:58.643482+00', '2025-11-02 16:28:58.643482+00', 'password', 'd21af6a4-a152-4afb-b046-c50a7f01363d'),
	('d049b792-e8cb-484a-9f2f-0df6fd5cc666', '2025-11-02 16:46:56.680584+00', '2025-11-02 16:46:56.680584+00', 'password', '0dfcf72f-391a-4922-8ed3-2412e0aa1428'),
	('07c40990-66cb-45dc-8590-31645274a2f8', '2025-11-02 16:46:58.772138+00', '2025-11-02 16:46:58.772138+00', 'password', '04027bc0-231d-4dda-a869-2ddfbc2c85e2'),
	('494dec91-0f1b-4722-82cb-c5cb8087d546', '2025-11-02 17:09:08.44672+00', '2025-11-02 17:09:08.44672+00', 'password', '02e5835d-ce19-4f21-a8a4-694e4d8e971a'),
	('a8443c3f-6654-4388-9e49-3e984a24f4dc', '2025-11-03 09:50:27.557525+00', '2025-11-03 09:50:27.557525+00', 'password', '43ff8b7a-51b6-436e-91c3-5125392b74d1'),
	('1380e12a-fccd-4ba7-a576-dd70bf9bb4f5', '2025-11-04 18:24:10.86143+00', '2025-11-04 18:24:10.86143+00', 'password', 'b4a30433-8550-49bf-a807-0baa66dca2bd');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('eab48e2a-6ef1-4a7c-be76-e79206c1cb36', '6d067e97-6dcb-4d0b-9a48-949c2eeb87a4', 'confirmation_token', 'pkce_9f4a2bb5bfb68085aad802cf879855ec0dd9900eafc9a00da20082bc', 'kkczekajowie@gmail.com', '2025-11-02 16:50:30.978975', '2025-11-02 16:50:30.978975');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 22, 'lyehky7q3swu', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', false, '2025-11-02 16:28:52.073355+00', '2025-11-02 16:28:52.073355+00', NULL, '532c51a1-32af-4f6d-a01e-7653b76d058e'),
	('00000000-0000-0000-0000-000000000000', 27, 'yk7wywhszhol', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', false, '2025-11-02 17:09:08.43591+00', '2025-11-02 17:09:08.43591+00', NULL, '494dec91-0f1b-4722-82cb-c5cb8087d546'),
	('00000000-0000-0000-0000-000000000000', 25, 'kyyzcevjwa7m', '71dd2449-101f-4562-b01c-6b0c5552462a', true, '2025-11-02 16:46:56.671065+00', '2025-11-02 18:13:13.540933+00', NULL, 'd049b792-e8cb-484a-9f2f-0df6fd5cc666'),
	('00000000-0000-0000-0000-000000000000', 23, 'nsiv5oo7u42b', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', true, '2025-11-02 16:28:58.641517+00', '2025-11-02 18:33:25.838778+00', NULL, '49687396-a008-4ee1-8b7e-cfb277aaf26f'),
	('00000000-0000-0000-0000-000000000000', 28, 'hofhdtbs7kjs', '71dd2449-101f-4562-b01c-6b0c5552462a', true, '2025-11-02 18:13:13.554632+00', '2025-11-02 19:25:14.221904+00', 'kyyzcevjwa7m', 'd049b792-e8cb-484a-9f2f-0df6fd5cc666'),
	('00000000-0000-0000-0000-000000000000', 29, 'ajbg5w476vnr', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', true, '2025-11-02 18:33:25.849582+00', '2025-11-02 20:47:36.050085+00', 'nsiv5oo7u42b', '49687396-a008-4ee1-8b7e-cfb277aaf26f'),
	('00000000-0000-0000-0000-000000000000', 31, 'tld5u5dqvdgt', 'd3e9e56f-c373-4c21-aca3-b2b4f72c49ab', false, '2025-11-02 20:47:36.065274+00', '2025-11-02 20:47:36.065274+00', 'ajbg5w476vnr', '49687396-a008-4ee1-8b7e-cfb277aaf26f'),
	('00000000-0000-0000-0000-000000000000', 26, 'n67direnvqeh', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', true, '2025-11-02 16:46:58.770845+00', '2025-11-03 09:22:59.350763+00', NULL, '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 30, 'kp5qfjcbbbhi', '71dd2449-101f-4562-b01c-6b0c5552462a', true, '2025-11-02 19:25:14.234347+00', '2025-11-03 09:24:34.078802+00', 'hofhdtbs7kjs', 'd049b792-e8cb-484a-9f2f-0df6fd5cc666'),
	('00000000-0000-0000-0000-000000000000', 33, 'q5mnlze5cbqc', '71dd2449-101f-4562-b01c-6b0c5552462a', false, '2025-11-03 09:24:34.080554+00', '2025-11-03 09:24:34.080554+00', 'kp5qfjcbbbhi', 'd049b792-e8cb-484a-9f2f-0df6fd5cc666'),
	('00000000-0000-0000-0000-000000000000', 34, 'mly2vj2lsmni', '71dd2449-101f-4562-b01c-6b0c5552462a', false, '2025-11-03 09:50:27.536551+00', '2025-11-03 09:50:27.536551+00', NULL, 'a8443c3f-6654-4388-9e49-3e984a24f4dc'),
	('00000000-0000-0000-0000-000000000000', 32, 'ltlwjgtqkepy', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', true, '2025-11-03 09:22:59.35921+00', '2025-11-03 11:06:34.634176+00', 'n67direnvqeh', '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 35, 'vvl5mv2sgz2k', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', true, '2025-11-03 11:06:34.648317+00', '2025-11-03 12:24:00.775304+00', 'ltlwjgtqkepy', '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 36, '4s37gaaglt6a', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', true, '2025-11-03 12:24:00.788031+00', '2025-11-03 16:58:50.585945+00', 'vvl5mv2sgz2k', '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 37, 'pv4jdzd2mb2l', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', true, '2025-11-03 16:58:50.598553+00', '2025-11-04 11:30:37.229127+00', '4s37gaaglt6a', '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 38, '4hl6342mmp2k', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', true, '2025-11-04 11:30:37.247743+00', '2025-11-04 13:03:01.125792+00', 'pv4jdzd2mb2l', '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 39, 'surr7lgk3aab', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', false, '2025-11-04 13:03:01.145308+00', '2025-11-04 13:03:01.145308+00', '4hl6342mmp2k', '07c40990-66cb-45dc-8590-31645274a2f8'),
	('00000000-0000-0000-0000-000000000000', 40, '5qk275arfgyd', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', false, '2025-11-04 18:24:10.818061+00', '2025-11-04 18:24:10.818061+00', NULL, '1380e12a-fccd-4ba7-a576-dd70bf9bb4f5');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."groups" ("id", "name", "budget", "end_date", "creator_id", "created_at", "updated_at") VALUES
	(1, 'Test', 100, '2025-10-23 22:00:00+00', 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', '2025-10-22 21:38:11.3995+00', '2025-10-22 21:38:11.3995+00'),
	(3, 'Boże Narodzenie 2025', 150, '2025-12-23 23:00:00+00', '71dd2449-101f-4562-b01c-6b0c5552462a', '2025-11-02 13:12:03.081689+00', '2025-11-02 13:12:03.081689+00');


--
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."participants" ("id", "group_id", "user_id", "name", "email", "created_at", "access_token", "result_viewed_at") VALUES
	(2, 1, NULL, 'eee', NULL, '2025-10-23 18:22:29.674657+00', 'cfb7eebd-9cfa-49c8-a65e-6078be7fdb3e', NULL),
	(3, 1, NULL, 'fsdfds', NULL, '2025-10-23 18:22:32.250609+00', '80bcde99-e403-4cce-9a16-059c564ec125', NULL),
	(1, 1, 'f3a24edf-84a9-4e0a-ab59-40ba9e4e2008', 'iteniahi', 'iteniahi@gmail.com', '2025-10-22 21:38:11.481968+00', 'f66547c7-7686-4d17-bb4f-f269dd9cbb6e', '2025-10-23 18:23:47.367+00'),
	(19, 3, '71dd2449-101f-4562-b01c-6b0c5552462a', 'Maciej', 'natanielcz@gmail.com', '2025-11-02 13:12:03.162353+00', 'd728973e-294d-49a0-8474-11f3251b7923', '2025-11-02 13:24:19.737+00'),
	(20, 3, NULL, 'Władysław', NULL, '2025-11-02 13:12:15.498752+00', 'b2d930aa-e703-4d2f-8838-edfb1db42af9', '2025-11-02 13:25:00.429+00'),
	(32, 3, NULL, 'Kamil', 'deexos@gmail.com', '2025-11-02 13:13:30.412341+00', '8073a156-380c-4e4e-849b-fb18783b70de', '2025-11-02 16:31:36.503+00'),
	(31, 3, NULL, 'Paulina', 'iteniahi@gmail.com', '2025-11-02 13:13:24.102719+00', 'c61b6a67-0ddb-4465-8543-b055bffc8217', '2025-11-02 16:32:08.237+00'),
	(21, 3, NULL, 'Krzysztof', NULL, '2025-11-02 13:12:22.019052+00', '06af7ab4-fa8f-4662-bd29-a030813f75d0', '2025-11-02 16:33:11.572+00'),
	(22, 3, NULL, 'Krystyna', NULL, '2025-11-02 13:12:27.85173+00', 'fba0ed78-c7aa-4df4-8760-44ad6df58d1c', '2025-11-02 16:44:49.314+00'),
	(25, 3, NULL, 'Justyn', NULL, '2025-11-02 13:12:49.951226+00', 'bfeb82a9-4244-4269-9e0f-dfeca42f3f5e', '2025-11-02 16:45:18.877+00'),
	(34, 3, NULL, 'Dagmara', NULL, '2025-11-02 13:13:39.123221+00', '572ad780-caf1-4440-ab79-8fdbe4e79191', '2025-11-02 16:46:01.715+00'),
	(33, 3, NULL, 'Martyna', NULL, '2025-11-02 13:13:34.036523+00', '7df5ee5d-22d3-4c10-a268-bec1c9362b45', '2025-11-02 16:52:19.485+00'),
	(27, 3, NULL, 'Justyna', NULL, '2025-11-02 13:13:07.501736+00', '3145424b-ae0e-4b08-a440-44fd0e47b02e', '2025-11-02 16:57:28.808+00'),
	(26, 3, NULL, 'Daniel', NULL, '2025-11-02 13:12:55.452014+00', '2b056709-8530-4c76-946b-86547274bfa0', '2025-11-02 16:57:31.514+00'),
	(28, 3, NULL, 'Kornel', NULL, '2025-11-02 13:13:12.8607+00', 'c47e9427-3096-40eb-b15e-edf565f02683', '2025-11-02 16:58:32.001+00'),
	(29, 3, NULL, 'Daria', NULL, '2025-11-02 13:13:16.606743+00', '226c78bf-bf3d-4e5d-a838-bcb9c2be52f1', '2025-11-02 17:20:50.964+00'),
	(23, 3, NULL, 'Adrian', NULL, '2025-11-02 13:12:34.150417+00', '471d0d67-00f7-4939-80c6-6db0b2e9f8f4', '2025-11-02 18:04:29.316+00'),
	(24, 3, NULL, 'Monika', NULL, '2025-11-02 13:12:39.38072+00', 'c54cdd69-9841-4329-96dc-f78f75a23a99', '2025-11-02 20:13:14.198+00');


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."assignments" ("id", "group_id", "giver_participant_id", "receiver_participant_id", "created_at") VALUES
	(1, 1, 1, 2, '2025-10-23 18:22:36.282892+00'),
	(2, 1, 2, 3, '2025-10-23 18:22:36.282892+00'),
	(3, 1, 3, 1, '2025-10-23 18:22:36.282892+00'),
	(34, 3, 33, 28, '2025-11-02 16:30:32.108812+00'),
	(35, 3, 25, 26, '2025-11-02 16:30:32.108812+00'),
	(36, 3, 22, 20, '2025-11-02 16:30:32.108812+00'),
	(37, 3, 21, 19, '2025-11-02 16:30:32.108812+00'),
	(38, 3, 23, 32, '2025-11-02 16:30:32.108812+00'),
	(39, 3, 24, 31, '2025-11-02 16:30:32.108812+00'),
	(40, 3, 32, 27, '2025-11-02 16:30:32.108812+00'),
	(41, 3, 28, 24, '2025-11-02 16:30:32.108812+00'),
	(42, 3, 27, 21, '2025-11-02 16:30:32.108812+00'),
	(43, 3, 29, 22, '2025-11-02 16:30:32.108812+00'),
	(44, 3, 19, 23, '2025-11-02 16:30:32.108812+00'),
	(45, 3, 34, 25, '2025-11-02 16:30:32.108812+00'),
	(46, 3, 31, 29, '2025-11-02 16:30:32.108812+00'),
	(47, 3, 20, 33, '2025-11-02 16:30:32.108812+00'),
	(48, 3, 26, 34, '2025-11-02 16:30:32.108812+00');


--
-- Data for Name: exclusion_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."exclusion_rules" ("id", "group_id", "blocker_participant_id", "blocked_participant_id", "created_at") VALUES
	(15, 3, 21, 22, '2025-11-02 13:31:00.801262+00'),
	(16, 3, 22, 21, '2025-11-02 13:31:01.744149+00'),
	(17, 3, 26, 27, '2025-11-02 13:31:09.517415+00'),
	(18, 3, 27, 26, '2025-11-02 13:31:10.145651+00'),
	(19, 3, 28, 29, '2025-11-02 13:31:17.902814+00'),
	(20, 3, 29, 28, '2025-11-02 13:31:18.51469+00'),
	(21, 3, 32, 33, '2025-11-02 13:31:27.848085+00'),
	(22, 3, 33, 32, '2025-11-02 13:31:28.546782+00'),
	(23, 3, 20, 19, '2025-11-02 13:31:42.418003+00'),
	(24, 3, 21, 32, '2025-11-02 13:31:50.39558+00');


--
-- Data for Name: wishes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."wishes" ("id", "participant_id", "wishlist", "updated_at") VALUES
	(1, 1, 'rs', '2025-10-23 18:23:53.567+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 40, true);


--
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."assignments_id_seq"', 48, true);


--
-- Name: exclusion_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."exclusion_rules_id_seq"', 24, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."groups_id_seq"', 3, true);


--
-- Name: participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."participants_id_seq"', 34, true);


--
-- Name: wishes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."wishes_id_seq"', 1, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict ATRMPulP3cOBHkaSrfLbhLYlfTzWu2zQnMJmceGYjNBVeMefRN15wfupD3DIVgP

RESET ALL;
