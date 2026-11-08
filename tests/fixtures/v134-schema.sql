CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA private;CREATE SCHEMA extensions;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'service_role')$$;CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;SET check_function_bodies=off;
CREATE SEQUENCE stellar_security_events_id_seq;
CREATE SEQUENCE clan_transactions_id_seq;
CREATE SEQUENCE clan_credit_grants_id_seq;
CREATE SEQUENCE premium_purchases_v12_id_seq;
CREATE TABLE public."account_moderation_v1763"("user_id" uuid,"is_banned" bool DEFAULT false,"banned_until" timestamptz,"banned_reason" text,"banned_by" uuid,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."admin_action_log_v1763"("id" int8,"admin_user_id" uuid,"target_user_id" uuid,"target_callsign" text,"target_email" text,"action" text,"detail" jsonb DEFAULT '{}'::jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."arena_battles"("id" int8,"battle_date" date,"attacker_id" uuid,"defender_id" uuid,"winner_id" uuid,"attacker_power" int8,"defender_power" int8,"rounds" int4,"result" jsonb DEFAULT '{}'::jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."arena_daily"("user_id" uuid,"battle_date" date,"attacks_used" int4 DEFAULT 0);
CREATE TABLE public."arena_daily_rewards"("user_id" uuid,"reward_date" date,"rating" int4,"rank_position" int4,"league" text,"player_level" int4,"level_bonus_percent" int4 DEFAULT 0,"rank_bonus_percent" int4 DEFAULT 0,"total_bonus_percent" int4 DEFAULT 0,"credits" int8 DEFAULT 0,"uridium" int8 DEFAULT 0,"xp" int8 DEFAULT 0,"repair_bonus" int4 DEFAULT 0,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."arena_profiles"("user_id" uuid,"callsign" text DEFAULT 'Pilot'::text,"faction" text,"level" int4 DEFAULT 1,"ship_id" text DEFAULT 'phoenix'::text,"hp" int8 DEFAULT 1,"shield" int8 DEFAULT 0,"laser_damage" int8 DEFAULT 0,"speed" int4 DEFAULT 0,"power" int8 DEFAULT 1,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."arena_stats"("user_id" uuid,"wins" int4 DEFAULT 0,"losses" int4 DEFAULT 0,"battles" int4 DEFAULT 0,"rating" int4 DEFAULT 1000,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."auction_bids"("id" int8,"user_id" uuid,"hour_key" text,"lot_ref" text,"user_bid" int8 DEFAULT 0,"lot" jsonb DEFAULT '{}'::jsonb,"status" text DEFAULT 'active'::text,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."battle_group_invites_v179"("id" uuid DEFAULT gen_random_uuid(),"group_id" uuid,"inviter_id" uuid,"invitee_id" uuid,"status" text DEFAULT 'pending'::text,"created_at" timestamptz DEFAULT now(),"expires_at" timestamptz DEFAULT (now() + '00:30:00'::interval));
CREATE TABLE public."battle_group_members_v179"("group_id" uuid,"user_id" uuid,"role" text DEFAULT 'member'::text,"joined_at" timestamptz DEFAULT now());
CREATE TABLE public."battle_groups_v179"("id" uuid DEFAULT gen_random_uuid(),"leader_id" uuid,"rally_map_id" text,"rally_territory_faction" text,"rally_x" float8,"rally_y" float8,"rally_at" timestamptz,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."bonus_box_config_v1825"("id" int4,"config" jsonb,"version" int4 DEFAULT 1,"updated_at" timestamptz DEFAULT now(),"updated_by" uuid);
CREATE TABLE public."clan_credit_grants"("id" int8 DEFAULT nextval('clan_credit_grants_id_seq'::regclass),"clan_id" uuid,"sender_id" uuid,"recipient_id" uuid,"amount" int8,"claimed" bool DEFAULT false,"created_at" timestamptz DEFAULT now(),"claimed_at" timestamptz);
CREATE TABLE public."clan_join_requests_v19"("id" uuid DEFAULT gen_random_uuid(),"user_id" uuid,"clan_id" uuid,"status" text DEFAULT 'pending'::text,"reviewed_by" uuid,"created_at" timestamptz DEFAULT now(),"reviewed_at" timestamptz);
CREATE TABLE public."clan_map_domination_results_v132"("event_id" uuid,"map_id" text,"winner_clan_id" uuid,"winning_score" int8 DEFAULT 0,"finalized_at" timestamptz DEFAULT now());
CREATE TABLE public."clan_map_domination_scores_v132"("event_id" uuid,"clan_id" uuid,"score" int8 DEFAULT 0,"boss_score" int8 DEFAULT 0,"pvp_score" int8 DEFAULT 0,"event_score" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."clan_map_ownership_v132"("map_id" text,"clan_id" uuid,"source_event_id" uuid,"winning_score" int8 DEFAULT 0,"captured_at" timestamptz,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."clan_members"("user_id" uuid,"clan_id" uuid,"role" text DEFAULT 'member'::text,"joined_at" timestamptz DEFAULT now());
CREATE TABLE public."clan_transactions"("id" int8 DEFAULT nextval('clan_transactions_id_seq'::regclass),"clan_id" uuid,"actor_id" uuid,"target_user_id" uuid,"kind" text,"gross_amount" int8 DEFAULT 0,"net_amount" int8 DEFAULT 0,"burn_amount" int8 DEFAULT 0,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."clan_war_contrib_v131"("war_id" uuid,"user_id" uuid,"clan_id" uuid,"score" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."clan_wars_v131"("id" uuid DEFAULT gen_random_uuid(),"attacker_clan_id" uuid,"defender_clan_id" uuid,"attacker_score" int8 DEFAULT 0,"defender_score" int8 DEFAULT 0,"starts_at" timestamptz DEFAULT now(),"ends_at" timestamptz DEFAULT (now() + '12:00:00'::interval),"status" text DEFAULT 'active'::text,"winner_clan_id" uuid,"created_by" uuid,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."clans"("id" uuid DEFAULT gen_random_uuid(),"name" text,"tag" text,"owner_id" uuid,"vault_credits" int8 DEFAULT 0,"total_donated" int8 DEFAULT 0,"total_burned" int8 DEFAULT 0,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now(),"level" int4 DEFAULT 1,"mission_kills" jsonb DEFAULT '{}'::jsonb,"total_interest" int8 DEFAULT 0,"total_collected" int8 DEFAULT 0,"total_transfer_fees" int8 DEFAULT 0,"last_interest_date" date,"last_collection_date" date);
CREATE TABLE public."designer_drop_claims_v16"("user_id" uuid,"claim_key" text,"source_kind" text,"source_ref" text,"design_id" text,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."galaxy_event_progress_v1826"("user_id" uuid,"event_id" text,"event_key" text,"event_start" timestamptz,"event_end" timestamptz,"target" int4,"progress" int4 DEFAULT 0,"rewarded" bool DEFAULT false,"rewarded_at" timestamptz,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."galaxy_gate_config_v1906"("id" int2 DEFAULT 1,"config" jsonb DEFAULT '{}'::jsonb,"version" int8 DEFAULT 1,"updated_at" timestamptz DEFAULT now(),"updated_by" uuid);
CREATE TABLE public."game_admins"("user_id" uuid,"role" text DEFAULT 'admin'::text,"unlimited_arena" bool DEFAULT true,"unlimited_jump" bool DEFAULT true,"unlimited_repair" bool DEFAULT true,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_auction_rules_v1908"("id" int4,"nova_floor" int8 DEFAULT 100000000,"common_floor" int8 DEFAULT 100000,"version" int8 DEFAULT 1,"updated_at" timestamptz DEFAULT now(),"stl_to_credits" int8 DEFAULT 6667,"category_multipliers" jsonb DEFAULT '{"ammo": 2.5, "ship": 0.03, "drone": 0.05, "extra": 0.04, "laser": 0.04, "rocket": 2, "petGear": 0.05, "generator": 0.04}'::jsonb,"item_multipliers" jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public."game_balance_entries_v1909"("kind" text,"item_id" text,"label" text,"params" jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_balance_event_backup_v1917"("kind" text,"item_id" text,"params" jsonb,"label" text,"saved_at" timestamptz DEFAULT now());
CREATE TABLE public."game_balance_meta_v1909"("id" int4,"version" int4 DEFAULT 1,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_battle_pass_seasons_v1817b"("season_key" text,"name" text,"description" text DEFAULT ''::text,"starts_at" timestamptz,"ends_at" timestamptz,"tier_count" int4 DEFAULT 30,"points_per_tier" int4 DEFAULT 500,"daily_points" int4 DEFAULT 100,"premium_price_brl" numeric DEFAULT 19.90,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_battle_pass_tiers_v1817b"("season_key" text,"tier_no" int4,"free_reward" jsonb DEFAULT '{}'::jsonb,"premium_reward" jsonb DEFAULT '{}'::jsonb,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_chat_messages_v16"("id" int8,"channel" text,"sender_user_id" uuid,"sender_callsign" text,"clan_id" uuid,"recipient_user_id" uuid,"recipient_callsign" text,"body" text,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."game_coupon_redemptions_v1821"("code" text,"user_id" uuid,"redeemed_at" timestamptz DEFAULT now(),"rewards_snapshot" jsonb);
CREATE TABLE public."game_coupon_redemptions_v193"("code" text,"user_id" uuid,"redeemed_at" timestamptz DEFAULT now(),"rewards_snapshot" jsonb);
CREATE TABLE public."game_coupon_reward_catalog_v193"("kind" text,"item_id" text,"name" text,"category" text,"rarity" text);
CREATE TABLE public."game_coupons_v1821"("code" text,"title" text,"rewards" jsonb,"active" bool DEFAULT true,"min_level" int4 DEFAULT 1,"max_uses" int4 DEFAULT 1,"redeemed_count" int4 DEFAULT 0,"starts_at" timestamptz DEFAULT now(),"expires_at" timestamptz,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."game_coupons_v193"("code" text,"title" text,"rewards" jsonb,"active" bool DEFAULT true,"min_level" int4 DEFAULT 1,"max_uses" int4 DEFAULT 1,"redeemed_count" int4 DEFAULT 0,"starts_at" timestamptz DEFAULT now(),"expires_at" timestamptz,"created_by" uuid,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."game_crafting_recipe_v1815"("recipe_id" text,"name" text,"description" text,"cost" int8,"currency" text DEFAULT 'credits'::text,"ingredients" jsonb DEFAULT '{}'::jsonb,"grant_payload" jsonb DEFAULT '{}'::jsonb,"output_label" text,"min_level" int4 DEFAULT 1,"enabled" bool DEFAULT true,"sort_order" int4 DEFAULT 100,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_economy_service_v1815"("service_id" text,"name" text,"description" text,"base_cost" int8,"duration_ms" int4,"level_band_size" int4 DEFAULT 5,"level_cost_scale" numeric DEFAULT 0.35,"max_stack_ms" int4 DEFAULT 21600000,"effect" jsonb DEFAULT '{}'::jsonb,"enabled" bool DEFAULT true,"sort_order" int4 DEFAULT 100,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_feature_flags_v1810"("flag_key" text,"enabled" bool DEFAULT true,"description" text,"config" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_login_sessions_v1214"("user_id" uuid,"session_id" uuid,"device_label" text,"issued_at" timestamptz DEFAULT now(),"last_seen" timestamptz DEFAULT now());
CREATE TABLE public."game_map_config_v1814"("map_id" text,"label" text,"tier" int4,"name" text,"risk" text DEFAULT 'Normal'::text,"world_w" int4,"world_h" int4,"enemy_multiplier" numeric DEFAULT 1,"ore_count" int4 DEFAULT 0,"ore_respawn_min_ms" int4 DEFAULT 5000,"ore_respawn_max_ms" int4 DEFAULT 12000,"landmark_count" int4 DEFAULT 0,"min_level" int4 DEFAULT 1,"battle" bool DEFAULT false,"gate" bool DEFAULT false,"enabled" bool DEFAULT true,"palette" jsonb DEFAULT '{}'::jsonb,"structures" jsonb DEFAULT '[]'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_map_npc_spawns_v1811"("map_id" text,"npc_key" text,"spawn_count" int4 DEFAULT 0,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_map_resource_pool_v1814"("map_id" text,"resource_key" text,"weight" numeric DEFAULT 1,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_mission_category_v1815"("category" text,"label" text,"accent" text DEFAULT '#58d9ff'::text,"reset_kind" text,"min_level" int4 DEFAULT 1,"reward_factor" numeric DEFAULT 1,"item_chance" numeric DEFAULT 0,"enabled" bool DEFAULT true,"config" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_mission_custom_v1815"("mission_id" text,"category" text,"title" text,"description" text,"tasks" jsonb DEFAULT '[]'::jsonb,"group_key" text DEFAULT 'mix'::text,"sequence" bool DEFAULT false,"reward_factor" numeric,"tag" text,"flat_reward" jsonb,"enabled" bool DEFAULT true,"sort_order" int4 DEFAULT 100,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_npc_config_v1811"("npc_key" text,"name" text,"hp" int8,"shield" int8 DEFAULT 0,"credits" int8 DEFAULT 0,"stl" int8 DEFAULT 0,"xp" int8 DEFAULT 0,"speed" numeric DEFAULT 30,"damage" int8 DEFAULT 1,"color" text DEFAULT '#ff755d'::text,"size" numeric DEFAULT 18,"resources" jsonb DEFAULT '{}'::jsonb,"respawn_min_ms" int4 DEFAULT 6000,"respawn_max_ms" int4 DEFAULT 13000,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_portal_links_v1814"("portal_key" text,"from_sector" text,"to_sector" text,"bidirectional" bool DEFAULT true,"enabled" bool DEFAULT true,"sort_order" int4 DEFAULT 100,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_presence_snapshots_v1831"("sample_minute" timestamptz,"observed_at" timestamptz DEFAULT now(),"presence_window_seconds" int4 DEFAULT 90,"players_recent" int4 DEFAULT 0,"sessions_recent" int4 DEFAULT 0,"maps_active" int4 DEFAULT 0,"same_map_pairs" int4 DEFAULT 0,"separate_map_pairs" int4 DEFAULT 0,"maps" jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public."game_resource_config_v1814"("resource_key" text,"name" text,"color" text DEFAULT '#ffffff'::text,"sell_price" int8 DEFAULT 0,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_runtime_meta_v1810"("config_key" text,"version" int8 DEFAULT 1,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_saves"("user_id" uuid,"state" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_sector_nodes_v1814"("sector_label" text,"map_id" text,"territory_faction" text,"graph_x" numeric,"graph_y" numeric,"min_level" int4 DEFAULT 1,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."game_ui_modules_v1810"("module_key" text,"parent_key" text,"label" text,"sort_order" int4 DEFAULT 100,"min_level" int4 DEFAULT 1,"enabled" bool DEFAULT true,"hide_until_level" bool DEFAULT false,"admin_only" bool DEFAULT false,"config" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."live_designs_v16"("design_id" text,"kind" text,"name" text,"rarity" text DEFAULT 'rare'::text,"enabled" bool DEFAULT true,"visual" jsonb DEFAULT '{}'::jsonb,"bonuses" jsonb DEFAULT '{}'::jsonb,"ability" jsonb,"eligibility" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."live_drop_rules_v16"("drop_key" text,"source_kind" text,"source_ref" text,"design_id" text,"chance" numeric,"enabled" bool DEFAULT true,"metadata" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."live_event_config_v16"("event_key" text,"name" text,"icon" text DEFAULT '✦'::text,"description" text DEFAULT ''::text,"enabled" bool DEFAULT true,"starts_at" timestamptz,"duration_minutes" int4,"repeat_minutes" int4,"priority" int4 DEFAULT 100,"target" int4 DEFAULT 1,"reward" jsonb DEFAULT '{}'::jsonb,"rules" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now(),"schedule_mode" text DEFAULT 'interval'::text,"weekdays" int2[] DEFAULT '{}'::smallint[],"start_local_time" time,"timezone" text DEFAULT 'America/Sao_Paulo'::text,"ends_at" timestamptz);
CREATE TABLE public."live_event_manual_override_v3411"("id" int2 DEFAULT 1,"event_key" text,"start_at" timestamptz,"end_at" timestamptz,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."live_event_weekend_backup_v341"("event_key" text,"original_row" jsonb,"backup_at" timestamptz DEFAULT now());
CREATE TABLE public."live_event_weekend_settings_v3411"("id" int2 DEFAULT 1,"enabled" bool DEFAULT true,"timezone" text DEFAULT 'America/Sao_Paulo'::text,"slots" jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."live_shop_prices_v16"("catalog_key" text,"kind" text,"ref_id" text,"price" int8,"currency" text,"enabled" bool DEFAULT true,"meta" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now(),"display_name" text,"description" text,"shop_tab" text,"shop_visible" bool DEFAULT false,"min_level" int4 DEFAULT 1,"sort_order" int4 DEFAULT 100);
CREATE TABLE public."map_event_instances_v132"("id" uuid DEFAULT gen_random_uuid(),"event_key" text,"name" text,"kind" text DEFAULT 'world_boss'::text,"map_id" text,"starts_at" timestamptz,"ends_at" timestamptz,"status" text DEFAULT 'active'::text,"config" jsonb DEFAULT '{}'::jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."player_design_inventory_v16"("user_id" uuid,"design_id" text,"quantity" int4 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."player_design_loadout_v16"("user_id" uuid,"ship_design_id" text,"pet_design_id" text,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."player_drone_designs_v16"("user_id" uuid,"drone_id" text,"design_id" text,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."player_level_milestones_v1771"("user_id" uuid,"level" int4,"reached_at" timestamptz DEFAULT now(),"play_seconds" int8 DEFAULT 0,"kills" int8 DEFAULT 0,"credits_earned" int8 DEFAULT 0,"stl_earned" int8 DEFAULT 0,"xp_earned" int8 DEFAULT 0,"credits_balance" int8 DEFAULT 0,"stl_balance" int8 DEFAULT 0);
CREATE TABLE public."player_location_v1774"("user_id" uuid,"map_id" text,"territory_faction" text,"x" float8,"y" float8,"angle" float8 DEFAULT 0,"client_saved_at" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."player_presence"("user_id" uuid,"callsign" text DEFAULT 'Pilot'::text,"map_id" text DEFAULT 'x1'::text,"x" float8 DEFAULT 0,"y" float8 DEFAULT 0,"angle" float8 DEFAULT 0,"ship_id" text DEFAULT 'phoenix'::text,"faction" text,"level" int4 DEFAULT 1,"hp" int8 DEFAULT 0,"max_hp" int8 DEFAULT 0,"shield" int8 DEFAULT 0,"max_shield" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now(),"territory_faction" text DEFAULT 'battle'::text,"pilot_title" text DEFAULT 'Piloto Estelar'::text);
CREATE TABLE public."player_telemetry_batches_v1771"("user_id" uuid,"batch_id" text,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."player_telemetry_v1771"("user_id" uuid,"sessions" int8 DEFAULT 0,"play_seconds" int8 DEFAULT 0,"kills" int8 DEFAULT 0,"boxes" int8 DEFAULT 0,"ore_nodes" int8 DEFAULT 0,"ore_units" int8 DEFAULT 0,"missions_completed" int8 DEFAULT 0,"deaths" int8 DEFAULT 0,"map_jumps" int8 DEFAULT 0,"level_ups" int8 DEFAULT 0,"credits_earned" int8 DEFAULT 0,"credits_spent" int8 DEFAULT 0,"stl_earned" int8 DEFAULT 0,"stl_spent" int8 DEFAULT 0,"xp_earned" int8 DEFAULT 0,"npc_cr" int8 DEFAULT 0,"npc_stl" int8 DEFAULT 0,"npc_xp" int8 DEFAULT 0,"mission_cr" int8 DEFAULT 0,"mission_stl" int8 DEFAULT 0,"mission_xp" int8 DEFAULT 0,"resource_cr" int8 DEFAULT 0,"resource_stl" int8 DEFAULT 0,"resource_xp" int8 DEFAULT 0,"pass_cr" int8 DEFAULT 0,"pass_stl" int8 DEFAULT 0,"pass_xp" int8 DEFAULT 0,"event_cr" int8 DEFAULT 0,"event_stl" int8 DEFAULT 0,"event_xp" int8 DEFAULT 0,"gate_cr" int8 DEFAULT 0,"gate_stl" int8 DEFAULT 0,"gate_xp" int8 DEFAULT 0,"discovery_cr" int8 DEFAULT 0,"discovery_stl" int8 DEFAULT 0,"discovery_xp" int8 DEFAULT 0,"other_cr" int8 DEFAULT 0,"other_stl" int8 DEFAULT 0,"other_xp" int8 DEFAULT 0,"last_level" int4 DEFAULT 1,"last_credits" int8 DEFAULT 0,"last_stl" int8 DEFAULT 0,"last_xp" int8 DEFAULT 0,"selected_title" text DEFAULT 'Piloto Estelar'::text,"first_seen_at" timestamptz DEFAULT now(),"last_seen_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_accounts_v12"("user_id" uuid,"premium_until" timestamptz,"battle_pass_season" text,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_catalog_v12"("id" text,"name" text,"category" text,"price_brl" numeric,"item_id" text,"quantity" int4 DEFAULT 1,"description" text,"active" bool DEFAULT true,"sort_order" int4 DEFAULT 100,"min_level" int4 DEFAULT 1,"meta" jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public."premium_checkout_policy_v1835"("channel" text,"provider" text,"checkout_flow" text,"test_only" bool DEFAULT true,"live_enabled" bool DEFAULT false,"credentials_configured" bool DEFAULT false,"webhook_configured" bool DEFAULT false,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_checkout_tests_v1832"("id" int8,"user_id" uuid,"idempotency_key" text,"product_id" text,"quoted_price_brl" numeric,"status" text DEFAULT 'simulated_paid'::text,"season_key" text,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_offers_stage_v1832"("product_id" text,"display_name" text,"category" text,"billing_mode" text,"price_brl" numeric,"duration_days" int4,"billing_months" int4,"tier_quantity" int4,"reward_plan" jsonb DEFAULT '{}'::jsonb,"display_order" int4 DEFAULT 100,"test_only" bool DEFAULT true,"live_enabled" bool DEFAULT false,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_pass_tier_tests_v1832"("user_id" uuid,"season_key" text,"purchased_tiers" int4 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_purchases_v12"("id" int8 DEFAULT nextval('premium_purchases_v12_id_seq'::regclass),"user_id" uuid,"product_id" text,"price_brl" numeric,"test_purchase" bool DEFAULT true,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."premium_subscription_tests_v1832"("user_id" uuid,"product_id" text,"status" text DEFAULT 'test_active'::text,"auto_renew" bool DEFAULT true,"started_at" timestamptz DEFAULT now(),"next_renewal_at" timestamptz,"renewal_count" int4 DEFAULT 0,"last_checkout_id" int8,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."profiles"("id" uuid,"callsign" text DEFAULT 'Pilot'::text,"faction" text,"level" int4 DEFAULT 1,"xp" int8 DEFAULT 0,"credits" int8 DEFAULT 20000,"premium" int8 DEFAULT 0,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now(),"uridium" int8 DEFAULT 0,"aliens_killed" int8 DEFAULT 0,"gg_completed" int8 DEFAULT 0);
CREATE TABLE public."pvp_attack_cooldown_v201"("attacker_user_id" uuid,"last_attack_at" timestamptz DEFAULT '-infinity'::timestamp with time zone);
CREATE TABLE public."pvp_damage_events"("id" int8,"target_user_id" uuid,"attacker_user_id" uuid,"attacker_callsign" text DEFAULT 'Pilot'::text,"damage" int8 DEFAULT 0,"shield_drain" bool DEFAULT false,"created_at" timestamptz DEFAULT now(),"consumed_at" timestamptz);
CREATE TABLE public."pvp_engagements"("id" int8,"territory_faction" text,"map_id" text,"home_user_id" uuid,"invader_user_id" uuid,"opened_at" timestamptz DEFAULT now(),"expires_at" timestamptz DEFAULT (now() + '00:10:00'::interval));
CREATE TABLE public."sl2d_catalog"("id" text,"category" text,"label" text,"description" text,"available" bool DEFAULT true);
CREATE TABLE public."sl2d_daily_claims"("user_id" uuid,"claimed_on" date,"reward" text);
CREATE TABLE public."sl2d_inventory"("user_id" uuid,"item_id" text,"amount" int4 DEFAULT 1);
CREATE TABLE public."sl2d_player_state"("user_id" uuid,"level" int4 DEFAULT 1,"xp" int8 DEFAULT 0,"power" int8 DEFAULT 100,"credits" int8 DEFAULT 5000,"hp" int4 DEFAULT 1000,"max_hp" int4 DEFAULT 1000,"shield" int4 DEFAULT 700,"max_shield" int4 DEFAULT 700,"vip" int4 DEFAULT 0,"equipped_ship" text DEFAULT 'aurora'::text,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."sl2d_profiles"("user_id" uuid,"callsign" text,"faction" text DEFAULT 'terra'::text,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."sl2d_rankings"("user_id" uuid,"callsign" text,"faction" text,"level" int4,"power" int8,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_account_reset_epochs_v478"("user_id" uuid,"epoch" int8 DEFAULT 1,"reset_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_astral_config_v381"("gate" text,"config" jsonb,"revision" int8 DEFAULT 1,"updated_at" timestamptz DEFAULT now(),"updated_by" uuid);
CREATE TABLE public."stellar_astral_cursor_v381"("user_id" uuid,"gate" text,"last_completed" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_astral_ledger_v381"("user_id" uuid,"gate" text,"completion_number" int8,"week_id" text,"first_weekly" bool DEFAULT false,"quote" jsonb,"config_revision" int8,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_astral_quote_lock_v381"("user_id" uuid,"gate" text,"completion_number" int8,"quote" jsonb,"config_revision" int8,"week_id" text,"locked_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_auction_settlements_v1182"("bid_id" int8,"user_id" uuid,"hour_key" text,"lot_ref" text,"paid_credits" int8,"award" jsonb,"save_hash" text,"settled_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_autopilot_access_v48"("user_id" uuid,"enabled" bool DEFAULT false,"source" text DEFAULT 'admin'::text,"granted_by" uuid,"updated_at" timestamptz DEFAULT now(),"expires_at" timestamptz);
CREATE TABLE public."stellar_aux_protocol_drop_receipts_v1131"("user_id" uuid,"kill_key" text,"npc_type" text,"fragment_kind" text,"qty" int4,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_aux_protocol_drop_rules_v1131"("source" text,"chance" numeric,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_aux_sentinel_coupons_v1"("code" text,"active" bool DEFAULT true,"created_at" timestamptz DEFAULT now(),"expires_at" timestamptz,"redeemed_by" uuid,"redeemed_at" timestamptz);
CREATE TABLE public."stellar_balance_backup_v81"("kind" text,"row_key" text,"original" jsonb,"saved_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_catalog_v121"("category" text,"code" text,"legacy_id" text,"display_name" text,"details" jsonb DEFAULT '{}'::jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_clan_operation_claims"("clan_id" uuid,"operation_id" text,"claimed_by" uuid,"credits" int8 DEFAULT 0,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_clan_operations"("id" text,"title" text,"metric" text,"target" int4,"vault_credits" int8 DEFAULT 0,"enabled" bool DEFAULT false,"sort_order" int4 DEFAULT 100);
CREATE TABLE public."stellar_command_receipts_v1332"("user_id" uuid,"command_id" text,"module" text,"request_hash" text,"receipt" jsonb,"committed_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_competitive_claims"("season_id" uuid,"user_id" uuid,"points" int4,"rank" int4,"credits" int4,"stl" int4,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_competitive_seasons"("id" uuid DEFAULT gen_random_uuid(),"title" text,"starts_at" timestamptz,"ends_at" timestamptz,"enabled" bool DEFAULT false,"min_points" int4 DEFAULT 10,"top_n" int4 DEFAULT 10,"reward_credits" int4 DEFAULT 0,"reward_stl" int4 DEFAULT 0,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_dominion_claims_v360"("clan_id" uuid,"claim_kind" text,"period_start" date,"actor" uuid,"credits" int8,"earned_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_dominion_rules_v360"("id" int4 DEFAULT 1,"enabled" bool DEFAULT true,"regen_hp_tick" int4 DEFAULT 3000,"regen_shield_tick" int4 DEFAULT 5000,"regen_idle_seconds" int4 DEFAULT 60,"daily_credits_per_relay" int4 DEFAULT 15000,"daily_credits_cap" int4 DEFAULT 90000,"weekly_war_actions" int4 DEFAULT 3,"weekly_credits" int4 DEFAULT 120000,"war_reward_credits" int4 DEFAULT 60000,"war_hours" int4 DEFAULT 24,"war_cooldown_hours" int4 DEFAULT 24,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_dominion_war_claims_v360"("war_id" uuid,"clan_id" uuid,"actor" uuid,"credits" int8,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_dominion_wars_v360"("id" uuid DEFAULT gen_random_uuid(),"attacker" uuid,"defender" uuid,"declared_by" uuid,"starts_at" timestamptz DEFAULT now(),"ends_at" timestamptz,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_economy_receipts_v125"("user_id" uuid,"request_id" text,"operation" text,"request_hash" text,"receipt" jsonb,"committed_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_elite_claims"("user_id" uuid,"objective_id" text,"title" text,"credits" int8 DEFAULT 0,"stl" int8 DEFAULT 0,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_elite_counters"("user_id" uuid,"npc_kills" int8 DEFAULT 0,"sector_captures" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_elite_objectives"("objective_id" text,"label" text,"title" text,"metric" text,"target" int8,"credits" int8 DEFAULT 0,"stl" int8 DEFAULT 0,"enabled" bool DEFAULT false,"sort_order" int4 DEFAULT 100,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_elite_selected_titles"("user_id" uuid,"objective_id" text,"title" text,"equipped_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_farm_push_subscriptions_v489"("id" uuid DEFAULT gen_random_uuid(),"user_id" uuid,"endpoint_hash" text,"endpoint" text,"p256dh" text,"auth" text,"enabled" bool DEFAULT true,"last_notified_session_id" uuid,"last_notified_at" timestamptz,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_frontier_claims_v370"("user_id" uuid,"contract_id" text,"week_start" date,"credits" int8,"stl" int4,"shards" int4,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_frontier_clan_claims_v370"("clan_id" uuid,"week_start" date,"actor" uuid,"credits" int4,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_frontier_contracts_v370"("id" text,"title" text,"sector" text,"min_level" int4,"task_kind" text,"target_type" text,"target_count" int4,"reward_credits" int4,"reward_stl" int4,"reward_shards" int4,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_frontier_ship_tech_v370"("user_id" uuid,"level" int4 DEFAULT 1,"shards" int4 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_live_purchase_receipts_v123"("user_id" uuid,"request_id" uuid,"catalog_key" text,"receipt" jsonb,"committed_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_natal_actions_v132"("user_id" uuid,"key" text,"receipt" jsonb DEFAULT '{}'::jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_natal_config_v132"("id" int4,"enabled" bool DEFAULT true,"starts_at" timestamptz,"ends_at" timestamptz,"goals" jsonb);
CREATE TABLE public."stellar_natal_counts_v132"("key" text,"faction" text,"kind" text,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_natal_players_v132"("user_id" uuid,"faction" text,"npc" int8 DEFAULT 0,"box" int8 DEFAULT 0,"boss" int8 DEFAULT 0,"fireworks" int4 DEFAULT 0,"last_firework" timestamptz);
CREATE TABLE public."stellar_natal_rewards_v132"("id" text,"definition" jsonb);
CREATE TABLE public."stellar_npc_reward_ledger"("user_id" uuid,"kill_key" text,"npc_type" text DEFAULT 'npc'::text,"credits" int8 DEFAULT 0,"stl" int8 DEFAULT 0,"issued_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_offline_farm_access_v488"("user_id" uuid,"enabled" bool DEFAULT false,"max_minutes" int4,"expires_at" timestamptz,"granted_by" uuid,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_offline_farm_settings_v485"("id" int2 DEFAULT 1,"max_minutes" int4 DEFAULT 240,"damage_percent" int4 DEFAULT 100,"max_kills" int4 DEFAULT 550,"travel_seconds" int4 DEFAULT 125,"updated_at" timestamptz DEFAULT now(),"max_sale_credits" int8 DEFAULT 30000000);
CREATE TABLE public."stellar_offline_farm_v484"("id" uuid DEFAULT gen_random_uuid(),"user_id" uuid,"status" text DEFAULT 'running'::text,"map_id" text,"npc_key" text,"ammo_key" text,"minutes" int4,"auto_sell" bool DEFAULT true,"auto_buy" bool DEFAULT true,"mine" bool DEFAULT true,"snapshot" jsonb,"baseline_save_at" timestamptz,"started_at" timestamptz DEFAULT now(),"ends_at" timestamptz,"completed_at" timestamptz,"report" jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_ore_reward_ledger"("user_id" uuid,"ore_key" text,"resource" text,"amount" int4,"issued_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_player_save_abc_v118"("user_id" uuid,"slot" bpchar,"state" jsonb,"save_updated_at" timestamptz,"state_hash" text,"captured_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_player_save_checkpoint_v119"("user_id" uuid,"slot" bpchar,"revision" int8,"state" jsonb,"state_hash" text,"captured_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_player_save_head_v119"("user_id" uuid,"revision" int8 DEFAULT 0,"state_hash" text,"changed_at" timestamptz DEFAULT clock_timestamp(),"checkpointed_at" timestamptz,"journaled_at" timestamptz);
CREATE TABLE public."stellar_player_save_journal_v119"("journal_id" int8,"user_id" uuid,"revision" int8,"modules" text[] DEFAULT ARRAY['geral'::text],"before_hash" text,"after_hash" text,"created_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_player_save_operation_v119"("user_id" uuid,"operation_id" uuid,"module" text,"action" text,"request_hash" text,"result" jsonb,"revision" int8,"committed_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_pre_v118_backup_20261103"("user_id" uuid,"callsign" text,"game_state" jsonb,"save_updated_at" timestamptz,"profile_snapshot" jsonb,"state_hash" text,"captured_at" timestamptz DEFAULT clock_timestamp());
CREATE TABLE public."stellar_pre_v119_accounts_20261104"("user_id" uuid,"callsign" text,"game_state" jsonb,"save_updated_at" timestamptz,"profile_snapshot" jsonb,"state_hash" text,"captured_at" timestamptz);
CREATE TABLE public."stellar_pre_v119_farms_20261104"("id" uuid,"user_id" uuid,"status" text,"map_id" text,"npc_key" text,"ammo_key" text,"minutes" int4,"auto_sell" bool,"auto_buy" bool,"mine" bool,"snapshot" jsonb,"baseline_save_at" timestamptz,"started_at" timestamptz,"ends_at" timestamptz,"completed_at" timestamptz,"report" jsonb,"created_at" timestamptz,"archived_at" timestamptz);
CREATE TABLE public."stellar_pre_v119_npc_ledger_20261104"("user_id" uuid,"kill_key" text,"npc_type" text,"credits" int8,"stl" int8,"issued_at" timestamptz,"archived_at" timestamptz);
CREATE TABLE public."stellar_pre_v119_ore_ledger_20261104"("user_id" uuid,"ore_key" text,"resource" text,"amount" int4,"issued_at" timestamptz,"archived_at" timestamptz);
CREATE TABLE public."stellar_relay_audit_v346"("id" int8,"actor" uuid,"clan_id" uuid,"action" text,"module_id" uuid,"map_id" text,"node_id" text,"details" jsonb DEFAULT '{}'::jsonb,"at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_clan_parts_v346"("clan_id" uuid,"part_type" text,"quantity" int4 DEFAULT 0);
CREATE TABLE public."stellar_relay_clan_pve_v346"("clan_id" uuid,"period_start" date,"npc_kills" int8 DEFAULT 0,"ore_collections" int8 DEFAULT 0);
CREATE TABLE public."stellar_relay_fortification_audit_v350"("id" int8,"actor" uuid,"clan_id" uuid,"map_id" text,"node_id" text,"previous_level" int4,"new_level" int4,"credits_spent" int8,"parts_each_used" int4,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_fortification_tiers_v350"("level" int4,"hp_bonus" int8 DEFAULT 0,"shield_bonus" int8 DEFAULT 0,"parts_each" int4 DEFAULT 0,"credits" int8 DEFAULT 0,"min_clan_level" int4 DEFAULT 1,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_fortifications_v350"("map_id" text,"node_id" text,"level" int4 DEFAULT 1,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_mission_claims_v346"("clan_id" uuid,"mission_id" text,"period_start" date,"actor" uuid,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_module_balance_v3463"("category" text,"attribute" text,"level" int4,"damage" int4 DEFAULT 0,"cooldown_ms" int4 DEFAULT 0,"shield_bonus" int4 DEFAULT 0,"hp_bonus" int4 DEFAULT 0,"bonus_pct" numeric DEFAULT 0,"parts" int4,"credits" int8,"min_clan_level" int4,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_modules_v346"("id" uuid DEFAULT gen_random_uuid(),"clan_id" uuid,"category" text,"attribute" text,"level" int4 DEFAULT 1,"map_id" text,"node_id" text,"slot" int2,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_pve_events_v346"("event_key" text,"actor" uuid,"recorded_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_rules_v346"("id" int4 DEFAULT 1,"enabled" bool DEFAULT true,"max_shield" int8 DEFAULT 500000,"max_hp" int8 DEFAULT 500000,"hit_damage" int4 DEFAULT 12000,"hit_cooldown_ms" int4 DEFAULT 650,"capture_ms" int4 DEFAULT 8000,"protection_ms" int4 DEFAULT 90000,"weekend_multiplier" numeric DEFAULT 1.2,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_relay_state_v346"("map_id" text,"node_id" text,"owner_clan_id" uuid,"hp" int8 DEFAULT 500000,"shield" int8 DEFAULT 500000,"max_hp" int8 DEFAULT 500000,"max_shield" int8 DEFAULT 500000,"protected_until" timestamptz,"last_hit_at" timestamptz,"revision" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_save_clock_v133"("user_id" uuid,"revision" int8,"updated_at" timestamptz,"writer" text);
CREATE TABLE public."stellar_save_receipts_v133"("user_id" uuid,"operation_id" uuid,"request_hash" text,"receipt" jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_security_events"("id" int8 DEFAULT nextval('stellar_security_events_id_seq'::regclass),"user_id" uuid,"code" text,"severity" text,"context" jsonb DEFAULT '{}'::jsonb,"created_at" timestamptz DEFAULT now(),"auto_suspended" bool DEFAULT false,"reviewed_at" timestamptz,"reviewed_by" uuid,"review_note" text);
CREATE TABLE public."stellar_ship_design_selection_v132"("user_id" uuid,"ship_id" text,"design_id" text);
CREATE TABLE public."stellar_ship_v50_save_backup"("user_id" uuid,"previous_state" jsonb,"backed_up_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_ship_v50_shop_backup"("catalog_key" text,"was_enabled" bool,"was_visible" bool,"backed_up_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u423_loadouts"("user_id" uuid,"config" int2,"slot" text,"item" text,"equipped_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u423_module_rules"("item" text,"slot" text,"proposed_bonus" jsonb DEFAULT '{}'::jsonb,"combat_enabled" bool DEFAULT false,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u423_ops_claims"("user_id" uuid,"week_start" date,"tier" int2,"squad_id" uuid,"personal_kills" int8,"team_kills" int8,"granted_research" int4,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u423_ops_config"("tier" int2,"goal_kills" int4,"personal_min" int4,"research_points" int4,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u426_clan_donations"("id" int8,"user_id" uuid,"clan_id" uuid,"structure" text,"research_points" int4,"request_id" uuid,"donated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u426_clan_funding"("clan_id" uuid,"structure" text,"research_total" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u426_clan_rules"("structure" text,"title" text,"research_goal" int4,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u426_market_offers"("id" uuid DEFAULT gen_random_uuid(),"seller" uuid,"buyer" uuid,"item" text,"quantity" int4,"unit_price" int8,"fee_credits" int8 DEFAULT 0,"status" text DEFAULT 'open'::text,"request_id" uuid,"listed_at" timestamptz DEFAULT now(),"closed_at" timestamptz);
CREATE TABLE public."stellar_u426_market_rules"("id" int4 DEFAULT 1,"fee_bps" int4 DEFAULT 300,"enabled" bool DEFAULT false,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u426_sector_runs"("id" uuid DEFAULT gen_random_uuid(),"user_id" uuid,"sector" text,"started_at" timestamptz DEFAULT now(),"ready_at" timestamptz,"kills_required" int4,"research_reward" int4,"claimed_at" timestamptz,"created_request" uuid);
CREATE TABLE public."stellar_u426_sectors"("code" text,"title" text,"lore" text DEFAULT ''::text,"minutes" int4,"kills_required" int4,"research_cost" int4,"research_reward" int4,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_actions"("user_id" uuid,"request_id" uuid,"action" text,"result" jsonb,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_catalog"("code" text,"kind" text,"title" text,"rule" jsonb,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_donations"("id" int8,"user_id" uuid,"faction" text,"project_code" text,"quantity" int4,"donated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_expeditions"("id" uuid DEFAULT gen_random_uuid(),"user_id" uuid,"code" text,"started_at" timestamptz DEFAULT now(),"ready_at" timestamptz,"reward_points" int4,"claimed_at" timestamptz);
CREATE TABLE public."stellar_u42_inventory"("user_id" uuid,"item" text,"quantity" int8 DEFAULT 0);
CREATE TABLE public."stellar_u42_material_spends"("user_id" uuid,"request_id" uuid,"material" text,"quantity" int8,"spent_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_research"("user_id" uuid,"points" int8 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_squad_members"("user_id" uuid,"squad_id" uuid,"joined_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_squad_objective_claims_v421"("user_id" uuid,"week_start" date,"squad_id" uuid,"credited_kills" int8,"granted_research" int4,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_squad_objective_config_v421"("id" int2 DEFAULT 1,"weekly_kills" int4 DEFAULT 100,"minimum_player_kills" int4 DEFAULT 10,"research_points" int4 DEFAULT 60,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u42_squads"("id" uuid DEFAULT gen_random_uuid(),"invite_code" text,"faction" text,"owner_id" uuid,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u435_raid_claims"("user_id" uuid,"week_start" date,"squad_id" uuid,"personal_kills" int8,"squad_kills" int8,"reward" int4,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u435_raid_config"("id" int4 DEFAULT 1,"target_kills" int4 DEFAULT 3,"min_player_kills" int4 DEFAULT 1,"research_reward" int4 DEFAULT 120,"enabled" bool DEFAULT true,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_u440_admin_test_grants"("id" int8,"user_id" uuid,"item" text,"quantity" int4,"created_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_v113_balance_backup"("source_name" text,"key" text,"old_row" jsonb,"captured_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_war_actions"("id" int8,"occurred_at" timestamptz DEFAULT now(),"campaign_id" uuid,"kind" text,"map_id" text,"node_id" text,"faction" text,"former_owner" text,"actor_user_id" uuid,"points" int4 DEFAULT 0,"clan_id" uuid);
CREATE TABLE public."stellar_war_campaign_claims"("campaign_id" uuid,"user_id" uuid,"faction" text,"points" int4,"victorious" bool,"credits" int8,"stl" int8,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_war_campaigns"("id" uuid DEFAULT gen_random_uuid(),"title" text,"starts_at" timestamptz,"ends_at" timestamptz,"enabled" bool DEFAULT false,"min_points" int4 DEFAULT 10,"reward_credits" int4 DEFAULT 2500,"reward_stl" int4 DEFAULT 10,"created_at" timestamptz DEFAULT now(),"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_war_defense_cooldowns"("user_id" uuid,"map_id" text,"node_id" text,"defended_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_war_rules"("id" int4 DEFAULT 1,"daily_credits_per_node" int4 DEFAULT 400,"daily_credits_cap" int4 DEFAULT 2800,"capture_points" int4 DEFAULT 10,"defense_points" int4 DEFAULT 3,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_war_scores"("campaign_id" uuid,"user_id" uuid,"faction" text,"captures" int4 DEFAULT 0,"defenses" int4 DEFAULT 0,"points" int4 DEFAULT 0,"updated_at" timestamptz DEFAULT now(),"clan_id" uuid);
CREATE TABLE public."stellar_war_supply_claims"("user_id" uuid,"claim_day" date,"faction" text,"owned_nodes" int4,"credits" int8,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."stellar_warbot_events_v477"("map_id" text,"enabled" bool DEFAULT false,"mode" text DEFAULT 'training'::text,"bots_per_faction" int4 DEFAULT 2,"tier" int4 DEFAULT 1,"attack_players" bool DEFAULT false,"ends_at" timestamptz,"updated_at" timestamptz DEFAULT now(),"updated_by" uuid);
CREATE TABLE public."stellar_warfront_nodes"("map_id" text,"node_id" text,"owner" text,"revision" int8 DEFAULT 0,"captured_at" timestamptz,"captured_by" uuid);
CREATE TABLE public."stellar_world_directives"("id" int8,"title" text,"description" text DEFAULT ''::text,"map_id" text DEFAULT 'all'::text,"category" text DEFAULT 'alert'::text,"starts_at" timestamptz,"ends_at" timestamptz,"enabled" bool DEFAULT false,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."world_boss_claims_v131"("boss_id" text,"user_id" uuid,"claimed_at" timestamptz DEFAULT now());
CREATE TABLE public."world_boss_contrib_v131"("boss_id" text,"user_id" uuid,"clan_id" uuid,"damage" int8 DEFAULT 0,"hits" int4 DEFAULT 0,"updated_at" timestamptz DEFAULT now());
CREATE TABLE public."world_boss_v131"("id" text,"name" text DEFAULT 'NEMESIS PRIME'::text,"max_hp" int8,"hp" int8,"spawn_at" timestamptz DEFAULT now(),"ends_at" timestamptz,"defeated_at" timestamptz,"created_at" timestamptz DEFAULT now());
ALTER TABLE public."account_moderation_v1763" ADD CONSTRAINT "account_moderation_v1763_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."admin_action_log_v1763" ADD CONSTRAINT "admin_action_log_v1763_pkey" PRIMARY KEY (id);
ALTER TABLE public."arena_battles" ADD CONSTRAINT "arena_battles_pkey" PRIMARY KEY (id);
ALTER TABLE public."arena_daily" ADD CONSTRAINT "arena_daily_pkey" PRIMARY KEY (user_id, battle_date);
ALTER TABLE public."arena_daily_rewards" ADD CONSTRAINT "arena_daily_rewards_pkey" PRIMARY KEY (user_id, reward_date);
ALTER TABLE public."arena_profiles" ADD CONSTRAINT "arena_profiles_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."arena_stats" ADD CONSTRAINT "arena_stats_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."auction_bids" ADD CONSTRAINT "auction_bids_pkey" PRIMARY KEY (id);
ALTER TABLE public."auction_bids" ADD CONSTRAINT "auction_bids_user_id_hour_key_lot_ref_key" UNIQUE (user_id, hour_key, lot_ref);
ALTER TABLE public."battle_group_invites_v179" ADD CONSTRAINT "battle_group_invites_v179_pkey" PRIMARY KEY (id);
ALTER TABLE public."battle_group_members_v179" ADD CONSTRAINT "battle_group_members_v179_pkey" PRIMARY KEY (group_id, user_id);
ALTER TABLE public."battle_group_members_v179" ADD CONSTRAINT "battle_group_members_v179_user_id_key" UNIQUE (user_id);
ALTER TABLE public."battle_groups_v179" ADD CONSTRAINT "battle_groups_v179_pkey" PRIMARY KEY (id);
ALTER TABLE public."bonus_box_config_v1825" ADD CONSTRAINT "bonus_box_config_v1825_pkey" PRIMARY KEY (id);
ALTER TABLE public."clan_credit_grants" ADD CONSTRAINT "clan_credit_grants_pkey" PRIMARY KEY (id);
ALTER TABLE public."clan_join_requests_v19" ADD CONSTRAINT "clan_join_requests_v19_pkey" PRIMARY KEY (id);
ALTER TABLE public."clan_join_requests_v19" ADD CONSTRAINT "clan_join_requests_v19_user_id_clan_id_key" UNIQUE (user_id, clan_id);
ALTER TABLE public."clan_map_domination_results_v132" ADD CONSTRAINT "clan_map_domination_results_v132_pkey" PRIMARY KEY (event_id);
ALTER TABLE public."clan_map_domination_scores_v132" ADD CONSTRAINT "clan_map_domination_scores_v132_pkey" PRIMARY KEY (event_id, clan_id);
ALTER TABLE public."clan_map_ownership_v132" ADD CONSTRAINT "clan_map_ownership_v132_pkey" PRIMARY KEY (map_id);
ALTER TABLE public."clan_members" ADD CONSTRAINT "clan_members_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."clan_transactions" ADD CONSTRAINT "clan_transactions_pkey" PRIMARY KEY (id);
ALTER TABLE public."clan_war_contrib_v131" ADD CONSTRAINT "clan_war_contrib_v131_pkey" PRIMARY KEY (war_id, user_id);
ALTER TABLE public."clan_wars_v131" ADD CONSTRAINT "clan_wars_v131_pkey" PRIMARY KEY (id);
ALTER TABLE public."clans" ADD CONSTRAINT "clans_pkey" PRIMARY KEY (id);
ALTER TABLE public."designer_drop_claims_v16" ADD CONSTRAINT "designer_drop_claims_v16_pkey" PRIMARY KEY (user_id, claim_key);
ALTER TABLE public."galaxy_event_progress_v1826" ADD CONSTRAINT "galaxy_event_progress_v1826_pkey" PRIMARY KEY (user_id, event_id);
ALTER TABLE public."galaxy_gate_config_v1906" ADD CONSTRAINT "galaxy_gate_config_v1906_pkey" PRIMARY KEY (id);
ALTER TABLE public."game_admins" ADD CONSTRAINT "game_admins_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."game_auction_rules_v1908" ADD CONSTRAINT "game_auction_rules_v1908_pkey" PRIMARY KEY (id);
ALTER TABLE public."game_balance_entries_v1909" ADD CONSTRAINT "game_balance_entries_v1909_pkey" PRIMARY KEY (kind, item_id);
ALTER TABLE public."game_balance_event_backup_v1917" ADD CONSTRAINT "game_balance_event_backup_v1917_pkey" PRIMARY KEY (kind, item_id);
ALTER TABLE public."game_balance_meta_v1909" ADD CONSTRAINT "game_balance_meta_v1909_pkey" PRIMARY KEY (id);
ALTER TABLE public."game_battle_pass_seasons_v1817b" ADD CONSTRAINT "game_battle_pass_seasons_v1817b_pkey" PRIMARY KEY (season_key);
ALTER TABLE public."game_battle_pass_tiers_v1817b" ADD CONSTRAINT "game_battle_pass_tiers_v1817b_pkey" PRIMARY KEY (season_key, tier_no);
ALTER TABLE public."game_chat_messages_v16" ADD CONSTRAINT "game_chat_messages_v16_pkey" PRIMARY KEY (id);
ALTER TABLE public."game_coupon_redemptions_v1821" ADD CONSTRAINT "game_coupon_redemptions_v1821_pkey" PRIMARY KEY (code, user_id);
ALTER TABLE public."game_coupon_redemptions_v193" ADD CONSTRAINT "game_coupon_redemptions_v193_pkey" PRIMARY KEY (code, user_id);
ALTER TABLE public."game_coupon_reward_catalog_v193" ADD CONSTRAINT "game_coupon_reward_catalog_v193_pkey" PRIMARY KEY (kind, item_id);
ALTER TABLE public."game_coupons_v1821" ADD CONSTRAINT "game_coupons_v1821_pkey" PRIMARY KEY (code);
ALTER TABLE public."game_coupons_v193" ADD CONSTRAINT "game_coupons_v193_pkey" PRIMARY KEY (code);
ALTER TABLE public."game_crafting_recipe_v1815" ADD CONSTRAINT "game_crafting_recipe_v1815_pkey" PRIMARY KEY (recipe_id);
ALTER TABLE public."game_economy_service_v1815" ADD CONSTRAINT "game_economy_service_v1815_pkey" PRIMARY KEY (service_id);
ALTER TABLE public."game_feature_flags_v1810" ADD CONSTRAINT "game_feature_flags_v1810_pkey" PRIMARY KEY (flag_key);
ALTER TABLE public."game_login_sessions_v1214" ADD CONSTRAINT "game_login_sessions_v1214_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."game_map_config_v1814" ADD CONSTRAINT "game_map_config_v1814_pkey" PRIMARY KEY (map_id);
ALTER TABLE public."game_map_npc_spawns_v1811" ADD CONSTRAINT "game_map_npc_spawns_v1811_pkey" PRIMARY KEY (map_id, npc_key);
ALTER TABLE public."game_map_resource_pool_v1814" ADD CONSTRAINT "game_map_resource_pool_v1814_pkey" PRIMARY KEY (map_id, resource_key);
ALTER TABLE public."game_mission_category_v1815" ADD CONSTRAINT "game_mission_category_v1815_pkey" PRIMARY KEY (category);
ALTER TABLE public."game_mission_custom_v1815" ADD CONSTRAINT "game_mission_custom_v1815_pkey" PRIMARY KEY (mission_id);
ALTER TABLE public."game_npc_config_v1811" ADD CONSTRAINT "game_npc_config_v1811_pkey" PRIMARY KEY (npc_key);
ALTER TABLE public."game_portal_links_v1814" ADD CONSTRAINT "game_portal_links_v1814_pkey" PRIMARY KEY (portal_key);
ALTER TABLE public."game_presence_snapshots_v1831" ADD CONSTRAINT "game_presence_snapshots_v1831_pkey" PRIMARY KEY (sample_minute);
ALTER TABLE public."game_resource_config_v1814" ADD CONSTRAINT "game_resource_config_v1814_pkey" PRIMARY KEY (resource_key);
ALTER TABLE public."game_runtime_meta_v1810" ADD CONSTRAINT "game_runtime_meta_v1810_pkey" PRIMARY KEY (config_key);
ALTER TABLE public."game_saves" ADD CONSTRAINT "game_saves_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."game_sector_nodes_v1814" ADD CONSTRAINT "game_sector_nodes_v1814_pkey" PRIMARY KEY (sector_label);
ALTER TABLE public."game_ui_modules_v1810" ADD CONSTRAINT "game_ui_modules_v1810_pkey" PRIMARY KEY (module_key);
ALTER TABLE public."live_designs_v16" ADD CONSTRAINT "live_designs_v16_pkey" PRIMARY KEY (design_id);
ALTER TABLE public."live_drop_rules_v16" ADD CONSTRAINT "live_drop_rules_v16_pkey" PRIMARY KEY (drop_key);
ALTER TABLE public."live_event_config_v16" ADD CONSTRAINT "live_event_config_v16_pkey" PRIMARY KEY (event_key);
ALTER TABLE public."live_event_manual_override_v3411" ADD CONSTRAINT "live_event_manual_override_v3411_pkey" PRIMARY KEY (id);
ALTER TABLE public."live_event_weekend_backup_v341" ADD CONSTRAINT "live_event_weekend_backup_v341_pkey" PRIMARY KEY (event_key);
ALTER TABLE public."live_event_weekend_settings_v3411" ADD CONSTRAINT "live_event_weekend_settings_v3411_pkey" PRIMARY KEY (id);
ALTER TABLE public."live_shop_prices_v16" ADD CONSTRAINT "live_shop_prices_v16_pkey" PRIMARY KEY (catalog_key);
ALTER TABLE public."map_event_instances_v132" ADD CONSTRAINT "map_event_instances_v132_event_key_starts_at_key" UNIQUE (event_key, starts_at);
ALTER TABLE public."map_event_instances_v132" ADD CONSTRAINT "map_event_instances_v132_pkey" PRIMARY KEY (id);
ALTER TABLE public."player_design_inventory_v16" ADD CONSTRAINT "player_design_inventory_v16_pkey" PRIMARY KEY (user_id, design_id);
ALTER TABLE public."player_design_loadout_v16" ADD CONSTRAINT "player_design_loadout_v16_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."player_drone_designs_v16" ADD CONSTRAINT "player_drone_designs_v16_pkey" PRIMARY KEY (user_id, drone_id);
ALTER TABLE public."player_level_milestones_v1771" ADD CONSTRAINT "player_level_milestones_v1771_pkey" PRIMARY KEY (user_id, level);
ALTER TABLE public."player_location_v1774" ADD CONSTRAINT "player_location_v1774_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."player_presence" ADD CONSTRAINT "player_presence_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."player_telemetry_batches_v1771" ADD CONSTRAINT "player_telemetry_batches_v1771_pkey" PRIMARY KEY (user_id, batch_id);
ALTER TABLE public."player_telemetry_v1771" ADD CONSTRAINT "player_telemetry_v1771_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."premium_accounts_v12" ADD CONSTRAINT "premium_accounts_v12_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."premium_catalog_v12" ADD CONSTRAINT "premium_catalog_v12_pkey" PRIMARY KEY (id);
ALTER TABLE public."premium_checkout_policy_v1835" ADD CONSTRAINT "premium_checkout_policy_v1835_pkey" PRIMARY KEY (channel);
ALTER TABLE public."premium_checkout_tests_v1832" ADD CONSTRAINT "premium_checkout_tests_v1832_pkey" PRIMARY KEY (id);
ALTER TABLE public."premium_checkout_tests_v1832" ADD CONSTRAINT "premium_checkout_tests_v1832_user_id_idempotency_key_key" UNIQUE (user_id, idempotency_key);
ALTER TABLE public."premium_offers_stage_v1832" ADD CONSTRAINT "premium_offers_stage_v1832_pkey" PRIMARY KEY (product_id);
ALTER TABLE public."premium_pass_tier_tests_v1832" ADD CONSTRAINT "premium_pass_tier_tests_v1832_pkey" PRIMARY KEY (user_id, season_key);
ALTER TABLE public."premium_purchases_v12" ADD CONSTRAINT "premium_purchases_v12_pkey" PRIMARY KEY (id);
ALTER TABLE public."premium_subscription_tests_v1832" ADD CONSTRAINT "premium_subscription_tests_v1832_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."pvp_attack_cooldown_v201" ADD CONSTRAINT "pvp_attack_cooldown_v201_pkey" PRIMARY KEY (attacker_user_id);
ALTER TABLE public."pvp_damage_events" ADD CONSTRAINT "pvp_damage_events_pkey" PRIMARY KEY (id);
ALTER TABLE public."pvp_engagements" ADD CONSTRAINT "pvp_engagements_pkey" PRIMARY KEY (id);
ALTER TABLE public."pvp_engagements" ADD CONSTRAINT "pvp_engagements_territory_faction_map_id_home_user_id_invad_key" UNIQUE (territory_faction, map_id, home_user_id, invader_user_id);
ALTER TABLE public."sl2d_catalog" ADD CONSTRAINT "sl2d_catalog_pkey" PRIMARY KEY (id);
ALTER TABLE public."sl2d_daily_claims" ADD CONSTRAINT "sl2d_daily_claims_pkey" PRIMARY KEY (user_id, claimed_on);
ALTER TABLE public."sl2d_inventory" ADD CONSTRAINT "sl2d_inventory_pkey" PRIMARY KEY (user_id, item_id);
ALTER TABLE public."sl2d_player_state" ADD CONSTRAINT "sl2d_player_state_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."sl2d_profiles" ADD CONSTRAINT "sl2d_profiles_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."sl2d_rankings" ADD CONSTRAINT "sl2d_rankings_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_account_reset_epochs_v478" ADD CONSTRAINT "stellar_account_reset_epochs_v478_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_astral_config_v381" ADD CONSTRAINT "stellar_astral_config_v381_pkey" PRIMARY KEY (gate);
ALTER TABLE public."stellar_astral_cursor_v381" ADD CONSTRAINT "stellar_astral_cursor_v381_pkey" PRIMARY KEY (user_id, gate);
ALTER TABLE public."stellar_astral_ledger_v381" ADD CONSTRAINT "stellar_astral_ledger_v381_pkey" PRIMARY KEY (user_id, gate, completion_number);
ALTER TABLE public."stellar_astral_quote_lock_v381" ADD CONSTRAINT "stellar_astral_quote_lock_v381_pkey" PRIMARY KEY (user_id, gate, completion_number);
ALTER TABLE public."stellar_auction_settlements_v1182" ADD CONSTRAINT "stellar_auction_settlements_v1182_pkey" PRIMARY KEY (bid_id);
ALTER TABLE public."stellar_autopilot_access_v48" ADD CONSTRAINT "stellar_autopilot_access_v48_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_aux_protocol_drop_receipts_v1131" ADD CONSTRAINT "stellar_aux_protocol_drop_receipts_v1131_pkey" PRIMARY KEY (user_id, kill_key);
ALTER TABLE public."stellar_aux_protocol_drop_rules_v1131" ADD CONSTRAINT "stellar_aux_protocol_drop_rules_v1131_pkey" PRIMARY KEY (source);
ALTER TABLE public."stellar_aux_sentinel_coupons_v1" ADD CONSTRAINT "stellar_aux_sentinel_coupons_v1_pkey" PRIMARY KEY (code);
ALTER TABLE public."stellar_balance_backup_v81" ADD CONSTRAINT "stellar_balance_backup_v81_pkey" PRIMARY KEY (kind, row_key);
ALTER TABLE public."stellar_catalog_v121" ADD CONSTRAINT "stellar_catalog_v121_category_legacy_id_key" UNIQUE (category, legacy_id);
ALTER TABLE public."stellar_catalog_v121" ADD CONSTRAINT "stellar_catalog_v121_pkey" PRIMARY KEY (category, code);
ALTER TABLE public."stellar_clan_operation_claims" ADD CONSTRAINT "stellar_clan_operation_claims_pkey" PRIMARY KEY (clan_id, operation_id);
ALTER TABLE public."stellar_clan_operations" ADD CONSTRAINT "stellar_clan_operations_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_command_receipts_v1332" ADD CONSTRAINT "stellar_command_receipts_v1332_pkey" PRIMARY KEY (user_id, command_id);
ALTER TABLE public."stellar_competitive_claims" ADD CONSTRAINT "stellar_competitive_claims_pkey" PRIMARY KEY (season_id, user_id);
ALTER TABLE public."stellar_competitive_seasons" ADD CONSTRAINT "stellar_competitive_seasons_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_dominion_claims_v360" ADD CONSTRAINT "stellar_dominion_claims_v360_pkey" PRIMARY KEY (clan_id, claim_kind, period_start);
ALTER TABLE public."stellar_dominion_rules_v360" ADD CONSTRAINT "stellar_dominion_rules_v360_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_dominion_war_claims_v360" ADD CONSTRAINT "stellar_dominion_war_claims_v360_pkey" PRIMARY KEY (war_id);
ALTER TABLE public."stellar_dominion_wars_v360" ADD CONSTRAINT "stellar_dominion_wars_v360_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_economy_receipts_v125" ADD CONSTRAINT "stellar_economy_receipts_v125_pkey" PRIMARY KEY (user_id, request_id);
ALTER TABLE public."stellar_elite_claims" ADD CONSTRAINT "stellar_elite_claims_pkey" PRIMARY KEY (user_id, objective_id);
ALTER TABLE public."stellar_elite_counters" ADD CONSTRAINT "stellar_elite_counters_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_elite_objectives" ADD CONSTRAINT "stellar_elite_objectives_pkey" PRIMARY KEY (objective_id);
ALTER TABLE public."stellar_elite_selected_titles" ADD CONSTRAINT "stellar_elite_selected_titles_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_farm_push_subscriptions_v489" ADD CONSTRAINT "stellar_farm_push_subscriptions_v489_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_farm_push_subscriptions_v489" ADD CONSTRAINT "stellar_farm_push_subscriptions_v489_user_id_endpoint_hash_key" UNIQUE (user_id, endpoint_hash);
ALTER TABLE public."stellar_frontier_claims_v370" ADD CONSTRAINT "stellar_frontier_claims_v370_pkey" PRIMARY KEY (user_id, contract_id, week_start);
ALTER TABLE public."stellar_frontier_clan_claims_v370" ADD CONSTRAINT "stellar_frontier_clan_claims_v370_pkey" PRIMARY KEY (clan_id, week_start);
ALTER TABLE public."stellar_frontier_contracts_v370" ADD CONSTRAINT "stellar_frontier_contracts_v370_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_frontier_ship_tech_v370" ADD CONSTRAINT "stellar_frontier_ship_tech_v370_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_live_purchase_receipts_v123" ADD CONSTRAINT "stellar_live_purchase_receipts_v123_pkey" PRIMARY KEY (user_id, request_id);
ALTER TABLE public."stellar_natal_actions_v132" ADD CONSTRAINT "stellar_natal_actions_v132_pkey" PRIMARY KEY (user_id, key);
ALTER TABLE public."stellar_natal_config_v132" ADD CONSTRAINT "stellar_natal_config_v132_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_natal_counts_v132" ADD CONSTRAINT "stellar_natal_counts_v132_pkey" PRIMARY KEY (key);
ALTER TABLE public."stellar_natal_players_v132" ADD CONSTRAINT "stellar_natal_players_v132_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_natal_rewards_v132" ADD CONSTRAINT "stellar_natal_rewards_v132_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_npc_reward_ledger" ADD CONSTRAINT "stellar_npc_reward_ledger_pkey" PRIMARY KEY (user_id, kill_key);
ALTER TABLE public."stellar_offline_farm_access_v488" ADD CONSTRAINT "stellar_offline_farm_access_v488_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_offline_farm_settings_v485" ADD CONSTRAINT "stellar_offline_farm_settings_v485_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_offline_farm_v484" ADD CONSTRAINT "stellar_offline_farm_v484_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_ore_reward_ledger" ADD CONSTRAINT "stellar_ore_reward_ledger_pkey" PRIMARY KEY (user_id, ore_key);
ALTER TABLE public."stellar_player_save_abc_v118" ADD CONSTRAINT "stellar_player_save_abc_v118_pkey" PRIMARY KEY (user_id, slot);
ALTER TABLE public."stellar_player_save_checkpoint_v119" ADD CONSTRAINT "stellar_player_save_checkpoint_v119_pkey" PRIMARY KEY (user_id, slot);
ALTER TABLE public."stellar_player_save_head_v119" ADD CONSTRAINT "stellar_player_save_head_v119_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_player_save_journal_v119" ADD CONSTRAINT "save_v119_journal_unique" UNIQUE (user_id, revision);
ALTER TABLE public."stellar_player_save_journal_v119" ADD CONSTRAINT "stellar_player_save_journal_v119_pkey" PRIMARY KEY (journal_id);
ALTER TABLE public."stellar_player_save_operation_v119" ADD CONSTRAINT "stellar_player_save_operation_v119_pkey" PRIMARY KEY (user_id, operation_id);
ALTER TABLE public."stellar_pre_v118_backup_20261103" ADD CONSTRAINT "stellar_pre_v118_backup_20261103_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_relay_audit_v346" ADD CONSTRAINT "stellar_relay_audit_v346_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_relay_clan_parts_v346" ADD CONSTRAINT "stellar_relay_clan_parts_v346_pkey" PRIMARY KEY (clan_id, part_type);
ALTER TABLE public."stellar_relay_clan_pve_v346" ADD CONSTRAINT "stellar_relay_clan_pve_v346_pkey" PRIMARY KEY (clan_id, period_start);
ALTER TABLE public."stellar_relay_fortification_audit_v350" ADD CONSTRAINT "stellar_relay_fortification_audit_v350_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_relay_fortification_tiers_v350" ADD CONSTRAINT "stellar_relay_fortification_tiers_v350_pkey" PRIMARY KEY (level);
ALTER TABLE public."stellar_relay_fortifications_v350" ADD CONSTRAINT "stellar_relay_fortifications_v350_pkey" PRIMARY KEY (map_id, node_id);
ALTER TABLE public."stellar_relay_mission_claims_v346" ADD CONSTRAINT "stellar_relay_mission_claims_v346_pkey" PRIMARY KEY (clan_id, mission_id, period_start);
ALTER TABLE public."stellar_relay_module_balance_v3463" ADD CONSTRAINT "stellar_relay_module_balance_v3463_pkey" PRIMARY KEY (category, attribute, level);
ALTER TABLE public."stellar_relay_modules_v346" ADD CONSTRAINT "stellar_relay_modules_v346_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_relay_pve_events_v346" ADD CONSTRAINT "stellar_relay_pve_events_v346_pkey" PRIMARY KEY (event_key);
ALTER TABLE public."stellar_relay_rules_v346" ADD CONSTRAINT "stellar_relay_rules_v346_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_relay_state_v346" ADD CONSTRAINT "stellar_relay_state_v346_pkey" PRIMARY KEY (map_id, node_id);
ALTER TABLE public."stellar_save_clock_v133" ADD CONSTRAINT "stellar_save_clock_v133_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_save_receipts_v133" ADD CONSTRAINT "stellar_save_receipts_v133_pkey" PRIMARY KEY (user_id, operation_id);
ALTER TABLE public."stellar_security_events" ADD CONSTRAINT "stellar_security_events_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_ship_design_selection_v132" ADD CONSTRAINT "stellar_ship_design_selection_v132_pkey" PRIMARY KEY (user_id, ship_id);
ALTER TABLE public."stellar_ship_v50_save_backup" ADD CONSTRAINT "stellar_ship_v50_save_backup_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_ship_v50_shop_backup" ADD CONSTRAINT "stellar_ship_v50_shop_backup_pkey" PRIMARY KEY (catalog_key);
ALTER TABLE public."stellar_u423_loadouts" ADD CONSTRAINT "stellar_u423_loadouts_pkey" PRIMARY KEY (user_id, config, slot);
ALTER TABLE public."stellar_u423_module_rules" ADD CONSTRAINT "stellar_u423_module_rules_pkey" PRIMARY KEY (item);
ALTER TABLE public."stellar_u423_ops_claims" ADD CONSTRAINT "stellar_u423_ops_claims_pkey" PRIMARY KEY (user_id, week_start, tier);
ALTER TABLE public."stellar_u423_ops_config" ADD CONSTRAINT "stellar_u423_ops_config_pkey" PRIMARY KEY (tier);
ALTER TABLE public."stellar_u426_clan_donations" ADD CONSTRAINT "stellar_u426_clan_donations_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u426_clan_donations" ADD CONSTRAINT "stellar_u426_clan_donations_user_id_request_id_key" UNIQUE (user_id, request_id);
ALTER TABLE public."stellar_u426_clan_funding" ADD CONSTRAINT "stellar_u426_clan_funding_pkey" PRIMARY KEY (clan_id, structure);
ALTER TABLE public."stellar_u426_clan_rules" ADD CONSTRAINT "stellar_u426_clan_rules_pkey" PRIMARY KEY (structure);
ALTER TABLE public."stellar_u426_market_offers" ADD CONSTRAINT "stellar_u426_market_offers_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u426_market_offers" ADD CONSTRAINT "stellar_u426_market_offers_seller_request_id_key" UNIQUE (seller, request_id);
ALTER TABLE public."stellar_u426_market_rules" ADD CONSTRAINT "stellar_u426_market_rules_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u426_sector_runs" ADD CONSTRAINT "stellar_u426_sector_runs_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u426_sector_runs" ADD CONSTRAINT "stellar_u426_sector_runs_user_id_created_request_key" UNIQUE (user_id, created_request);
ALTER TABLE public."stellar_u426_sectors" ADD CONSTRAINT "stellar_u426_sectors_pkey" PRIMARY KEY (code);
ALTER TABLE public."stellar_u42_actions" ADD CONSTRAINT "stellar_u42_actions_pkey" PRIMARY KEY (user_id, request_id);
ALTER TABLE public."stellar_u42_catalog" ADD CONSTRAINT "stellar_u42_catalog_pkey" PRIMARY KEY (code);
ALTER TABLE public."stellar_u42_donations" ADD CONSTRAINT "stellar_u42_donations_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u42_expeditions" ADD CONSTRAINT "stellar_u42_expeditions_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u42_inventory" ADD CONSTRAINT "stellar_u42_inventory_pkey" PRIMARY KEY (user_id, item);
ALTER TABLE public."stellar_u42_material_spends" ADD CONSTRAINT "stellar_u42_material_spends_pkey" PRIMARY KEY (user_id, request_id, material);
ALTER TABLE public."stellar_u42_research" ADD CONSTRAINT "stellar_u42_research_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_u42_squad_members" ADD CONSTRAINT "stellar_u42_squad_members_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."stellar_u42_squad_objective_claims_v421" ADD CONSTRAINT "stellar_u42_squad_objective_claims_v421_pkey" PRIMARY KEY (user_id, week_start);
ALTER TABLE public."stellar_u42_squad_objective_config_v421" ADD CONSTRAINT "stellar_u42_squad_objective_config_v421_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u42_squads" ADD CONSTRAINT "stellar_u42_squads_invite_code_key" UNIQUE (invite_code);
ALTER TABLE public."stellar_u42_squads" ADD CONSTRAINT "stellar_u42_squads_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u435_raid_claims" ADD CONSTRAINT "stellar_u435_raid_claims_pkey" PRIMARY KEY (user_id, week_start);
ALTER TABLE public."stellar_u435_raid_config" ADD CONSTRAINT "stellar_u435_raid_config_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_u440_admin_test_grants" ADD CONSTRAINT "stellar_u440_admin_test_grants_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_v113_balance_backup" ADD CONSTRAINT "stellar_v113_balance_backup_pkey" PRIMARY KEY (source_name, key);
ALTER TABLE public."stellar_war_actions" ADD CONSTRAINT "stellar_war_actions_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_war_campaign_claims" ADD CONSTRAINT "stellar_war_campaign_claims_pkey" PRIMARY KEY (campaign_id, user_id);
ALTER TABLE public."stellar_war_campaigns" ADD CONSTRAINT "stellar_war_campaigns_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_war_defense_cooldowns" ADD CONSTRAINT "stellar_war_defense_cooldowns_pkey" PRIMARY KEY (user_id, map_id, node_id);
ALTER TABLE public."stellar_war_rules" ADD CONSTRAINT "stellar_war_rules_pkey" PRIMARY KEY (id);
ALTER TABLE public."stellar_war_scores" ADD CONSTRAINT "stellar_war_scores_pkey" PRIMARY KEY (campaign_id, user_id);
ALTER TABLE public."stellar_war_supply_claims" ADD CONSTRAINT "stellar_war_supply_claims_pkey" PRIMARY KEY (user_id, claim_day);
ALTER TABLE public."stellar_warbot_events_v477" ADD CONSTRAINT "stellar_warbot_events_v477_pkey" PRIMARY KEY (map_id);
ALTER TABLE public."stellar_warfront_nodes" ADD CONSTRAINT "stellar_warfront_nodes_pkey" PRIMARY KEY (map_id, node_id);
ALTER TABLE public."stellar_world_directives" ADD CONSTRAINT "stellar_world_directives_pkey" PRIMARY KEY (id);
ALTER TABLE public."world_boss_claims_v131" ADD CONSTRAINT "world_boss_claims_v131_pkey" PRIMARY KEY (boss_id, user_id);
ALTER TABLE public."world_boss_contrib_v131" ADD CONSTRAINT "world_boss_contrib_v131_pkey" PRIMARY KEY (boss_id, user_id);
ALTER TABLE public."world_boss_v131" ADD CONSTRAINT "world_boss_v131_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_action_log_v1763" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public."arena_battles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public."auction_bids" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public."game_chat_messages_v16" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public."premium_checkout_tests_v1832" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."pvp_damage_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public."pvp_engagements" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public."stellar_player_save_journal_v119" ALTER COLUMN "journal_id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_relay_audit_v346" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_relay_fortification_audit_v350" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_u426_clan_donations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_u42_donations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_u440_admin_test_grants" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_war_actions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public."stellar_world_directives" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY;
CREATE OR REPLACE FUNCTION public.admin_coupon_dashboard_v193()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from public.game_admins where user_id=uid and lower(role)='admin') then
  raise exception 'Acesso administrativo negado.';
 end if;
 return jsonb_build_object(
   'catalog',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',item_id,'name',name,'category',category,'rarity',rarity) order by category,rarity,name) from public.game_coupon_reward_catalog_v193),'[]'::jsonb),
   'coupons',coalesce((select jsonb_agg(jsonb_build_object('code',code,'title',title,'rewards',rewards,'active',active,'max_uses',max_uses,'redeemed_count',redeemed_count,'min_level',min_level,'starts_at',starts_at,'expires_at',expires_at,'created_at',created_at) order by created_at desc) from (select * from public.game_coupons_v193 order by created_at desc limit 100) q),'[]'::jsonb)
 );
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_create_coupon_v193(p_code text, p_title text, p_rewards jsonb, p_max_uses integer DEFAULT 1, p_min_level integer DEFAULT 1, p_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); v_code text:=upper(btrim(coalesce(p_code,'')));
 r jsonb; v_kind text; v_id text; v_qty bigint; v_days integer; v_max bigint;
 v_start timestamptz:=coalesce(p_starts_at,now());
begin
 if uid is null or not exists(select 1 from public.game_admins where user_id=uid and lower(role)='admin') then raise exception 'Acesso administrativo negado.'; end if;
 if v_code='' then v_code:='SL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,11)); end if;
 if v_code !~ '^[A-Z0-9][A-Z0-9_-]{3,63}$' or v_code='EVENTO7D' then raise exception 'Código inválido ou reservado.'; end if;
 if exists(select 1 from public.game_coupons_v1821 where code=v_code) then raise exception 'Este código já existe no sistema antigo.'; end if;
 if char_length(btrim(coalesce(p_title,''))) not between 3 and 100 then raise exception 'Título deve ter entre 3 e 100 caracteres.'; end if;
 if coalesce(p_max_uses,0) not between 1 and 100000 then raise exception 'Limite de usos inválido.'; end if;
 if coalesce(p_min_level,0) not between 1 and 44 then raise exception 'Nível mínimo inválido.'; end if;
 if p_expires_at is not null and p_expires_at<=v_start then raise exception 'Validade precisa ser posterior ao início.'; end if;
 if jsonb_typeof(p_rewards) is distinct from 'array' or jsonb_array_length(p_rewards) not between 1 and 12 then raise exception 'Escolha de 1 a 12 prêmios.'; end if;
 for r in select value from jsonb_array_elements(p_rewards) loop
   if jsonb_typeof(r)<>'object' then raise exception 'Estrutura de prêmio inválida.'; end if;
   v_kind:=coalesce(r->>'kind',''); v_id:=coalesce(r->>'id','');
   if not exists(select 1 from public.game_coupon_reward_catalog_v193 where kind=v_kind and item_id=v_id) then
     raise exception 'Prêmio não cadastrado no catálogo: % (%).',v_id,v_kind;
   end if;
   if v_kind='premium' then
     v_days:=coalesce(nullif(r->>'days','')::integer,0);
     if v_days not between 1 and 365 then raise exception 'Premium: escolha de 1 a 365 dias.'; end if;
   elsif v_kind='battle_pass' then
     if coalesce((r->>'qty')::integer,1)<>1 then raise exception 'Passe não aceita quantidade diferente de 1.'; end if;
   else
     v_qty:=coalesce(nullif(r->>'qty','')::bigint,0);
     v_max:=case when v_kind in ('ship') then 1 when v_kind='drone' then 8 when v_kind='inventory' then 10000 when v_kind in ('ammo','rocket') then 10000000 when v_kind='cargo' then 100000 when v_kind in ('credits','uridium') then 100000000 else 0 end;
     if v_qty not between 1 and v_max then raise exception 'Quantidade inválida para %: máximo %.',v_id,v_max; end if;
   end if;
 end loop;
 insert into public.game_coupons_v193(code,title,rewards,active,max_uses,min_level,starts_at,expires_at,created_by)
 values(v_code,btrim(p_title),p_rewards,true,p_max_uses,p_min_level,v_start,p_expires_at,uid);
 return jsonb_build_object('ok',true,'code',v_code,'title',btrim(p_title));
exception when unique_violation then raise exception 'Este código já está em uso.';
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_create_crafting_recipe_v1908(p_content jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_id text:=trim(coalesce(p_content->>'recipe_id',''));v_name text:=trim(coalesce(p_content->>'name',''));v_i jsonb:=coalesce(p_content->'ingredients','{}'::jsonb);v_g jsonb:=coalesce(p_content->'grant_payload','{}'::jsonb);
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF v_id !~ '^[a-zA-Z0-9_-]{1,32}$' OR length(v_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'ID ou nome inválidos.'; END IF;
 IF jsonb_typeof(v_i)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(v_i)) NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Informe entre 1 e 12 ingredientes.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(v_i) AS t(k,v) WHERE k !~ '^[a-zA-Z0-9_-]{1,32}$' OR v !~ '^[1-9][0-9]*$' OR v::numeric>1000000) THEN RAISE EXCEPTION 'Ingrediente inválido.'; END IF;
 IF (v_g->>'kind') NOT IN ('resource','ammo','rocket','repair') OR (v_g->>'id') !~ '^[a-zA-Z0-9_-]{1,32}$' OR coalesce((v_g->>'qty')::numeric,0) NOT BETWEEN 1 AND 10000000 THEN RAISE EXCEPTION 'Produto inválido.'; END IF;
 IF EXISTS(SELECT 1 FROM public.game_crafting_recipe_v1815 WHERE recipe_id=v_id) THEN RAISE EXCEPTION 'Receita com este ID já existe.'; END IF;
 INSERT INTO public.game_crafting_recipe_v1815(recipe_id,name,description,cost,currency,ingredients,grant_payload,output_label,min_level,enabled,sort_order,updated_at)
 VALUES(v_id,v_name,left(coalesce(p_content->>'description',''),180),greatest(0,least(1000000000000,(p_content->>'cost')::bigint)),CASE WHEN p_content->>'currency'='uridium' THEN 'uridium' ELSE 'credits' END,v_i,v_g,left(coalesce(nullif(p_content->>'output_label',''),v_name),80),greatest(1,least(100,(p_content->>'min_level')::integer)),coalesce((p_content->>'enabled')::boolean,true),100,now());
 RETURN jsonb_build_object('ok',true,'recipe_id',v_id);
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_create_economy_service_v1908(p_content jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_id text:=trim(coalesce(p_content->>'service_id',''));v_name text:=trim(coalesce(p_content->>'name',''));v_effect jsonb:=coalesce(p_content->'effect','{}'::jsonb);
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF v_id !~ '^[a-zA-Z0-9_-]{1,32}$' OR length(v_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'ID ou nome inválidos.'; END IF;
 IF jsonb_typeof(v_effect)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(v_effect))<>1 OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_effect) AS x(k) WHERE k NOT IN ('laser_damage_pct','shield_pct','cargo_flat','speed_flat')) THEN RAISE EXCEPTION 'Efeito não permitido.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(v_effect) AS k(name,value) WHERE value !~ '^[0-9]+(\.[0-9]+)?$' OR value::numeric>10000) THEN RAISE EXCEPTION 'Valor do efeito inválido.'; END IF;
 IF EXISTS(SELECT 1 FROM public.game_economy_service_v1815 WHERE service_id=v_id) THEN RAISE EXCEPTION 'Serviço com este ID já existe.'; END IF;
 INSERT INTO public.game_economy_service_v1815(service_id,name,description,base_cost,duration_ms,level_band_size,level_cost_scale,max_stack_ms,effect,enabled,sort_order,updated_at)
 VALUES(v_id,v_name,left(coalesce(p_content->>'description',''),180),greatest(0,least(1000000000000,(p_content->>'base_cost')::bigint)),greatest(60000,least(86400000,(p_content->>'duration_ms')::integer)),5,greatest(0,least(10,(p_content->>'level_cost_scale')::numeric)),greatest(60000,least(604800000,(p_content->>'max_stack_ms')::integer)),v_effect,coalesce((p_content->>'enabled')::boolean,true),100,now());
 RETURN jsonb_build_object('ok',true,'service_id',v_id);
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_create_pass_season_v1908(p_content jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_key text:=trim(coalesce(p_content->>'season_key',''));v_name text:=trim(coalesce(p_content->>'name',''));v_start timestamptz;v_end timestamptz;v_tiers integer;v_tier integer;
v_empty jsonb:='{"credits":0,"uridium":0,"ammo":{},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF v_key !~ '^[a-zA-Z0-9_-]{3,32}$' OR length(v_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'ID ou nome de temporada inválidos.'; END IF;
 v_start:=(p_content->>'starts_at')::timestamptz;v_end:=(p_content->>'ends_at')::timestamptz;v_tiers:=(p_content->>'tier_count')::integer;
 IF v_start IS NULL OR v_end IS NULL OR v_end<=v_start OR v_tiers NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Datas ou número de níveis inválidos.'; END IF;
 IF EXISTS(SELECT 1 FROM public.game_battle_pass_seasons_v1817b WHERE season_key=v_key) THEN RAISE EXCEPTION 'Esta temporada já existe.'; END IF;
 INSERT INTO public.game_battle_pass_seasons_v1817b(season_key,name,description,starts_at,ends_at,tier_count,points_per_tier,daily_points,premium_price_brl,enabled,updated_at)
 VALUES(v_key,v_name,left(coalesce(p_content->>'description',''),240),v_start,v_end,v_tiers,greatest(1,least(1000000,(p_content->>'points_per_tier')::integer)),greatest(1,least(100000,(p_content->>'daily_points')::integer)),greatest(0,least(99999,(p_content->>'premium_price_brl')::numeric)),false,now());
 FOR v_tier IN 1..v_tiers LOOP
   INSERT INTO public.game_battle_pass_tiers_v1817b(season_key,tier_no,free_reward,premium_reward,enabled,updated_at)
   VALUES(v_key,v_tier,v_empty,v_empty,false,now());
 END LOOP;
 RETURN jsonb_build_object('ok',true,'season_key',v_key,'tier_count',v_tiers,'enabled',false);
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_delete_account_v1763(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_admin uuid:=auth.uid(); v_result jsonb;
BEGIN
 IF v_admin IS NULL OR NOT public.is_game_admin_v1763(v_admin) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_admin OR public.is_game_admin_v1763(p_target_user_id) THEN RAISE EXCEPTION 'Conta administrativa protegida.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target_user_id::text,478));
 DELETE FROM public.game_coupon_redemptions_v193 WHERE user_id=p_target_user_id;
 UPDATE public.game_coupons_v193 SET created_by=v_admin WHERE created_by=p_target_user_id;
 DELETE FROM public.premium_checkout_tests_v1832 WHERE user_id=p_target_user_id;
 DELETE FROM public.premium_pass_tier_tests_v1832 WHERE user_id=p_target_user_id;
 DELETE FROM public.premium_subscription_tests_v1832 WHERE user_id=p_target_user_id;
 DELETE FROM public.stellar_relay_mission_claims_v346 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_relay_pve_events_v346 WHERE actor=p_target_user_id;
 UPDATE public.stellar_u426_market_offers SET buyer=NULL WHERE buyer=p_target_user_id;
 v_result:=public.admin_delete_account_v1763_legacy_v478(p_target_user_id);
 IF COALESCE((v_result->>'ok')::boolean,false) IS NOT TRUE
    OR EXISTS(SELECT 1 FROM auth.users WHERE id=p_target_user_id) THEN
  RAISE EXCEPTION 'Exclusão não confirmada: usuário ainda presente.';
 END IF;
 RETURN v_result||jsonb_build_object('verified',true,'message','Conta excluída e ausência no Auth confirmada.');
END $function$
;
CREATE OR REPLACE FUNCTION public.admin_delete_account_v1763_legacy_v478(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_admin uuid:=auth.uid();
  v_callsign text;
  v_email text;
begin
  if not public.is_game_admin_v1763(v_admin) then raise exception 'Acesso administrativo negado.'; end if;
  if p_target_user_id is null then raise exception 'Conta inválida.'; end if;
  if p_target_user_id=v_admin then raise exception 'Você não pode deletar a própria conta administrativa.'; end if;
  if public.is_game_admin_v1763(p_target_user_id) then raise exception 'Outra conta administrativa não pode ser deletada por este painel.'; end if;
  select coalesce(p.callsign,split_part(coalesce(u.email,''),'@',1),'Pilot'),coalesce(u.email,'') into v_callsign,v_email
    from auth.users u left join public.profiles p on p.id=u.id where u.id=p_target_user_id and u.deleted_at is null;
  if not found then raise exception 'Conta não encontrada.'; end if;

  perform public.admin_transfer_owned_clan_v1763(p_target_user_id);
  insert into public.admin_action_log_v1763(admin_user_id,target_user_id,target_callsign,target_email,action,detail)
  values(v_admin,p_target_user_id,v_callsign,v_email,'delete',jsonb_build_object('account_deleted',true));
  delete from auth.users where id=p_target_user_id;
  if not found then raise exception 'Falha ao deletar a conta.'; end if;
  return jsonb_build_object('ok',true,'user_id',p_target_user_id,'callsign',v_callsign,'message','Conta deletada. O jogador terá que criar uma nova conta.');
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_delete_custom_mission_v1815(p_mission_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  delete from public.game_mission_custom_v1815 where mission_id=p_mission_id;
  return public.get_systems_runtime_config_v1815();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_get_game_presence_snapshots_v1831(p_minutes integer DEFAULT 180)
 RETURNS SETOF game_presence_snapshots_v1831
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
      RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE = '42501';
    END IF;
    IF p_minutes IS NULL OR p_minutes < 1 OR p_minutes > 43200 THEN
      RAISE EXCEPTION 'Janela inválida: 1 a 43200 minutos.';
    END IF;
    RETURN QUERY
      SELECT s.* FROM public.game_presence_snapshots_v1831 s
      WHERE s.sample_minute >= now() - make_interval(mins => p_minutes)
      ORDER BY s.sample_minute DESC;
END
$function$
;
CREATE OR REPLACE FUNCTION public.admin_player_telemetry_v1771(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_data jsonb;
  v_milestones jsonb;
  v_sources jsonb;
begin
  if not public.is_game_admin_v1763(v_uid) then
    raise exception 'Acesso administrativo negado.';
  end if;

  select to_jsonb(t) || jsonb_build_object(
      'callsign',coalesce(p.callsign,'Pilot'),
      'cr_per_hour',case when t.play_seconds>0 then round(t.credits_earned*3600.0/t.play_seconds)::bigint else 0 end,
      'stl_per_hour',case when t.play_seconds>0 then round(t.stl_earned*3600.0/t.play_seconds)::bigint else 0 end,
      'xp_per_hour',case when t.play_seconds>0 then round(t.xp_earned*3600.0/t.play_seconds)::bigint else 0 end
    )
  into v_data
  from public.player_telemetry_v1771 t
  left join public.profiles p on p.id=t.user_id
  where t.user_id=p_target_user_id;

  select coalesce(jsonb_agg(row_to_json(m) order by m.level),'[]'::jsonb)
  into v_milestones
  from public.player_level_milestones_v1771 m
  where m.user_id=p_target_user_id;

  select coalesce(jsonb_agg(row_to_json(x) order by x.sort_order),'[]'::jsonb)
  into v_sources
  from (
    select 1 sort_order,'NPCs' label,t.npc_cr cr,t.npc_stl stl,t.npc_xp xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 2,'Missões',t.mission_cr,t.mission_stl,t.mission_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 3,'Recursos',t.resource_cr,t.resource_stl,t.resource_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 4,'Passe / Nível',t.pass_cr,t.pass_stl,t.pass_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 5,'Eventos',t.event_cr,t.event_stl,t.event_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 6,'Portais',t.gate_cr,t.gate_stl,t.gate_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 7,'Exploração',t.discovery_cr,t.discovery_stl,t.discovery_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
    union all select 8,'Outros',t.other_cr,t.other_stl,t.other_xp from public.player_telemetry_v1771 t where t.user_id=p_target_user_id
  ) x;

  return jsonb_build_object(
    'telemetry',coalesce(v_data,'{}'::jsonb),
    'milestones',coalesce(v_milestones,'[]'::jsonb),
    'sources',coalesce(v_sources,'[]'::jsonb)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_preview_premium_stage_v1832()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_season jsonb; v_catalog jsonb; v_sub jsonb; v_pass jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
  RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
 END IF;
 SELECT to_jsonb(s) INTO v_season FROM (
   SELECT season_key,name,tier_count,premium_price_brl,ends_at FROM public.game_battle_pass_seasons_v1817b
   WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1
 ) s;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',product_id,'name',display_name,'category',category,'billing_mode',billing_mode,
  'price_brl',price_brl,'duration_days',duration_days,'billing_months',billing_months,
  'tier_quantity',tier_quantity,'reward_plan',reward_plan,'test_only',test_only,'live_enabled',live_enabled
 ) ORDER BY display_order,product_id),'[]'::jsonb) INTO v_catalog
 FROM public.premium_offers_stage_v1832;
 SELECT to_jsonb(s) INTO v_sub FROM (SELECT product_id,status,auto_renew,started_at,next_renewal_at,renewal_count
 FROM public.premium_subscription_tests_v1832 WHERE user_id=v_uid) s;
 SELECT to_jsonb(t) INTO v_pass FROM (SELECT season_key,purchased_tiers FROM public.premium_pass_tier_tests_v1832
 WHERE user_id=v_uid AND season_key=(v_season->>'season_key')) t;
 RETURN jsonb_build_object('test_mode',true,'billing_live',false,'rewards_live',false,
 'offers',v_catalog,'current_season',v_season,'test_subscription',v_sub,'test_tiers',v_pass);
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_recent_actions_v1763()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_rows jsonb;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc),'[]'::jsonb) into v_rows
  from (
    select id,target_user_id::text,target_callsign,target_email,action,detail,created_at
    from public.admin_action_log_v1763
    order by created_at desc limit 40
  ) x;
  return jsonb_build_object('actions',v_rows);
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_reset_account_v1763(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_admin uuid:=auth.uid(); v_result jsonb; v_table text; v_epoch bigint;
BEGIN
 IF v_admin IS NULL OR NOT public.is_game_admin_v1763(v_admin) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_admin OR public.is_game_admin_v1763(p_target_user_id) THEN RAISE EXCEPTION 'Conta protegida contra reset.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target_user_id::text,478));
 v_result:=public.admin_reset_account_v1763_legacy_v478(p_target_user_id);
 IF COALESCE((v_result->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Reset legado não confirmado.'; END IF;
 FOREACH v_table IN ARRAY ARRAY[
 'galaxy_event_progress_v1826','game_coupon_redemptions_v1821','game_coupon_redemptions_v193',
 'stellar_elite_counters','stellar_elite_claims','stellar_elite_selected_titles',
 'stellar_competitive_claims','stellar_war_campaign_claims','stellar_war_supply_claims','stellar_war_defense_cooldowns','stellar_war_scores',
 'stellar_npc_reward_ledger','stellar_ore_reward_ledger',
 'stellar_astral_cursor_v381','stellar_astral_ledger_v381','stellar_astral_quote_lock_v381',
 'stellar_frontier_claims_v370','stellar_frontier_ship_tech_v370',
 'stellar_u42_actions','stellar_u42_donations','stellar_u42_expeditions','stellar_u42_inventory',
 'stellar_u42_material_spends','stellar_u42_research','stellar_u42_squad_members',
 'stellar_u42_squad_objective_claims_v421','stellar_u423_loadouts','stellar_u423_ops_claims',
 'stellar_u426_clan_donations','stellar_u426_sector_runs','stellar_u435_raid_claims',
 'stellar_u440_admin_test_grants','stellar_season_scores'
 ] LOOP
  IF to_regclass(format('public.%I',v_table)) IS NOT NULL THEN
   EXECUTE format('DELETE FROM public.%I WHERE user_id=$1',v_table) USING p_target_user_id;
  END IF;
 END LOOP;
 DELETE FROM public.stellar_dominion_claims_v360 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_dominion_war_claims_v360 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_frontier_clan_claims_v370 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_relay_mission_claims_v346 WHERE actor=p_target_user_id;
 UPDATE public.stellar_u426_market_offers SET buyer=NULL WHERE buyer=p_target_user_id;
 INSERT INTO public.stellar_account_reset_epochs_v478(user_id,epoch,reset_at)
 VALUES(p_target_user_id,1,now())
 ON CONFLICT(user_id) DO UPDATE SET epoch=public.stellar_account_reset_epochs_v478.epoch+1,reset_at=now()
 RETURNING epoch INTO v_epoch;
 RETURN v_result||jsonb_build_object('reset_epoch',v_epoch,'verified',true,
 'message','Conta zerada no servidor. Progresso local antigo bloqueado; login e Premium preservados.');
END $function$
;
CREATE OR REPLACE FUNCTION public.admin_reset_account_v1763_legacy_v478(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_admin uuid:=auth.uid();
  v_callsign text;
  v_email text;
begin
  if not public.is_game_admin_v1763(v_admin) then raise exception 'Acesso administrativo negado.'; end if;
  if p_target_user_id is null then raise exception 'Conta inválida.'; end if;
  if p_target_user_id=v_admin then raise exception 'Você não pode zerar a própria conta administrativa.'; end if;
  if public.is_game_admin_v1763(p_target_user_id) then raise exception 'Conta administrativa protegida contra reset total.'; end if;

  select coalesce(p.callsign,split_part(coalesce(u.email,''),'@',1),'Pilot'),coalesce(u.email,'')
    into v_callsign,v_email
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=p_target_user_id and u.deleted_at is null;
  if not found then raise exception 'Conta não encontrada.'; end if;

  perform public.admin_transfer_owned_clan_v1763(p_target_user_id);

  delete from public.clan_members where user_id=p_target_user_id;
  delete from public.clan_credit_grants where sender_id=p_target_user_id or recipient_id=p_target_user_id;
  delete from public.clan_transactions where actor_id=p_target_user_id;
  update public.clan_transactions set target_user_id=null where target_user_id=p_target_user_id;
  delete from public.clan_war_contrib_v131 where user_id=p_target_user_id;
  delete from public.world_boss_claims_v131 where user_id=p_target_user_id;
  delete from public.world_boss_contrib_v131 where user_id=p_target_user_id;

  delete from public.pvp_damage_events where target_user_id=p_target_user_id or attacker_user_id=p_target_user_id;
  delete from public.pvp_engagements where home_user_id=p_target_user_id or invader_user_id=p_target_user_id;
  delete from public.arena_battles where attacker_id=p_target_user_id or defender_id=p_target_user_id or winner_id=p_target_user_id;
  delete from public.arena_daily_rewards where user_id=p_target_user_id;
  delete from public.arena_daily where user_id=p_target_user_id;
  delete from public.arena_stats where user_id=p_target_user_id;
  delete from public.arena_profiles where user_id=p_target_user_id;

  delete from public.designer_drop_claims_v16 where user_id=p_target_user_id;
  delete from public.player_drone_designs_v16 where user_id=p_target_user_id;
  delete from public.player_design_loadout_v16 where user_id=p_target_user_id;
  delete from public.player_design_inventory_v16 where user_id=p_target_user_id;

  delete from public.auction_bids where user_id=p_target_user_id;
  delete from public.player_presence where user_id=p_target_user_id;
  delete from public.player_location_v1774 where user_id=p_target_user_id;
  delete from public.game_login_sessions_v1214 where user_id=p_target_user_id;
  delete from public.game_saves where user_id=p_target_user_id;

  delete from public.player_level_milestones_v1771 where user_id=p_target_user_id;
  delete from public.player_telemetry_batches_v1771 where user_id=p_target_user_id;
  delete from public.player_telemetry_v1771 where user_id=p_target_user_id;

  update public.profiles
  set faction=null,level=1,xp=0,credits=20000,uridium=0,aliens_killed=0,gg_completed=0,updated_at=now()
  where id=p_target_user_id;

  insert into public.admin_action_log_v1763(admin_user_id,target_user_id,target_callsign,target_email,action,detail)
  values(
    v_admin,p_target_user_id,v_callsign,v_email,'reset',
    jsonb_build_object(
      'premium_preserved',true,
      'callsign_preserved',true,
      'telemetry_reset',true,
      'location_reset',true,
      'legacy_tables_removed',true
    )
  );

  return jsonb_build_object(
    'ok',true,
    'user_id',p_target_user_id,
    'callsign',v_callsign,
    'message','Conta, telemetria e posição zeradas. Login, callsign e Premium preservados.'
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_search_accounts_v1763(p_query text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_q text:=lower(trim(coalesce(p_query,'')));
  v_rows jsonb;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select coalesce(jsonb_agg(row_to_json(x) order by x.callsign,x.email),'[]'::jsonb) into v_rows
  from (
    select
      u.id::text as user_id,
      coalesce(p.callsign,split_part(coalesce(u.email,''),'@',1),'Pilot') as callsign,
      coalesce(u.email,'') as email,
      p.faction,
      coalesce(p.level,1) as level,
      coalesce(p.xp,0) as xp,
      coalesce(p.credits,0) as credits,
      coalesce(p.uridium,0) as uridium,
      (gs.user_id is not null) as has_save,
      public.is_game_admin_v1763(u.id) as is_admin,
      (coalesce(m.is_banned,false) and (m.banned_until is null or m.banned_until>now())) as is_banned,
      m.banned_until,
      m.banned_reason,
      u.created_at,
      pp.updated_at as presence_updated_at
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.game_saves gs on gs.user_id=u.id
    left join public.account_moderation_v1763 m on m.user_id=u.id
    left join public.player_presence pp on pp.user_id=u.id
    where u.deleted_at is null and (
      v_q='' or lower(coalesce(p.callsign,'')) like '%'||v_q||'%'
      or lower(coalesce(u.email,'')) like '%'||v_q||'%'
      or lower(u.id::text) like '%'||v_q||'%'
    )
    order by coalesce(pp.updated_at,u.created_at) desc
    limit 30
  ) x;
  return jsonb_build_object('users',v_rows);
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_balance_v1909(p_kind text, p_item_id text, p_fields jsonb, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_old jsonb;v_out jsonb;v_key text;v_value jsonb;v_num numeric;v_min numeric;v_max numeric;
 v_type text;v_subtype text;v_meta integer;v_low jsonb;v_subkey text;v_subnum numeric;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_kind NOT IN ('ship','item') OR p_item_id IS NULL OR length(p_item_id)>64 OR jsonb_typeof(p_fields)<>'object' THEN
  RAISE EXCEPTION 'Registro de balanceamento inválido.';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_fields))=0 OR (SELECT count(*) FROM jsonb_object_keys(p_fields))>18 OR length(p_fields::text)>3500 THEN
  RAISE EXCEPTION 'Quantidade de atributos inválida.';
 END IF;
 SELECT version INTO v_meta FROM public.game_balance_meta_v1909 WHERE id=1 FOR UPDATE;
 IF p_expected_version IS NOT NULL AND p_expected_version<>v_meta THEN
  RAISE EXCEPTION 'Configuração mudou no servidor (v%). Recarregue antes de salvar.',v_meta;
 END IF;
 SELECT params INTO v_old FROM public.game_balance_entries_v1909
 WHERE kind=p_kind AND item_id=p_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Este equipamento ou nave não consta no catálogo autorizado.'; END IF;
 v_type := coalesce(v_old->>'equipment_type','');v_subtype:=coalesce(v_old->>'equipment_subtype','');
 v_out:=v_old;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each(p_fields) LOOP
  IF v_key IN ('name','role','description') THEN
   IF (v_key='role' AND p_kind<>'ship') OR (v_key='description' AND p_kind<>'item') OR
       jsonb_typeof(v_value)<>'string' OR length(btrim(v_value #>> '{}')) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Texto inválido para %.',v_key;
   END IF;
   v_out:=jsonb_set(v_out,ARRAY[v_key],to_jsonb(left(btrim(v_value #>> '{}'),180)),true);
   CONTINUE;
  END IF;
  IF p_kind='ship' THEN
   IF v_key NOT IN ('hp','speed','cargo','lasers','generators','extras','bonusLowMaps') THEN RAISE EXCEPTION 'Atributo de nave não permitido: %',v_key; END IF;
  ELSIF v_key='equipment_type' OR v_key='equipment_subtype' OR
    NOT ((v_type='laser' AND v_key IN ('damage','alienDamage','alienBonus')) OR
    (v_type='generator' AND v_subtype='speed' AND v_key='speed') OR
    (v_type='generator' AND v_subtype='shield' AND v_key IN ('shield','absorption','shieldRegenBonus')) OR
    (v_type='extra' AND v_key IN ('slotBonus','repairRate','repairTick','shieldRepairTick','repairDelay','cargoBonus') AND v_old ? v_key) OR
    (v_type='drone' AND v_key='slots')) THEN
    RAISE EXCEPTION 'Atributo de equipamento não permitido: %',v_key;
  END IF;
  IF v_key='bonusLowMaps' THEN
   IF p_kind<>'ship' THEN RAISE EXCEPTION 'Bônus de mapa é exclusivo de nave.'; END IF;
   IF v_value='null'::jsonb THEN
    v_out:=jsonb_set(v_out,ARRAY[v_key],'null'::jsonb,true);
   ELSE
    IF jsonb_typeof(v_value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(v_value))<>6 THEN RAISE EXCEPTION 'Bônus de mapa requer os 6 campos.'; END IF;
    FOR v_subkey,v_num IN SELECT key,0::numeric FROM jsonb_each(v_value) LOOP
     IF jsonb_typeof(v_value->v_subkey)<>'number' THEN RAISE EXCEPTION 'Bônus de mapa inválido.'; END IF;
     v_subnum:=(v_value->>v_subkey)::numeric;
     IF v_subkey IN ('hp','speed','cargo') THEN
      v_max:=CASE v_subkey WHEN 'hp' THEN 2000000 WHEN 'speed' THEN 1000 ELSE 100000 END;
      IF v_subnum<0 OR v_subnum>v_max THEN RAISE EXCEPTION 'Bônus de mapa fora do limite.'; END IF;
     ELSIF v_subkey IN ('laserMult','rocketMult','shieldMult') THEN
      IF v_subnum<0.1 OR v_subnum>5 THEN RAISE EXCEPTION 'Multiplicador de mapa fora do limite.'; END IF;
     ELSE RAISE EXCEPTION 'Campo de bônus de mapa inválido: %',v_subkey; END IF;
    END LOOP;
    v_out:=jsonb_set(v_out,ARRAY[v_key],v_value,true);
   END IF;
   CONTINUE;
  END IF;
  IF jsonb_typeof(v_value)<>'number' THEN RAISE EXCEPTION 'Atributo % precisa ser numérico.',v_key; END IF;
  v_num:=(v_value #>> '{}')::numeric;
  v_min:=CASE v_key WHEN 'hp' THEN 1000 WHEN 'speed' THEN CASE WHEN p_kind='ship' THEN 50 ELSE 0 END
         WHEN 'lasers' THEN 1 WHEN 'slots' THEN 1 ELSE 0 END;
  v_max:=CASE v_key WHEN 'hp' THEN 10000000 WHEN 'speed' THEN 1200 WHEN 'cargo' THEN 100000
    WHEN 'lasers' THEN 32 WHEN 'generators' THEN 32 WHEN 'extras' THEN 20 WHEN 'damage' THEN 100000
    WHEN 'alienDamage' THEN 100000 WHEN 'alienBonus' THEN 5 WHEN 'shield' THEN 1000000
    WHEN 'absorption' THEN 95 WHEN 'shieldRegenBonus' THEN 1 WHEN 'slotBonus' THEN 20
    WHEN 'repairRate' THEN 1 WHEN 'repairTick' THEN 1000000 WHEN 'shieldRepairTick' THEN 1000000
    WHEN 'repairDelay' THEN 120 WHEN 'cargoBonus' THEN 100000 WHEN 'slots' THEN 12 ELSE -1 END;
  IF v_max<0 OR v_num<v_min OR v_num>v_max OR
    (v_key IN ('hp','speed','cargo','lasers','generators','extras','damage','alienDamage','shield','absorption','slotBonus','repairTick','shieldRepairTick','repairDelay','cargoBonus','slots') AND v_num<>trunc(v_num)) THEN
    RAISE EXCEPTION 'Atributo % fora dos limites.',v_key;
  END IF;
  v_out:=jsonb_set(v_out,ARRAY[v_key],v_value,true);
 END LOOP;
 UPDATE public.game_balance_entries_v1909 SET params=v_out,label=coalesce(v_out->>'name',label),updated_at=now()
 WHERE kind=p_kind AND item_id=p_item_id;
 UPDATE public.game_balance_meta_v1909 SET version=version+1,updated_at=now() WHERE id=1;
 RETURN public.get_balance_runtime_v1909();
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_ban_v1763(p_target_user_id uuid, p_minutes integer DEFAULT NULL::integer, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_admin uuid:=auth.uid();
  v_callsign text;
  v_email text;
  v_until timestamptz;
begin
  if not public.is_game_admin_v1763(v_admin) then raise exception 'Acesso administrativo negado.'; end if;
  if p_target_user_id is null then raise exception 'Conta inválida.'; end if;
  if p_target_user_id=v_admin then raise exception 'Você não pode banir a própria conta administrativa.'; end if;
  if public.is_game_admin_v1763(p_target_user_id) then raise exception 'Outra conta administrativa não pode ser banida por este painel.'; end if;
  select coalesce(p.callsign,split_part(coalesce(u.email,''),'@',1),'Pilot'),coalesce(u.email,'')
    into v_callsign,v_email from auth.users u left join public.profiles p on p.id=u.id where u.id=p_target_user_id and u.deleted_at is null;
  if not found then raise exception 'Conta não encontrada.'; end if;
  v_until:=case when coalesce(p_minutes,0)<=0 then null else now()+make_interval(mins=>greatest(1,least(p_minutes,525600))) end;
  insert into public.account_moderation_v1763(user_id,is_banned,banned_until,banned_reason,banned_by,updated_at)
  values(p_target_user_id,true,v_until,left(nullif(trim(coalesce(p_reason,'')),''),240),v_admin,now())
  on conflict(user_id) do update set is_banned=true,banned_until=excluded.banned_until,banned_reason=excluded.banned_reason,banned_by=v_admin,updated_at=now();
  delete from public.game_login_sessions_v1214 where user_id=p_target_user_id;
  delete from public.player_presence where user_id=p_target_user_id;
  insert into public.admin_action_log_v1763(admin_user_id,target_user_id,target_callsign,target_email,action,detail)
  values(v_admin,p_target_user_id,v_callsign,v_email,'ban',jsonb_build_object('minutes',p_minutes,'until',v_until,'reason',left(coalesce(p_reason,''),240)));
  return jsonb_build_object('ok',true,'user_id',p_target_user_id,'callsign',v_callsign,'banned_until',v_until);
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_coupon_active_v193(p_code text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();v_code text:=upper(btrim(coalesce(p_code,'')));
begin
 if uid is null or not exists(select 1 from public.game_admins where user_id=uid and lower(role)='admin') then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_coupons_v193 set active=coalesce(p_active,false) where code=v_code;
 if not found then raise exception 'Cupom não encontrado.'; end if;
 return jsonb_build_object('ok',true,'code',v_code,'active',coalesce(p_active,false));
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_manual_event_v3411(p_event_key text, p_duration_minutes integer, p_stop boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_stop THEN UPDATE public.live_event_manual_override_v3411 SET event_key=NULL,start_at=NULL,end_at=NULL,updated_at=now() WHERE id=1;
 ELSE
   IF p_duration_minutes NOT BETWEEN 15 AND 360 OR NOT EXISTS (SELECT 1 FROM public.live_event_config_v16 WHERE event_key=p_event_key AND enabled=true) THEN RAISE EXCEPTION 'Evento ou duração inválida.'; END IF;
   UPDATE public.live_event_manual_override_v3411 SET event_key=p_event_key,start_at=clock_timestamp(),end_at=clock_timestamp()+make_interval(mins=>p_duration_minutes),updated_at=now() WHERE id=1;
 END IF;
 RETURN public.get_live_ops_v16();
END;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_weekend_event_v3411(p_event_key text, p_enabled boolean, p_priority integer, p_target integer, p_reward jsonb, p_controls jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE new_rules jsonb; k text; v text;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.live_event_config_v16 WHERE event_key=p_event_key AND rules @> '{"weekend_rotation":true}'::jsonb) THEN RAISE EXCEPTION 'Evento não pertence à rotação.'; END IF;
 IF p_priority NOT BETWEEN 1 AND 10000 OR p_target NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Prioridade ou meta fora dos limites.'; END IF;
 IF jsonb_typeof(p_reward)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_reward))<>4 THEN RAISE EXCEPTION 'Recompensa deve conter 4 campos.'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_reward) LOOP
  IF k NOT IN ('credits','uridium','xp','cores') THEN RAISE EXCEPTION 'Recompensa não reconhecida.'; END IF;
  v:=p_reward->>k;
  IF v !~ '^\d{1,10}$' OR v::numeric > (CASE k WHEN 'credits' THEN 100000000 WHEN 'uridium' THEN 500000 WHEN 'xp' THEN 10000000 ELSE 100 END) THEN RAISE EXCEPTION 'Recompensa acima do limite.'; END IF;
 END LOOP;
 IF jsonb_typeof(p_controls)<>'object' THEN RAISE EXCEPTION 'Controles inválidos.'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_controls) LOOP
  IF k NOT IN ('wave_count','min_alive','ore_count','wave_interval_ms','phase_count','wave_growth','elite_patrols','boss_escorts','ore_growth','convoy_speed_pct') THEN RAISE EXCEPTION 'Parâmetro do evento não permitido.'; END IF;
  v:=p_controls->>k;
  IF v !~ '^\d{1,6}$' OR v::numeric > (CASE k WHEN 'wave_count' THEN 12 WHEN 'min_alive' THEN 12 WHEN 'ore_count' THEN 20 WHEN 'phase_count' THEN 4 WHEN 'wave_growth' THEN 3 WHEN 'elite_patrols' THEN 2 WHEN 'boss_escorts' THEN 3 WHEN 'ore_growth' THEN 8 WHEN 'convoy_speed_pct' THEN 140 ELSE 120000 END)
      OR v::numeric < (CASE k WHEN 'wave_interval_ms' THEN 3000 WHEN 'wave_growth' THEN 0 WHEN 'elite_patrols' THEN 0 WHEN 'boss_escorts' THEN 0 WHEN 'ore_growth' THEN 0 WHEN 'convoy_speed_pct' THEN 80 ELSE 1 END) THEN RAISE EXCEPTION 'Parâmetro de onda fora do limite.'; END IF;
 END LOOP;
 SELECT coalesce(rules,'{}'::jsonb) INTO new_rules FROM public.live_event_config_v16 WHERE event_key=p_event_key FOR UPDATE;
 UPDATE public.live_event_config_v16 SET enabled=coalesce(p_enabled,true),priority=p_priority,target=p_target,
    reward=p_reward,rules=new_rules||jsonb_build_object('event_control',p_controls),updated_at=now() WHERE event_key=p_event_key;
 RETURN public.get_live_ops_v16();
END;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_weekend_settings_v3411(p_enabled boolean, p_slots jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE rec record; last_day int:=-1; last_end int:=0; day_value int; minute_value int; duration_value int; start_text text;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF jsonb_typeof(p_slots)<>'array' OR jsonb_array_length(p_slots) NOT BETWEEN 1 AND 16 THEN RAISE EXCEPTION 'Informe de 1 a 16 horários.'; END IF;
 FOR rec IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
   IF jsonb_typeof(rec.value)<>'object' OR (rec.value->>'day') !~ '^[0-6]$'
     OR (rec.value->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     OR (rec.value->>'duration') !~ '^\d{2,3}$' THEN RAISE EXCEPTION 'Horário inválido.'; END IF;
   day_value:=(rec.value->>'day')::int;start_text:=rec.value->>'start';
   minute_value:=split_part(start_text,':',1)::int*60+split_part(start_text,':',2)::int;
   duration_value:=(rec.value->>'duration')::int;
   IF duration_value NOT BETWEEN 15 AND 360 OR minute_value+duration_value>1440 THEN RAISE EXCEPTION 'Duração inválida ou ultrapassa meia-noite.'; END IF;
 END LOOP;
 -- Os slots devem estar ordenados a partir de sábado, sem sobreposições.
 FOR rec IN SELECT (value->>'day')::int AS dow,
    split_part(value->>'start',':',1)::int*60+split_part(value->>'start',':',2)::int AS minute,
    (value->>'duration')::int AS duration
    FROM jsonb_array_elements(p_slots)
    ORDER BY CASE (value->>'day')::int WHEN 6 THEN 0 WHEN 0 THEN 1 ELSE (value->>'day')::int+1 END,
      split_part(value->>'start',':',1)::int*60+split_part(value->>'start',':',2)::int
 LOOP
   IF rec.dow=last_day AND rec.minute<last_end THEN RAISE EXCEPTION 'Horários sobrepostos.'; END IF;
   last_day:=rec.dow;last_end:=rec.minute+rec.duration;
 END LOOP;
 UPDATE public.live_event_weekend_settings_v3411 SET enabled=coalesce(p_enabled,true),
   slots=(SELECT jsonb_agg(value ORDER BY sort_day, minute)
      FROM (SELECT value,CASE (value->>'day')::int WHEN 6 THEN 0 WHEN 0 THEN 1 ELSE (value->>'day')::int+1 END AS sort_day,
        split_part(value->>'start',':',1)::int*60+split_part(value->>'start',':',2)::int AS minute
        FROM jsonb_array_elements(p_slots)) sorted),updated_at=now() WHERE id=1;
 RETURN public.get_live_ops_v16();
END;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_simulate_premium_checkout_v1832(p_product_id text, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_product public.premium_offers_stage_v1832%rowtype;
 v_order public.premium_checkout_tests_v1832%rowtype;
 v_season text; v_max_tier integer; v_existing_tiers integer; v_new_total integer;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
  RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
 END IF;
 IF length(coalesce(p_idempotency_key,''))<8 OR length(p_idempotency_key)>120
   OR p_idempotency_key !~ '^[a-zA-Z0-9:_-]+$' THEN
  RAISE EXCEPTION 'Chave de teste inválida';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('premium_v1832:'||v_uid::text));
 SELECT * INTO v_order FROM public.premium_checkout_tests_v1832
 WHERE user_id=v_uid AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_order.product_id<>p_product_id THEN RAISE EXCEPTION 'Chave usada com outro produto'; END IF;
  RETURN jsonb_build_object('ok',true,'duplicate',true,'test_only',true,'order_id',v_order.id,
   'product_id',v_order.product_id,'price_brl',v_order.quoted_price_brl);
 END IF;
 SELECT * INTO v_product FROM public.premium_offers_stage_v1832 WHERE product_id=p_product_id AND test_only AND NOT live_enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Oferta de teste inexistente'; END IF;
 IF v_product.category='starter_bundle' AND EXISTS (
  SELECT 1 FROM public.premium_checkout_tests_v1832 c
  WHERE c.user_id=v_uid AND c.product_id=v_product.product_id
 ) THEN
  RAISE EXCEPTION 'Pacote de compra única já simulado nesta conta.';
 END IF;
 IF v_product.category IN ('battle_pass','pass_tiers') THEN
  SELECT season_key,tier_count INTO v_season,v_max_tier FROM public.game_battle_pass_seasons_v1817b
  WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1;
  IF v_season IS NULL THEN RAISE EXCEPTION 'Nenhuma temporada ativa para o teste'; END IF;
 END IF;
 IF v_product.category='pass_tiers' THEN
  SELECT purchased_tiers INTO v_existing_tiers FROM public.premium_pass_tier_tests_v1832
   WHERE user_id=v_uid AND season_key=v_season;
  v_new_total:=coalesce(v_existing_tiers,0)+v_product.tier_quantity;
  IF v_new_total>v_max_tier THEN RAISE EXCEPTION 'Teste ultrapassaria o limite de % níveis da temporada',v_max_tier; END IF;
 END IF;
 INSERT INTO public.premium_checkout_tests_v1832(user_id,idempotency_key,product_id,quoted_price_brl,season_key)
 VALUES(v_uid,p_idempotency_key,v_product.product_id,v_product.price_brl,v_season)
 RETURNING * INTO v_order;
 IF v_product.category='premium' AND v_product.billing_mode='auto_renew' THEN
  INSERT INTO public.premium_subscription_tests_v1832
   (user_id,product_id,status,auto_renew,started_at,next_renewal_at,renewal_count,last_checkout_id,updated_at)
  VALUES(v_uid,v_product.product_id,'test_active',true,now(),now()+make_interval(months=>v_product.billing_months),0,v_order.id,now())
  ON CONFLICT(user_id) DO UPDATE SET
   product_id=excluded.product_id,status='test_active',auto_renew=true,started_at=now(),
   next_renewal_at=excluded.next_renewal_at,renewal_count=0,last_checkout_id=v_order.id,updated_at=now();
 ELSIF v_product.category='pass_tiers' THEN
  INSERT INTO public.premium_pass_tier_tests_v1832(user_id,season_key,purchased_tiers)
  VALUES(v_uid,v_season,v_product.tier_quantity)
  ON CONFLICT(user_id,season_key) DO UPDATE SET
   purchased_tiers=public.premium_pass_tier_tests_v1832.purchased_tiers+excluded.purchased_tiers,updated_at=now();
 END IF;
 RETURN jsonb_build_object('ok',true,'duplicate',false,'test_only',true,
 'billing_live',false,'rewards_live',false,'order_id',v_order.id,'product_id',v_order.product_id,
 'price_brl',v_order.quoted_price_brl,'season_key',v_season,
 'simulated_tiers_total',CASE WHEN v_product.category='pass_tiers' THEN v_new_total ELSE NULL END);
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_status_v1763()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_admin boolean:=false;
  v_total bigint:=0;
  v_banned bigint:=0;
  v_online bigint:=0;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  v_admin:=public.is_game_admin_v1763(v_uid);
  if not v_admin then return jsonb_build_object('is_admin',false); end if;
  select count(*) into v_total from auth.users where deleted_at is null;
  select count(*) into v_banned from public.account_moderation_v1763 where is_banned and (banned_until is null or banned_until>now());
  select count(*) into v_online from public.player_presence where updated_at>now()-interval '2 minutes';
  return jsonb_build_object('is_admin',true,'total_accounts',v_total,'banned_accounts',v_banned,'online_accounts',v_online);
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_telemetry_overview_v1771()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_summary jsonb;
  v_sources jsonb;
  v_milestones jsonb;
  v_players jsonb;
begin
  if not public.is_game_admin_v1763(v_uid) then
    raise exception 'Acesso administrativo negado.';
  end if;

  with base as (
    select *,
      case when play_seconds>=300 then credits_earned*3600.0/play_seconds else null end cr_h,
      case when play_seconds>=300 then stl_earned*3600.0/play_seconds else null end stl_h,
      case when play_seconds>=300 then xp_earned*3600.0/play_seconds else null end xp_h
    from public.player_telemetry_v1771
  )
  select jsonb_build_object(
    'tracked_players',count(*),
    'active_24h',count(*) filter(where last_seen_at>now()-interval '24 hours'),
    'avg_level',coalesce(round(avg(last_level)::numeric,1),1),
    'play_seconds',coalesce(sum(play_seconds),0),
    'kills',coalesce(sum(kills),0),
    'missions_completed',coalesce(sum(missions_completed),0),
    'deaths',coalesce(sum(deaths),0),
    'credits_earned',coalesce(sum(credits_earned),0),
    'credits_spent',coalesce(sum(credits_spent),0),
    'stl_earned',coalesce(sum(stl_earned),0),
    'stl_spent',coalesce(sum(stl_spent),0),
    'xp_earned',coalesce(sum(xp_earned),0),
    'cr_per_hour',case when coalesce(sum(play_seconds),0)>0 then round(sum(credits_earned)*3600.0/sum(play_seconds))::bigint else 0 end,
    'stl_per_hour',case when coalesce(sum(play_seconds),0)>0 then round(sum(stl_earned)*3600.0/sum(play_seconds))::bigint else 0 end,
    'xp_per_hour',case when coalesce(sum(play_seconds),0)>0 then round(sum(xp_earned)*3600.0/sum(play_seconds))::bigint else 0 end,
    'cr_sink_pct',case when coalesce(sum(credits_earned),0)>0 then round(sum(credits_spent)*100.0/sum(credits_earned),1) else 0 end,
    'stl_sink_pct',case when coalesce(sum(stl_earned),0)>0 then round(sum(stl_spent)*100.0/sum(stl_earned),1) else 0 end,
    'xp_hour_p50',coalesce(round(percentile_cont(.5) within group(order by xp_h))::bigint,0),
    'xp_hour_p90',coalesce(round(percentile_cont(.9) within group(order by xp_h))::bigint,0),
    'stl_hour_p50',coalesce(round(percentile_cont(.5) within group(order by stl_h))::bigint,0),
    'cr_hour_p50',coalesce(round(percentile_cont(.5) within group(order by cr_h))::bigint,0)
  ) into v_summary
  from base;

  select coalesce(jsonb_agg(row_to_json(x) order by x.sort_order),'[]'::jsonb) into v_sources
  from (
    select 1 sort_order,'npc' key,'NPCs' label,coalesce(sum(npc_cr),0) cr,coalesce(sum(npc_stl),0) stl,coalesce(sum(npc_xp),0) xp from public.player_telemetry_v1771
    union all select 2,'mission','Missões',coalesce(sum(mission_cr),0),coalesce(sum(mission_stl),0),coalesce(sum(mission_xp),0) from public.player_telemetry_v1771
    union all select 3,'resource','Recursos',coalesce(sum(resource_cr),0),coalesce(sum(resource_stl),0),coalesce(sum(resource_xp),0) from public.player_telemetry_v1771
    union all select 4,'pass','Passe / Nível',coalesce(sum(pass_cr),0),coalesce(sum(pass_stl),0),coalesce(sum(pass_xp),0) from public.player_telemetry_v1771
    union all select 5,'event','Eventos',coalesce(sum(event_cr),0),coalesce(sum(event_stl),0),coalesce(sum(event_xp),0) from public.player_telemetry_v1771
    union all select 6,'gate','Portais',coalesce(sum(gate_cr),0),coalesce(sum(gate_stl),0),coalesce(sum(gate_xp),0) from public.player_telemetry_v1771
    union all select 7,'discovery','Exploração',coalesce(sum(discovery_cr),0),coalesce(sum(discovery_stl),0),coalesce(sum(discovery_xp),0) from public.player_telemetry_v1771
    union all select 8,'other','Outros',coalesce(sum(other_cr),0),coalesce(sum(other_stl),0),coalesce(sum(other_xp),0) from public.player_telemetry_v1771
  ) x;

  select coalesce(jsonb_agg(row_to_json(m) order by m.level),'[]'::jsonb) into v_milestones
  from (
    select
      level,
      count(*) players,
      round(avg(play_seconds))::bigint avg_seconds,
      round(percentile_cont(.5) within group(order by play_seconds))::bigint median_seconds,
      round(percentile_cont(.9) within group(order by play_seconds))::bigint p90_seconds,
      round(avg(kills))::bigint avg_kills,
      round(avg(credits_earned))::bigint avg_cr_earned,
      round(avg(stl_earned))::bigint avg_stl_earned
    from public.player_level_milestones_v1771
    where level in (2,3,5,6,7,8,10,12,15,20,25,30,40,50)
    group by level
  ) m;

  select coalesce(jsonb_agg(row_to_json(p) order by p.last_seen_at desc),'[]'::jsonb) into v_players
  from (
    select
      t.user_id::text,
      coalesce(pr.callsign,'Pilot') callsign,
      t.last_level level,
      t.selected_title,
      t.play_seconds,t.sessions,t.kills,t.missions_completed,t.deaths,t.ore_units,t.map_jumps,
      t.credits_earned,t.credits_spent,t.stl_earned,t.stl_spent,t.xp_earned,
      case when t.play_seconds>0 then round(t.credits_earned*3600.0/t.play_seconds)::bigint else 0 end cr_per_hour,
      case when t.play_seconds>0 then round(t.stl_earned*3600.0/t.play_seconds)::bigint else 0 end stl_per_hour,
      case when t.play_seconds>0 then round(t.xp_earned*3600.0/t.play_seconds)::bigint else 0 end xp_per_hour,
      t.npc_cr,t.npc_stl,t.npc_xp,
      t.mission_cr,t.mission_stl,t.mission_xp,
      t.resource_cr,t.resource_stl,t.resource_xp,
      t.pass_cr,t.pass_stl,t.pass_xp,
      t.event_cr,t.event_stl,t.event_xp,
      t.gate_cr,t.gate_stl,t.gate_xp,
      t.discovery_cr,t.discovery_stl,t.discovery_xp,
      t.other_cr,t.other_stl,t.other_xp,
      t.last_credits,t.last_stl,t.last_seen_at
    from public.player_telemetry_v1771 t
    left join public.profiles pr on pr.id=t.user_id
    order by t.last_seen_at desc
    limit 100
  ) p;

  return jsonb_build_object(
    'summary',coalesce(v_summary,'{}'::jsonb),
    'sources',coalesce(v_sources,'[]'::jsonb),
    'milestones',coalesce(v_milestones,'[]'::jsonb),
    'players',coalesce(v_players,'[]'::jsonb)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_transfer_owned_clan_v1763(p_target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_clan uuid; v_next uuid;
begin
  for v_clan in select id from public.clans where owner_id=p_target_user_id loop
    select cm.user_id into v_next from public.clan_members cm
      where cm.clan_id=v_clan and cm.user_id<>p_target_user_id
      order by cm.joined_at asc limit 1;
    if v_next is null then
      delete from public.clans where id=v_clan;
    else
      update public.clans set owner_id=v_next,updated_at=now() where id=v_clan;
      update public.clan_members set role='member' where clan_id=v_clan and user_id=p_target_user_id;
      update public.clan_members set role='owner' where clan_id=v_clan and user_id=v_next;
    end if;
  end loop;
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_unban_user_v1763(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_admin uuid:=auth.uid(); v_callsign text; v_email text;
begin
  if not public.is_game_admin_v1763(v_admin) then raise exception 'Acesso administrativo negado.'; end if;
  select coalesce(p.callsign,split_part(coalesce(u.email,''),'@',1),'Pilot'),coalesce(u.email,'') into v_callsign,v_email
    from auth.users u left join public.profiles p on p.id=u.id where u.id=p_target_user_id and u.deleted_at is null;
  if not found then raise exception 'Conta não encontrada.'; end if;
  insert into public.account_moderation_v1763(user_id,is_banned,banned_until,banned_reason,banned_by,updated_at)
  values(p_target_user_id,false,null,null,null,now())
  on conflict(user_id) do update set is_banned=false,banned_until=null,banned_reason=null,banned_by=null,updated_at=now();
  insert into public.admin_action_log_v1763(admin_user_id,target_user_id,target_callsign,target_email,action)
  values(v_admin,p_target_user_id,v_callsign,v_email,'unban');
  return jsonb_build_object('ok',true,'user_id',p_target_user_id,'callsign',v_callsign);
end;$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_auction_rules_v1908(p_nova_floor bigint, p_common_floor bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE r public.game_auction_rules_v1908%rowtype;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_nova_floor NOT BETWEEN 100000000 AND 1000000000 OR p_nova_floor % 100000<>0 OR p_common_floor NOT BETWEEN 100000 AND 10000000 OR p_common_floor % 100000<>0 THEN RAISE EXCEPTION 'Valores de leilão inválidos.'; END IF;
 UPDATE public.game_auction_rules_v1908 SET nova_floor=p_nova_floor,common_floor=p_common_floor,version=version+1,updated_at=now() WHERE id=1 RETURNING * INTO r;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'version',r.version);
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_auction_rules_v1916(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 r public.game_auction_rules_v1908%rowtype;
 v_nova bigint;v_common bigint;v_ratio bigint;v_cats jsonb;v_items jsonb;
 v_key text;v_value jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Configuração inválida.'; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1 FOR UPDATE;
 IF r.version <> COALESCE((p_payload->>'version')::bigint,-1) THEN RAISE EXCEPTION 'Outra alteração já foi publicada. Recarregue o editor e revise.'; END IF;
 v_nova:=(p_payload->>'nova_floor')::bigint;
 v_common:=(p_payload->>'common_floor')::bigint;
 v_ratio:=(p_payload->>'stl_to_credits')::bigint;
 v_cats:=p_payload->'category_multipliers';v_items:=p_payload->'item_multipliers';
 IF v_nova NOT BETWEEN 100000000 AND 1000000000 OR v_nova%100000<>0 OR v_common NOT BETWEEN 100000 AND 10000000 OR v_common%100000<>0 OR v_ratio NOT BETWEEN 100 AND 100000 THEN RAISE EXCEPTION 'Valores de conversão ou piso fora do limite.'; END IF;
 IF jsonb_typeof(v_cats)<>'object' OR (SELECT COUNT(*) FROM jsonb_object_keys(v_cats))<>8 OR jsonb_typeof(v_items)<>'object' OR (SELECT COUNT(*) FROM jsonb_object_keys(v_items))>200 THEN RAISE EXCEPTION 'A lista de multiplicadores deve ter 8 categorias e até 200 exceções.'; END IF;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each(v_cats) LOOP
   IF v_key NOT IN ('ammo','rocket','ship','laser','generator','drone','extra','petGear') OR jsonb_typeof(v_value)<>'number' THEN RAISE EXCEPTION 'Categoria inválida: %',v_key; END IF;
   IF (v_value::text)::numeric NOT BETWEEN .01 AND 15 THEN RAISE EXCEPTION 'Multiplicador de % inválido.',v_key; END IF;
 END LOOP;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each(v_items) LOOP
   IF v_key !~ '^(ammo|rocket|ship|item|petGear):[a-zA-Z0-9_]+$' OR jsonb_typeof(v_value)<>'number' THEN RAISE EXCEPTION 'Exceção inválida: %',v_key; END IF;
   IF (v_value::text)::numeric NOT BETWEEN .01 AND 15 THEN RAISE EXCEPTION 'Multiplicador de % inválido.',v_key; END IF;
 END LOOP;
 UPDATE public.game_auction_rules_v1908 SET nova_floor=v_nova,common_floor=v_common,stl_to_credits=v_ratio,
 category_multipliers=v_cats,item_multipliers=v_items,version=version+1,updated_at=now() WHERE id=1 RETURNING * INTO r;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'stl_to_credits',r.stl_to_credits,
  'category_multipliers',r.category_multipliers,'item_multipliers',r.item_multipliers,'version',r.version);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_battle_pass_season_v1817b(p_season_key text, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_tier_count integer DEFAULT NULL::integer, p_points_per_tier integer DEFAULT NULL::integer, p_daily_points integer DEFAULT NULL::integer, p_premium_price_brl numeric DEFAULT NULL::numeric, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_battle_pass_seasons_v1817b
  set name=case when p_name is null or trim(p_name)='' then name else left(trim(p_name),80) end,
      description=case when p_description is null then description else left(trim(p_description),240) end,
      starts_at=case when p_starts_at is null then starts_at else p_starts_at end,
      ends_at=case when p_ends_at is null then ends_at else p_ends_at end,
      tier_count=case when p_tier_count is null then tier_count else greatest(1,least(100,p_tier_count)) end,
      points_per_tier=case when p_points_per_tier is null then points_per_tier else greatest(1,least(1000000,p_points_per_tier)) end,
      daily_points=case when p_daily_points is null then daily_points else greatest(1,least(100000,p_daily_points)) end,
      premium_price_brl=case when p_premium_price_brl is null then premium_price_brl else greatest(0,least(99999,p_premium_price_brl)) end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      updated_at=now()
  where season_key=p_season_key;
  if not found then raise exception 'Temporada não encontrada.'; end if;
  if exists(select 1 from public.game_battle_pass_seasons_v1817b where season_key=p_season_key and ends_at<=starts_at) then
    raise exception 'O fim da temporada precisa ser posterior ao início.';
  end if;
  return public.get_battle_pass_runtime_config_v1817b();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_battle_pass_tier_v1817b(p_season_key text, p_tier_no integer, p_free_reward jsonb DEFAULT NULL::jsonb, p_premium_reward jsonb DEFAULT NULL::jsonb, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.game_battle_pass_seasons_v1817b where season_key=p_season_key) then raise exception 'Temporada não encontrada.'; end if;
  insert into public.game_battle_pass_tiers_v1817b(season_key,tier_no,free_reward,premium_reward,enabled,updated_at)
  values(p_season_key,greatest(1,least(100,p_tier_no)),coalesce(p_free_reward,'{}'::jsonb),coalesce(p_premium_reward,'{}'::jsonb),coalesce(p_enabled,true),now())
  on conflict(season_key,tier_no) do update
  set free_reward=case when p_free_reward is null then public.game_battle_pass_tiers_v1817b.free_reward else p_free_reward end,
      premium_reward=case when p_premium_reward is null then public.game_battle_pass_tiers_v1817b.premium_reward else p_premium_reward end,
      enabled=case when p_enabled is null then public.game_battle_pass_tiers_v1817b.enabled else p_enabled end,
      updated_at=now();
  return public.get_battle_pass_runtime_config_v1817b();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_bonus_box_config_v1825(p_config jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
  v_reward jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_gate jsonb;
  v_maps jsonb := '{}'::jsonb;
  v_prices jsonb := '{}'::jsonb;
  v_limit integer;
  v_min integer;
  v_max integer;
  v_weight numeric;
  v_total numeric := 0;
  v_labels text[] := ARRAY['lcb10','mcb25','mcb50','sab50','credits','uridium','stellarDust'];
  v_kind text;
  v_id text;
  v_idx integer;
  v_respawn_min integer;
  v_respawn_max integer;
  v_discount integer;
  v_clean jsonb;
  v_out jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
    RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_config)<>'object' THEN
    RAISE EXCEPTION 'Configuração deve ser um objeto JSON.';
  END IF;
  IF jsonb_typeof(p_config->'map_counts') <> 'object'
     OR jsonb_typeof(p_config->'gate_prices') <> 'object'
     OR jsonb_typeof(p_config->'rewards') <> 'array'
     OR jsonb_array_length(p_config->'rewards') <> 7 THEN
    RAISE EXCEPTION 'Mapas, preços e as sete recompensas são obrigatórios.';
  END IF;
  FOR v_key IN SELECT unnest(ARRAY['x1','x2','x3','x4','x5','x6','x7','x8','b41','b42','b43']) LOOP
    IF (p_config->'map_counts'->>v_key) IS NULL OR (p_config->'map_counts'->>v_key) !~ '^[0-9]{1,3}$' THEN
      RAISE EXCEPTION 'Quantidade inválida para o mapa %.',v_key;
    END IF;
    v_limit := (p_config->'map_counts'->>v_key)::integer;
    IF v_limit>100 THEN RAISE EXCEPTION 'Máximo de 100 caixas para o mapa %.',v_key; END IF;
    v_maps := v_maps || jsonb_build_object(v_key,v_limit);
  END LOOP;
  v_respawn_min := (p_config->>'respawn_min_ms')::integer;
  v_respawn_max := (p_config->>'respawn_max_ms')::integer;
  IF v_respawn_min IS NULL OR v_respawn_max IS NULL
    OR v_respawn_min<5000 OR v_respawn_max>3600000 OR v_respawn_max<v_respawn_min THEN
    RAISE EXCEPTION 'Respawn precisa ser entre 5 e 3600 segundos, com mínimo <= máximo.';
  END IF;
  v_discount := (p_config->>'premium_discount_pct')::integer;
  IF v_discount IS NULL OR v_discount<0 OR v_discount>50 THEN
    RAISE EXCEPTION 'Desconto Premium permitido: 0 a 50 por cento.';
  END IF;
  FOR v_key IN SELECT unnest(ARRAY['alpha','beta','gamma']) LOOP
    v_gate := p_config->'gate_prices'->v_key;
    IF jsonb_typeof(v_gate)<>'object' THEN RAISE EXCEPTION 'Preço ausente: %.',v_key; END IF;
    v_min := (v_gate->>'stl')::integer;
    v_max := (v_gate->>'dust')::integer;
    IF v_min IS NULL OR v_min<1 OR v_min>100000 OR v_max IS NULL OR v_max<1 OR v_max>100 THEN
      RAISE EXCEPTION 'Preço inválido do portal % (STL: 1..100000, Poeira: 1..100).',v_key;
    END IF;
    v_prices := v_prices || jsonb_build_object(v_key,jsonb_build_object('stl',v_min,'dust',v_max));
  END LOOP;
  FOR v_idx IN 0..6 LOOP
    v_reward := p_config->'rewards'->v_idx;
    IF jsonb_typeof(v_reward)<>'object' THEN RAISE EXCEPTION 'Prêmio % inválido.',v_idx+1; END IF;
    v_id := v_labels[v_idx+1];
    v_kind := CASE WHEN v_idx<4 THEN 'ammo' ELSE v_id END;
    IF v_reward->>'kind'<>v_kind OR (v_idx<4 AND v_reward->>'id'<>v_id) THEN
      RAISE EXCEPTION 'Tipo de recompensa % não corresponde ao padrão permitido.',v_idx+1;
    END IF;
    v_min := (v_reward->>'min')::integer;
    v_max := (v_reward->>'max')::integer;
    v_weight := (v_reward->>'weight')::numeric;
    IF v_min IS NULL OR v_max IS NULL OR v_weight IS NULL
      OR v_min<1 OR v_max<v_min OR v_weight<0 OR v_weight>100 THEN
      RAISE EXCEPTION 'Intervalo/chance inválido na recompensa %.',v_id;
    END IF;
    IF v_max > (CASE WHEN v_kind='credits' THEN 10000000 WHEN v_kind='uridium' THEN 100000 WHEN v_kind='stellarDust' THEN 100 ELSE 1000000 END) THEN
      RAISE EXCEPTION 'Quantidade máxima de % excedida.',v_id;
    END IF;
    v_total := v_total + v_weight;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('kind',v_kind,'min',v_min,'max',v_max,'weight',v_weight)
      || CASE WHEN v_kind='ammo' THEN jsonb_build_object('id',v_id) ELSE '{}'::jsonb END);
  END LOOP;
  IF v_total<=0 THEN RAISE EXCEPTION 'Pelo menos uma recompensa deve ter chance maior que zero.'; END IF;
  v_clean := jsonb_build_object('map_counts',v_maps,'respawn_min_ms',v_respawn_min,
    'respawn_max_ms',v_respawn_max,'premium_discount_pct',v_discount,
    'gate_prices',v_prices,'rewards',v_rows);
  UPDATE public.bonus_box_config_v1825
    SET config=v_clean,version=version+1,updated_at=now(),updated_by=v_uid
    WHERE id=1;
  -- O cadastro de preços do LIVE OPS continua sincronizado com o painel.
  UPDATE public.live_shop_prices_v16 AS p
    SET price=(v_prices->split_part(p.catalog_key,':',2)->>'stl')::integer,updated_at=now()
    WHERE p.catalog_key IN ('gate_spin:alpha','gate_spin:beta','gate_spin:gamma')
      AND p.kind='gate_spin' AND p.currency='uridium';
  RETURN public.get_bonus_box_config_v1825();
END;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_common_shop_item_v1817c(p_catalog_key text, p_display_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_price bigint DEFAULT NULL::bigint, p_currency text DEFAULT NULL::text, p_quantity integer DEFAULT NULL::integer, p_min_level integer DEFAULT NULL::integer, p_sort_order integer DEFAULT NULL::integer, p_shop_tab text DEFAULT NULL::text, p_shop_visible boolean DEFAULT NULL::boolean, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_kind text;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select kind into v_kind from public.live_shop_prices_v16 where catalog_key=p_catalog_key;
  if v_kind is null or v_kind not in ('ship','laser','generator','drone','pet','pet_gear','extra','ammo','rocket') then
    raise exception 'Produto da Loja Comum inválido.';
  end if;
  if p_currency is not null and p_currency not in ('credits','uridium') then raise exception 'Moeda inválida.'; end if;
  if p_shop_tab is not null and p_shop_tab not in ('ships','lasers','generators','drones','pet','extras','ammo','rockets') then
    raise exception 'Aba da loja inválida.';
  end if;

  update public.live_shop_prices_v16
  set display_name=case when p_display_name is null then display_name else nullif(trim(p_display_name),'') end,
      description=case when p_description is null then description else nullif(trim(p_description),'') end,
      price=case when p_price is null then price else greatest(0,p_price) end,
      currency=case when p_currency is null then currency else p_currency end,
      min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
      sort_order=case when p_sort_order is null then sort_order else greatest(0,least(9999,p_sort_order)) end,
      shop_tab=case when p_shop_tab is null then shop_tab else p_shop_tab end,
      shop_visible=case when p_shop_visible is null then shop_visible else p_shop_visible end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      meta=case when p_quantity is null then meta else
        jsonb_set(
          coalesce(meta,'{}'::jsonb),
          '{grant}',
          coalesce(meta->'grant','{}'::jsonb) || jsonb_build_object('qty',greatest(1,least(10000000,p_quantity))),
          true
        )
      end,
      updated_at=now()
  where catalog_key=p_catalog_key;

  return public.get_shops_runtime_config_v1817c();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_crafting_recipe_v1815(p_recipe_id text, p_cost bigint DEFAULT NULL::bigint, p_currency text DEFAULT NULL::text, p_ingredients jsonb DEFAULT NULL::jsonb, p_grant_payload jsonb DEFAULT NULL::jsonb, p_output_label text DEFAULT NULL::text, p_min_level integer DEFAULT NULL::integer, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_crafting_recipe_v1815
  set cost=case when p_cost is null then cost else greatest(0,p_cost) end,
      currency=case when p_currency is null then currency when p_currency in ('credits','uridium') then p_currency else currency end,
      ingredients=case when p_ingredients is null then ingredients else p_ingredients end,
      grant_payload=case when p_grant_payload is null then grant_payload else p_grant_payload end,
      output_label=case when p_output_label is null or trim(p_output_label)='' then output_label else trim(p_output_label) end,
      min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      updated_at=now()
  where recipe_id=p_recipe_id;
  if not found then raise exception 'Receita não encontrada.'; end if;
  return public.get_systems_runtime_config_v1815();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_drone_multiplier_v1829(p_type text, p_multiplier numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_uid uuid:=auth.uid();v_updated jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE='42501';END IF;
 IF p_type NOT IN ('flax','iris') OR p_multiplier IS NULL OR p_multiplier<1 OR p_multiplier>4 THEN RAISE EXCEPTION 'Multiplicador inválido: permitido 1 a 4.';END IF;
 UPDATE public.live_shop_prices_v16 SET meta=jsonb_set(coalesce(meta,'{}'::jsonb),'{drone_price_multiplier}',to_jsonb(p_multiplier),true),updated_at=now()
 WHERE catalog_key='drone:'||p_type AND kind='drone' RETURNING meta INTO v_updated;
 IF NOT FOUND THEN RAISE EXCEPTION 'Drone não encontrado.';END IF;
 RETURN v_updated;
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_economy_service_v1815(p_service_id text, p_base_cost bigint DEFAULT NULL::bigint, p_duration_ms integer DEFAULT NULL::integer, p_level_cost_scale numeric DEFAULT NULL::numeric, p_max_stack_ms integer DEFAULT NULL::integer, p_effect jsonb DEFAULT NULL::jsonb, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_economy_service_v1815
  set base_cost=case when p_base_cost is null then base_cost else greatest(0,p_base_cost) end,
      duration_ms=case when p_duration_ms is null then duration_ms else greatest(60000,least(86400000,p_duration_ms)) end,
      level_cost_scale=case when p_level_cost_scale is null then level_cost_scale else greatest(0,least(10,p_level_cost_scale)) end,
      max_stack_ms=case when p_max_stack_ms is null then max_stack_ms else greatest(60000,least(604800000,p_max_stack_ms)) end,
      effect=case when p_effect is null then effect else p_effect end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      updated_at=now()
  where service_id=p_service_id;
  if not found then raise exception 'Serviço econômico não encontrado.'; end if;
  return public.get_systems_runtime_config_v1815();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_feature_flag_v1810(p_flag_key text, p_enabled boolean DEFAULT NULL::boolean, p_config jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_feature_flags_v1810
  set enabled=coalesce(p_enabled,enabled),
      config=coalesce(p_config,config),
      updated_at=now()
  where flag_key=p_flag_key;
  if not found then raise exception 'Feature flag não encontrada.'; end if;
  return public.get_game_runtime_config_v1810();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_galaxy_gate_config_v1906(p_key text, p_gate jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_round jsonb; v_wave jsonb; v_reward jsonb; v_key text; v_number numeric;
 v_i integer; v_j integer; v_count integer; v_total integer:=0;
 v_npcs text[]:=ARRAY['streuner','recruitStreuner','aiderStreuner','bossStreuner','lordakia','bossLordakia','saimon','bossSaimon','mordon','bossMordon','devolarium','bossDevolarium','sibelon','bossSibelon','emberFang','bossEmberFang','ironWasp','bossIronWasp','riftMauler','bossRiftMauler','obsidianPike','bossObsidianPike','sentinelScavenger','sentinelScout','sentinelSupport','riftScout','bossRiftScout','voidCorsair','bossVoidCorsair','nexusWarden','bossNexusWarden','astralReaper','bossAstralReaper'];
 v_out jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
   RAISE EXCEPTION 'Permissao administrativa negada.' USING ERRCODE='42501';
 END IF;
 IF p_key NOT IN ('alpha','beta','gamma') OR jsonb_typeof(p_gate)<>'object'
   OR jsonb_typeof(p_gate->'rounds')<>'array' THEN
   RAISE EXCEPTION 'Portal/estrutura invalidos.';
 END IF;
 IF jsonb_array_length(p_gate->'rounds') NOT BETWEEN 1 AND 20 THEN
   RAISE EXCEPTION 'Informe entre 1 e 20 rounds.';
 END IF;
 FOREACH v_key IN ARRAY ARRAY['waveIntervalMs','roundIntervalMs'] LOOP
   IF coalesce(p_gate->>v_key,'') !~ '^[0-9]{4,6}$' THEN RAISE EXCEPTION 'Tempo % invalido.',v_key; END IF;
   IF (p_gate->>v_key)::integer NOT BETWEEN 2000 AND 120000 THEN RAISE EXCEPTION 'Tempo % fora do limite.',v_key; END IF;
 END LOOP;
 FOREACH v_key IN ARRAY ARRAY['enemyScale','damageScale','rewardScale','totalRewardMult'] LOOP
   IF coalesce(p_gate->>v_key,'') !~ '^[0-9]{1,2}(\.[0-9]{1,2})?$' THEN RAISE EXCEPTION 'Escala % invalida.',v_key; END IF;
   v_number:=(p_gate->>v_key)::numeric;
   IF v_number<0.25 OR v_number>3 THEN RAISE EXCEPTION 'Escala % fora de 0.25..3.',v_key; END IF;
 END LOOP;
 FOR v_i IN 0..jsonb_array_length(p_gate->'rounds')-1 LOOP
   v_round:=p_gate->'rounds'->v_i;
   IF jsonb_typeof(v_round)<>'object' OR length(coalesce(v_round->>'name','')) NOT BETWEEN 1 AND 60
     OR jsonb_typeof(v_round->'waves')<>'array' THEN RAISE EXCEPTION 'Round % invalido.',v_i+1; END IF;
   IF jsonb_array_length(v_round->'waves') NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Round %: configure 1 a 12 ondas.',v_i+1; END IF;
   FOR v_j IN 0..jsonb_array_length(v_round->'waves')-1 LOOP
     v_wave:=v_round->'waves'->v_j;
     IF jsonb_typeof(v_wave)<>'object' OR NOT (coalesce(v_wave->>'type','')=ANY(v_npcs))
       OR coalesce(v_wave->>'count','') !~ '^[0-9]{1,2}$' THEN
       RAISE EXCEPTION 'NPC/quantidade invalidos no round %, onda %.',v_i+1,v_j+1;
     END IF;
     v_count:=(v_wave->>'count')::integer;
     IF v_count NOT BETWEEN 1 AND 15 THEN RAISE EXCEPTION 'Quantidade permitida: 1 a 15 NPCs por onda.'; END IF;
     v_total:=v_total+v_count;
   END LOOP;
 END LOOP;
 IF v_total>240 THEN RAISE EXCEPTION 'Maximo de 240 NPCs somados por portal.'; END IF;
 FOR v_reward IN SELECT p_gate->'roundReward' UNION ALL SELECT p_gate->'finalReward' LOOP
   IF jsonb_typeof(v_reward)<>'object' THEN RAISE EXCEPTION 'Recompensa invalida.'; END IF;
   FOREACH v_key IN ARRAY ARRAY['credits','uridium','cores','ammoQty','rocketQty','voidite'] LOOP
     IF coalesce(v_reward->>v_key,'') !~ '^[0-9]{1,11}$' THEN RAISE EXCEPTION 'Quantidade % invalida.',v_key; END IF;
     v_number:=(v_reward->>v_key)::numeric;
     IF v_number>(CASE v_key WHEN 'credits' THEN 100000000 WHEN 'uridium' THEN 100000 WHEN 'cores' THEN 1000 WHEN 'ammoQty' THEN 50000 WHEN 'rocketQty' THEN 2000 WHEN 'voidite' THEN 500 ELSE 0 END) THEN
       RAISE EXCEPTION 'Recompensa % acima do limite.',v_key;
     END IF;
   END LOOP;
   IF coalesce(v_reward->>'ammoId','') NOT IN ('','lcb10','mcb25','mcb50','ucb100','sab50')
    OR coalesce(v_reward->>'rocketId','') NOT IN ('','r310','plt2026','plt2021','plt3030') THEN
    RAISE EXCEPTION 'Tipo de municao/missil invalido.';
   END IF;
 END LOOP;
 -- Salva somente as chaves permitidas; o servidor valida o mesmo contrato antes do POST.
 UPDATE public.galaxy_gate_config_v1906 SET
   config=jsonb_set(config,ARRAY[p_key],jsonb_build_object(
    'rounds',p_gate->'rounds','waveIntervalMs',(p_gate->>'waveIntervalMs')::integer,
    'roundIntervalMs',(p_gate->>'roundIntervalMs')::integer,
    'enemyScale',(p_gate->>'enemyScale')::numeric,
    'damageScale',(p_gate->>'damageScale')::numeric,
    'rewardScale',(p_gate->>'rewardScale')::numeric,
    'totalRewardMult',(p_gate->>'totalRewardMult')::numeric,
    'roundReward',p_gate->'roundReward','finalReward',p_gate->'finalReward'),true),
   version=version+1,updated_at=now(),updated_by=auth.uid()
 WHERE id=1;
 RETURN public.get_galaxy_gate_config_v1906();
END;$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_live_event_schedule_v1817a(p_event_key text, p_enabled boolean DEFAULT NULL::boolean, p_schedule_mode text DEFAULT NULL::text, p_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_duration_minutes integer DEFAULT NULL::integer, p_repeat_minutes integer DEFAULT NULL::integer, p_weekdays integer[] DEFAULT NULL::integer[], p_start_local_time text DEFAULT NULL::text, p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_clear_ends_at boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_days smallint[];
  v_time time;
  v_mode text;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.live_event_config_v16 where event_key=p_event_key) then raise exception 'Evento não encontrado.'; end if;

  if p_schedule_mode is not null and p_schedule_mode not in ('interval','weekly','once') then
    raise exception 'Modo de agenda inválido.';
  end if;

  if p_weekdays is not null then
    select coalesce(array_agg(distinct x::smallint order by x::smallint),'{}'::smallint[])
      into v_days
      from unnest(p_weekdays) x
      where x between 0 and 6;
  end if;

  if p_start_local_time is not null and btrim(p_start_local_time)<>'' then
    begin
      v_time:=p_start_local_time::time;
    exception when others then
      raise exception 'Horário local inválido.';
    end;
  end if;

  update public.live_event_config_v16
  set enabled=case when p_enabled is null then enabled else p_enabled end,
      schedule_mode=case when p_schedule_mode is null then schedule_mode else p_schedule_mode end,
      starts_at=case when p_starts_at is null then starts_at else p_starts_at end,
      duration_minutes=case when p_duration_minutes is null then duration_minutes else greatest(1,least(10080,p_duration_minutes)) end,
      repeat_minutes=case when p_repeat_minutes is null then repeat_minutes else greatest(1,least(10080,p_repeat_minutes)) end,
      weekdays=case when p_weekdays is null then weekdays else coalesce(v_days,'{}'::smallint[]) end,
      start_local_time=case when p_start_local_time is null then start_local_time else v_time end,
      timezone='America/Sao_Paulo',
      ends_at=case when p_clear_ends_at then null when p_ends_at is null then ends_at else p_ends_at end,
      updated_at=now()
  where event_key=p_event_key;

  select schedule_mode into v_mode from public.live_event_config_v16 where event_key=p_event_key;
  if v_mode='weekly' and (
    coalesce(array_length((select weekdays from public.live_event_config_v16 where event_key=p_event_key),1),0)=0
    or (select start_local_time is null from public.live_event_config_v16 where event_key=p_event_key)
  ) then
    raise exception 'Agenda semanal precisa de pelo menos um dia e um horário.';
  end if;

  return public.get_live_ops_v16();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_map_npc_spawn_v1811(p_map_id text, p_npc_key text, p_spawn_count integer DEFAULT NULL::integer, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.game_npc_config_v1811 where npc_key=p_npc_key) then raise exception 'NPC não encontrado.'; end if;
  insert into public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled,updated_at)
  values(trim(p_map_id),p_npc_key,greatest(0,least(500,coalesce(p_spawn_count,0))),coalesce(p_enabled,true),now())
  on conflict(map_id,npc_key) do update
  set spawn_count=coalesce(greatest(0,least(500,p_spawn_count)),public.game_map_npc_spawns_v1811.spawn_count),
      enabled=coalesce(p_enabled,public.game_map_npc_spawns_v1811.enabled),
      updated_at=now();
  return public.get_npc_runtime_config_v1811();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_map_resource_pool_v1816(p_map_id text, p_resource_key text, p_weight numeric DEFAULT NULL::numeric, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.game_map_config_v1814 where map_id=p_map_id) then raise exception 'Mapa não encontrado.'; end if;
  if not exists(select 1 from public.game_resource_config_v1814 where resource_key=p_resource_key) then raise exception 'Recurso não encontrado.'; end if;

  insert into public.game_map_resource_pool_v1814(map_id,resource_key,weight,enabled,updated_at)
  values(trim(p_map_id),trim(p_resource_key),
    case when p_weight is null then 1 else greatest(.01,least(1000,p_weight)) end,
    coalesce(p_enabled,true),now())
  on conflict(map_id,resource_key) do update
  set weight=case when p_weight is null then public.game_map_resource_pool_v1814.weight else greatest(.01,least(1000,p_weight)) end,
      enabled=case when p_enabled is null then public.game_map_resource_pool_v1814.enabled else p_enabled end,
      updated_at=now();

  return public.get_world_runtime_config_v1814();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_map_v1814(p_map_id text, p_name text DEFAULT NULL::text, p_risk text DEFAULT NULL::text, p_world_w integer DEFAULT NULL::integer, p_world_h integer DEFAULT NULL::integer, p_enemy_multiplier numeric DEFAULT NULL::numeric, p_ore_count integer DEFAULT NULL::integer, p_ore_respawn_min_ms integer DEFAULT NULL::integer, p_ore_respawn_max_ms integer DEFAULT NULL::integer, p_landmark_count integer DEFAULT NULL::integer, p_min_level integer DEFAULT NULL::integer, p_enabled boolean DEFAULT NULL::boolean, p_palette jsonb DEFAULT NULL::jsonb, p_structures jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_map_config_v1814 set
  name=case when p_name is null or trim(p_name)='' then name else trim(p_name) end,
  risk=case when p_risk is null or trim(p_risk)='' then risk else trim(p_risk) end,
  world_w=case when p_world_w is null then world_w else greatest(1000,least(50000,p_world_w)) end,
  world_h=case when p_world_h is null then world_h else greatest(1000,least(50000,p_world_h)) end,
  enemy_multiplier=case when p_enemy_multiplier is null then enemy_multiplier else greatest(.1,least(10,p_enemy_multiplier)) end,
  ore_count=case when p_ore_count is null then ore_count else greatest(0,least(1000,p_ore_count)) end,
  ore_respawn_min_ms=case when p_ore_respawn_min_ms is null then ore_respawn_min_ms else greatest(1000,least(600000,p_ore_respawn_min_ms)) end,
  ore_respawn_max_ms=case when p_ore_respawn_max_ms is null then ore_respawn_max_ms else greatest(1000,least(600000,p_ore_respawn_max_ms)) end,
  landmark_count=case when p_landmark_count is null then landmark_count else greatest(0,least(100,p_landmark_count)) end,
  min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
  enabled=case when p_enabled is null then enabled else p_enabled end,
  palette=case when p_palette is null then palette else p_palette end,
  structures=case when p_structures is null then structures else p_structures end,
  updated_at=now()
 where map_id=p_map_id;
 if not found then raise exception 'Mapa não encontrado.'; end if;
 if exists(select 1 from public.game_map_config_v1814 where map_id=p_map_id and ore_respawn_max_ms<ore_respawn_min_ms) then
   raise exception 'Respawn máximo deve ser maior ou igual ao mínimo.';
 end if;
 return public.get_world_runtime_config_v1814();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_mission_category_v1815(p_category text, p_min_level integer DEFAULT NULL::integer, p_reward_factor numeric DEFAULT NULL::numeric, p_item_chance numeric DEFAULT NULL::numeric, p_enabled boolean DEFAULT NULL::boolean, p_config jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_mission_category_v1815
  set min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
      reward_factor=case when p_reward_factor is null then reward_factor else greatest(0,least(10,p_reward_factor)) end,
      item_chance=case when p_item_chance is null then item_chance else greatest(0,least(1,p_item_chance)) end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      config=case when p_config is null then config else p_config end,
      updated_at=now()
  where category=p_category;
  if not found then raise exception 'Categoria de missão não encontrada.'; end if;
  return public.get_systems_runtime_config_v1815();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_npc_v1811(p_npc_key text, p_name text DEFAULT NULL::text, p_hp bigint DEFAULT NULL::bigint, p_shield bigint DEFAULT NULL::bigint, p_credits bigint DEFAULT NULL::bigint, p_stl bigint DEFAULT NULL::bigint, p_xp bigint DEFAULT NULL::bigint, p_speed numeric DEFAULT NULL::numeric, p_damage bigint DEFAULT NULL::bigint, p_color text DEFAULT NULL::text, p_size numeric DEFAULT NULL::numeric, p_resources jsonb DEFAULT NULL::jsonb, p_respawn_min_ms integer DEFAULT NULL::integer, p_respawn_max_ms integer DEFAULT NULL::integer, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;

  update public.game_npc_config_v1811
  set name=case when p_name is null or trim(p_name)='' then name else trim(p_name) end,
      hp=case when p_hp is null then hp else greatest(1,p_hp) end,
      shield=case when p_shield is null then shield else greatest(0,p_shield) end,
      credits=case when p_credits is null then credits else greatest(0,p_credits) end,
      stl=case when p_stl is null then stl else greatest(0,p_stl) end,
      xp=case when p_xp is null then xp else greatest(0,p_xp) end,
      speed=case when p_speed is null then speed else greatest(1,least(1000,p_speed)) end,
      damage=case when p_damage is null then damage else greatest(0,p_damage) end,
      color=case when p_color is null or trim(p_color)='' then color else trim(p_color) end,
      size=case when p_size is null then size else greatest(4,least(250,p_size)) end,
      resources=case when p_resources is null then resources else p_resources end,
      respawn_min_ms=case when p_respawn_min_ms is null then respawn_min_ms else greatest(1000,least(600000,p_respawn_min_ms)) end,
      respawn_max_ms=case when p_respawn_max_ms is null then respawn_max_ms else greatest(1000,least(600000,p_respawn_max_ms)) end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      updated_at=now()
  where npc_key=p_npc_key;

  if not found then raise exception 'NPC não encontrado.'; end if;
  if exists(select 1 from public.game_npc_config_v1811 where npc_key=p_npc_key and respawn_max_ms<respawn_min_ms) then
    raise exception 'Respawn máximo deve ser maior ou igual ao mínimo.';
  end if;

  return public.get_npc_runtime_config_v1811();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_portal_link_v1814(p_portal_key text, p_enabled boolean DEFAULT NULL::boolean, p_bidirectional boolean DEFAULT NULL::boolean, p_sort_order integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_portal_links_v1814 set
  enabled=case when p_enabled is null then enabled else p_enabled end,
  bidirectional=case when p_bidirectional is null then bidirectional else p_bidirectional end,
  sort_order=case when p_sort_order is null then sort_order else greatest(0,least(9999,p_sort_order)) end,
  updated_at=now()
 where portal_key=p_portal_key;
 if not found then raise exception 'Portal não encontrado.'; end if;
 return public.get_world_runtime_config_v1814();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_premium_shop_item_v1817c(p_product_id text, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_price_brl numeric DEFAULT NULL::numeric, p_quantity integer DEFAULT NULL::integer, p_min_level integer DEFAULT NULL::integer, p_sort_order integer DEFAULT NULL::integer, p_active boolean DEFAULT NULL::boolean, p_days integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_category text;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select category into v_category from public.premium_catalog_v12 where id=p_product_id;
  if v_category is null then raise exception 'Produto Premium inválido.'; end if;

  update public.premium_catalog_v12
  set name=case when p_name is null or trim(p_name)='' then name else left(trim(p_name),100) end,
      description=case when p_description is null then description else left(trim(p_description),300) end,
      price_brl=case when p_price_brl is null or v_category='battle_pass' then price_brl else greatest(0,least(99999,p_price_brl)) end,
      quantity=case when p_quantity is null then quantity else greatest(1,least(10000000,p_quantity)) end,
      min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
      sort_order=case when p_sort_order is null then sort_order else greatest(0,least(9999,p_sort_order)) end,
      active=case when p_active is null then active else p_active end,
      meta=case when p_days is null or v_category<>'premium' then meta
        else coalesce(meta,'{}'::jsonb) || jsonb_build_object('days',greatest(1,least(3650,p_days))) end
  where id=p_product_id;

  return public.get_shops_runtime_config_v1817c();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_update_resource_v1814(p_resource_key text, p_name text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_sell_price bigint DEFAULT NULL::bigint, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_resource_config_v1814 set
  name=case when p_name is null or trim(p_name)='' then name else trim(p_name) end,
  color=case when p_color is null or trim(p_color)='' then color else trim(p_color) end,
  sell_price=case when p_sell_price is null then sell_price else greatest(0,p_sell_price) end,
  enabled=case when p_enabled is null then enabled else p_enabled end,
  updated_at=now()
 where resource_key=p_resource_key;
 if not found then raise exception 'Recurso não encontrado.'; end if;
 return public.get_world_runtime_config_v1814();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_sector_v1814(p_sector_label text, p_graph_x numeric DEFAULT NULL::numeric, p_graph_y numeric DEFAULT NULL::numeric, p_min_level integer DEFAULT NULL::integer, p_enabled boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_sector_nodes_v1814 set
  graph_x=case when p_graph_x is null then graph_x else greatest(0,least(100,p_graph_x)) end,
  graph_y=case when p_graph_y is null then graph_y else greatest(0,least(100,p_graph_y)) end,
  min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
  enabled=case when p_enabled is null then enabled else p_enabled end,
  updated_at=now()
 where sector_label=p_sector_label;
 if not found then raise exception 'Setor não encontrado.'; end if;
 return public.get_world_runtime_config_v1814();
end; $function$
;
CREATE OR REPLACE FUNCTION public.admin_update_ui_module_v1810(p_module_key text, p_label text DEFAULT NULL::text, p_sort_order integer DEFAULT NULL::integer, p_min_level integer DEFAULT NULL::integer, p_enabled boolean DEFAULT NULL::boolean, p_hide_until_level boolean DEFAULT NULL::boolean, p_config jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_ui_modules_v1810
  set label=coalesce(nullif(trim(p_label),''),label),
      sort_order=coalesce(p_sort_order,sort_order),
      min_level=coalesce(greatest(1,least(100,p_min_level)),min_level),
      enabled=coalesce(p_enabled,enabled),
      hide_until_level=coalesce(p_hide_until_level,hide_until_level),
      config=coalesce(p_config,config),
      updated_at=now()
  where module_key=p_module_key;
  if not found then raise exception 'Módulo não encontrado.'; end if;
  return public.get_game_runtime_config_v1810();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_upsert_custom_mission_v1815(p_mission_id text, p_category text, p_title text, p_description text, p_tasks jsonb, p_group_key text DEFAULT 'mix'::text, p_sequence boolean DEFAULT false, p_reward_factor numeric DEFAULT NULL::numeric, p_tag text DEFAULT NULL::text, p_flat_reward jsonb DEFAULT NULL::jsonb, p_enabled boolean DEFAULT true, p_sort_order integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.game_mission_category_v1815 where category=p_category) then raise exception 'Categoria inválida.'; end if;
  if jsonb_typeof(coalesce(p_tasks,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_tasks,'[]'::jsonb))=0 then raise exception 'A missão precisa de pelo menos uma tarefa.'; end if;

  insert into public.game_mission_custom_v1815(
    mission_id,category,title,description,tasks,group_key,sequence,reward_factor,tag,flat_reward,enabled,sort_order,updated_at
  ) values(
    left(trim(p_mission_id),80),p_category,left(trim(p_title),100),left(trim(p_description),260),p_tasks,
    left(coalesce(nullif(trim(p_group_key),''),'mix'),24),coalesce(p_sequence,false),
    case when p_reward_factor is null then null else greatest(0,least(10,p_reward_factor)) end,
    case when p_tag is null then null else left(trim(p_tag),64) end,p_flat_reward,coalesce(p_enabled,true),coalesce(p_sort_order,100),now()
  )
  on conflict(mission_id) do update set
    category=excluded.category,title=excluded.title,description=excluded.description,tasks=excluded.tasks,
    group_key=excluded.group_key,sequence=excluded.sequence,reward_factor=excluded.reward_factor,
    tag=excluded.tag,flat_reward=excluded.flat_reward,enabled=excluded.enabled,sort_order=excluded.sort_order,updated_at=now();

  return public.get_systems_runtime_config_v1815();
end; $function$
;
CREATE OR REPLACE FUNCTION public.arena_attack(p_target_user_id uuid)
 RETURNS TABLE(won boolean, rounds integer, attacks_left integer, opponent_callsign text, attacker_remaining bigint, defender_remaining bigint, attacker_rating integer, defender_rating integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  a public.arena_profiles%rowtype;
  d public.arena_profiles%rowtype;
  daily public.arena_daily%rowtype;
  a_pool numeric;
  d_pool numeric;
  a_hit numeric;
  d_hit numeric;
  r integer := 0;
  v_winner uuid;
  v_won boolean;
  a_rating integer;
  d_rating integer;
begin
  if v_uid is null then raise exception 'Sessão ausente.'; end if;
  if p_target_user_id is null or p_target_user_id=v_uid then raise exception 'Adversário inválido.'; end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || v_day::text));

  select * into a from public.arena_profiles where user_id=v_uid for update;
  if a.user_id is null then raise exception 'Abra a Arena novamente para sincronizar sua nave.'; end if;

  select * into d from public.arena_profiles where user_id=p_target_user_id;
  if d.user_id is null then raise exception 'Adversário indisponível.'; end if;

  insert into public.arena_daily(user_id,battle_date,attacks_used)
  values(v_uid,v_day,0)
  on conflict(user_id,battle_date) do nothing;

  select * into daily
  from public.arena_daily
  where user_id=v_uid and battle_date=v_day
  for update;

  if daily.attacks_used>=10 then
    raise exception 'Limite diário atingido: 10 batalhas.';
  end if;

  update public.arena_daily
  set attacks_used=attacks_used+1
  where user_id=v_uid and battle_date=v_day;

  insert into public.arena_stats(user_id) values(v_uid) on conflict(user_id) do nothing;
  insert into public.arena_stats(user_id) values(p_target_user_id) on conflict(user_id) do nothing;

  a_pool := greatest(1,a.hp+a.shield);
  d_pool := greatest(1,d.hp+d.shield);

  for r in 1..30 loop
    a_hit := greatest(100, round(greatest(100,a.laser_damage) * (0.82 + random()*0.36) + a.level*90));
    if random() < least(0.18, d.speed/10000.0) then a_hit := round(a_hit*0.60); end if;
    d_pool := d_pool-a_hit;
    if d_pool<=0 then exit; end if;

    d_hit := greatest(100, round(greatest(100,d.laser_damage) * (0.82 + random()*0.36) + d.level*90));
    if random() < least(0.18, a.speed/10000.0) then d_hit := round(d_hit*0.60); end if;
    a_pool := a_pool-d_hit;
    if a_pool<=0 then exit; end if;
  end loop;

  if a_pool=d_pool then
    v_winner := case when random()<0.5 then v_uid else p_target_user_id end;
  elsif a_pool>d_pool then
    v_winner := v_uid;
  else
    v_winner := p_target_user_id;
  end if;
  v_won := v_winner=v_uid;

  update public.arena_stats
  set battles=battles+1,
      wins=wins+(case when user_id=v_winner then 1 else 0 end),
      losses=losses+(case when user_id<>v_winner then 1 else 0 end),
      rating=greatest(0,rating+(case when user_id=v_winner then 25 else -10 end)),
      updated_at=now()
  where user_id in (v_uid,p_target_user_id);

  insert into public.arena_battles(
    battle_date,attacker_id,defender_id,winner_id,attacker_power,defender_power,rounds,result
  ) values(
    v_day,v_uid,p_target_user_id,v_winner,a.power,d.power,r,
    jsonb_build_object(
      'attacker_remaining',greatest(0,round(a_pool)),
      'defender_remaining',greatest(0,round(d_pool)),
      'attacker_ship',a.ship_id,
      'defender_ship',d.ship_id
    )
  );

  select rating into a_rating from public.arena_stats where user_id=v_uid;
  select rating into d_rating from public.arena_stats where user_id=p_target_user_id;

  return query
  select
    v_won,
    r,
    (9-daily.attacks_used)::int,
    d.callsign,
    greatest(0,round(a_pool))::bigint,
    greatest(0,round(d_pool))::bigint,
    a_rating,
    d_rating;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.arena_attack_v11(p_target_user_id uuid)
 RETURNS TABLE(won boolean, rounds integer, attacks_left integer, opponent_callsign text, attacker_remaining bigint, defender_remaining bigint, attacker_rating integer, defender_rating integer, attacker_hp_start bigint, attacker_shield_start bigint, defender_hp_start bigint, defender_shield_start bigint, attacker_ship text, defender_ship text, attacker_callsign text, defender_callsign text, attacker_laser_damage bigint, defender_laser_damage bigint, attacker_speed integer, defender_speed integer, battle_duration_ms integer, combat_log jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_admin boolean := false;
  a public.arena_profiles%rowtype;
  d public.arena_profiles%rowtype;
  daily public.arena_daily%rowtype;
  a_hp bigint; a_shield bigint; d_hp bigint; d_shield bigint;
  a_hp_start bigint; a_shield_start bigint; d_hp_start bigint; d_shield_start bigint;
  v_hit bigint; v_shield_damage bigint; v_hp_damage bigint; v_dodged boolean;
  v_log jsonb := '[]'::jsonb;
  v_seq integer := 0;
  v_round integer := 0;
  v_i integer;
  v_winner uuid; v_won boolean;
  a_rating integer; d_rating integer;
  v_duration integer;
begin
  if v_uid is null then raise exception 'Sessão ausente.'; end if;
  if p_target_user_id is null or p_target_user_id=v_uid then raise exception 'Adversário inválido.'; end if;

  select coalesce(ga.unlimited_arena,false)
  into v_admin
  from public.game_admins ga
  where ga.user_id=v_uid;
  v_admin := coalesce(v_admin,false);

  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || v_day::text));

  select * into a from public.arena_profiles where user_id=v_uid for update;
  if a.user_id is null then raise exception 'Abra a Arena novamente para sincronizar sua nave.'; end if;

  select * into d from public.arena_profiles where user_id=p_target_user_id;
  if d.user_id is null then raise exception 'Adversário indisponível.'; end if;

  insert into public.arena_daily(user_id,battle_date,attacks_used)
  values(v_uid,v_day,0)
  on conflict(user_id,battle_date) do nothing;

  select * into daily
  from public.arena_daily
  where user_id=v_uid and battle_date=v_day
  for update;

  if not v_admin and daily.attacks_used>=10 then
    raise exception 'Limite diário atingido: 10 batalhas.';
  end if;

  if not v_admin then
    update public.arena_daily
    set attacks_used=attacks_used+1
    where user_id=v_uid and battle_date=v_day;
  end if;

  insert into public.arena_stats(user_id) values(v_uid) on conflict(user_id) do nothing;
  insert into public.arena_stats(user_id) values(p_target_user_id) on conflict(user_id) do nothing;

  a_hp_start := greatest(1,a.hp);
  a_shield_start := greatest(0,a.shield);
  d_hp_start := greatest(1,d.hp);
  d_shield_start := greatest(0,d.shield);
  a_hp := a_hp_start; a_shield := a_shield_start;
  d_hp := d_hp_start; d_shield := d_shield_start;

  for v_i in 1..30 loop
    v_round := v_i;

    v_hit := greatest(100,round(greatest(100,a.laser_damage)*(0.88+random()*0.24)+a.level*90)::bigint);
    v_dodged := random() < least(0.18,d.speed/10000.0);
    if v_dodged then v_hit := greatest(1,round(v_hit*0.60)::bigint); end if;
    v_shield_damage := least(d_shield,v_hit);
    v_hp_damage := greatest(0,v_hit-v_shield_damage);
    d_shield := greatest(0,d_shield-v_shield_damage);
    d_hp := greatest(0,d_hp-v_hp_damage);
    v_seq := v_seq+1;
    v_log := v_log || jsonb_build_array(jsonb_build_object(
      'seq',v_seq,'round',v_round,'actor','attacker','weapon','PLS-1','damage',v_hit,
      'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',v_dodged,
      'target_hp',d_hp,'target_shield',d_shield
    ));
    if d_hp<=0 then exit; end if;

    if mod(v_round,4)=0 then
      v_hit := greatest(1,round(1000*(0.95+random()*0.10))::bigint);
      v_shield_damage := least(d_shield,v_hit);
      v_hp_damage := greatest(0,v_hit-v_shield_damage);
      d_shield := greatest(0,d_shield-v_shield_damage);
      d_hp := greatest(0,d_hp-v_hp_damage);
      v_seq := v_seq+1;
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'seq',v_seq,'round',v_round,'actor','attacker','weapon','CMT-1','damage',v_hit,
        'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',false,
        'target_hp',d_hp,'target_shield',d_shield
      ));
      if d_hp<=0 then exit; end if;
    end if;

    v_hit := greatest(100,round(greatest(100,d.laser_damage)*(0.88+random()*0.24)+d.level*90)::bigint);
    v_dodged := random() < least(0.18,a.speed/10000.0);
    if v_dodged then v_hit := greatest(1,round(v_hit*0.60)::bigint); end if;
    v_shield_damage := least(a_shield,v_hit);
    v_hp_damage := greatest(0,v_hit-v_shield_damage);
    a_shield := greatest(0,a_shield-v_shield_damage);
    a_hp := greatest(0,a_hp-v_hp_damage);
    v_seq := v_seq+1;
    v_log := v_log || jsonb_build_array(jsonb_build_object(
      'seq',v_seq,'round',v_round,'actor','defender','weapon','PLS-1','damage',v_hit,
      'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',v_dodged,
      'target_hp',a_hp,'target_shield',a_shield
    ));
    if a_hp<=0 then exit; end if;

    if mod(v_round,4)=0 then
      v_hit := greatest(1,round(1000*(0.95+random()*0.10))::bigint);
      v_shield_damage := least(a_shield,v_hit);
      v_hp_damage := greatest(0,v_hit-v_shield_damage);
      a_shield := greatest(0,a_shield-v_shield_damage);
      a_hp := greatest(0,a_hp-v_hp_damage);
      v_seq := v_seq+1;
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'seq',v_seq,'round',v_round,'actor','defender','weapon','CMT-1','damage',v_hit,
        'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',false,
        'target_hp',a_hp,'target_shield',a_shield
      ));
      if a_hp<=0 then exit; end if;
    end if;
  end loop;

  if a_hp=d_hp and a_shield=d_shield then
    v_winner := case when random()<0.5 then v_uid else p_target_user_id end;
  elsif (a_hp+a_shield)>(d_hp+d_shield) then
    v_winner := v_uid;
  else
    v_winner := p_target_user_id;
  end if;
  v_won := v_winner=v_uid;

  update public.arena_stats
  set battles=battles+1,
      wins=wins+(case when user_id=v_winner then 1 else 0 end),
      losses=losses+(case when user_id<>v_winner then 1 else 0 end),
      rating=greatest(0,rating+(case when user_id=v_winner then 25 else -10 end)),
      updated_at=now()
  where user_id in (v_uid,p_target_user_id);

  v_duration := greatest(1800,jsonb_array_length(v_log)*360);

  insert into public.arena_battles(
    battle_date,attacker_id,defender_id,winner_id,attacker_power,defender_power,rounds,result
  ) values(
    v_day,v_uid,p_target_user_id,v_winner,a.power,d.power,v_round,
    jsonb_build_object(
      'version','11.0.0','fixed_laser','PLS-1','fixed_rocket','CMT-1',
      'admin_attacker',v_admin,
      'attacker_remaining',greatest(0,a_hp+a_shield),
      'defender_remaining',greatest(0,d_hp+d_shield),
      'attacker_hp_start',a_hp_start,'attacker_shield_start',a_shield_start,
      'defender_hp_start',d_hp_start,'defender_shield_start',d_shield_start,
      'attacker_ship',a.ship_id,'defender_ship',d.ship_id,
      'battle_duration_ms',v_duration,'combat_log',v_log
    )
  );

  select rating into a_rating from public.arena_stats where user_id=v_uid;
  select rating into d_rating from public.arena_stats where user_id=p_target_user_id;

  return query
  select v_won,v_round,
    (case when v_admin then 10 else (9-daily.attacks_used)::int end),
    d.callsign,
    greatest(0,a_hp+a_shield)::bigint,
    greatest(0,d_hp+d_shield)::bigint,
    a_rating,d_rating,a_hp_start,a_shield_start,d_hp_start,d_shield_start,
    a.ship_id,d.ship_id,a.callsign,d.callsign,a.laser_damage,d.laser_damage,
    a.speed,d.speed,v_duration,v_log;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.auction_minimum_floor_v1916(p_lot_ref text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 r public.game_auction_rules_v1908%rowtype;
 v_prefix text; v_item text; v_kind text; v_price bigint; v_multiplier numeric; v_candidate numeric;
BEGIN
 IF p_lot_ref IS NULL OR p_lot_ref !~ '^(ammo|rocket|ship|item|petGear):[a-zA-Z0-9_]+$' THEN RETURN NULL; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 v_prefix:=split_part(p_lot_ref,':',1); v_item:=split_part(p_lot_ref,':',2);
 IF p_lot_ref='item:iris' THEN
   SELECT price INTO v_price FROM public.live_shop_prices_v16 WHERE catalog_key='drone:iris' AND currency='uridium' AND enabled=true AND shop_visible=true;
   IF NOT FOUND THEN RETURN NULL; END IF;
   RETURN r.nova_floor;
 END IF;
 IF v_prefix='item' THEN
   SELECT kind,price INTO v_kind,v_price FROM public.live_shop_prices_v16
   WHERE ref_id=v_item AND kind IN ('laser','generator','drone','extra') AND currency='uridium' AND enabled=true AND shop_visible=true
   ORDER BY kind LIMIT 1;
 ELSE
   v_kind:=CASE WHEN v_prefix='petGear' THEN 'pet_gear' ELSE v_prefix END;
   SELECT kind,price INTO v_kind,v_price FROM public.live_shop_prices_v16
   WHERE ref_id=v_item AND kind=v_kind AND currency='uridium' AND enabled=true AND shop_visible=true LIMIT 1;
 END IF;
 IF v_kind IS NULL OR v_price IS NULL OR v_price<=0 THEN RETURN NULL; END IF;
 v_multiplier:=COALESCE((r.item_multipliers->>p_lot_ref)::numeric,
  (r.category_multipliers->>(CASE WHEN v_prefix='petGear' THEN 'petGear' ELSE v_kind END))::numeric);
 IF v_multiplier IS NULL OR v_multiplier<0.01 OR v_multiplier>15 THEN RETURN NULL; END IF;
 v_candidate:=CEIL((v_price::numeric*r.stl_to_credits::numeric*v_multiplier)/100000::numeric)*100000;
 RETURN GREATEST(r.common_floor,v_candidate)::bigint;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_npc_runtime_config_v1811()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('npc',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,
      updated_at=now();
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_pass_runtime_config_v1817b()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('pass',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,updated_at=now();
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_runtime_config_v1810()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('core',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,
      updated_at=now();
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_shops_runtime_config_v1817c()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('shops',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,updated_at=now();
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_systems_runtime_config_v1815()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('systems',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,
      updated_at=now();
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bump_world_runtime_config_v1814()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('world',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,updated_at=now();
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.callsign_available_v141(p_callsign text, p_exclude_user uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE lower(btrim(p.callsign)) = lower(btrim(coalesce(p_callsign,'')))
      AND (p_exclude_user IS NULL OR p.id <> p_exclude_user)
  );
$function$
;
CREATE OR REPLACE FUNCTION public.cancel_clan_request_v19(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  update public.clan_join_requests_v19 set status='cancelled',reviewed_at=now()
  where id=p_request_id and user_id=v_uid and status='pending';
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  return jsonb_build_object('ok',true,'cancelled',true);
end;$function$
;
CREATE OR REPLACE FUNCTION public.capture_game_presence_snapshot_v1831()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_now timestamptz := clock_timestamp();
    v_players integer := 0;
    v_sessions integer := 0;
    v_maps_active integer := 0;
    v_same_pairs integer := 0;
    v_separate_pairs integer := 0;
    v_map_counts jsonb := '{}'::jsonb;
BEGIN
    WITH map_counts AS (
        SELECT p.map_id, count(*)::integer AS players
        FROM public.player_presence p
        WHERE p.updated_at >= v_now - interval '90 seconds'
          AND p.updated_at <= v_now + interval '10 seconds'
          AND p.map_id IS NOT NULL
        GROUP BY p.map_id
    ), metrics AS (
        SELECT coalesce(sum(players),0)::integer AS players_recent,
               count(*)::integer AS maps_active,
               coalesce(sum(players*(players-1)/2),0)::integer AS same_pairs,
               coalesce(jsonb_object_agg(map_id,players),'{}'::jsonb) AS maps
        FROM map_counts
    )
    SELECT players_recent, maps_active, same_pairs, maps
      INTO v_players, v_maps_active, v_same_pairs, v_map_counts
    FROM metrics;

    v_separate_pairs := greatest(0, (v_players * (v_players-1) / 2) - v_same_pairs);
    SELECT count(*)::integer INTO v_sessions
    FROM public.game_login_sessions_v1214 s
    WHERE s.last_seen >= v_now - interval '90 seconds'
      AND s.last_seen <= v_now + interval '10 seconds';

    INSERT INTO public.game_presence_snapshots_v1831
        (sample_minute,observed_at,presence_window_seconds,players_recent,
         sessions_recent,maps_active,same_map_pairs,separate_map_pairs,maps)
    VALUES (date_trunc('minute',v_now),v_now,90,v_players,
            v_sessions,v_maps_active,v_same_pairs,v_separate_pairs,v_map_counts)
    ON CONFLICT(sample_minute) DO UPDATE SET
      observed_at = EXCLUDED.observed_at,
      presence_window_seconds = EXCLUDED.presence_window_seconds,
      players_recent = EXCLUDED.players_recent,
      sessions_recent = EXCLUDED.sessions_recent,
      maps_active = EXCLUDED.maps_active,
      same_map_pairs = EXCLUDED.same_map_pairs,
      separate_map_pairs = EXCLUDED.separate_map_pairs,
      maps = EXCLUDED.maps;
END
$function$
;
CREATE OR REPLACE FUNCTION public.claim_arena_daily_reward()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_snapshot jsonb;
  v_state jsonb;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inserted integer := 0;
  v_credits bigint;
  v_uridium bigint;
  v_xp bigint;
  v_repair integer;
  v_old_credits bigint;
  v_old_uridium bigint;
  v_old_xp bigint;
  v_old_repair integer;
  v_old_level integer;
  v_new_xp bigint;
  v_new_level integer := 1;
  v_i integer;
  v_threshold bigint;
  v_callsign text;
  v_faction text;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_snapshot := private.arena_reward_snapshot(v_uid);

  if coalesce((v_snapshot->>'claimed_today')::boolean, false) then
    return v_snapshot || jsonb_build_object(
      'claim_applied', false,
      'already_claimed', true
    );
  end if;

  select gs.state
    into v_state
  from public.game_saves gs
  where gs.user_id = v_uid
  for update;

  if v_state is null then
    raise exception 'Save online não encontrado. Entre no jogo e salve o progresso antes de resgatar.';
  end if;

  v_credits := (v_snapshot->>'credits')::bigint;
  v_uridium := (v_snapshot->>'uridium')::bigint;
  v_xp := (v_snapshot->>'xp')::bigint;
  v_repair := (v_snapshot->>'repair_bonus')::integer;

  insert into public.arena_daily_rewards (
    user_id, reward_date, rating, rank_position, league, player_level,
    level_bonus_percent, rank_bonus_percent, total_bonus_percent,
    credits, uridium, xp, repair_bonus
  ) values (
    v_uid,
    v_today,
    (v_snapshot->>'rating')::integer,
    (v_snapshot->>'rank_position')::integer,
    v_snapshot->>'league',
    (v_snapshot->>'player_level')::integer,
    (v_snapshot->>'level_bonus_percent')::integer,
    (v_snapshot->>'rank_bonus_percent')::integer,
    (v_snapshot->>'total_bonus_percent')::integer,
    v_credits, v_uridium, v_xp, v_repair
  )
  on conflict (user_id, reward_date) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return private.arena_reward_snapshot(v_uid) || jsonb_build_object(
      'claim_applied', false,
      'already_claimed', true
    );
  end if;

  v_state := coalesce(v_state, '{}'::jsonb);
  v_state := jsonb_set(
    v_state,
    '{profile}',
    case when jsonb_typeof(v_state->'profile') = 'object' then v_state->'profile' else '{}'::jsonb end,
    true
  );
  v_state := jsonb_set(
    v_state,
    '{galaxyGate}',
    case when jsonb_typeof(v_state->'galaxyGate') = 'object' then v_state->'galaxyGate' else '{}'::jsonb end,
    true
  );

  v_old_credits := coalesce(nullif(v_state #>> '{profile,credits}', '')::bigint, 0);
  v_old_uridium := coalesce(nullif(v_state #>> '{profile,uridium}', '')::bigint, 0);
  v_old_xp := coalesce(nullif(v_state #>> '{profile,xp}', '')::bigint, 0);
  v_old_repair := coalesce(nullif(v_state #>> '{galaxyGate,repairBonus}', '')::integer, 0);
  v_old_level := greatest(1, least(44, coalesce(nullif(v_state #>> '{profile,level}', '')::integer, 1)));

  v_new_xp := v_old_xp + v_xp;

  v_new_level := 1;
  for v_i in 2..44 loop
    v_threshold := public.player_xp_threshold_v1915(v_i, coalesce((v_state #>> '{profile,xpModelV1915}')::boolean,false) IS NOT TRUE);
    exit when v_new_xp < v_threshold;
    v_new_level := v_i;
  end loop;

  v_state := jsonb_set(v_state, '{profile,credits}', to_jsonb(v_old_credits + v_credits), true);
  v_state := jsonb_set(v_state, '{profile,uridium}', to_jsonb(v_old_uridium + v_uridium), true);
  v_state := jsonb_set(v_state, '{profile,xp}', to_jsonb(v_new_xp), true);
  v_state := jsonb_set(v_state, '{profile,level}', to_jsonb(v_new_level), true);
  v_state := jsonb_set(v_state, '{profile,xpModelV101}', 'true'::jsonb, true);
  v_state := jsonb_set(v_state, '{galaxyGate,repairBonus}', to_jsonb(v_old_repair + v_repair), true);

  update public.game_saves
  set state = v_state,
      updated_at = now()
  where user_id = v_uid;

  v_callsign := coalesce(nullif(v_state #>> '{profile,callsign}', ''), 'Pilot');
  v_faction := nullif(v_state #>> '{profile,faction}', '');

  update public.profiles
  set callsign = v_callsign,
      faction = coalesce(v_faction, faction),
      level = v_new_level,
      xp = v_new_xp,
      credits = v_old_credits + v_credits,
      uridium = v_old_uridium + v_uridium,
      updated_at = now()
  where id = v_uid;

  if not found then
    insert into public.profiles (id, callsign, faction, level, xp, credits, uridium, updated_at)
    values (v_uid, v_callsign, v_faction, v_new_level, v_new_xp, v_old_credits + v_credits, v_old_uridium + v_uridium, now());
  end if;

  return private.arena_reward_snapshot(v_uid) || jsonb_build_object(
    'claim_applied', true,
    'already_claimed', false,
    'level_before', v_old_level,
    'level_after', v_new_level,
    'new_credits', v_old_credits + v_credits,
    'new_uridium', v_old_uridium + v_uridium,
    'new_xp', v_new_xp,
    'new_repair_bonus', v_old_repair + v_repair
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_aux_protocol_auction_v111(p_hour_key text, p_lot_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_id text;
 v_row public.live_shop_prices_v16%rowtype;
 v_winner public.auction_bids%rowtype;
 v_state jsonb;
 v_old bigint;
 v_new bigint;
 v_rev bigint;
 v_owned integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 IF p_lot_ref !~ '^auxProtocol:(dano|hp|escudo|loot|porao)$' THEN RAISE EXCEPTION 'Protocolo de leilão inválido.'; END IF;
 IF p_hour_key IS NULL OR p_hour_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$' OR
    p_hour_key>=to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN
   RAISE EXCEPTION 'Este leilão ainda não terminou.';
 END IF;
 v_id:=split_part(p_lot_ref,':',2);
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save indisponível.'; END IF;
 IF EXISTS(SELECT 1 FROM public.auction_bids WHERE user_id=v_uid AND hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='won') THEN
   RETURN jsonb_build_object('ok',true,'replayed',true,'state',v_state,'id',v_id);
 END IF;
 SELECT * INTO v_winner FROM public.auction_bids WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref
 AND status='active' ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR v_winner.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Este lote não foi vencido por esta conta.'; END IF;
 SELECT * INTO v_row FROM public.live_shop_prices_v16 WHERE catalog_key='aux_protocol:'||v_id
  AND kind='aux_protocol' AND ref_id=v_id AND enabled AND shop_visible AND meta->>'auction_enabled'='true';
 IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não está ativo no leilão.'; END IF;
 IF v_winner.lot->>'kind' IS DISTINCT FROM 'auxProtocol' OR
    v_winner.lot->>'ref' IS DISTINCT FROM p_lot_ref OR
    v_winner.lot->>'id' IS DISTINCT FROM v_id THEN
  RAISE EXCEPTION 'Lote não corresponde ao protocolo autorizado.';
 END IF;
 IF coalesce(v_state#>>'{pet,owned}','false')<>'true' THEN RAISE EXCEPTION 'AUX não adquirido.'; END IF;
 v_owned:=coalesce((v_state#>>ARRAY['pet','advancedProtocolOwnedV110',v_id])::integer,0);
 IF v_owned>0 THEN RAISE EXCEPTION 'Protocolo já adquirido; reembolse ou cancele o lote pelo suporte.'; END IF;
 v_old:=coalesce((v_state#>>'{profile,credits}')::bigint,0);
 IF v_winner.user_bid<=0 OR v_old<v_winner.user_bid THEN RAISE EXCEPTION 'Créditos insuficientes para liquidar o leilão.'; END IF;
 v_new:=v_old-v_winner.user_bid;
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(v_new),true);
 v_state:=jsonb_set(v_state,'{pet,advancedProtocolOwnedV110}',
  coalesce(v_state#>'{pet,advancedProtocolOwnedV110}','{}'::jsonb)||jsonb_build_object(v_id,1),true);
 v_rev:=greatest(0,coalesce((v_state->>'serverPurchaseRevision')::bigint,0))+1;
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',to_jsonb(v_rev),true);
 UPDATE public.game_saves SET state=v_state,updated_at=now() WHERE user_id=v_uid;
 UPDATE public.profiles SET credits=v_new,updated_at=now() WHERE id=v_uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Perfil financeiro ausente.'; END IF;
 UPDATE public.auction_bids SET status='won',updated_at=now()
 WHERE id=v_winner.id AND user_id=v_uid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote já processado.'; END IF;
 RETURN jsonb_build_object('ok',true,'replayed',false,'state',v_state,'id',v_id,'paid_credits',v_winner.user_bid);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_clan_credit_grants_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_total bigint:=0; v_credits bigint; v_new bigint; r record;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  for r in select id,amount from public.clan_credit_grants where recipient_id=v_uid and not claimed order by id for update loop
    v_total:=v_total+r.amount;
    update public.clan_credit_grants set claimed=true,claimed_at=now() where id=r.id;
  end loop;
  select coalesce(credits,0) into v_credits from public.profiles where id=v_uid for update;
  if v_credits is null then raise exception 'Perfil não encontrado.'; end if;
  v_new:=v_credits+v_total;
  if v_total>0 then
    update public.profiles set credits=v_new,updated_at=now() where id=v_uid;
    update public.game_saves set state=jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',
      coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),updated_at=now() where user_id=v_uid;
  end if;
  return jsonb_build_object('ok',true,'credited',v_total,'new_credits',v_new);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_event_designer_v165(p_event_id text, p_event_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cfg public.live_event_config_v16%ROWTYPE;
  v_key text := lower(btrim(coalesce(p_event_key,'')));
  v_id text := btrim(coalesce(p_event_id,''));
  v_match text[];
  v_start_ms bigint;
  v_base_ms bigint;
  v_repeat_ms bigint;
  v_duration_ms bigint;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_claim_key text;
  r record;
  v_design text := null;
  v_qty integer := 1;
  v_name text := null;
  v_rarity text := null;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;

  v_match := regexp_match(v_id, '^v16:([a-z0-9_]+):([0-9]{13})$');
  IF v_match IS NULL OR array_length(v_match,1) < 2 THEN
    RAISE EXCEPTION 'Evento inválido.';
  END IF;
  IF v_match[1] <> v_key THEN
    RAISE EXCEPTION 'Evento divergente.';
  END IF;

  SELECT * INTO v_cfg
  FROM public.live_event_config_v16
  WHERE event_key=v_key AND enabled=true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',true,'eligible',false,'design_id',null,'quantity',0);
  END IF;

  v_start_ms := v_match[2]::bigint;
  v_base_ms := floor(extract(epoch from v_cfg.starts_at)*1000)::bigint;
  v_repeat_ms := greatest(1,v_cfg.repeat_minutes)::bigint*60000;
  v_duration_ms := greatest(1,v_cfg.duration_minutes)::bigint*60000;

  IF v_start_ms < v_base_ms
     OR mod(v_start_ms-v_base_ms,v_repeat_ms) <> 0
     OR v_start_ms > v_now_ms + 60000
     OR v_now_ms > v_start_ms + v_duration_ms + 1200000 THEN
    RAISE EXCEPTION 'Janela do evento não é válida.';
  END IF;

  v_claim_key := 'event:'||v_id;
  BEGIN
    INSERT INTO public.designer_drop_claims_v16(user_id,claim_key,source_kind,source_ref)
    VALUES(v_uid,v_claim_key,'event',v_key);
  EXCEPTION WHEN unique_violation THEN
    SELECT c.design_id,d.name,d.rarity
      INTO v_design,v_name,v_rarity
    FROM public.designer_drop_claims_v16 c
    LEFT JOIN public.live_designs_v16 d ON d.design_id=c.design_id
    WHERE c.user_id=v_uid AND c.claim_key=v_claim_key;

    RETURN jsonb_build_object(
      'ok',true,'eligible',true,'already_claimed',true,
      'design_id',v_design,'name',v_name,'rarity',v_rarity,
      'quantity',case when v_design is null then 0 else 1 end
    );
  END;

  FOR r IN
    SELECT dr.*,d.name,d.rarity
    FROM public.live_drop_rules_v16 dr
    JOIN public.live_designs_v16 d ON d.design_id=dr.design_id
    WHERE dr.enabled=true AND d.enabled=true
      AND dr.source_kind='event' AND dr.source_ref=v_key
      AND d.kind IN ('ship','pet')
    ORDER BY dr.chance ASC,dr.drop_key
  LOOP
    IF random() < r.chance THEN
      v_design := r.design_id;
      v_name := r.name;
      v_rarity := r.rarity;
      v_qty := greatest(1,coalesce((r.metadata->>'qty')::integer,1));
      EXIT;
    END IF;
  END LOOP;

  IF v_design IS NOT NULL THEN
    INSERT INTO public.player_design_inventory_v16(user_id,design_id,quantity)
    VALUES(v_uid,v_design,v_qty)
    ON CONFLICT(user_id,design_id) DO UPDATE
      SET quantity=public.player_design_inventory_v16.quantity+excluded.quantity,
          updated_at=now();

    UPDATE public.designer_drop_claims_v16
       SET design_id=v_design
     WHERE user_id=v_uid AND claim_key=v_claim_key;
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'eligible',true,'already_claimed',false,
    'design_id',v_design,'name',v_name,'rarity',v_rarity,
    'quantity',case when v_design is null then 0 else v_qty end
  );
END
$function$
;
CREATE OR REPLACE FUNCTION public.claim_gate_drone_design_v163(p_gate text, p_completion integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_state jsonb;
  v_server_completed integer:=0;
  v_claim_key text;
  r record;
  v_design text:=null;
  v_qty integer:=1;
  v_name text:=null;
  v_rarity text:=null;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  p_gate:=lower(btrim(coalesce(p_gate,'')));
  IF p_gate NOT IN ('beta','gamma') THEN
    RETURN jsonb_build_object('ok',true,'eligible',false,'design_id',null,'quantity',0);
  END IF;
  IF coalesce(p_completion,0)<=0 THEN RAISE EXCEPTION 'Conclusão inválida.'; END IF;

  SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid;
  v_server_completed:=coalesce((v_state->'galaxyGate'->p_gate->>'completed')::integer,0);

  IF p_completion>v_server_completed THEN
    RAISE EXCEPTION 'Conclusão ainda não sincronizada com o servidor.';
  END IF;

  v_claim_key:='gate:'||p_gate||':'||p_completion;

  BEGIN
    INSERT INTO public.designer_drop_claims_v16(user_id,claim_key,source_kind,source_ref)
    VALUES(v_uid,v_claim_key,'gate',p_gate);
  EXCEPTION WHEN unique_violation THEN
    SELECT c.design_id,d.name,d.rarity
      INTO v_design,v_name,v_rarity
    FROM public.designer_drop_claims_v16 c
    LEFT JOIN public.live_designs_v16 d ON d.design_id=c.design_id
    WHERE c.user_id=v_uid AND c.claim_key=v_claim_key;

    RETURN jsonb_build_object(
      'ok',true,'eligible',true,'already_claimed',true,
      'design_id',v_design,'name',v_name,'rarity',v_rarity,
      'quantity',case when v_design is null then 0 else 1 end
    );
  END;

  FOR r IN
    SELECT dr.*,d.name,d.rarity
    FROM public.live_drop_rules_v16 dr
    JOIN public.live_designs_v16 d ON d.design_id=dr.design_id
    WHERE dr.enabled=true AND d.enabled=true
      AND dr.source_kind='gate' AND dr.source_ref=p_gate
    ORDER BY dr.chance ASC,dr.drop_key
  LOOP
    IF random() < r.chance THEN
      v_design:=r.design_id;
      v_name:=r.name;
      v_rarity:=r.rarity;
      v_qty:=greatest(1,coalesce((r.metadata->>'qty')::integer,1));
      EXIT;
    END IF;
  END LOOP;

  IF v_design IS NOT NULL THEN
    INSERT INTO public.player_design_inventory_v16(user_id,design_id,quantity)
    VALUES(v_uid,v_design,v_qty)
    ON CONFLICT(user_id,design_id) DO UPDATE
      SET quantity=public.player_design_inventory_v16.quantity+excluded.quantity,
          updated_at=now();

    UPDATE public.designer_drop_claims_v16
      SET design_id=v_design
    WHERE user_id=v_uid AND claim_key=v_claim_key;
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'eligible',true,'already_claimed',false,
    'design_id',v_design,'name',v_name,'rarity',v_rarity,
    'quantity',case when v_design is null then 0 else v_qty end
  );
END
$function$
;
CREATE OR REPLACE FUNCTION public.claim_world_boss_reward_v131()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_boss public.world_boss_v131%rowtype; v_damage bigint:=0; v_inserted integer:=0; v_credits bigint; v_uri bigint; v_frags integer; v_cores integer; v_bp text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_boss from public.ensure_world_boss_v131();
  if v_boss.hp>0 then raise exception 'O World Boss ainda está vivo.'; end if;
  select coalesce(damage,0) into v_damage from public.world_boss_contrib_v131 where boss_id=v_boss.id and user_id=v_uid;
  if v_damage<=0 then raise exception 'Você precisa causar dano no World Boss para receber recompensa.'; end if;
  insert into public.world_boss_claims_v131(boss_id,user_id) values(v_boss.id,v_uid) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then return jsonb_build_object('already_claimed',true,'boss_id',v_boss.id); end if;
  v_credits:=5000000+least(20000000,v_damage/10); v_uri:=5000+least(20000,v_damage/10000); v_frags:=5+least(10,greatest(0,(v_damage/5000000)::integer)); v_cores:=1+least(3,greatest(0,(v_damage/25000000)::integer));
  v_bp:=(array['lf4','sg3nb02','g3n7900'])[1+(floor(random()*3))::integer];
  return jsonb_build_object('already_claimed',false,'boss_id',v_boss.id,'credits',v_credits,'uridium',v_uri,'fragments',v_frags,'cores',v_cores,'blueprint_id',v_bp);
end;$function$
;
CREATE OR REPLACE FUNCTION public.claim_world_boss_reward_v132()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_result jsonb;
  v_clan uuid;
  v_event public.map_event_instances_v132%rowtype;
  v_owner uuid;
  v_bonus boolean:=false;
  v_cr bigint;
  v_uri bigint;
  v_frags integer;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.ensure_daily_event_v132();
  select public.claim_world_boss_reward_v131() into v_result;
  if coalesce((v_result->>'already_claimed')::boolean,false) then return v_result; end if;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  select * into v_event from public.map_event_instances_v132 where status='active' and kind='world_boss' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  select clan_id into v_owner from public.clan_map_ownership_v132 where map_id=v_event.map_id;
  v_bonus:=v_clan is not null and v_owner is not null and v_clan=v_owner;
  if v_bonus then
    v_cr:=round(coalesce((v_result->>'credits')::numeric,0)*1.10)::bigint;
    v_uri:=round(coalesce((v_result->>'uridium')::numeric,0)*1.10)::bigint;
    v_frags:=coalesce((v_result->>'fragments')::integer,0)+1;
    v_result:=jsonb_set(v_result,'{credits}',to_jsonb(v_cr),true);
    v_result:=jsonb_set(v_result,'{uridium}',to_jsonb(v_uri),true);
    v_result:=jsonb_set(v_result,'{fragments}',to_jsonb(v_frags),true);
  end if;
  return v_result||jsonb_build_object('domination_owner_bonus',v_bonus,'event_map_id',v_event.map_id,'owner_bonus_percent',10);
end;$function$
;
CREATE OR REPLACE FUNCTION public.clan_check_entry_level_v19(p_uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_req integer:=public.clan_required_level_v19();
  v_level integer;v_saved_level integer;v_xp bigint;v_saved_xp bigint;
  v_new_model boolean:=false;v_calc_level integer:=1;v_i integer;v_threshold bigint;
BEGIN
  SELECT p.level,p.xp,
    coalesce(nullif(s.state #>> '{profile,level}','')::integer,p.level),
    coalesce(nullif(s.state #>> '{profile,xp}','')::bigint,p.xp),
    coalesce(nullif(s.state #>> '{profile,xpModelV1915}','')::boolean,false)
    INTO v_level,v_xp,v_saved_level,v_saved_xp,v_new_model
    FROM public.profiles p LEFT JOIN public.game_saves s ON s.user_id=p.id
    WHERE p.id=p_uid;
  IF v_level IS NULL OR v_saved_level IS NULL THEN
    RAISE EXCEPTION 'Perfil e save online são necessários para acessar alianças.';
  END IF;
  v_xp:=least(greatest(0,coalesce(v_xp,0)),greatest(0,coalesce(v_saved_xp,0)));
  FOR v_i IN 2..44 LOOP
    v_threshold:=public.player_xp_threshold_v1915(v_i,NOT v_new_model);
    EXIT WHEN v_xp<v_threshold;
    v_calc_level:=v_i;
  END LOOP;
  IF least(v_level,v_saved_level,v_calc_level)<v_req THEN
    RAISE EXCEPTION 'Aliança libera no nível % (conforme XP e save). Seu nível validado é %.',v_req,least(v_level,v_saved_level,v_calc_level);
  END IF;
  IF NOT coalesce((SELECT enabled FROM public.game_ui_modules_v1810 WHERE module_key='clan'),true) THEN
    RAISE EXCEPTION 'Alianças temporariamente indisponíveis.';
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.clan_interest_rate_v12(p_level integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$
select case greatest(1,least(10,coalesce(p_level,1)))
 when 1 then 5.0 when 2 then 5.5 when 3 then 6.0 when 4 then 6.5 when 5 then 7.0
 when 6 then 7.5 when 7 then 8.0 when 8 then 8.5 when 9 then 9.0 else 10.0 end::numeric;
$function$
;
CREATE OR REPLACE FUNCTION public.clan_level_status_v12(p_clan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_clan public.clans%rowtype; v_req jsonb; v_xp bigint:=0; v_members integer:=0; v_mission jsonb:='{}'::jsonb;
  v_ok boolean:=true; k text; target bigint; current bigint;
begin
  select * into v_clan from public.clans where id=p_clan_id;
  if not found then return null; end if;
  v_req:=public.clan_requirement_v12(v_clan.level);
  select coalesce(sum(coalesce(p.xp,0)),0)::bigint,count(*)::integer into v_xp,v_members
  from public.clan_members cm join public.profiles p on p.id=cm.user_id where cm.clan_id=p_clan_id;
  for k,target in select key,(value::text)::bigint from jsonb_each(v_req->'mission') loop
    current:=coalesce((v_clan.mission_kills->>k)::bigint,0);
    v_mission:=v_mission||jsonb_build_object(k,jsonb_build_object('current',current,'target',target,'done',current>=target));
    if current<target then v_ok:=false; end if;
  end loop;
  if v_clan.level>=10 then v_ok:=false; end if;
  if v_xp<coalesce((v_req->>'xp')::bigint,0) then v_ok:=false; end if;
  if v_clan.vault_credits<coalesce((v_req->>'credits')::bigint,0) then v_ok:=false; end if;
  return jsonb_build_object(
    'level',v_clan.level,'interest_rate',public.clan_interest_rate_v12(v_clan.level),
    'member_xp',v_xp,'members',v_members,'vault_credits',v_clan.vault_credits,
    'requirements',v_req,'mission_progress',v_mission,'ready',v_ok
  );
end;$function$
;
CREATE OR REPLACE FUNCTION public.clan_required_level_v19()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select greatest(8,coalesce((select min_level from public.game_ui_modules_v1810 where module_key='clan'),8))::integer;
$function$
;
CREATE OR REPLACE FUNCTION public.clan_requirement_v12(p_current_level integer)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case greatest(1,least(10,coalesce(p_current_level,1)))
    when 1 then jsonb_build_object('next_level',2,'xp',20000,'credits',5000000,'mission',jsonb_build_object('streuner',100))
    when 2 then jsonb_build_object('next_level',3,'xp',60000,'credits',15000000,'mission',jsonb_build_object('lordakia',150))
    when 3 then jsonb_build_object('next_level',4,'xp',160000,'credits',40000000,'mission',jsonb_build_object('saimon',200))
    when 4 then jsonb_build_object('next_level',5,'xp',400000,'credits',100000000,'mission',jsonb_build_object('mordon',150))
    when 5 then jsonb_build_object('next_level',6,'xp',1120000,'credits',250000000,'mission',jsonb_build_object('devolarium',100))
    when 6 then jsonb_build_object('next_level',7,'xp',2880000,'credits',600000000,'mission',jsonb_build_object('sibelon',100))
    when 7 then jsonb_build_object('next_level',8,'xp',7680000,'credits',1200000000,'mission',jsonb_build_object('boss_mordon',50,'boss_devolarium',50))
    when 8 then jsonb_build_object('next_level',9,'xp',20480000,'credits',2500000000,'mission',jsonb_build_object('boss_sibelon',100))
    when 9 then jsonb_build_object('next_level',10,'xp',51200000,'credits',5000000000,'mission',jsonb_build_object('boss_any',300))
    else jsonb_build_object('next_level',null,'xp',0,'credits',0,'mission','{}'::jsonb)
  end;
$function$
;
CREATE OR REPLACE FUNCTION public.clear_game_session_v1214(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_deleted integer := 0;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  delete from public.game_login_sessions_v1214
  where user_id = v_uid and session_id = p_session_id;

  get diagnostics v_deleted = row_count;
  return jsonb_build_object('ok', true, 'cleared', v_deleted > 0);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.consume_pvp_damage_events()
 RETURNS TABLE(id bigint, attacker_user_id uuid, attacker_callsign text, damage bigint, shield_drain boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sessão ausente.';
  end if;

  return query
  with picked as (
    select e.id
    from public.pvp_damage_events e
    where e.target_user_id = v_uid
      and e.consumed_at is null
      and e.created_at > now() - interval '20 seconds'
    order by e.id
    limit 50
    for update skip locked
  ),
  updated as (
    update public.pvp_damage_events e
    set consumed_at = now()
    from picked p
    where e.id = p.id
    returning e.id,e.attacker_user_id,e.attacker_callsign,e.damage,e.shield_drain,e.created_at
  )
  select * from updated order by id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_battle_group_v179()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if exists(select 1 from public.battle_group_members_v179 where user_id=v_uid) then
    raise exception 'Você já está em um Grupo de Batalha.';
  end if;

  insert into public.battle_groups_v179(leader_id) values(v_uid) returning id into v_gid;
  insert into public.battle_group_members_v179(group_id,user_id,role) values(v_gid,v_uid,'leader');
  return public.get_my_battle_group_v179();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_clan_v12(p_name text, p_tag text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_name text:=trim(coalesce(p_name,''));v_tag text:=upper(trim(coalesce(p_tag,'')));v_id uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.clan_check_entry_level_v19(v_uid);
  if exists(select 1 from public.clan_members where user_id=v_uid) then raise exception 'Você já pertence a um clã.'; end if;
  if char_length(v_name)<3 or char_length(v_name)>28 then raise exception 'O nome do clã precisa ter entre 3 e 28 caracteres.'; end if;
  if v_tag !~ '^[A-Z0-9]{2,6}$' then raise exception 'A TAG deve ter 2 a 6 letras/números.'; end if;
  insert into public.clans(name,tag,owner_id) values(v_name,v_tag,v_uid) returning id into v_id;
  insert into public.clan_members(user_id,clan_id,role) values(v_uid,v_id,'owner');
  update public.clan_join_requests_v19 set status='cancelled',reviewed_at=now() where user_id=v_uid and status='pending';
  return jsonb_build_object('ok',true,'clan_id',v_id,'name',v_name,'tag',v_tag);
exception when unique_violation then raise exception 'Nome ou TAG já está em uso ou sua conta já possui clã.';
end;$function$
;
CREATE OR REPLACE FUNCTION public.declare_clan_war_v131(p_target_clan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_existing integer; v_war public.clan_wars_v131%rowtype;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.finish_expired_clan_wars_v131();
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null or v_role<>'owner' then raise exception 'Somente o líder do clã pode declarar guerra.'; end if;
  if p_target_clan_id is null or p_target_clan_id=v_clan then raise exception 'Escolha um clã rival válido.'; end if;
  if not exists(select 1 from public.clans where id=p_target_clan_id) then raise exception 'Clã rival não encontrado.'; end if;
  select count(*) into v_existing from public.clan_wars_v131 where status='active' and ends_at>now() and (attacker_clan_id in(v_clan,p_target_clan_id) or defender_clan_id in(v_clan,p_target_clan_id));
  if v_existing>0 then raise exception 'Um dos clãs já está em uma guerra ativa.'; end if;
  insert into public.clan_wars_v131(attacker_clan_id,defender_clan_id,created_by) values(v_clan,p_target_clan_id,v_uid) returning * into v_war;
  return jsonb_build_object('ok',true,'war_id',v_war.id,'ends_at',v_war.ends_at);
end;$function$
;
CREATE OR REPLACE FUNCTION public.donate_clan_credits_v12(p_amount bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin raise exception 'Na V12 o cofre recebe Créditos apenas pela coleta automática diária de 10%%.'; end;$function$
;
CREATE OR REPLACE FUNCTION public.enforce_admin_game_save()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_jump boolean := false;
  v_repair boolean := false;
  v_gate jsonb;
begin
  select unlimited_jump, unlimited_repair
  into v_jump, v_repair
  from public.game_admins
  where user_id = new.user_id;

  if coalesce(v_jump,false) or coalesce(v_repair,false) then
    new.state := coalesce(new.state, '{}'::jsonb);
    v_gate := coalesce(new.state->'galaxyGate','{}'::jsonb);

    if coalesce(v_jump,false) then
      v_gate := v_gate || jsonb_build_object('jumpBonus', 999999999);
    end if;

    if coalesce(v_repair,false) then
      v_gate := v_gate || jsonb_build_object('repairBonus', 999999999);
    end if;

    new.state := jsonb_set(new.state, '{galaxyGate}', v_gate, true);
  end if;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.enforce_unique_equipment_stage_checkout_v1836()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_limit int;
BEGIN
 SELECT NULLIF(o.reward_plan->>'purchase_limit','')::int INTO v_limit
 FROM public.premium_offers_stage_v1832 o
 WHERE o.product_id=NEW.product_id AND o.category IN ('equipment_bundle','event_ship_bundle');
 IF v_limit IS NOT NULL AND (
   SELECT COUNT(*) FROM public.premium_checkout_tests_v1832 c
   WHERE c.user_id=NEW.user_id AND c.product_id=NEW.product_id
 )>=v_limit THEN
   RAISE EXCEPTION 'Pacote de compra única já simulado nesta conta.';
 END IF;
 RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.ensure_daily_event_v132()
 RETURNS map_event_instances_v132
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start timestamptz;
  v_end timestamptz;
  v_map text;
  v_key text := 'nemesis_'||to_char(v_day,'YYYYMMDD');
  v_boss public.world_boss_v131%rowtype;
  v_row public.map_event_instances_v132%rowtype;
begin
  v_start := (v_day::timestamp at time zone 'America/Sao_Paulo');
  v_end := ((v_day + 1)::timestamp at time zone 'America/Sao_Paulo');
  v_map := case mod(extract(doy from v_day)::integer,3) when 0 then 'b41' when 1 then 'b42' else 'b43' end;
  -- Se um evento futuro já reservou o setor rotativo, usa o próximo 4-X livre.
  if exists(
    select 1 from public.map_event_instances_v132 e
    where e.map_id=v_map and e.status<>'cancelled' and e.event_key<>v_key
      and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_start,v_end,'[)')
  ) then
    select candidate into v_map
    from (values ('b41'::text),('b42'::text),('b43'::text)) m(candidate)
    where not exists(
      select 1 from public.map_event_instances_v132 e
      where e.map_id=m.candidate and e.status<>'cancelled' and e.event_key<>v_key
        and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_start,v_end,'[)')
    )
    order by case m.candidate when 'b41' then 1 when 'b42' then 2 else 3 end
    limit 1;
  end if;
  if v_map is null then raise exception 'Nenhum setor 4-X livre para o evento diário.'; end if;
  select * into v_boss from public.ensure_world_boss_v131();
  insert into public.map_event_instances_v132(event_key,name,kind,map_id,starts_at,ends_at,status,config)
  values(v_key,'NEMESIS PRIME • INVASÃO GLOBAL','world_boss',v_map,v_start,v_end,'active',jsonb_build_object('boss_id',v_boss.id,'exclusive_4x',true,'domination',true,'event_family','world_boss','npc_groups','[]'::jsonb))
  on conflict(event_key,starts_at) do update set
    map_id=excluded.map_id,
    ends_at=excluded.ends_at,
    status=case when public.map_event_instances_v132.status='cancelled' then 'cancelled' else 'active' end,
    config=public.map_event_instances_v132.config||excluded.config
  returning * into v_row;
  return v_row;
end;$function$
;
CREATE OR REPLACE FUNCTION public.ensure_world_boss_v131()
 RETURNS world_boss_v131
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_key text:=to_char((now() at time zone 'America/Sao_Paulo'),'YYYYMMDD'); v_id text:='nemesis_'||v_key; v_row public.world_boss_v131%rowtype; v_end timestamptz;
begin
  select * into v_row from public.world_boss_v131 where id=v_id;
  if found then return v_row; end if;
  v_end:=((date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo');
  insert into public.world_boss_v131(id,name,max_hp,hp,spawn_at,ends_at) values(v_id,'NEMESIS PRIME',250000000,250000000,now(),v_end)
  on conflict(id) do nothing;
  select * into v_row from public.world_boss_v131 where id=v_id;
  return v_row;
end;$function$
;
CREATE OR REPLACE FUNCTION public.evaluate_clan_level_v12(p_clan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_status jsonb; v_level integer; v_cost bigint; v_owner uuid; v_new integer;
begin
 select level,owner_id into v_level,v_owner from public.clans where id=p_clan_id for update;
 if v_level is null then return null; end if;
 v_status:=public.clan_level_status_v12(p_clan_id);
 if coalesce((v_status->>'ready')::boolean,false) then
   v_cost:=(v_status->'requirements'->>'credits')::bigint; v_new:=v_level+1;
   update public.clans set level=v_new,vault_credits=vault_credits-v_cost,mission_kills='{}'::jsonb,updated_at=now() where id=p_clan_id;
   insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount)
   values(p_clan_id,v_owner,'level_up',v_cost,0,v_cost);
   return public.clan_level_status_v12(p_clan_id)||jsonb_build_object('leveled_up',true,'new_level',v_new,'cost_paid',v_cost);
 end if;
 return v_status||jsonb_build_object('leveled_up',false);
end;$function$
;
CREATE OR REPLACE FUNCTION public.finalize_map_domination_v132()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_event public.map_event_instances_v132%rowtype;
  v_winner uuid;
  v_score bigint;
begin
  for v_event in
    select e.* from public.map_event_instances_v132 e
    where e.ends_at<=now() and e.status<>'cancelled'
      and not exists(select 1 from public.clan_map_domination_results_v132 r where r.event_id=e.id)
    order by e.ends_at asc
  loop
    select s.clan_id,s.score into v_winner,v_score
    from public.clan_map_domination_scores_v132 s
    where s.event_id=v_event.id
    order by s.score desc,s.updated_at asc
    limit 1;

    insert into public.clan_map_domination_results_v132(event_id,map_id,winner_clan_id,winning_score)
    values(v_event.id,v_event.map_id,v_winner,coalesce(v_score,0))
    on conflict(event_id) do nothing;

    if v_winner is not null then
      insert into public.clan_map_ownership_v132(map_id,clan_id,source_event_id,winning_score,captured_at,updated_at)
      values(v_event.map_id,v_winner,v_event.id,coalesce(v_score,0),now(),now())
      on conflict(map_id) do update set
        clan_id=excluded.clan_id,
        source_event_id=excluded.source_event_id,
        winning_score=excluded.winning_score,
        captured_at=excluded.captured_at,
        updated_at=now();
    end if;

    update public.map_event_instances_v132 set status='finished' where id=v_event.id and status<>'cancelled';
  end loop;
end;$function$
;
CREATE OR REPLACE FUNCTION public.finish_expired_clan_wars_v131()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  update public.clan_wars_v131 set status='finished',winner_clan_id=case when attacker_score>defender_score then attacker_clan_id when defender_score>attacker_score then defender_clan_id else null end
  where status='active' and ends_at<=now();
end;$function$
;
CREATE OR REPLACE FUNCTION public.galaxy_event_save_guard_v1826()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE old_claims jsonb := coalesce(OLD.state->'eventRewardsV1826','{}'::jsonb);
        new_claims jsonb := coalesce(NEW.state->'eventRewardsV1826','{}'::jsonb);
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()=OLD.user_id
    AND jsonb_typeof(old_claims)='object'
    AND NOT (jsonb_typeof(new_claims)='object' AND new_claims @> old_claims)
  THEN RAISE EXCEPTION 'SAVE_EVENT_STALE: reabra o jogo para sincronizar a recompensa de evento.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.game_coupon_protect_save_v1821()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  old_claims jsonb := coalesce(OLD.state->'couponClaimsV1821','{}'::jsonb);
  new_claims jsonb := coalesce(NEW.state->'couponClaimsV1821','{}'::jsonb);
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()=OLD.user_id
    AND jsonb_typeof(old_claims)='object'
    AND NOT (jsonb_typeof(new_claims)='object' AND new_claims @> old_claims) THEN
    RAISE EXCEPTION 'SAVE_COUPON_STALE: Atualize o jogo para sincronizar seus prêmios antes de salvar.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_arena_daily_reward_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;
  return private.arena_reward_snapshot(v_uid);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_arena_history()
 RETURNS TABLE(id bigint, opponent_id uuid, opponent_callsign text, won boolean, rounds integer, attacker_power bigint, defender_power bigint, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    b.id,
    case when b.attacker_id=auth.uid() then b.defender_id else b.attacker_id end as opponent_id,
    coalesce(p.callsign,'Pilot') as opponent_callsign,
    b.winner_id=auth.uid() as won,
    b.rounds,
    b.attacker_power,
    b.defender_power,
    b.created_at
  from public.arena_battles b
  left join public.profiles p
    on p.id=case when b.attacker_id=auth.uid() then b.defender_id else b.attacker_id end
  where b.attacker_id=auth.uid() or b.defender_id=auth.uid()
  order by b.created_at desc
  limit 12;
$function$
;
CREATE OR REPLACE FUNCTION public.get_arena_opponents()
 RETURNS TABLE(user_id uuid, callsign text, faction text, level integer, ship_id text, hp bigint, shield bigint, laser_damage bigint, speed integer, power bigint, rating integer, wins integer, losses integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with mine as (
    select coalesce(power,1) p from public.arena_profiles where user_id=auth.uid()
  )
  select
    ap.user_id, ap.callsign, ap.faction, ap.level, ap.ship_id,
    ap.hp, ap.shield, ap.laser_damage, ap.speed, ap.power,
    coalesce(s.rating,1000), coalesce(s.wins,0), coalesce(s.losses,0)
  from public.arena_profiles ap
  left join public.arena_stats s on s.user_id=ap.user_id
  cross join mine
  where ap.user_id <> auth.uid()
  order by abs(ap.power-mine.p), coalesce(s.rating,1000) desc, ap.updated_at desc
  limit 24;
$function$
;
CREATE OR REPLACE FUNCTION public.get_arena_state()
 RETURNS TABLE(attacks_used integer, attacks_left integer, wins integer, losses integer, battles integer, rating integer, power bigint, battle_date date)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (
    select auth.uid() uid, (now() at time zone 'America/Sao_Paulo')::date d
  ),
  adm as (
    select coalesce((
      select ga.unlimited_arena
      from public.game_admins ga, me
      where ga.user_id=me.uid
    ),false) unlimited
  ),
  d as (
    select ad.attacks_used
    from public.arena_daily ad, me
    where ad.user_id=me.uid and ad.battle_date=me.d
  )
  select
    (case when adm.unlimited then 0 else coalesce((select attacks_used from d),0) end)::int,
    (case when adm.unlimited then 10 else 10-coalesce((select attacks_used from d),0) end)::int,
    coalesce(s.wins,0)::int,
    coalesce(s.losses,0)::int,
    coalesce(s.battles,0)::int,
    coalesce(s.rating,1000)::int,
    coalesce(p.power,0)::bigint,
    me.d
  from me
  cross join adm
  left join public.arena_stats s on s.user_id=me.uid
  left join public.arena_profiles p on p.user_id=me.uid;
$function$
;
CREATE OR REPLACE FUNCTION public.get_auction_market(p_hour_key text)
 RETURNS TABLE(lot_ref text, user_bid bigint, leader_user_id uuid, leader_callsign text, lot jsonb, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct on (b.lot_ref)
    b.lot_ref,
    b.user_bid,
    b.user_id as leader_user_id,
    coalesce(p.callsign, 'Pilot') as leader_callsign,
    b.lot,
    b.updated_at
  from public.auction_bids b
  left join public.profiles p on p.id = b.user_id
  where b.hour_key = p_hour_key
    and b.status = 'active'
  order by b.lot_ref, b.user_bid desc, b.updated_at asc;
$function$
;
CREATE OR REPLACE FUNCTION public.get_auction_rules_v1908()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE r public.game_auction_rules_v1908%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'stl_to_credits',r.stl_to_credits,
 'category_multipliers',r.category_multipliers,'item_multipliers',r.item_multipliers,'version',r.version);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_balance_runtime_v1909()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_version integer;v_updated timestamptz;v_rows jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login obrigatório.'; END IF;
 SELECT version,updated_at INTO v_version,v_updated FROM public.game_balance_meta_v1909 WHERE id=1;
 SELECT coalesce(jsonb_agg(jsonb_build_object('kind',kind,'item_id',item_id,'label',label,'params',params) ORDER BY kind,item_id),'[]'::jsonb)
 INTO v_rows FROM public.game_balance_entries_v1909;
 RETURN jsonb_build_object('version',v_version,'updated_at',v_updated,'entries',v_rows);
END;$function$
;
CREATE OR REPLACE FUNCTION public.get_battle_pass_runtime_config_v1817b()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_active public.game_battle_pass_seasons_v1817b%rowtype;
  v_active_json jsonb;
  v_seasons jsonb;
  v_tiers jsonb;
  v_tier_season_key text;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810 where config_key='pass';

  select * into v_active
  from public.game_battle_pass_seasons_v1817b
  where enabled and now()>=starts_at and now()<ends_at
  order by starts_at desc,season_key desc
  limit 1;

  if found then
    v_active_json:=jsonb_build_object(
      'season_key',v_active.season_key,'name',v_active.name,'description',v_active.description,
      'starts_at',v_active.starts_at,'ends_at',v_active.ends_at,'tier_count',v_active.tier_count,
      'points_per_tier',v_active.points_per_tier,'daily_points',v_active.daily_points,
      'premium_price_brl',v_active.premium_price_brl,'enabled',v_active.enabled
    );
    v_tier_season_key:=v_active.season_key;
  else
    v_active_json:=null;
    select season_key into v_tier_season_key
    from public.game_battle_pass_seasons_v1817b
    order by enabled desc,starts_at desc,season_key desc
    limit 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'season_key',season_key,'tier_no',tier_no,'free_reward',free_reward,
    'premium_reward',premium_reward,'enabled',enabled
  ) order by tier_no),'[]'::jsonb)
  into v_tiers
  from public.game_battle_pass_tiers_v1817b
  where season_key=v_tier_season_key;

  select coalesce(jsonb_agg(jsonb_build_object(
    'season_key',season_key,'name',name,'description',description,'starts_at',starts_at,'ends_at',ends_at,
    'tier_count',tier_count,'points_per_tier',points_per_tier,'daily_points',daily_points,
    'premium_price_brl',premium_price_brl,'enabled',enabled,'updated_at',updated_at
  ) order by starts_at desc,season_key desc),'[]'::jsonb)
  into v_seasons
  from public.game_battle_pass_seasons_v1817b;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'active_season',v_active_json,
    'editor_season_key',v_tier_season_key,
    'seasons',v_seasons,
    'tiers',coalesce(v_tiers,'[]'::jsonb)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_bonus_box_config_v1825()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT jsonb_build_object('version',version,'updated_at',updated_at,'config',config)
 FROM public.bonus_box_config_v1825 WHERE id=1;
$function$
;
CREATE OR REPLACE FUNCTION public.get_chat_history_v16(p_channel text, p_recipient_callsign text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS SETOF game_chat_messages_v16
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_recipient uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  p_channel:=lower(btrim(coalesce(p_channel,''))); p_limit:=greatest(1,least(100,coalesce(p_limit,50)));
  if p_channel='global' then
    return query select * from public.game_chat_messages_v16 m where m.channel='global' order by m.created_at desc limit p_limit;
  elsif p_channel='clan' then
    select clan_id into v_clan from public.clan_members where user_id=v_uid;
    if v_clan is null then return; end if;
    return query select * from public.game_chat_messages_v16 m where m.channel='clan' and m.clan_id=v_clan order by m.created_at desc limit p_limit;
  elsif p_channel='private' then
    select id into v_recipient from public.profiles where lower(btrim(callsign))=lower(btrim(coalesce(p_recipient_callsign,''))) limit 1;
    if v_recipient is null then return; end if;
    return query select * from public.game_chat_messages_v16 m where m.channel='private' and ((m.sender_user_id=v_uid and m.recipient_user_id=v_recipient) or (m.sender_user_id=v_recipient and m.recipient_user_id=v_uid)) order by m.created_at desc limit p_limit;
  end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.get_clan_requests_v19()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_clan uuid;v_role text;v_incoming jsonb:='[]'::jsonb;v_outgoing jsonb:='[]'::jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_role in ('owner','deputy') then
    select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'callsign',coalesce(p.callsign,'Piloto'),'level',coalesce(p.level,1),'created_at',r.created_at) order by r.created_at),'[]'::jsonb)
      into v_incoming from public.clan_join_requests_v19 r left join public.profiles p on p.id=r.user_id
      where r.clan_id=v_clan and r.status='pending';
  end if;
  if v_clan is null then
    select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'clan_id',c.id,'clan_name',c.name,'clan_tag',c.tag,'created_at',r.created_at) order by r.created_at),'[]'::jsonb)
      into v_outgoing from public.clan_join_requests_v19 r join public.clans c on c.id=r.clan_id
      where r.user_id=v_uid and r.status='pending';
  end if;
  return jsonb_build_object('incoming',v_incoming,'outgoing',v_outgoing,'can_review',v_role in ('owner','deputy'));
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_domination_state_v132()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_clan uuid;
  v_maps jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.sync_event_flow_v132();
  perform public.finalize_map_domination_v132();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'map_id',m.map_id,
    'map_label',m.map_label,
    'owner',case when oc.id is null then null else jsonb_build_object('id',oc.id,'name',oc.name,'tag',oc.tag,'captured_at',o.captured_at,'winning_score',o.winning_score) end,
    'active_event',case when ev.id is null then null else jsonb_build_object('id',ev.id,'name',ev.name,'event_key',ev.event_key,'kind',ev.kind,'starts_at',ev.starts_at,'ends_at',ev.ends_at) end,
    'leader',case when lc.id is null then null else jsonb_build_object('id',lc.id,'name',lc.name,'tag',lc.tag,'score',lead.score) end,
    'my_clan_score',coalesce(mine.score,0)
  ) order by m.map_label),'[]'::jsonb)
  into v_maps
  from (values ('b41'::text,'4-1'::text),('b42','4-2'),('b43','4-3')) as m(map_id,map_label)
  left join public.clan_map_ownership_v132 o on o.map_id=m.map_id
  left join public.clans oc on oc.id=o.clan_id
  left join lateral (
    select e.id,e.name,e.event_key,e.kind,e.starts_at,e.ends_at
    from public.map_event_instances_v132 e
    where e.map_id=m.map_id and e.status='active' and e.starts_at<=now() and e.ends_at>now()
    order by e.starts_at desc limit 1
  ) ev on true
  left join lateral (
    select s.clan_id,s.score from public.clan_map_domination_scores_v132 s
    where s.event_id=ev.id order by s.score desc,s.updated_at asc limit 1
  ) lead on true
  left join public.clans lc on lc.id=lead.clan_id
  left join lateral (
    select s.score from public.clan_map_domination_scores_v132 s
    where s.event_id=ev.id and s.clan_id=v_clan limit 1
  ) mine on true;

  return jsonb_build_object('maps',v_maps,'my_clan_id',v_clan,'owner_bonus_percent',10);
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_event_flow_v132()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_active jsonb;
  v_upcoming jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.sync_event_flow_v132();
  perform public.finalize_map_domination_v132();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'event_key',e.event_key,'name',e.name,'kind',e.kind,'map_id',e.map_id,
      'map_label',case e.map_id when 'b41' then '4-1' when 'b42' then '4-2' else '4-3' end,
      'starts_at',e.starts_at,'ends_at',e.ends_at,'status',e.status,'config',e.config
    ) order by e.starts_at,e.created_at),'[]'::jsonb)
  into v_active
  from public.map_event_instances_v132 e
  where e.status='active' and e.starts_at<=now() and e.ends_at>now();

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'event_key',e.event_key,'name',e.name,'kind',e.kind,'map_id',e.map_id,
      'map_label',case e.map_id when 'b41' then '4-1' when 'b42' then '4-2' else '4-3' end,
      'starts_at',e.starts_at,'ends_at',e.ends_at,'status',e.status,'config',e.config
    ) order by e.starts_at),'[]'::jsonb)
  into v_upcoming
  from (select * from public.map_event_instances_v132 where status='scheduled' and starts_at>now() order by starts_at limit 12) e;

  return jsonb_build_object('active',v_active,'upcoming',v_upcoming,'event_only_maps',jsonb_build_array('b41','b42','b43'));
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_galaxy_gate_config_v1906()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessao necessaria.' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('version',version,'updated_at',updated_at,'config',config)
   INTO v_result FROM public.galaxy_gate_config_v1906 WHERE id=1;
 RETURN COALESCE(v_result,'{"version":0,"config":{}}'::jsonb);
END;$function$
;
CREATE OR REPLACE FUNCTION public.get_game_runtime_config_v1810()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_is_admin boolean:=false;
  v_version bigint:=1;
  v_updated timestamptz;
  v_modules jsonb;
  v_flags jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  v_is_admin:=public.is_game_admin_v1763(v_uid);

  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810
  where config_key='core';

  select coalesce(jsonb_agg(row_to_json(m) order by m.parent_sort,m.sort_order,m.module_key),'[]'::jsonb)
  into v_modules
  from (
    select
      u.module_key,u.parent_key,u.label,u.sort_order,u.min_level,u.enabled,
      u.hide_until_level,u.admin_only,u.config,
      coalesce(p.sort_order,u.sort_order) parent_sort
    from public.game_ui_modules_v1810 u
    left join public.game_ui_modules_v1810 p on p.module_key=u.parent_key
    where not u.admin_only or v_is_admin
  ) m;

  select coalesce(jsonb_agg(row_to_json(f) order by f.flag_key),'[]'::jsonb)
  into v_flags
  from (
    select flag_key,enabled,description,config
    from public.game_feature_flags_v1810
    order by flag_key
  ) f;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'is_admin',v_is_admin,
    'modules',v_modules,
    'flags',v_flags
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_game_runtime_public_v1813()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_modules jsonb;
  v_flags jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810
  where config_key='core';

  select coalesce(jsonb_agg(row_to_json(m) order by m.parent_sort,m.sort_order,m.module_key),'[]'::jsonb)
  into v_modules
  from (
    select
      u.module_key,u.parent_key,u.label,u.sort_order,u.min_level,u.enabled,
      u.hide_until_level,u.admin_only,u.config,
      coalesce(p.sort_order,u.sort_order) parent_sort
    from public.game_ui_modules_v1810 u
    left join public.game_ui_modules_v1810 p on p.module_key=u.parent_key
    order by coalesce(p.sort_order,u.sort_order),u.sort_order,u.module_key
  ) m;

  select coalesce(jsonb_agg(row_to_json(f) order by f.flag_key),'[]'::jsonb)
  into v_flags
  from (
    select flag_key,enabled,description,config
    from public.game_feature_flags_v1810
    order by flag_key
  ) f;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'modules',coalesce(v_modules,'[]'::jsonb),
    'flags',coalesce(v_flags,'[]'::jsonb)
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_live_ops_v16()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT jsonb_build_object(
  'server_time',(extract(epoch FROM clock_timestamp())*1000)::bigint,
  'weekend_settings',coalesce((SELECT to_jsonb(t)-'id' FROM public.live_event_weekend_settings_v3411 t WHERE id=1),'{}'::jsonb),
  'manual_override',coalesce((SELECT to_jsonb(t)-'id' FROM public.live_event_manual_override_v3411 t WHERE id=1),'{}'::jsonb),
  'events',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'event_key',event_key,'name',name,'icon',icon,'description',description,'enabled',enabled,
    'starts_at',starts_at,'duration_minutes',duration_minutes,'repeat_minutes',repeat_minutes,
    'schedule_mode',schedule_mode,'weekdays',weekdays,'start_local_time',start_local_time,
    'timezone',timezone,'ends_at',ends_at,
    'priority',priority,'target',target,'reward',reward,'rules',rules,'updated_at',updated_at)
    ORDER BY priority,event_key) FROM public.live_event_config_v16),'[]'::jsonb),
  'catalog',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'catalog_key',catalog_key,'kind',kind,'ref_id',ref_id,'display_name',display_name,
    'description',description,'price',price,'currency',currency,'enabled',enabled,
    'shop_tab',shop_tab,'shop_visible',shop_visible,'min_level',min_level,'sort_order',sort_order,
    'meta',meta,'updated_at',updated_at) ORDER BY coalesce(shop_tab,'zzz'),sort_order,catalog_key)
    FROM public.live_shop_prices_v16 WHERE enabled),'[]'::jsonb)
 );
$function$
;
CREATE OR REPLACE FUNCTION public.get_map_presence_v12(p_map_id text, p_territory_faction text)
 RETURNS TABLE(user_id uuid, callsign text, map_id text, territory_faction text, x double precision, y double precision, angle double precision, ship_id text, faction text, level integer, hp bigint, max_hp bigint, shield bigint, max_shield bigint, updated_at timestamp with time zone, rank_code text, rank_title text, clan_tag text, is_admin boolean, pilot_title text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select pp.user_id,pp.callsign,pp.map_id,pp.territory_faction,pp.x,pp.y,pp.angle,pp.ship_id,pp.faction,pp.level,
         pp.hp,pp.max_hp,pp.shield,pp.max_shield,pp.updated_at,
         case when ga.user_id is not null then 'admin' else coalesce(r.rank_code,'pilot_basic') end,
         case when ga.user_id is not null then 'Administrador' else coalesce(r.rank_title,'Piloto Básico') end,
         c.tag,(ga.user_id is not null),
         coalesce(nullif(trim(pp.pilot_title),''),'Piloto Estelar')
  from public.player_presence pp
  left join public.get_public_rankings() r on r.id=pp.user_id
  left join public.game_admins ga on ga.user_id=pp.user_id and lower(coalesce(ga.role,''))='admin'
  left join public.clan_members cm on cm.user_id=pp.user_id
  left join public.clans c on c.id=cm.clan_id
  where pp.map_id=p_map_id and pp.territory_faction=p_territory_faction
    and pp.updated_at>=now()-interval '9 seconds'
  order by pp.updated_at desc;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_account_access_v1763()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_row public.account_moderation_v1763%rowtype;
  v_active boolean:=false;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_row from public.account_moderation_v1763 where user_id=v_uid;
  if found then
    v_active:=v_row.is_banned and (v_row.banned_until is null or v_row.banned_until>now());
    if v_row.is_banned and not v_active then
      update public.account_moderation_v1763
      set is_banned=false,banned_reason=null,banned_by=null,updated_at=now()
      where user_id=v_uid;
    end if;
  end if;
  return jsonb_build_object(
    'allowed',not v_active,
    'is_banned',v_active,
    'banned_until',case when v_active then v_row.banned_until else null end,
    'reason',case when v_active then v_row.banned_reason else null end
  );
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_my_battle_group_v179()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_group jsonb;
  v_members jsonb;
  v_invites jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;

  update public.battle_group_invites_v179
  set status='expired'
  where status='pending' and expires_at<=now();

  select group_id into v_gid
  from public.battle_group_members_v179
  where user_id=v_uid
  limit 1;

  if v_gid is not null then
    select jsonb_build_object(
      'id',g.id::text,
      'leader_id',g.leader_id::text,
      'rally_map_id',g.rally_map_id,
      'rally_territory_faction',g.rally_territory_faction,
      'rally_x',g.rally_x,
      'rally_y',g.rally_y,
      'rally_at',g.rally_at,
      'created_at',g.created_at
    ) into v_group
    from public.battle_groups_v179 g
    where g.id=v_gid;

    select coalesce(jsonb_agg(row_to_json(m) order by (m.role='leader') desc,m.joined_at),'[]'::jsonb)
    into v_members
    from (
      select
        gm.user_id::text,
        gm.role,
        gm.joined_at,
        coalesce(p.callsign,'Pilot') callsign,
        p.faction,
        coalesce(c.tag,'') clan_tag,
        pp.map_id,
        pp.territory_faction,
        pp.x,pp.y,
        pp.updated_at presence_updated_at
      from public.battle_group_members_v179 gm
      left join public.profiles p on p.id=gm.user_id
      left join public.clan_members cm on cm.user_id=gm.user_id
      left join public.clans c on c.id=cm.clan_id
      left join public.player_presence pp on pp.user_id=gm.user_id
      where gm.group_id=v_gid
      order by (gm.role='leader') desc,gm.joined_at
    ) m;
  else
    v_group:=null;
    v_members:='[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_to_json(i) order by i.created_at desc),'[]'::jsonb)
  into v_invites
  from (
    select
      bi.id::text,
      bi.group_id::text,
      bi.inviter_id::text,
      coalesce(p.callsign,'Pilot') inviter_callsign,
      bi.created_at,
      bi.expires_at
    from public.battle_group_invites_v179 bi
    left join public.profiles p on p.id=bi.inviter_id
    where bi.invitee_id=v_uid and bi.status='pending' and bi.expires_at>now()
    order by bi.created_at desc
    limit 10
  ) i;

  return jsonb_build_object(
    'group',v_group,
    'members',coalesce(v_members,'[]'::jsonb),
    'invites',coalesce(v_invites,'[]'::jsonb),
    'my_user_id',v_uid::text
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_clan_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan_id uuid; v_role text; v_clan jsonb; v_members jsonb:='[]'::jsonb;
v_transactions jsonb:='[]'::jsonb; v_pending bigint:=0; v_admin boolean:=false; v_status jsonb;
begin
 if v_uid is null then raise exception 'Sessão inválida.'; end if;
 select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
 select cm.clan_id,cm.role into v_clan_id,v_role from public.clan_members cm where cm.user_id=v_uid;
 select coalesce(sum(g.amount),0) into v_pending from public.clan_credit_grants g where g.recipient_id=v_uid and not g.claimed;
 if v_clan_id is null then
   return jsonb_build_object('is_admin',v_admin,'role',null,'clan',null,'members','[]'::jsonb,'transactions','[]'::jsonb,'pending_credits',v_pending);
 end if;
 select jsonb_build_object('id',c.id,'name',c.name,'tag',c.tag,'owner_id',c.owner_id,'level',c.level,'vault_credits',c.vault_credits,
   'total_collected',c.total_collected,'total_interest',c.total_interest,'total_transfer_fees',c.total_transfer_fees,
   'last_interest_date',c.last_interest_date,'last_collection_date',c.last_collection_date,'created_at',c.created_at)
 into v_clan from public.clans c where c.id=v_clan_id;
 v_status:=public.clan_level_status_v12(v_clan_id);
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.id,'callsign',p.callsign,'level',coalesce(p.level,1),'xp',coalesce(p.xp,0),
   'credits',coalesce(p.credits,0),'role',cm.role,'joined_at',cm.joined_at)
   order by case when cm.role='owner' then 0 else 1 end,p.callsign),'[]'::jsonb)
 into v_members from public.clan_members cm join public.profiles p on p.id=cm.user_id where cm.clan_id=v_clan_id;
 select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_transactions from (
   select t.created_at,jsonb_build_object('id',t.id,'kind',t.kind,'gross_amount',t.gross_amount,'net_amount',t.net_amount,
     'burn_amount',t.burn_amount,'actor_callsign',pa.callsign,'target_callsign',pt.callsign,'created_at',t.created_at) obj
   from public.clan_transactions t left join public.profiles pa on pa.id=t.actor_id left join public.profiles pt on pt.id=t.target_user_id
   where t.clan_id=v_clan_id order by t.created_at desc limit 40) x;
 return jsonb_build_object('is_admin',v_admin,'role',v_role,'clan',v_clan,'level_status',v_status,
   'members',v_members,'transactions',v_transactions,'pending_credits',v_pending);
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_my_designers_v16()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_inventory jsonb;
  v_drones jsonb;
  v_loadout jsonb;
  v_catalog jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;

  SELECT coalesce(jsonb_object_agg(design_id,quantity),'{}'::jsonb)
    INTO v_inventory
  FROM public.player_design_inventory_v16
  WHERE user_id=v_uid AND quantity>0;

  SELECT coalesce(jsonb_object_agg(drone_id,design_id),'{}'::jsonb)
    INTO v_drones
  FROM public.player_drone_designs_v16
  WHERE user_id=v_uid;

  SELECT jsonb_build_object('ship',ship_design_id,'pet',pet_design_id)
    INTO v_loadout
  FROM public.player_design_loadout_v16
  WHERE user_id=v_uid;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'design_id',design_id,'kind',kind,'name',name,'rarity',rarity,
      'visual',visual,'bonuses',bonuses,'ability',ability,'eligibility',eligibility
    ) ORDER BY kind,rarity,name),'[]'::jsonb)
    INTO v_catalog
  FROM public.live_designs_v16
  WHERE enabled=true;

  RETURN jsonb_build_object(
    'inventory',coalesce(v_inventory,'{}'::jsonb),
    'drones',coalesce(v_drones,'{}'::jsonb),
    'loadout',coalesce(v_loadout,'{"ship":null,"pet":null}'::jsonb),
    'catalog',coalesce(v_catalog,'[]'::jsonb)
  );
END
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_galaxy_event_progress_v1826(p_event_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); row_ev public.galaxy_event_progress_v1826%ROWTYPE; old_rec jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
 SELECT * INTO row_ev FROM public.galaxy_event_progress_v1826 WHERE user_id=uid AND event_id=p_event_id;
 IF FOUND THEN RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.progress,'target',row_ev.target,'complete',row_ev.rewarded,'rewarded',row_ev.rewarded,'rewardedNow',false); END IF;
 SELECT state #> ARRAY['galaxyEvents','records',p_event_id] INTO old_rec FROM public.game_saves WHERE user_id=uid;
 RETURN jsonb_build_object('eventId',p_event_id,'progress',greatest(0,coalesce((old_rec->>'value')::int,0)),
   'complete',coalesce((old_rec->>'rewarded')::boolean,false),
   'rewarded',coalesce((old_rec->>'rewarded')::boolean,false),'rewardedNow',false);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_player_location_v1774()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_row public.player_location_v1774%rowtype;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_row from public.player_location_v1774 where user_id=v_uid;
  if not found then return null; end if;
  return jsonb_build_object(
    'map_id',v_row.map_id,
    'territory_faction',v_row.territory_faction,
    'x',v_row.x,
    'y',v_row.y,
    'angle',v_row.angle,
    'client_saved_at',v_row.client_saved_at,
    'updated_at',v_row.updated_at
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_npc_runtime_config_v1811()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_npcs jsonb;
  v_spawns jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810
  where config_key='npc';

  select coalesce(jsonb_agg(row_to_json(n) order by n.npc_key),'[]'::jsonb)
  into v_npcs
  from (
    select npc_key,name,hp,shield,credits,stl,xp,speed,damage,color,size,resources,
           respawn_min_ms,respawn_max_ms,enabled
    from public.game_npc_config_v1811
    order by npc_key
  ) n;

  select coalesce(jsonb_agg(row_to_json(s) order by s.map_id,s.npc_key),'[]'::jsonb)
  into v_spawns
  from (
    select map_id,npc_key,spawn_count,enabled
    from public.game_map_npc_spawns_v1811
    order by map_id,npc_key
  ) s;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'npcs',v_npcs,
    'spawns',v_spawns
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_premium_shop_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid(); v_admin boolean:=false; v_until timestamptz; v_season text;
  v_current text; v_pass_name text; v_pass_desc text; v_pass_price numeric; v_catalog jsonb;
  v_level integer:=1;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  select greatest(coalesce(level,1),1) into v_level from public.profiles where id=v_uid;
  v_level:=coalesce(v_level,1);
  select premium_until,battle_pass_season into v_until,v_season from public.premium_accounts_v12 where user_id=v_uid;
  select season_key,name,description,premium_price_brl into v_current,v_pass_name,v_pass_desc,v_pass_price
  from public.game_battle_pass_seasons_v1817b
  where enabled and now()>=starts_at and now()<ends_at
  order by starts_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,
    'name',case when category='battle_pass' and v_current is not null then v_pass_name else name end,
    'category',category,
    'price_brl',case when category='battle_pass' and v_current is not null then v_pass_price else price_brl end,
    'item_id',item_id,'quantity',quantity,
    'description',case when category='battle_pass' and v_current is not null then v_pass_desc else description end,
    'sort_order',sort_order,'min_level',min_level,'meta',meta,
    'locked',v_level<min_level
  ) order by sort_order,id),'[]'::jsonb)
  into v_catalog from public.premium_catalog_v12
  where active and (category<>'battle_pass' or v_current is not null);

  return jsonb_build_object(
    'is_admin',v_admin,'can_purchase',v_admin,'test_mode',true,'premium_until',v_until,
    'premium_active',coalesce(v_until>now(),false),'battle_pass_season',v_season,
    'battle_pass_active',coalesce(v_current is not null and v_season=v_current,false),
    'current_season',v_current,'player_level',v_level,'catalog',v_catalog
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_premium_stage_catalog_v1833()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_offers jsonb; v_season jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',product_id,'name',display_name,'category',category,'billing_mode',billing_mode,
   'price_brl',price_brl,'duration_days',duration_days,'billing_months',billing_months,
   'tier_quantity',tier_quantity,'stl_amount',NULLIF(reward_plan->>'stl','')::bigint,
   'premium_days',NULLIF(reward_plan->>'premium_days','')::int,
   'bundle_items',CASE WHEN category IN ('starter_bundle','equipment_bundle','event_ship_bundle')
     THEN reward_plan->'items' ELSE NULL END,
   'event_ship_id',CASE WHEN category='event_ship_bundle' THEN reward_plan->>'ship_id' ELSE NULL END,
   'event_ship_name',CASE WHEN category='event_ship_bundle' THEN reward_plan->>'ship_name' ELSE NULL END,
   'purchase_limit',NULLIF(reward_plan->>'purchase_limit','')::int,
   'test_only',true,'live_enabled',false
 ) ORDER BY display_order,product_id),'[]'::jsonb) INTO v_offers
 FROM public.premium_offers_stage_v1832 WHERE test_only=true AND live_enabled=false;
 SELECT to_jsonb(s) INTO v_season FROM (
   SELECT season_key,name,tier_count,ends_at FROM public.game_battle_pass_seasons_v1817b
   WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1
 ) s;
 RETURN jsonb_build_object('test_mode',true,'billing_live',false,'rewards_live',false,
  'public_preview',true,'can_simulate',false,'offers',v_offers,'current_season',v_season,
  'test_subscription',null,'test_tiers',null);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_public_rankings()
 RETURNS TABLE(id uuid, callsign text, faction text, level integer, xp bigint, aliens_killed bigint, gg_completed bigint, ship_id text, missions_completed integer, honor numeric, arena_rating integer, arena_wins integer, arena_losses integer, rank_points bigint, rank_code text, rank_title text, rank_position integer, total_players integer, is_admin boolean, negative_honor boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
with pilots as (
  select p.id,coalesce(nullif(p.callsign,''),split_part(u.email,'@',1),'Pilot') callsign,p.faction,
         greatest(coalesce(p.level,1),1)::integer level,greatest(coalesce(p.xp,0),0)::bigint xp,
         greatest(coalesce(p.aliens_killed,0),0)::bigint aliens_killed,greatest(coalesce(p.gg_completed,0),0)::bigint gg_completed,
         coalesce(gs.state,'{}'::jsonb) state,greatest(coalesce(ast.rating,1000),0)::integer arena_rating,
         greatest(coalesce(ast.wins,0),0)::integer arena_wins,greatest(coalesce(ast.losses,0),0)::integer arena_losses,
         coalesce(u.created_at,now()) registered_at,p.updated_at
  from public.profiles p
  left join auth.users u on u.id=p.id
  left join public.game_saves gs on gs.user_id=p.id
  left join public.arena_stats ast on ast.user_id=p.id
  where not exists (
    select 1 from public.game_admins ga
    where ga.user_id=p.id and lower(coalesce(ga.role,''))='admin'
  )
), base as (
  select pilots.*,
         coalesce(nullif(state->>'activeShipId',''),'phoenix') ship_id,
         case when jsonb_typeof(state->'missions'->'completed')='object'
              then (select count(*)::integer from jsonb_object_keys(state->'missions'->'completed')) else 0 end missions_completed,
         coalesce(nullif(state->'profile'->>'honor','')::numeric,0) honor,
         greatest(coalesce(nullif(state->'profileStats'->>'friendlyKills','')::integer,0),0) friendly_kills,
         greatest(coalesce(nullif(state->'profileStats'->>'enemyDeaths','')::integer,0),0) enemy_deaths,
         greatest(coalesce(nullif(state->'profileStats'->>'radiationDeaths','')::integer,0),0) radiation_deaths,
         greatest(coalesce(nullif(state->'profileStats'->>'phoenixDeaths','')::integer,0),0) phoenix_deaths,
         greatest((current_date-(registered_at at time zone 'UTC')::date),0) registered_days,
         coalesce(nullif(state->'profileStats'->>'negativeHonor','')::integer,0) negative_honor_flag
  from pilots
), scored as (
  select b.*,
    greatest((
      floor(coalesce(xp,0)::numeric/100000)+floor(greatest(coalesce(honor,0),0)/100)+(coalesce(arena_wins,0)*3)
      +(coalesce(level,1)*100)+(coalesce(registered_days,0)*6)+public.ship_rank_value(ship_id)
      +floor(coalesce(aliens_killed,0)::numeric/2)+(coalesce(missions_completed,0)*100)
      -(coalesce(friendly_kills,0)*100)-(coalesce(enemy_deaths,0)*4)-(coalesce(radiation_deaths,0)*8)-(coalesce(phoenix_deaths,0)*2)
    )::bigint,0) rank_points,
    (coalesce(honor,0)<0 or coalesce(friendly_kills,0)>=10 or coalesce(negative_honor_flag,0)>0) negative_honor
  from base b
), eligible as (
  -- V18.0.3: sem carência por idade da conta.
  -- A partir do LV2, patente competitiva é definida apenas pela posição em pontos.
  select * from scored where not negative_honor and level>=2
), ranked_eligible as (
  select e.id,row_number() over(order by e.rank_points desc,e.xp desc,e.updated_at desc nulls last,e.id) regular_position,
         count(*) over() total_regular
  from eligible e
), leaderboard as (
  select s.*,row_number() over(order by s.rank_points desc,s.xp desc,s.updated_at desc nulls last,s.id) rank_position,
         count(*) over() total_players,re.regular_position,re.total_regular
  from scored s left join ranked_eligible re on re.id=s.id
)
select l.id,l.callsign,l.faction,l.level,l.xp,l.aliens_killed,l.gg_completed,l.ship_id,l.missions_completed,l.honor,
       l.arena_rating,l.arena_wins,l.arena_losses,l.rank_points,
       case
         when l.negative_honor then 'negative_honor'
         when l.regular_position=1 then 'general'
         when l.regular_position<=4 then 'general_basic'
         when l.regular_position<=9 then 'colonel_chief'
         when l.regular_position<=29 then 'colonel'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.01 then 'colonel_basic'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.015 then 'major_chief'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.02 then 'major'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.025 then 'major_basic'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.03 then 'captain_chief'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.035 then 'captain'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.04 then 'captain_basic'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.045 then 'lieutenant_chief'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.05 then 'lieutenant'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.06 then 'lieutenant_basic'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.07 then 'sergeant_chief'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.08 then 'sergeant'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.09 then 'sergeant_basic'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.10 then 'pilot_chief'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.129 then 'pilot'
         else 'pilot_basic'
       end,
       case
         when l.negative_honor then 'Honra Negativa'
         when l.regular_position=1 then 'General'
         when l.regular_position<=4 then 'General Básico'
         when l.regular_position<=9 then 'Coronel Chefe'
         when l.regular_position<=29 then 'Coronel'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.01 then 'Coronel Básico'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.015 then 'Major Chefe'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.02 then 'Major'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.025 then 'Major Básico'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.03 then 'Capitão Chefe'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.035 then 'Capitão'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.04 then 'Capitão Básico'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.045 then 'Tenente Chefe'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.05 then 'Tenente'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.06 then 'Tenente Básico'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.07 then 'Sargento Chefe'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.08 then 'Sargento'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.09 then 'Sargento Básico'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.10 then 'Piloto Chefe'
         when (l.regular_position::numeric/greatest(coalesce(l.total_regular,1),1))<=.129 then 'Piloto'
         else 'Piloto Básico'
       end,
       l.rank_position::integer,l.total_players::integer,false,l.negative_honor
from leaderboard l
order by l.rank_points desc,l.xp desc,l.updated_at desc nulls last,l.id;
$function$
;
CREATE OR REPLACE FUNCTION public.get_shops_runtime_config_v1817c()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_common jsonb;
  v_premium jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810 where config_key='shops';

  select coalesce(jsonb_agg(jsonb_build_object(
    'catalog_key',catalog_key,'kind',kind,'ref_id',ref_id,
    'display_name',display_name,'description',description,
    'price',price,'currency',currency,'enabled',enabled,
    'shop_tab',shop_tab,'shop_visible',shop_visible,
    'min_level',min_level,'sort_order',sort_order,
    'meta',meta,'updated_at',updated_at
  ) order by coalesce(shop_tab,'zzz'),sort_order,catalog_key),'[]'::jsonb)
  into v_common
  from public.live_shop_prices_v16
  where kind in ('ship','laser','generator','drone','pet','pet_gear','extra','ammo','rocket');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'name',name,'category',category,'price_brl',price_brl,
    'item_id',item_id,'quantity',quantity,'description',description,
    'active',active,'sort_order',sort_order,'min_level',min_level,'meta',meta
  ) order by sort_order,id),'[]'::jsonb)
  into v_premium
  from public.premium_catalog_v12;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'common',v_common,
    'premium',v_premium
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_systems_runtime_config_v1815()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_categories jsonb;
  v_custom jsonb;
  v_services jsonb;
  v_recipes jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810 where config_key='systems';

  select coalesce(jsonb_agg(row_to_json(x) order by x.category),'[]'::jsonb)
  into v_categories
  from (
    select category,label,accent,reset_kind,min_level,reward_factor,item_chance,enabled,config
    from public.game_mission_category_v1815 order by category
  ) x;

  select coalesce(jsonb_agg(row_to_json(x) order by x.category,x.sort_order,x.mission_id),'[]'::jsonb)
  into v_custom
  from (
    select mission_id,category,title,description,tasks,group_key,sequence,reward_factor,tag,flat_reward,enabled,sort_order
    from public.game_mission_custom_v1815 order by category,sort_order,mission_id
  ) x;

  select coalesce(jsonb_agg(row_to_json(x) order by x.sort_order,x.service_id),'[]'::jsonb)
  into v_services
  from (
    select service_id,name,description,base_cost,duration_ms,level_band_size,level_cost_scale,max_stack_ms,effect,enabled,sort_order
    from public.game_economy_service_v1815 order by sort_order,service_id
  ) x;

  select coalesce(jsonb_agg(row_to_json(x) order by x.sort_order,x.recipe_id),'[]'::jsonb)
  into v_recipes
  from (
    select recipe_id,name,description,cost,currency,ingredients,grant_payload,output_label,min_level,enabled,sort_order
    from public.game_crafting_recipe_v1815 order by sort_order,recipe_id
  ) x;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'mission_categories',v_categories,
    'custom_missions',v_custom,
    'economy_services',v_services,
    'crafting_recipes',v_recipes
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_warfront_state_v131()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_boss public.world_boss_v131%rowtype; v_damage bigint:=0; v_rank integer:=0; v_claimed boolean:=false; v_war public.clan_wars_v131%rowtype; v_war_json jsonb:=null;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.finish_expired_clan_wars_v131();
  select * into v_boss from public.ensure_world_boss_v131();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  select coalesce(damage,0) into v_damage from public.world_boss_contrib_v131 where boss_id=v_boss.id and user_id=v_uid;
  select count(*)+1 into v_rank from public.world_boss_contrib_v131 where boss_id=v_boss.id and damage>v_damage;
  select exists(select 1 from public.world_boss_claims_v131 where boss_id=v_boss.id and user_id=v_uid) into v_claimed;
  if v_clan is not null then
    select * into v_war from public.clan_wars_v131 where status='active' and ends_at>now() and (attacker_clan_id=v_clan or defender_clan_id=v_clan) order by starts_at desc limit 1;
    if found then
      v_war_json:=jsonb_build_object('id',v_war.id,'attacker_score',v_war.attacker_score,'defender_score',v_war.defender_score,'starts_at',v_war.starts_at,'ends_at',v_war.ends_at,'my_side',case when v_war.attacker_clan_id=v_clan then 'attacker' else 'defender' end,
        'attacker',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.attacker_clan_id),
        'defender',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.defender_clan_id));
    end if;
  end if;
  return jsonb_build_object('world_boss',jsonb_build_object('id',v_boss.id,'name',v_boss.name,'max_hp',v_boss.max_hp,'hp',v_boss.hp,'spawn_at',v_boss.spawn_at,'ends_at',v_boss.ends_at,'defeated_at',v_boss.defeated_at,'my_damage',v_damage,'my_rank',case when v_damage>0 then v_rank else 0 end,'claimed',v_claimed),'war',v_war_json);
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_warfront_state_v132()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_base jsonb;
  v_events jsonb;
  v_dom jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select public.get_warfront_state_v131() into v_base;
  select public.get_event_flow_v132() into v_events;
  select public.get_domination_state_v132() into v_dom;
  return coalesce(v_base,'{}'::jsonb)||jsonb_build_object('event_flow',v_events,'domination',v_dom,'version','13.2.0');
end;$function$
;
CREATE OR REPLACE FUNCTION public.get_world_runtime_config_v1814()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_version bigint:=1; v_updated timestamptz;
  v_resources jsonb; v_maps jsonb; v_map_resources jsonb; v_sectors jsonb; v_portals jsonb;
begin
  select version,updated_at into v_version,v_updated from public.game_runtime_meta_v1810 where config_key='world';
  select coalesce(jsonb_agg(row_to_json(x) order by x.resource_key),'[]'::jsonb) into v_resources
  from (select resource_key,name,color,sell_price,enabled from public.game_resource_config_v1814 order by resource_key) x;
  select coalesce(jsonb_agg(row_to_json(x) order by x.map_id),'[]'::jsonb) into v_maps
  from (select map_id,label,tier,name,risk,world_w,world_h,enemy_multiplier,ore_count,ore_respawn_min_ms,ore_respawn_max_ms,landmark_count,min_level,battle,gate,enabled,palette,structures from public.game_map_config_v1814 order by map_id) x;
  select coalesce(jsonb_agg(row_to_json(x) order by x.map_id,x.resource_key),'[]'::jsonb) into v_map_resources
  from (select map_id,resource_key,weight,enabled from public.game_map_resource_pool_v1814 order by map_id,resource_key) x;
  select coalesce(jsonb_agg(row_to_json(x) order by x.sector_label),'[]'::jsonb) into v_sectors
  from (select sector_label,map_id,territory_faction,graph_x,graph_y,min_level,enabled from public.game_sector_nodes_v1814 order by sector_label) x;
  select coalesce(jsonb_agg(row_to_json(x) order by x.sort_order,x.portal_key),'[]'::jsonb) into v_portals
  from (select portal_key,from_sector,to_sector,bidirectional,enabled,sort_order from public.game_portal_links_v1814 order by sort_order,portal_key) x;
  return jsonb_build_object('version',coalesce(v_version,1),'updated_at',v_updated,'resources',v_resources,'maps',v_maps,'map_resources',v_map_resources,'sectors',v_sectors,'portals',v_portals);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_drone_purchase_history_v1829()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE k text; n_old numeric; n_new numeric; preserved jsonb;
BEGIN
 IF NEW.state IS NULL OR OLD.state IS NULL THEN RETURN NEW; END IF;
 preserved:=CASE WHEN jsonb_typeof(NEW.state->'dronePurchasesV1829')='object' THEN NEW.state->'dronePurchasesV1829' ELSE '{}'::jsonb END;
 FOR k IN SELECT unnest(ARRAY['flax','iris']) LOOP
   n_old:=CASE WHEN jsonb_typeof(OLD.state->'dronePurchasesV1829'->k)='number' THEN LEAST(100000,GREATEST(0,(OLD.state->'dronePurchasesV1829'->>k)::numeric)) ELSE 0 END;
   n_new:=CASE WHEN jsonb_typeof(preserved->k)='number' THEN LEAST(100000,GREATEST(0,(preserved->>k)::numeric)) ELSE 0 END;
   IF n_old>n_new THEN preserved:=jsonb_set(preserved,ARRAY[k],to_jsonb(n_old::bigint),true); END IF;
 END LOOP;
 IF preserved<>'{}'::jsonb THEN NEW.state:=jsonb_set(NEW.state,'{dronePurchasesV1829}',preserved,true); END IF;
 RETURN NEW;
END;$function$
;
CREATE OR REPLACE FUNCTION public.hit_world_boss_v131(p_damage bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_boss public.world_boss_v131%rowtype; v_req bigint:=greatest(1,least(10000000,coalesce(p_damage,1))); v_applied bigint; v_before bigint; v_total bigint;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_boss from public.ensure_world_boss_v131();
  select * into v_boss from public.world_boss_v131 where id=v_boss.id for update;
  if v_boss.hp<=0 or v_boss.ends_at<=now() then return jsonb_build_object('id',v_boss.id,'name',v_boss.name,'max_hp',v_boss.max_hp,'hp',v_boss.hp,'ends_at',v_boss.ends_at,'defeated',v_boss.hp<=0,'applied',0); end if;
  v_before:=v_boss.hp; v_applied:=least(v_req,v_before);
  update public.world_boss_v131 set hp=greatest(0,hp-v_applied),defeated_at=case when hp-v_applied<=0 then coalesce(defeated_at,now()) else defeated_at end where id=v_boss.id returning * into v_boss;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  insert into public.world_boss_contrib_v131(boss_id,user_id,clan_id,damage,hits) values(v_boss.id,v_uid,v_clan,v_applied,1) on conflict(boss_id,user_id) do update set damage=public.world_boss_contrib_v131.damage+excluded.damage,hits=public.world_boss_contrib_v131.hits+1,clan_id=excluded.clan_id,updated_at=now() returning damage into v_total;
  if v_clan is not null and v_applied>0 then perform public.record_clan_war_score_v131(greatest(1,least(20,(v_applied/250000)::integer)),'world_boss'); end if;
  return jsonb_build_object('id',v_boss.id,'name',v_boss.name,'max_hp',v_boss.max_hp,'hp',v_boss.hp,'ends_at',v_boss.ends_at,'defeated',v_boss.hp<=0,'applied',v_applied,'my_damage',v_total,'claimed',false);
end;$function$
;
CREATE OR REPLACE FUNCTION public.hit_world_boss_v132(p_damage bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_result jsonb;
  v_applied bigint:=0;
  v_points integer:=0;
  v_event public.map_event_instances_v132%rowtype;
  v_dom jsonb:=null;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.ensure_daily_event_v132();
  select * into v_event from public.map_event_instances_v132 where status='active' and kind='world_boss' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  select public.hit_world_boss_v131(p_damage) into v_result;
  v_applied:=coalesce((v_result->>'applied')::bigint,0);
  if v_applied>0 and v_event.id is not null then
    v_points:=greatest(1,least(25,ceil(v_applied/250000.0)::integer));
    select public.record_map_domination_score_v132(v_event.map_id,v_points,'world_boss') into v_dom;
  end if;
  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('event_map_id',v_event.map_id,'domination',v_dom);
end;$function$
;
CREATE OR REPLACE FUNCTION public.invite_battle_group_user_v1793(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_target_callsign text;
  v_count int;
  v_invite uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_target_user_id is null then raise exception 'Piloto inválido.'; end if;

  select group_id,role into v_gid,v_role
  from public.battle_group_members_v179
  where user_id=v_uid
  limit 1;

  if v_gid is null then raise exception 'Crie um Grupo de Batalha primeiro.'; end if;
  if v_role<>'leader' then raise exception 'Somente o líder pode convidar.'; end if;

  select count(*) into v_count
  from public.battle_group_members_v179
  where group_id=v_gid;

  if v_count>=5 then raise exception 'Grupo lotado: máximo de 5 pilotos.'; end if;
  if p_target_user_id=v_uid then raise exception 'Você já é o líder do grupo.'; end if;

  select callsign into v_target_callsign
  from public.profiles
  where id=p_target_user_id;

  if v_target_callsign is null then raise exception 'Piloto não encontrado.'; end if;

  if exists(select 1 from public.battle_group_members_v179 where user_id=p_target_user_id) then
    raise exception 'Esse piloto já está em um grupo.';
  end if;

  update public.battle_group_invites_v179
  set status='expired'
  where group_id=v_gid
    and invitee_id=p_target_user_id
    and status='pending';

  insert into public.battle_group_invites_v179(group_id,inviter_id,invitee_id)
  values(v_gid,v_uid,p_target_user_id)
  returning id into v_invite;

  return jsonb_build_object(
    'ok',true,
    'invite_id',v_invite::text,
    'target_user_id',p_target_user_id::text,
    'target_callsign',v_target_callsign,
    'global_invite',true
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.invite_battle_group_v179(p_callsign text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_target uuid;
  v_count int;
  v_invite uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;

  select group_id,role into v_gid,v_role
  from public.battle_group_members_v179
  where user_id=v_uid;

  if v_gid is null then raise exception 'Crie um Grupo de Batalha primeiro.'; end if;
  if v_role<>'leader' then raise exception 'Somente o líder pode convidar.'; end if;

  select count(*) into v_count
  from public.battle_group_members_v179
  where group_id=v_gid;

  if v_count>=5 then raise exception 'Grupo lotado: máximo de 5 pilotos.'; end if;

  select id into v_target
  from public.profiles
  where lower(callsign)=lower(trim(coalesce(p_callsign,'')))
  limit 1;

  if v_target is null then raise exception 'Piloto não encontrado.'; end if;
  if v_target=v_uid then raise exception 'Você já é o líder do grupo.'; end if;
  if exists(select 1 from public.battle_group_members_v179 where user_id=v_target) then
    raise exception 'Esse piloto já está em um grupo.';
  end if;

  update public.battle_group_invites_v179
  set status='expired'
  where invitee_id=v_target and status='pending';

  insert into public.battle_group_invites_v179(group_id,inviter_id,invitee_id)
  values(v_gid,v_uid,v_target)
  returning id into v_invite;

  return jsonb_build_object('ok',true,'invite_id',v_invite::text,'cross_faction_allowed',true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.is_game_admin_v1763(p_uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select coalesce(exists(
    select 1 from public.game_admins ga
    where ga.user_id=p_uid and lower(coalesce(ga.role,''))='admin'
  ),false);
$function$
;
CREATE OR REPLACE FUNCTION public.join_clan_v12(p_clan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_name text; v_tag text; v_request uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.clan_check_entry_level_v19(v_uid);
  if exists(select 1 from public.clan_members where user_id=v_uid) then raise exception 'Você já pertence a uma aliança.'; end if;
  select name,tag into v_name,v_tag from public.clans where id=p_clan_id;
  if v_name is null then raise exception 'Aliança não encontrada.'; end if;
  if exists(select 1 from public.clan_join_requests_v19 where user_id=v_uid and status='pending' and clan_id<>p_clan_id) then
    raise exception 'Cancele seu pedido anterior antes de solicitar outra aliança.';
  end if;
  insert into public.clan_join_requests_v19(user_id,clan_id,status,created_at,reviewed_at,reviewed_by)
    values(v_uid,p_clan_id,'pending',now(),null,null)
    on conflict(user_id,clan_id) do update set
      status='pending', created_at=case when public.clan_join_requests_v19.status='pending' then public.clan_join_requests_v19.created_at else now() end,
      reviewed_at=null,reviewed_by=null
      returning id into v_request;
  return jsonb_build_object('ok',true,'pending',true,'request_id',v_request,'name',v_name,'tag',v_tag);
end;$function$
;
CREATE OR REPLACE FUNCTION public.kick_battle_group_member_v179(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select group_id,role into v_gid,v_role from public.battle_group_members_v179 where user_id=v_uid;
  if v_gid is null or v_role<>'leader' then raise exception 'Somente o líder pode remover membros.'; end if;
  if p_target_user_id=v_uid then raise exception 'Use SAIR DO GRUPO para sair.'; end if;
  delete from public.battle_group_members_v179 where group_id=v_gid and user_id=p_target_user_id;
  return public.get_my_battle_group_v179();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.leave_battle_group_v179()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_next uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select group_id,role into v_gid,v_role from public.battle_group_members_v179 where user_id=v_uid;
  if v_gid is null then return public.get_my_battle_group_v179(); end if;

  if v_role='leader' then
    select user_id into v_next
    from public.battle_group_members_v179
    where group_id=v_gid and user_id<>v_uid
    order by joined_at asc
    limit 1;

    if v_next is null then
      delete from public.battle_groups_v179 where id=v_gid;
      return public.get_my_battle_group_v179();
    end if;

    update public.battle_group_members_v179 set role='leader' where group_id=v_gid and user_id=v_next;
    update public.battle_groups_v179 set leader_id=v_next,updated_at=now() where id=v_gid;
  end if;

  delete from public.battle_group_members_v179 where group_id=v_gid and user_id=v_uid;
  return public.get_my_battle_group_v179();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.leave_clan_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_count integer;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null then raise exception 'Você não pertence a um clã.'; end if;
  if v_role='owner' then
    select count(*) into v_count from public.clan_members where clan_id=v_clan;
    if v_count>1 then raise exception 'O líder não pode sair enquanto houver outros membros.'; end if;
    delete from public.clans where id=v_clan;
    return jsonb_build_object('ok',true,'disbanded',true);
  end if;
  delete from public.clan_members where user_id=v_uid;
  return jsonb_build_object('ok',true,'disbanded',false);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.list_clans_v12()
 RETURNS TABLE(id uuid, name text, tag text, member_count integer, level integer, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
 select c.id,c.name,c.tag,count(cm.user_id)::integer,c.level,c.created_at
 from public.clans c left join public.clan_members cm on cm.clan_id=c.id
 group by c.id,c.name,c.tag,c.level,c.created_at order by c.level desc,count(cm.user_id) desc,c.created_at asc;
$function$
;
CREATE OR REPLACE FUNCTION public.my_clan_id_v16()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select clan_id from public.clan_members where user_id=auth.uid() limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.place_auction_bid_online(p_hour_key text, p_lot_ref text, p_user_bid bigint, p_lot jsonb)
 RETURNS TABLE(lot_ref text, user_bid bigint, leader_user_id uuid, leader_callsign text, lot jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid:=auth.uid();
  v_id text;
  v_row public.live_shop_prices_v16%rowtype;
  v_rules public.game_auction_rules_v1908%rowtype;
  v_factor numeric;
  v_floor bigint;
  v_current public.auction_bids%rowtype;
  v_credits bigint;
  v_reserved bigint;
  v_owned integer;
BEGIN
 IF p_lot_ref !~ '^auxProtocol:' THEN
   RETURN QUERY SELECT * FROM public.place_auction_bid_online_base_v111(p_hour_key,p_lot_ref,p_user_bid,p_lot);
   RETURN;
 END IF;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 IF p_lot_ref !~ '^auxProtocol:(dano|hp|escudo|loot|porao)$' THEN RAISE EXCEPTION 'Protocolo de leilão inválido.'; END IF;
 v_id:=split_part(p_lot_ref,':',2);
 IF p_hour_key IS NULL OR p_hour_key<>to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN
  RAISE EXCEPTION 'Leilão fora da janela atual de São Paulo.';
 END IF;
 IF jsonb_typeof(p_lot)<>'object' OR p_lot->>'ref' IS DISTINCT FROM p_lot_ref
   OR p_lot->>'kind' IS DISTINCT FROM 'auxProtocol' OR p_lot->>'id' IS DISTINCT FROM v_id THEN
  RAISE EXCEPTION 'Identidade do lote inválida.';
 END IF;
 IF p_user_bid<100000 OR mod(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'Use lances de 100.000 CR.'; END IF;
 SELECT * INTO v_row FROM public.live_shop_prices_v16
 WHERE catalog_key='aux_protocol:'||v_id AND kind='aux_protocol' AND ref_id=v_id
   AND enabled AND shop_visible AND meta->>'auction_enabled'='true';
 IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não disponível no leilão.'; END IF;
 IF (v_id IN ('dano','hp','escudo') AND (v_row.currency<>'uridium' OR v_row.price<50000))
  OR (v_id IN ('loot','porao') AND (v_row.currency<>'credits' OR v_row.price<100000000)) THEN
  RAISE EXCEPTION 'Preço de catálogo do protocolo inválido.';
 END IF;
 v_factor:=coalesce((v_row.meta->>'auction_factor')::numeric,0.8);
 IF v_factor<0.1 OR v_factor>2 THEN RAISE EXCEPTION 'Fator do leilão inválido.'; END IF;
 SELECT * INTO v_rules FROM public.game_auction_rules_v1908 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Regras do leilão não encontradas.'; END IF;
 v_floor:=greatest(v_rules.common_floor,
   (ceil((v_row.price::numeric * CASE WHEN v_row.currency='uridium' THEN v_rules.stl_to_credits ELSE 1 END * v_factor)/100000)*100000)::bigint);
 IF p_user_bid<v_floor THEN RAISE EXCEPTION 'Lance abaixo do piso de % CR.',v_floor; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT COALESCE((state#>>ARRAY['pet','advancedProtocolOwnedV110',v_id])::integer,0)
 INTO v_owned FROM public.game_saves
 WHERE user_id=v_uid AND coalesce(state#>>'{pet,owned}','false')='true';
 IF NOT FOUND OR coalesce(v_owned,0)>0 THEN RAISE EXCEPTION 'AUX necessário ou protocolo já possuído.'; END IF;
 SELECT * INTO v_current FROM public.auction_bids
 WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active'
 ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND v_current.user_id=v_uid THEN RAISE EXCEPTION 'Você já está liderando este lote.'; END IF;
 IF FOUND AND p_user_bid < greatest(v_floor,v_current.user_bid+100000) THEN
  RAISE EXCEPTION 'Lance insuficiente para cobrir.';
 END IF;
 SELECT COALESCE(credits,0) INTO v_credits FROM public.profiles WHERE id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carteira não encontrada.'; END IF;
 SELECT COALESCE(SUM(user_bid),0) INTO v_reserved FROM public.auction_bids
 WHERE user_id=v_uid AND hour_key=p_hour_key AND status='active' AND lot_ref<>p_lot_ref;
 IF v_credits<v_reserved+p_user_bid THEN RAISE EXCEPTION 'Créditos insuficientes para reservar o lance.'; END IF;
 UPDATE public.auction_bids SET status='lost',updated_at=now()
 WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active';
 INSERT INTO public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 VALUES(v_uid,p_hour_key,p_lot_ref,p_user_bid,p_lot,'active',now(),now())
 ON CONFLICT(user_id,hour_key,lot_ref) DO UPDATE SET
 user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 RETURN QUERY SELECT b.lot_ref,b.user_bid,b.user_id,coalesce(p.callsign,'Pilot'),b.lot,b.updated_at
 FROM public.auction_bids b LEFT JOIN public.profiles p ON p.id=b.user_id
 WHERE b.user_id=v_uid AND b.hour_key=p_hour_key AND b.lot_ref=p_lot_ref AND b.status='active' LIMIT 1;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.place_auction_bid_online_base_v111(p_hour_key text, p_lot_ref text, p_user_bid bigint, p_lot jsonb)
 RETURNS TABLE(lot_ref text, user_bid bigint, leader_user_id uuid, leader_callsign text, lot jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
#variable_conflict use_column
DECLARE
 v_uid uuid:=auth.uid(); v_current public.auction_bids%rowtype;
 v_credits bigint:=0;v_reserved bigint:=0;v_floor bigint;v_prefix text;v_lot_kind text;v_expected text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 v_floor:=public.auction_minimum_floor_v1916(p_lot_ref);
 IF v_floor IS NULL THEN RAISE EXCEPTION 'Este lote não pertence ao catálogo Elite autorizado.'; END IF;
 v_prefix:=split_part(p_lot_ref,':',1);v_expected:=split_part(p_lot_ref,':',2);
 v_lot_kind:=CASE WHEN v_prefix='item' THEN 'item' WHEN v_prefix='petGear' THEN 'petGear' ELSE v_prefix END;
 IF jsonb_typeof(p_lot)<>'object' OR p_lot->>'ref' IS DISTINCT FROM p_lot_ref OR p_lot->>'id' IS DISTINCT FROM v_expected OR p_lot->>'kind' IS DISTINCT FROM v_lot_kind THEN RAISE EXCEPTION 'Identidade do lote inválida.'; END IF;
 IF p_hour_key IS NULL OR p_hour_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Janela do leilão inválida.'; END IF;
 IF p_user_bid < 100000 OR MOD(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'Use lances em passos de 100.000 CR.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT * INTO v_current FROM public.auction_bids WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active' ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND v_current.user_id=v_uid THEN RAISE EXCEPTION 'Você já está liderando este lote.'; END IF;
 IF FOUND THEN
   IF p_user_bid<GREATEST(v_current.user_bid+100000,v_floor) THEN RAISE EXCEPTION 'Lance insuficiente. Piso oficial: % CR.',v_floor; END IF;
 ELSIF p_user_bid<v_floor THEN RAISE EXCEPTION 'Lance abaixo do piso oficial: % CR.',v_floor; END IF;
 SELECT COALESCE(credits,0) INTO v_credits FROM public.profiles WHERE id=v_uid FOR UPDATE;
 SELECT COALESCE(SUM(user_bid),0) INTO v_reserved FROM public.auction_bids WHERE user_id=v_uid AND hour_key=p_hour_key AND status='active' AND lot_ref<>p_lot_ref;
 IF v_credits<v_reserved+p_user_bid THEN RAISE EXCEPTION 'Créditos insuficientes considerando os lances em garantia.'; END IF;
 UPDATE public.auction_bids SET status='lost',updated_at=now() WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active';
 INSERT INTO public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 VALUES(v_uid,p_hour_key,p_lot_ref,p_user_bid,p_lot,'active',now(),now())
 ON CONFLICT(user_id,hour_key,lot_ref) DO UPDATE SET user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 RETURN QUERY SELECT b.lot_ref,b.user_bid,b.user_id,COALESCE(p.callsign,'Pilot'),b.lot,b.updated_at
 FROM public.auction_bids b LEFT JOIN public.profiles p ON p.id=b.user_id
 WHERE b.user_id=v_uid AND b.hour_key=p_hour_key AND b.lot_ref=p_lot_ref AND b.status='active' LIMIT 1;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.player_xp_threshold_v1770(p_level integer)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE WHEN p_level<=1 THEN 0::bigint ELSE
    round((15000::double precision * power((p_level-1)::double precision,2.3::double precision)
       * power(1.20::double precision,greatest(0,p_level-2)::double precision))::numeric)::bigint
  END;
$function$
;
CREATE OR REPLACE FUNCTION public.player_xp_threshold_v1915(p_level integer, p_old_curve boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  lv integer:=greatest(1,p_level);
  oldxp bigint;
  left_lv integer;right_lv integer;left_xp bigint;right_xp bigint;
  old_left bigint;old_right bigint;
BEGIN
  oldxp:=public.player_xp_threshold_v1770(lv);
  IF p_old_curve OR lv<=10 THEN RETURN oldxp; END IF;
  IF lv<=32 THEN
    IF lv<=18 THEN
      left_lv:=10;right_lv:=18;left_xp:=10099480;right_xp:=49299480;
    ELSIF lv<=22 THEN
      left_lv:=18;right_lv:=22;left_xp:=49299480;right_xp:=158299480;
    ELSIF lv<=27 THEN
      left_lv:=22;right_lv:=27;left_xp:=158299480;right_xp:=397249480;
    ELSE
      left_lv:=27;right_lv:=32;left_xp:=397249480;right_xp:=741049480;
    END IF;
    old_left:=public.player_xp_threshold_v1770(left_lv);
    old_right:=public.player_xp_threshold_v1770(right_lv);
    RETURN round(left_xp::numeric + (right_xp-left_xp)::numeric
      * (oldxp-old_left)::numeric / greatest(1,old_right-old_left)::numeric)::bigint;
  END IF;
  -- LV33..44: extrapolacao continua; LV32 exatamente 741.049.480 XP.
  RETURN round(oldxp::numeric * 741049480::numeric
    / greatest(1,public.player_xp_threshold_v1770(32))::numeric)::bigint;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.process_all_clan_collection_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_date date:=(now() at time zone 'America/Sao_Paulo')::date; c record; m record; v_take bigint; v_new bigint;
v_clan_total bigint; v_total bigint:=0; v_members integer:=0;
begin
 for c in select id,owner_id from public.clans where last_collection_date is distinct from v_date for update loop
   v_clan_total:=0;
   for m in select cm.user_id,coalesce(p.credits,0)::bigint credits
     from public.clan_members cm join public.profiles p on p.id=cm.user_id
     where cm.clan_id=c.id order by cm.joined_at for update of p loop
     v_take:=floor(m.credits*0.10)::bigint;
     if v_take>0 then
       v_new:=m.credits-v_take;
       update public.profiles set credits=v_new,updated_at=now() where id=m.user_id;
       update public.game_saves set state=jsonb_set(
         jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',
           coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),
         '{serverEconomy}',
           coalesce(state->'serverEconomy','{}'::jsonb)||jsonb_build_object('lastClanCollectionDate',v_date,'lastClanCollectionAmount',v_take),true
       ),updated_at=now() where user_id=m.user_id;
       insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount)
         values(c.id,m.user_id,'daily_collection',v_take,v_take,0);
       v_clan_total:=v_clan_total+v_take; v_members:=v_members+1;
     end if;
   end loop;
   update public.clans set vault_credits=vault_credits+v_clan_total,total_collected=total_collected+v_clan_total,
     last_collection_date=v_date,updated_at=now() where id=c.id;
   perform public.evaluate_clan_level_v12(c.id);
   v_total:=v_total+v_clan_total;
 end loop;
 return jsonb_build_object('ok',true,'date',v_date,'collected',v_total,'members_charged',v_members);
end;$function$
;
CREATE OR REPLACE FUNCTION public.process_all_clan_interest_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_date date:=(now() at time zone 'America/Sao_Paulo')::date; c record; v_amount bigint; v_count integer:=0; v_total bigint:=0;
begin
 for c in select id,owner_id,level,vault_credits from public.clans where last_interest_date is distinct from v_date for update loop
   v_amount:=floor(c.vault_credits*public.clan_interest_rate_v12(c.level)/100.0)::bigint;
   update public.clans set vault_credits=vault_credits+v_amount,total_interest=total_interest+v_amount,last_interest_date=v_date,updated_at=now() where id=c.id;
   if v_amount>0 then insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount)
     values(c.id,c.owner_id,'interest',v_amount,v_amount,0); end if;
   v_count:=v_count+1; v_total:=v_total+v_amount;
 end loop;
 return jsonb_build_object('ok',true,'date',v_date,'clans',v_count,'interest',v_total);
end;$function$
;
CREATE OR REPLACE FUNCTION public.queue_pvp_attack(p_target_user_id uuid, p_damage bigint, p_shield_drain boolean, p_map_id text, p_territory_faction text)
 RETURNS TABLE(accepted boolean, effective_damage bigint, target_callsign text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_attacker public.player_presence%rowtype;
 v_target public.player_presence%rowtype;
 v_effective bigint;
 v_rate_count integer;
 v_dist numeric;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessao ausente.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_uid THEN RAISE EXCEPTION 'Alvo invalido.'; END IF;
 -- Cliente nao escolhe mapa autorizado: servidor valida presencas reais no banco.
 IF p_map_id IS NULL OR p_map_id NOT IN ('b41','b42','b43') OR p_territory_faction IS DISTINCT FROM 'battle' THEN
   RAISE EXCEPTION 'PvP permitido somente em 4-1, 4-2 ou 4-3.';
 END IF;
 SELECT * INTO v_attacker FROM public.player_presence WHERE user_id=v_uid
  AND updated_at>now()-interval '12 seconds';
 IF v_attacker.user_id IS NULL THEN RAISE EXCEPTION 'Sua presenca online nao esta sincronizada.'; END IF;
 SELECT * INTO v_target FROM public.player_presence WHERE user_id=p_target_user_id
  AND updated_at>now()-interval '12 seconds';
 IF v_target.user_id IS NULL THEN RAISE EXCEPTION 'Alvo offline.'; END IF;
 IF v_attacker.map_id<>p_map_id OR v_target.map_id<>p_map_id
    OR v_attacker.territory_faction IS DISTINCT FROM 'battle'
    OR v_target.territory_faction IS DISTINCT FROM 'battle' THEN
   RAISE EXCEPTION 'Alvo fora do Battle Map.';
 END IF;
 IF v_attacker.level<15 OR v_target.level<15 THEN
   RAISE EXCEPTION 'PvP 4-X exige nivel minimo 15.';
 END IF;
 IF v_attacker.hp<=0 OR v_target.hp<=0 THEN RAISE EXCEPTION 'Nave destruida: ataque indisponivel.'; END IF;
 -- Integrantes do mesmo grupo sao aliados mesmo nas zonas de PvP publico.
 IF EXISTS (SELECT 1 FROM public.battle_group_members_v179 a
   JOIN public.battle_group_members_v179 b ON b.group_id=a.group_id
   WHERE a.user_id=v_uid AND b.user_id=p_target_user_id) THEN
   RAISE EXCEPTION 'Fogo amigo bloqueado para seu grupo.';
 END IF;
 -- Margem de sincronizacao da presenca (4,5 s) sobre alcance laser (1.250u).
 v_dist:=sqrt(power(v_attacker.x-v_target.x,2)+power(v_attacker.y-v_target.y,2));
 IF v_dist>2200 THEN RAISE EXCEPTION 'Alvo distante: aproxime-se para disparar.'; END IF;
 IF p_damage IS NULL OR p_damage<1 OR p_damage>100000 THEN
   RAISE EXCEPTION 'Dano invalido por disparo.';
 END IF;
 -- Um limite por conta, nao por alvo, evita spam alternando jogadores.
 INSERT INTO public.pvp_attack_cooldown_v201(attacker_user_id,last_attack_at)
 VALUES(v_uid,now()) ON CONFLICT (attacker_user_id)
 DO UPDATE SET last_attack_at=EXCLUDED.last_attack_at
 WHERE public.pvp_attack_cooldown_v201.last_attack_at<=now()-interval '0.16 seconds';
 GET DIAGNOSTICS v_rate_count=ROW_COUNT;
 IF v_rate_count=0 THEN RAISE EXCEPTION 'Aguarde o proximo disparo PvP.'; END IF;
 IF coalesce(p_shield_drain,false) THEN
   v_effective:=least(greatest(0,coalesce(v_target.shield,0)),p_damage);
 ELSE v_effective:=p_damage; END IF;
 IF v_effective>0 THEN
  INSERT INTO public.pvp_damage_events(target_user_id,attacker_user_id,attacker_callsign,damage,shield_drain)
  VALUES(p_target_user_id,v_uid,coalesce(v_attacker.callsign,'Pilot'),v_effective,coalesce(p_shield_drain,false));
 END IF;
 RETURN QUERY SELECT true,v_effective,coalesce(v_target.callsign,'Pilot');
END;
$function$
;
CREATE OR REPLACE FUNCTION public.record_clan_alien_kill_v12(p_npc_type text, p_is_boss boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_key text; v_kills jsonb; v_result jsonb;
begin
 if v_uid is null then raise exception 'Sessão inválida.'; end if;
 select clan_id into v_clan from public.clan_members where user_id=v_uid;
 if v_clan is null then return jsonb_build_object('ok',true,'in_clan',false); end if;
 v_key:=lower(regexp_replace(coalesce(p_npc_type,''),'[^a-zA-Z0-9_]+','','g'));
 if v_key='' then return jsonb_build_object('ok',true,'in_clan',true); end if;
 select mission_kills into v_kills from public.clans where id=v_clan for update;
 if p_is_boss then
   v_kills:=jsonb_set(v_kills,array['boss_'||v_key],to_jsonb(coalesce((v_kills->>('boss_'||v_key))::bigint,0)+1),true);
   v_kills:=jsonb_set(v_kills,array['boss_any'],to_jsonb(coalesce((v_kills->>'boss_any')::bigint,0)+1),true);
 else
   v_kills:=jsonb_set(v_kills,array[v_key],to_jsonb(coalesce((v_kills->>v_key)::bigint,0)+1),true);
 end if;
 update public.clans set mission_kills=v_kills,updated_at=now() where id=v_clan;
 v_result:=public.evaluate_clan_level_v12(v_clan);
 return jsonb_build_object('ok',true,'in_clan',true,'status',v_result);
end;$function$
;
CREATE OR REPLACE FUNCTION public.record_clan_war_score_v131(p_points integer, p_reason text DEFAULT 'combat'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_war public.clan_wars_v131%rowtype; v_pts integer:=greatest(1,least(20,coalesce(p_points,1)));
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.finish_expired_clan_wars_v131();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if v_clan is null then return jsonb_build_object('scored',false); end if;
  select * into v_war from public.clan_wars_v131 where status='active' and ends_at>now() and (attacker_clan_id=v_clan or defender_clan_id=v_clan) order by starts_at desc limit 1 for update;
  if not found then return jsonb_build_object('scored',false); end if;
  if v_war.attacker_clan_id=v_clan then update public.clan_wars_v131 set attacker_score=attacker_score+v_pts where id=v_war.id returning * into v_war; else update public.clan_wars_v131 set defender_score=defender_score+v_pts where id=v_war.id returning * into v_war; end if;
  insert into public.clan_war_contrib_v131(war_id,user_id,clan_id,score) values(v_war.id,v_uid,v_clan,v_pts) on conflict(war_id,user_id) do update set score=public.clan_war_contrib_v131.score+excluded.score,updated_at=now();
  return jsonb_build_object('scored',true,'points',v_pts,'reason',left(coalesce(p_reason,'combat'),40),'war',jsonb_build_object('id',v_war.id,'attacker_score',v_war.attacker_score,'defender_score',v_war.defender_score,'ends_at',v_war.ends_at,'my_side',case when v_war.attacker_clan_id=v_clan then 'attacker' else 'defender' end,'attacker',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.attacker_clan_id),'defender',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.defender_clan_id)));
end;$function$
;
CREATE OR REPLACE FUNCTION public.record_map_domination_score_v132(p_map_id text, p_points integer, p_reason text DEFAULT 'combat'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_clan uuid;
  v_event public.map_event_instances_v132%rowtype;
  v_pts integer:=greatest(1,least(25,coalesce(p_points,1)));
  v_reason text:=lower(left(coalesce(p_reason,'combat'),40));
  v_row public.clan_map_domination_scores_v132%rowtype;
  v_dom jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_map_id not in ('b41','b42','b43') then return jsonb_build_object('scored',false,'reason','map_not_event'); end if;
  perform public.sync_event_flow_v132();
  perform public.finalize_map_domination_v132();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if v_clan is null then return jsonb_build_object('scored',false,'reason','no_clan'); end if;
  select * into v_event from public.map_event_instances_v132
    where map_id=p_map_id and status='active' and starts_at<=now() and ends_at>now()
    order by starts_at desc limit 1;
  if not found then return jsonb_build_object('scored',false,'reason','no_active_event'); end if;

  insert into public.clan_map_domination_scores_v132(event_id,clan_id,score,boss_score,pvp_score,event_score)
  values(v_event.id,v_clan,v_pts,
    case when v_reason like '%boss%' then v_pts else 0 end,
    case when v_reason like '%pvp%' then v_pts else 0 end,
    case when v_reason not like '%boss%' and v_reason not like '%pvp%' then v_pts else 0 end)
  on conflict(event_id,clan_id) do update set
    score=public.clan_map_domination_scores_v132.score+excluded.score,
    boss_score=public.clan_map_domination_scores_v132.boss_score+excluded.boss_score,
    pvp_score=public.clan_map_domination_scores_v132.pvp_score+excluded.pvp_score,
    event_score=public.clan_map_domination_scores_v132.event_score+excluded.event_score,
    updated_at=now()
  returning * into v_row;

  select public.get_domination_state_v132() into v_dom;
  return jsonb_build_object('scored',true,'points',v_pts,'reason',v_reason,'map_id',p_map_id,'event_id',v_event.id,'clan_score',v_row.score,'domination',v_dom);
end;$function$
;
CREATE OR REPLACE FUNCTION public.record_my_galaxy_event_progress_v1826(p_event_id text, p_delta integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); k text; start_ms bigint; t_start timestamptz; t_end timestamptz;
        event_def public.live_event_config_v16%ROWTYPE;
        row_ev public.galaxy_event_progress_v1826%ROWTYPE;
        old_save jsonb; old_rec jsonb; new_rec jsonb; new_save jsonb;
        new_progress int; old_rewarded boolean; r jsonb;
        lv int; mult numeric; xp_mult numeric:=1; cr bigint; stl bigint; xp bigint; cores int;
        new_profile jsonb; new_warfront jsonb; rewards jsonb;
        rotation_enabled boolean; weekend_key text; weekend_start timestamptz; weekend_end timestamptz; manual_key text; manual_start timestamptz; manual_end timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  IF p_event_id !~ '^v1817:[a-z][a-z0-9_]{1,48}:[0-9]{13}$' THEN RAISE EXCEPTION 'Identificador de período inválido.'; END IF;
  IF p_delta IS NULL OR p_delta<1 OR p_delta>10000 THEN RAISE EXCEPTION 'Progresso inválido.'; END IF;
  k:=split_part(p_event_id,':',2);start_ms:=split_part(p_event_id,':',3)::bigint;
  t_start:=to_timestamp(start_ms/1000.0);
  SELECT * INTO event_def FROM public.live_event_config_v16 WHERE event_key=k AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento indisponível.'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.live_event_config_v16
    WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb)
  INTO rotation_enabled;
  IF rotation_enabled AND event_def.schedule_mode='interval' THEN
    -- Aceita EXCLUSIVAMENTE o evento e o início do slot oficial vigente.
    SELECT m.event_key,m.start_at,m.end_at INTO manual_key,manual_start,manual_end
      FROM public.live_event_manual_override_v3411 m WHERE m.id=1 AND m.start_at<=clock_timestamp() AND m.end_at>clock_timestamp();
    IF manual_key=k AND manual_start IS NOT NULL AND abs(extract(epoch FROM (t_start-manual_start)))<=0.5 THEN
      t_end:=manual_end;
    ELSE
      -- Enquanto houver evento manual, a rotação automática fica suspensa.
      IF manual_key IS NOT NULL THEN RAISE EXCEPTION 'Existe um evento extraordinário em andamento.'; END IF;
      SELECT w.event_key,w.event_start,w.event_end
        INTO weekend_key,weekend_start,weekend_end
        FROM public.weekend_event_slot_v341(clock_timestamp()) w;
      IF weekend_key IS NULL OR weekend_key<>k OR abs(extract(epoch FROM (t_start-weekend_start)))>0.5
        THEN RAISE EXCEPTION 'Período não pertence à rotação oficial do fim de semana.'; END IF;
      t_end:=weekend_end;
    END IF;
    t_end:=least(t_end,coalesce(event_def.ends_at,'infinity'::timestamptz));
  ELSE
    t_end:=least(t_start+make_interval(mins=>event_def.duration_minutes),coalesce(event_def.ends_at,'infinity'::timestamptz));
    IF event_def.schedule_mode='once' THEN
      IF abs(extract(epoch FROM (t_start-event_def.starts_at)))>0.5 THEN RAISE EXCEPTION 'Janela única inválida.'; END IF;
    ELSIF event_def.schedule_mode='weekly' THEN
      IF NOT (extract(dow FROM t_start AT TIME ZONE 'America/Sao_Paulo')::int = ANY(event_def.weekdays)
         AND (t_start AT TIME ZONE 'America/Sao_Paulo')::time = event_def.start_local_time)
        THEN RAISE EXCEPTION 'Janela semanal inválida.'; END IF;
    ELSE
      IF t_start<event_def.starts_at OR event_def.repeat_minutes<1
        OR abs(mod(extract(epoch FROM (t_start-event_def.starts_at))::numeric, (event_def.repeat_minutes*60)::numeric))>0.5
        THEN RAISE EXCEPTION 'Janela recorrente inválida.'; END IF;
    END IF;
  END IF;
  IF clock_timestamp()<t_start OR clock_timestamp()>=t_end THEN RAISE EXCEPTION 'Período do evento encerrado.'; END IF;
  SELECT state INTO old_save FROM public.game_saves WHERE user_id=uid FOR UPDATE;
  IF old_save IS NULL THEN RAISE EXCEPTION 'Save online não localizado.'; END IF;
  old_rec:=old_save #> ARRAY['galaxyEvents','records',p_event_id];
  old_rewarded:=coalesce((old_rec->>'rewarded')::boolean,false)
     OR coalesce((old_save->'eventRewardsV1826') ? p_event_id,false);
  INSERT INTO public.galaxy_event_progress_v1826(user_id,event_id,event_key,event_start,event_end,target,progress,rewarded,rewarded_at)
  VALUES(uid,p_event_id,k,t_start,t_end,event_def.target,
    least(event_def.target,greatest(0,coalesce((old_rec->>'value')::int,0))),old_rewarded,
    CASE WHEN old_rewarded THEN now() ELSE NULL END)
  ON CONFLICT (user_id,event_id) DO NOTHING;
  SELECT * INTO row_ev FROM public.galaxy_event_progress_v1826 WHERE user_id=uid AND event_id=p_event_id FOR UPDATE;
  IF row_ev.rewarded THEN
    RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.target,'target',row_ev.target,'complete',true,'rewarded',true,'rewardedNow',false);
  END IF;
  new_progress:=least(row_ev.target,greatest(row_ev.progress,0)+p_delta);
  IF new_progress<row_ev.target THEN
    UPDATE public.galaxy_event_progress_v1826 SET progress=new_progress,updated_at=now() WHERE user_id=uid AND event_id=p_event_id;
    RETURN jsonb_build_object('eventId',p_event_id,'progress',new_progress,'target',row_ev.target,'complete',false,'rewarded',false,'rewardedNow',false);
  END IF;
  -- Chegou ao objetivo, creditado no banco exatamente uma vez.
  lv:=greatest(1,coalesce((old_save#>>'{profile,level}')::int,1));
  mult:=1+least(1.5,greatest(0,lv-1)/36.0);
  cr:=round(coalesce((event_def.reward->>'credits')::numeric,0)*mult);
  stl:=round(coalesce((event_def.reward->>'uridium')::numeric,0)*mult);
  xp:=round(coalesce((event_def.reward->>'xp')::numeric,0)*mult*.55);
  cores:=greatest(0,coalesce((event_def.reward->>'cores')::integer,0));
  new_profile:=coalesce(old_save->'profile','{}'::jsonb);
  new_profile:=jsonb_set(new_profile,'{credits}',to_jsonb(coalesce((new_profile->>'credits')::bigint,0)+cr),true);
  new_profile:=jsonb_set(new_profile,'{uridium}',to_jsonb(coalesce((new_profile->>'uridium')::bigint,0)+stl),true);
  new_profile:=jsonb_set(new_profile,'{xp}',to_jsonb(coalesce((new_profile->>'xp')::bigint,0)+xp),true);
  new_warfront:=coalesce(old_save->'warfront','{}'::jsonb);
  new_warfront:=jsonb_set(new_warfront,'{skillCores}',to_jsonb(coalesce((new_warfront->>'skillCores')::int,0)+cores),true);
  new_rec:=coalesce(old_rec,'{}'::jsonb)||jsonb_build_object('value',row_ev.target,'complete',true,'rewarded',true,'completedAt',now()::text);
  rewards:=jsonb_build_object('credits',cr,'uridium',stl,'xp',xp,'cores',cores);
  new_save:=jsonb_set(old_save,'{profile}',new_profile,true);
  new_save:=jsonb_set(new_save,'{warfront}',new_warfront,true);
  new_save:=jsonb_set(new_save,'{galaxyEvents}',coalesce(new_save->'galaxyEvents','{"records":{}}'::jsonb),true);
  new_save:=jsonb_set(new_save,'{galaxyEvents,records}',coalesce(new_save#>'{galaxyEvents,records}','{}'::jsonb),true);
  new_save:=jsonb_set(new_save,ARRAY['galaxyEvents','records',p_event_id],new_rec,true);
  new_save:=jsonb_set(new_save,'{eventRewardsV1826}',coalesce(old_save->'eventRewardsV1826','{}'::jsonb)||jsonb_build_object(p_event_id,rewards),true);
  UPDATE public.game_saves SET state=new_save,updated_at=now() WHERE user_id=uid;
  UPDATE public.profiles SET credits=coalesce((new_profile->>'credits')::bigint,0),uridium=coalesce((new_profile->>'uridium')::bigint,0),xp=coalesce((new_profile->>'xp')::bigint,0),updated_at=now() WHERE id=uid;
  UPDATE public.galaxy_event_progress_v1826 SET progress=row_ev.target,rewarded=true,rewarded_at=now(),updated_at=now() WHERE user_id=uid AND event_id=p_event_id;
  RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.target,'target',row_ev.target,'complete',true,'rewarded',true,'rewardedNow',true,'reward',rewards,'state',new_save);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.record_player_telemetry_v1771(p_batch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_batch text;
  v_sessions bigint; v_seconds bigint; v_kills bigint; v_boxes bigint; v_ore_nodes bigint; v_ore_units bigint;
  v_missions bigint; v_deaths bigint; v_jumps bigint; v_levelups bigint; v_spent_cr bigint; v_spent_stl bigint;
  v_npc_cr bigint; v_npc_stl bigint; v_npc_xp bigint;
  v_mis_cr bigint; v_mis_stl bigint; v_mis_xp bigint;
  v_res_cr bigint; v_res_stl bigint; v_res_xp bigint;
  v_pass_cr bigint; v_pass_stl bigint; v_pass_xp bigint;
  v_event_cr bigint; v_event_stl bigint; v_event_xp bigint;
  v_gate_cr bigint; v_gate_stl bigint; v_gate_xp bigint;
  v_disc_cr bigint; v_disc_stl bigint; v_disc_xp bigint;
  v_other_cr bigint; v_other_stl bigint; v_other_xp bigint;
  v_cr_earned bigint; v_stl_earned bigint; v_xp_earned bigint;
  v_level integer; v_credits bigint; v_stl bigint; v_xp bigint; v_title text;
  v_row public.player_telemetry_v1771%rowtype;
  v_level_event jsonb; v_reached integer;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_batch is null or jsonb_typeof(p_batch)<>'object' then raise exception 'Telemetria inválida.'; end if;
  v_batch:=left(coalesce(nullif(trim(p_batch->>'batch_id'),''),gen_random_uuid()::text),80);
  insert into public.player_telemetry_batches_v1771(user_id,batch_id) values(v_uid,v_batch)
  on conflict do nothing;
  if not found then return jsonb_build_object('ok',true,'duplicate',true); end if;

  v_sessions:=public.telemetry_num_v1771(p_batch,array['counters','sessions'],0,10);
  v_seconds:=public.telemetry_num_v1771(p_batch,array['counters','play_seconds'],0,900);
  v_kills:=public.telemetry_num_v1771(p_batch,array['counters','kills'],0,100000);
  v_boxes:=public.telemetry_num_v1771(p_batch,array['counters','boxes'],0,100000);
  v_ore_nodes:=public.telemetry_num_v1771(p_batch,array['counters','ore_nodes'],0,100000);
  v_ore_units:=public.telemetry_num_v1771(p_batch,array['counters','ore_units'],0,100000000);
  v_missions:=public.telemetry_num_v1771(p_batch,array['counters','missions_completed'],0,10000);
  v_deaths:=public.telemetry_num_v1771(p_batch,array['counters','deaths'],0,10000);
  v_jumps:=public.telemetry_num_v1771(p_batch,array['counters','map_jumps'],0,10000);
  v_levelups:=public.telemetry_num_v1771(p_batch,array['counters','level_ups'],0,100);
  v_spent_cr:=public.telemetry_num_v1771(p_batch,array['spent','cr'],0,1000000000000);
  v_spent_stl:=public.telemetry_num_v1771(p_batch,array['spent','stl'],0,1000000000000);

  v_npc_cr:=public.telemetry_num_v1771(p_batch,array['sources','npc','cr'],0,1000000000000);
  v_npc_stl:=public.telemetry_num_v1771(p_batch,array['sources','npc','stl'],0,1000000000000);
  v_npc_xp:=public.telemetry_num_v1771(p_batch,array['sources','npc','xp'],0,1000000000000);
  v_mis_cr:=public.telemetry_num_v1771(p_batch,array['sources','mission','cr'],0,1000000000000);
  v_mis_stl:=public.telemetry_num_v1771(p_batch,array['sources','mission','stl'],0,1000000000000);
  v_mis_xp:=public.telemetry_num_v1771(p_batch,array['sources','mission','xp'],0,1000000000000);
  v_res_cr:=public.telemetry_num_v1771(p_batch,array['sources','resource','cr'],0,1000000000000);
  v_res_stl:=public.telemetry_num_v1771(p_batch,array['sources','resource','stl'],0,1000000000000);
  v_res_xp:=public.telemetry_num_v1771(p_batch,array['sources','resource','xp'],0,1000000000000);
  v_pass_cr:=public.telemetry_num_v1771(p_batch,array['sources','pass','cr'],0,1000000000000);
  v_pass_stl:=public.telemetry_num_v1771(p_batch,array['sources','pass','stl'],0,1000000000000);
  v_pass_xp:=public.telemetry_num_v1771(p_batch,array['sources','pass','xp'],0,1000000000000);
  v_event_cr:=public.telemetry_num_v1771(p_batch,array['sources','event','cr'],0,1000000000000);
  v_event_stl:=public.telemetry_num_v1771(p_batch,array['sources','event','stl'],0,1000000000000);
  v_event_xp:=public.telemetry_num_v1771(p_batch,array['sources','event','xp'],0,1000000000000);
  v_gate_cr:=public.telemetry_num_v1771(p_batch,array['sources','gate','cr'],0,1000000000000);
  v_gate_stl:=public.telemetry_num_v1771(p_batch,array['sources','gate','stl'],0,1000000000000);
  v_gate_xp:=public.telemetry_num_v1771(p_batch,array['sources','gate','xp'],0,1000000000000);
  v_disc_cr:=public.telemetry_num_v1771(p_batch,array['sources','discovery','cr'],0,1000000000000);
  v_disc_stl:=public.telemetry_num_v1771(p_batch,array['sources','discovery','stl'],0,1000000000000);
  v_disc_xp:=public.telemetry_num_v1771(p_batch,array['sources','discovery','xp'],0,1000000000000);
  v_other_cr:=public.telemetry_num_v1771(p_batch,array['sources','other','cr'],0,1000000000000);
  v_other_stl:=public.telemetry_num_v1771(p_batch,array['sources','other','stl'],0,1000000000000);
  v_other_xp:=public.telemetry_num_v1771(p_batch,array['sources','other','xp'],0,1000000000000);

  v_cr_earned:=v_npc_cr+v_mis_cr+v_res_cr+v_pass_cr+v_event_cr+v_gate_cr+v_disc_cr+v_other_cr;
  v_stl_earned:=v_npc_stl+v_mis_stl+v_res_stl+v_pass_stl+v_event_stl+v_gate_stl+v_disc_stl+v_other_stl;
  v_xp_earned:=v_npc_xp+v_mis_xp+v_res_xp+v_pass_xp+v_event_xp+v_gate_xp+v_disc_xp+v_other_xp;

  v_level:=greatest(1,least(100,public.telemetry_num_v1771(p_batch,array['snapshot','level'],1,100)::integer));
  v_credits:=public.telemetry_num_v1771(p_batch,array['snapshot','credits'],0,9223372036854775807);
  v_stl:=public.telemetry_num_v1771(p_batch,array['snapshot','stl'],0,9223372036854775807);
  v_xp:=public.telemetry_num_v1771(p_batch,array['snapshot','xp'],0,9223372036854775807);
  v_title:=left(coalesce(nullif(trim(p_batch#>>'{snapshot,title}'),''),'Piloto Estelar'),64);

  insert into public.player_telemetry_v1771(
    user_id,sessions,play_seconds,kills,boxes,ore_nodes,ore_units,missions_completed,deaths,map_jumps,level_ups,
    credits_earned,credits_spent,stl_earned,stl_spent,xp_earned,
    npc_cr,npc_stl,npc_xp,mission_cr,mission_stl,mission_xp,resource_cr,resource_stl,resource_xp,
    pass_cr,pass_stl,pass_xp,event_cr,event_stl,event_xp,gate_cr,gate_stl,gate_xp,
    discovery_cr,discovery_stl,discovery_xp,other_cr,other_stl,other_xp,
    last_level,last_credits,last_stl,last_xp,selected_title,first_seen_at,last_seen_at
  ) values(
    v_uid,v_sessions,v_seconds,v_kills,v_boxes,v_ore_nodes,v_ore_units,v_missions,v_deaths,v_jumps,v_levelups,
    v_cr_earned,v_spent_cr,v_stl_earned,v_spent_stl,v_xp_earned,
    v_npc_cr,v_npc_stl,v_npc_xp,v_mis_cr,v_mis_stl,v_mis_xp,v_res_cr,v_res_stl,v_res_xp,
    v_pass_cr,v_pass_stl,v_pass_xp,v_event_cr,v_event_stl,v_event_xp,v_gate_cr,v_gate_stl,v_gate_xp,
    v_disc_cr,v_disc_stl,v_disc_xp,v_other_cr,v_other_stl,v_other_xp,
    v_level,v_credits,v_stl,v_xp,v_title,now(),now()
  )
  on conflict(user_id) do update set
    sessions=player_telemetry_v1771.sessions+excluded.sessions,
    play_seconds=player_telemetry_v1771.play_seconds+excluded.play_seconds,
    kills=player_telemetry_v1771.kills+excluded.kills,
    boxes=player_telemetry_v1771.boxes+excluded.boxes,
    ore_nodes=player_telemetry_v1771.ore_nodes+excluded.ore_nodes,
    ore_units=player_telemetry_v1771.ore_units+excluded.ore_units,
    missions_completed=player_telemetry_v1771.missions_completed+excluded.missions_completed,
    deaths=player_telemetry_v1771.deaths+excluded.deaths,
    map_jumps=player_telemetry_v1771.map_jumps+excluded.map_jumps,
    level_ups=player_telemetry_v1771.level_ups+excluded.level_ups,
    credits_earned=player_telemetry_v1771.credits_earned+excluded.credits_earned,
    credits_spent=player_telemetry_v1771.credits_spent+excluded.credits_spent,
    stl_earned=player_telemetry_v1771.stl_earned+excluded.stl_earned,
    stl_spent=player_telemetry_v1771.stl_spent+excluded.stl_spent,
    xp_earned=player_telemetry_v1771.xp_earned+excluded.xp_earned,
    npc_cr=player_telemetry_v1771.npc_cr+excluded.npc_cr,npc_stl=player_telemetry_v1771.npc_stl+excluded.npc_stl,npc_xp=player_telemetry_v1771.npc_xp+excluded.npc_xp,
    mission_cr=player_telemetry_v1771.mission_cr+excluded.mission_cr,mission_stl=player_telemetry_v1771.mission_stl+excluded.mission_stl,mission_xp=player_telemetry_v1771.mission_xp+excluded.mission_xp,
    resource_cr=player_telemetry_v1771.resource_cr+excluded.resource_cr,resource_stl=player_telemetry_v1771.resource_stl+excluded.resource_stl,resource_xp=player_telemetry_v1771.resource_xp+excluded.resource_xp,
    pass_cr=player_telemetry_v1771.pass_cr+excluded.pass_cr,pass_stl=player_telemetry_v1771.pass_stl+excluded.pass_stl,pass_xp=player_telemetry_v1771.pass_xp+excluded.pass_xp,
    event_cr=player_telemetry_v1771.event_cr+excluded.event_cr,event_stl=player_telemetry_v1771.event_stl+excluded.event_stl,event_xp=player_telemetry_v1771.event_xp+excluded.event_xp,
    gate_cr=player_telemetry_v1771.gate_cr+excluded.gate_cr,gate_stl=player_telemetry_v1771.gate_stl+excluded.gate_stl,gate_xp=player_telemetry_v1771.gate_xp+excluded.gate_xp,
    discovery_cr=player_telemetry_v1771.discovery_cr+excluded.discovery_cr,discovery_stl=player_telemetry_v1771.discovery_stl+excluded.discovery_stl,discovery_xp=player_telemetry_v1771.discovery_xp+excluded.discovery_xp,
    other_cr=player_telemetry_v1771.other_cr+excluded.other_cr,other_stl=player_telemetry_v1771.other_stl+excluded.other_stl,other_xp=player_telemetry_v1771.other_xp+excluded.other_xp,
    last_level=excluded.last_level,last_credits=excluded.last_credits,last_stl=excluded.last_stl,last_xp=excluded.last_xp,
    selected_title=excluded.selected_title,last_seen_at=now();

  select * into v_row from public.player_telemetry_v1771 where user_id=v_uid;

  if jsonb_typeof(p_batch->'level_events')='array' then
    for v_level_event in select value from jsonb_array_elements(p_batch->'level_events')
    loop
      begin
        v_reached:=greatest(1,least(100,(v_level_event->>'level')::integer));
      exception when others then continue;
      end;
      insert into public.player_level_milestones_v1771(
        user_id,level,reached_at,play_seconds,kills,credits_earned,stl_earned,xp_earned,credits_balance,stl_balance
      ) values(
        v_uid,v_reached,now(),v_row.play_seconds,v_row.kills,v_row.credits_earned,v_row.stl_earned,v_row.xp_earned,v_row.last_credits,v_row.last_stl
      ) on conflict(user_id,level) do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok',true,'duplicate',false,'play_seconds',v_row.play_seconds,'kills',v_row.kills,'last_level',v_row.last_level);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_aux_sentinel_coupon_v1(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code,'')));
  v_coupon record;
  v_save jsonb;
  v_pet jsonb;
  v_gears jsonb;
  v_pet_owned boolean;
  v_new_pet jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para resgatar um cupom.' USING ERRCODE='28000';
  END IF;
  IF v_code !~ '^AUX-SENT-[A-F0-9]{24}$' THEN
    RAISE EXCEPTION 'Cupom inválido ou já utilizado.' USING ERRCODE='22023';
  END IF;
  SELECT code, active, expires_at, redeemed_by INTO v_coupon
    FROM public.stellar_aux_sentinel_coupons_v1
    WHERE code=v_code FOR UPDATE;
  IF NOT FOUND OR NOT v_coupon.active
    OR v_coupon.redeemed_by IS NOT NULL
    OR (v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now()) THEN
    RAISE EXCEPTION 'Cupom inválido ou já utilizado.' USING ERRCODE='22023';
  END IF;

  SELECT state INTO v_save FROM public.game_saves WHERE user_id=v_uid FOR UPDATE;
  IF v_save IS NULL OR jsonb_typeof(v_save) <> 'object' THEN
    RAISE EXCEPTION 'A conta ainda não possui save online.' USING ERRCODE='22023';
  END IF;
  IF coalesce(nullif(v_save->>'accountOwnerId',''),v_uid::text) <> v_uid::text THEN
    RAISE EXCEPTION 'Save pertence a outro usuário.' USING ERRCODE='28000';
  END IF;

  v_pet := coalesce(v_save->'pet','{}'::jsonb);
  IF jsonb_typeof(v_pet) <> 'object' THEN
    RAISE EXCEPTION 'Estado do AUX-9 inválido.' USING ERRCODE='22023';
  END IF;
  v_gears := coalesce(v_pet->'gearsOwned','{}'::jsonb);
  IF jsonb_typeof(v_gears) <> 'object' THEN
    v_gears := '{}'::jsonb;
  END IF;
  v_pet_owned := coalesce((v_pet->>'owned')::boolean,false);
  IF v_pet_owned AND coalesce((v_gears->>'guard')::boolean,false) THEN
    RAISE EXCEPTION 'Esta conta já possui AUX-9 com Sentinela.' USING ERRCODE='22023';
  END IF;

  v_new_pet := v_pet || jsonb_build_object(
    'owned', true,
    'level', greatest(1,coalesce((v_pet->>'level')::int,1)),
    'xp', greatest(0,coalesce((v_pet->>'xp')::numeric,0)),
    'xpModelV175', coalesce((v_pet->>'xpModelV175')::boolean,true),
    'laserSlotsUnlocked', greatest(1,coalesce((v_pet->>'laserSlotsUnlocked')::int,0)),
    'shieldSlotsUnlocked', greatest(2,coalesce((v_pet->>'shieldSlotsUnlocked')::int,0)),
    'lasers', CASE WHEN jsonb_typeof(v_pet->'lasers')='array' AND jsonb_array_length(v_pet->'lasers')>0 THEN v_pet->'lasers' ELSE '[null]'::jsonb END,
    'shields', CASE WHEN jsonb_typeof(v_pet->'shields')='array' AND jsonb_array_length(v_pet->'shields')>0 THEN v_pet->'shields' ELSE '[null,null]'::jsonb END,
    'gearsOwned', v_gears || '{"guard":true}'::jsonb,
    'activeGear', 'guard',
    'kamikazeReadyAt', greatest(0,coalesce((v_pet->>'kamikazeReadyAt')::numeric,0))
  );

  UPDATE public.game_saves SET state=jsonb_set(v_save,'{pet}',v_new_pet,true),updated_at=now()
    WHERE user_id=v_uid;
  UPDATE public.stellar_aux_sentinel_coupons_v1 SET redeemed_by=v_uid,redeemed_at=now()
    WHERE code=v_code;

  RETURN jsonb_build_object(
    'ok',true,
    'reward','aux9_with_guard_mode',
    'pet_already_owned',v_pet_owned,
    'active_gear','guard'
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_game_coupon_v1821(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  uid uuid := auth.uid();
  code_input text := upper(btrim(coalesce(p_code,'')));
  rec public.game_coupons_v1821%ROWTYPE;
  saved jsonb;
  reward jsonb;
  v_kind text;
  item_id text;
  qty bigint;
  asset_key text;
  prop_name text;
  pet jsonb;
  gear_owned jsonb;
  owned boolean;
  current_num numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Você precisa estar conectado para resgatar.'; END IF;
  IF code_input !~ '^[A-Z0-9][A-Z0-9_-]{3,63}$' THEN RAISE EXCEPTION 'Cupom inválido.'; END IF;
  SELECT * INTO rec FROM public.game_coupons_v1821 WHERE code=code_input FOR UPDATE;
  IF NOT FOUND OR NOT rec.active OR rec.starts_at > now()
    OR (rec.expires_at IS NOT NULL AND rec.expires_at <= now()) THEN
    RAISE EXCEPTION 'Cupom inválido, inativo ou expirado.';
  END IF;
  IF rec.redeemed_count >= rec.max_uses THEN RAISE EXCEPTION 'Cupom esgotado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_coupon_redemptions_v1821 WHERE code=code_input AND user_id=uid) THEN
    RAISE EXCEPTION 'Você já resgatou este cupom.';
  END IF;
  SELECT state INTO saved FROM public.game_saves WHERE user_id=uid FOR UPDATE;
  IF saved IS NULL OR jsonb_typeof(saved)<>'object' THEN RAISE EXCEPTION 'Crie um piloto e salve o jogo antes de resgatar.'; END IF;
  IF coalesce(nullif(saved->>'accountOwnerId',''),uid::text)<>uid::text THEN
    RAISE EXCEPTION 'O save pertence a outro jogador.';
  END IF;
  IF coalesce((saved #>> '{profile,level}')::int,1)<rec.min_level THEN
    RAISE EXCEPTION 'Este cupom requer nível %.',rec.min_level;
  END IF;
  -- Não consumir cupom para jogador que já possui todos os componentes de AUX+Sentinela.
  IF jsonb_array_length(rec.rewards)=1
     AND rec.rewards->0->>'kind'='aux_sentinel'
     AND coalesce((saved #>> '{pet,owned}')::boolean,false)
     AND coalesce((saved #>> '{pet,gearsOwned,guard}')::boolean,false) THEN
    RAISE EXCEPTION 'Você já possui o AUX-9 com o Sentinela.';
  END IF;

  FOR reward IN SELECT value FROM jsonb_array_elements(rec.rewards) AS x(value) LOOP
    IF jsonb_typeof(reward)<>'object' THEN RAISE EXCEPTION 'Prêmio do cupom mal configurado.'; END IF;
    v_kind := coalesce(reward->>'kind','');
    item_id := coalesce(reward->>'id','');

    IF v_kind IN ('aux_sentinel','aux9') THEN
      pet := coalesce(saved->'pet','{}'::jsonb);
      IF jsonb_typeof(pet)<>'object' THEN RAISE EXCEPTION 'Dados inválidos do AUX-9.'; END IF;
      owned := coalesce((pet->>'owned')::boolean,false);
      IF NOT owned THEN
        pet := pet || jsonb_build_object('owned',true,'level',greatest(1,coalesce((pet->>'level')::int,1)),
          'xp',greatest(0,coalesce((pet->>'xp')::numeric,0)), 'xpModelV175',true,
          'laserSlotsUnlocked',greatest(1,coalesce((pet->>'laserSlotsUnlocked')::int,0)),
          'shieldSlotsUnlocked',greatest(2,coalesce((pet->>'shieldSlotsUnlocked')::int,0)),
          'lasers','[null]'::jsonb,'shields','[null,null]'::jsonb,'activeGear','off');
      END IF;
      IF v_kind='aux_sentinel' THEN
        gear_owned := coalesce(pet->'gearsOwned','{}'::jsonb);
        IF jsonb_typeof(gear_owned)<>'object' THEN gear_owned:='{}'::jsonb; END IF;
        pet := pet || jsonb_build_object('gearsOwned',gear_owned||'{"guard":true}'::jsonb,'activeGear','guard');
      END IF;
      saved := jsonb_set(saved,'{pet}',pet,true);

    ELSIF v_kind='pet_gear' THEN
      IF item_id NOT IN ('guard','box','ore','repair','kami') THEN RAISE EXCEPTION 'Módulo do AUX-9 inválido.'; END IF;
      pet := coalesce(saved->'pet','{}'::jsonb);
      IF NOT coalesce((pet->>'owned')::boolean,false) THEN RAISE EXCEPTION 'Este prêmio exige AUX-9 já adquirido.'; END IF;
      gear_owned := coalesce(pet->'gearsOwned','{}'::jsonb);
      IF jsonb_typeof(gear_owned)<>'object' THEN gear_owned:='{}'::jsonb; END IF;
      pet := jsonb_set(pet,'{gearsOwned}',gear_owned||jsonb_build_object(item_id,true),true);
      saved := jsonb_set(saved,'{pet}',pet,true);

    ELSIF v_kind IN ('credits','uridium') THEN
      qty := coalesce((reward->>'amount')::bigint,0);
      IF qty<1 OR qty>100000000 THEN RAISE EXCEPTION 'Quantidade de moeda fora do limite (1 a 100 milhões).'; END IF;
      current_num := coalesce((saved->'profile'->>v_kind)::numeric,0);
      IF current_num+qty>100000000000000 THEN RAISE EXCEPTION 'Saldo máximo excedido.'; END IF;
      saved := jsonb_set(saved,ARRAY['profile',v_kind],to_jsonb(current_num+qty),true);

    ELSIF v_kind IN ('inventory','ammo','rocket','ship') THEN
      IF item_id !~ '^[A-Za-z0-9_-]{1,64}$' THEN RAISE EXCEPTION 'ID do prêmio inválido.'; END IF;
      qty := coalesce((reward->>'qty')::bigint,1);
      IF qty<1 OR qty>1000000 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
      IF v_kind='ship' THEN
        IF qty<>1 THEN RAISE EXCEPTION 'Naves exigem quantidade 1.'; END IF;
        IF NOT EXISTS (SELECT 1 FROM public.live_shop_prices_v16 WHERE enabled=true AND kind='ship' AND ref_id=item_id) THEN
          RAISE EXCEPTION 'Nave não cadastrada na Loja.';
        END IF;
        IF coalesce(saved->'ownedShips','[]'::jsonb) ? item_id THEN
          RAISE EXCEPTION 'Essa nave já pertence à conta.';
        END IF;
        saved:=jsonb_set(saved,'{ownedShips}',coalesce(saved->'ownedShips','[]'::jsonb)||jsonb_build_array(item_id),true);
      ELSE
        asset_key := CASE v_kind WHEN 'inventory' THEN 'inventory' WHEN 'ammo' THEN 'ammo' ELSE 'rockets' END;
        IF NOT EXISTS (SELECT 1 FROM public.live_shop_prices_v16
          WHERE enabled=true AND ref_id=item_id
            AND ((v_kind='inventory' AND kind IN ('laser','generator','extra'))
              OR (v_kind='ammo' AND kind='ammo')
              OR (v_kind='rocket' AND kind='rocket'))) THEN
          RAISE EXCEPTION 'Item de prêmio não cadastrado na Loja.';
        END IF;
        current_num:=coalesce((saved->asset_key->>item_id)::numeric,0);
        IF current_num+qty>1000000000 THEN RAISE EXCEPTION 'Quantidade máxima excedida.'; END IF;
        saved:=jsonb_set(saved,ARRAY[asset_key,item_id],to_jsonb(current_num+qty),true);
      END IF;
    ELSE
      RAISE EXCEPTION 'Tipo de prêmio não suportado: %.',v_kind;
    END IF;
  END LOOP;

  saved:=jsonb_set(saved,'{couponClaimsV1821}',
    coalesce(saved->'couponClaimsV1821','{}'::jsonb)||jsonb_build_object(code_input,now()::text),true);

  UPDATE public.game_saves SET state=saved,updated_at=now() WHERE user_id=uid;
  INSERT INTO public.game_coupon_redemptions_v1821(code,user_id,rewards_snapshot)
    VALUES(code_input,uid,rec.rewards);
  UPDATE public.game_coupons_v1821 SET redeemed_count=redeemed_count+1 WHERE code=code_input;

  RETURN jsonb_build_object('ok',true,'code',code_input,'title',rec.title,'rewards',rec.rewards,'state',saved);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_game_coupon_v193(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); v_code text:=upper(btrim(coalesce(p_code,'')));
 rec public.game_coupons_v193%rowtype; saved jsonb;r jsonb;
 k text;i text;qty bigint;old_val numeric;v_days integer;old_until timestamptz;
 season text;slots integer;drone_count integer;v_drone jsonb;v_drones jsonb;v_cargo jsonb;
 v_result jsonb; v_limit bigint;
begin
 if uid is null then raise exception 'Entre na sua conta para resgatar.'; end if;
 select * into rec from public.game_coupons_v193 where code=v_code for update;
 if not found then return jsonb_build_object('handled',false); end if;
 if not rec.active or rec.starts_at>now() or (rec.expires_at is not null and rec.expires_at<=now()) then raise exception 'Cupom inativo ou expirado.'; end if;
 if rec.redeemed_count>=rec.max_uses then raise exception 'Cupom esgotado.'; end if;
 if exists(select 1 from public.game_coupon_redemptions_v193 where code=v_code and user_id=uid) then raise exception 'Você já utilizou este cupom.'; end if;
 select state into saved from public.game_saves where user_id=uid for update;
 if jsonb_typeof(saved) is distinct from 'object' then raise exception 'Salve um personagem antes de resgatar.'; end if;
 if coalesce(nullif(saved->>'accountOwnerId',''),uid::text)<>uid::text then raise exception 'Save de outro jogador.'; end if;
 if coalesce((saved #>> '{profile,level}')::integer,1)<rec.min_level then raise exception 'Cupom exige nível %.',rec.min_level; end if;
 for r in select value from jsonb_array_elements(rec.rewards) loop
   k:=r->>'kind';i:=r->>'id';qty:=coalesce(nullif(r->>'qty','')::bigint,1);
   -- Desconfie de reward JSON injetado: revalide o catálogo também ao resgatar.
   if not exists(select 1 from public.game_coupon_reward_catalog_v193 where kind=k and item_id=i) then raise exception 'Prêmio sem cadastro autorizado.'; end if;
   if k='premium' then
     v_days:=coalesce((r->>'days')::integer,0);
     if v_days not between 1 and 365 then raise exception 'Premium inválido.'; end if;
     insert into public.premium_accounts_v12(user_id,premium_until,updated_at) values(uid,now()+(v_days||' days')::interval,now())
     on conflict(user_id) do update set premium_until=greatest(now(),coalesce(public.premium_accounts_v12.premium_until,now()))+(v_days||' days')::interval,updated_at=now();
   elsif k='battle_pass' then
     select season_key into season from public.game_battle_pass_seasons_v1817b where enabled and starts_at<=now() and (ends_at is null or ends_at>now()) order by starts_at desc limit 1;
     if season is null then raise exception 'Nenhuma temporada ativa para o Passe Premium.'; end if;
     if exists(select 1 from public.premium_accounts_v12 where user_id=uid and battle_pass_season=season) then raise exception 'Passe Premium desta temporada já está ativo.'; end if;
     insert into public.premium_accounts_v12(user_id,battle_pass_season,updated_at) values(uid,season,now())
     on conflict(user_id) do update set battle_pass_season=excluded.battle_pass_season,updated_at=now();
   elsif k in ('credits','uridium') then
     if qty not between 1 and 100000000 then raise exception 'Valor inválido.'; end if;
     old_val:=coalesce((saved->'profile'->>k)::numeric,0);
     if old_val+qty>100000000000000 then raise exception 'Limite de saldo excedido.'; end if;
     saved:=jsonb_set(saved,ARRAY['profile',k],to_jsonb(old_val+qty),true);
     update public.profiles set credits=case when k='credits' then (old_val+qty)::bigint else credits end,
       uridium=case when k='uridium' then (old_val+qty)::bigint else uridium end,updated_at=now() where id=uid;
   elsif k='ship' then
     if qty<>1 then raise exception 'Nave aceita 1 unidade.'; end if;
     if coalesce(saved->'ownedShips','[]'::jsonb) ? i then raise exception 'Você já possui esta nave.'; end if;
     saved:=jsonb_set(saved,'{ownedShips}',coalesce(saved->'ownedShips','[]'::jsonb)||jsonb_build_array(i),true);
   elsif k='drone' then
     v_drones:=coalesce(saved->'drones','[]'::jsonb);
     if jsonb_typeof(v_drones)<>'array' then raise exception 'Drones inválidos.'; end if;
     drone_count:=jsonb_array_length(v_drones);
     if qty<1 or qty>8 or drone_count+qty>8 then raise exception 'O jogador precisa de slots livres para receber os drones.'; end if;
     slots:=case when i='iris' then 2 when i='flax' then 1 else 0 end;
     if slots=0 then raise exception 'Drone desconhecido.'; end if;
     for j in 1..qty loop
       v_drone:=jsonb_build_object('id','d_coupon_'||replace(gen_random_uuid()::text,'-',''),'type',i,'slots',case when slots=2 then '[null,null]'::jsonb else '[null]'::jsonb end);
       v_drones:=v_drones||jsonb_build_array(v_drone);
     end loop;
     saved:=jsonb_set(saved,'{drones}',v_drones,true);
   elsif k in ('inventory','ammo','rocket','cargo') then
     v_limit:=case when k='inventory' then 10000 when k='cargo' then 100000 else 10000000 end;
     if qty<1 or qty>v_limit then raise exception 'Quantidade inválida.'; end if;
     k:=case when k='rocket' then 'rockets' else k end;
     old_val:=coalesce((saved->k->>i)::numeric,0);
     if old_val+qty>1000000000 then raise exception 'Estoque máximo excedido.'; end if;
     if k='cargo' and i<>'Xenomit' then
       -- Não gerar minérios acima da capacidade do porão: compatível com cargo do jogo.
       if qty>10000 then raise exception 'Para recursos de porão, use até 10.000 por cupom.'; end if;
     end if;
     saved:=jsonb_set(saved,array[k,i],to_jsonb(old_val+qty),true);
   else raise exception 'Prêmio não reconhecido.';
   end if;
 end loop;
 saved:=jsonb_set(saved,'{couponClaimsV1821}',coalesce(saved->'couponClaimsV1821','{}'::jsonb)||jsonb_build_object(v_code,now()::text),true);
 update public.game_saves set state=saved,updated_at=now() where user_id=uid;
 insert into public.game_coupon_redemptions_v193(code,user_id,rewards_snapshot) values(v_code,uid,rec.rewards);
 update public.game_coupons_v193 set redeemed_count=redeemed_count+1 where code=v_code;
 return jsonb_build_object('handled',true,'ok',true,'code',v_code,'title',rec.title,'rewards',rec.rewards,'state',saved);
end;$function$
;
CREATE OR REPLACE FUNCTION public.register_game_session_v1214(p_session_id uuid, p_device_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_previous uuid;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if p_session_id is null then
    raise exception 'Identificador de sessão ausente.';
  end if;

  select session_id into v_previous
  from public.game_login_sessions_v1214
  where user_id = v_uid;

  insert into public.game_login_sessions_v1214(
    user_id, session_id, device_label, issued_at, last_seen
  )
  values (
    v_uid,
    p_session_id,
    left(nullif(trim(coalesce(p_device_label,'')),''), 160),
    now(),
    now()
  )
  on conflict (user_id) do update set
    session_id = excluded.session_id,
    device_label = excluded.device_label,
    issued_at = now(),
    last_seen = now();

  return jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'replaced_previous', v_previous is not null and v_previous <> p_session_id
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.respond_battle_group_invite_v179(p_invite_id uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_status text;
  v_expires timestamptz;
  v_count int;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;

  select group_id,status,expires_at into v_gid,v_status,v_expires
  from public.battle_group_invites_v179
  where id=p_invite_id and invitee_id=v_uid
  for update;

  if v_gid is null then raise exception 'Convite não encontrado.'; end if;
  if v_status<>'pending' or v_expires<=now() then raise exception 'Convite expirado.'; end if;

  if not coalesce(p_accept,false) then
    update public.battle_group_invites_v179 set status='declined' where id=p_invite_id;
    return public.get_my_battle_group_v179();
  end if;

  if exists(select 1 from public.battle_group_members_v179 where user_id=v_uid) then
    raise exception 'Você já está em um grupo.';
  end if;
  select count(*) into v_count from public.battle_group_members_v179 where group_id=v_gid;
  if v_count>=5 then raise exception 'O grupo ficou lotado.'; end if;

  insert into public.battle_group_members_v179(group_id,user_id,role) values(v_gid,v_uid,'member');
  update public.battle_group_invites_v179 set status='accepted' where id=p_invite_id;
  update public.battle_group_invites_v179 set status='expired'
  where invitee_id=v_uid and id<>p_invite_id and status='pending';

  return public.get_my_battle_group_v179();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.review_clan_request_v19(p_request_id uuid, p_approve boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_clan uuid;v_role text;v_req public.clan_join_requests_v19%rowtype;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null or v_role not in('owner','deputy') then raise exception 'Somente líder ou vice-líder pode analisar solicitações.'; end if;
  select * into v_req from public.clan_join_requests_v19 where id=p_request_id and clan_id=v_clan for update;
  if not found or v_req.status<>'pending' then raise exception 'Solicitação não encontrada ou já analisada.'; end if;
  if p_approve then
    perform public.clan_check_entry_level_v19(v_req.user_id);
    if exists(select 1 from public.clan_members where user_id=v_req.user_id) then raise exception 'Este jogador já pertence a uma aliança.'; end if;
    insert into public.clan_members(user_id,clan_id,role) values(v_req.user_id,v_clan,'member');
  end if;
  update public.clan_join_requests_v19 set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=v_uid,reviewed_at=now() where id=p_request_id;
  return jsonb_build_object('ok',true,'approved',p_approve,'request_id',p_request_id);
end;$function$
;
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.roll_design_drop_v16(p_source_kind text, p_source_ref text, p_claim_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); r record; v_design text:=null; v_qty integer:=1;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  p_source_kind:=lower(btrim(coalesce(p_source_kind,''))); p_source_ref:=btrim(coalesce(p_source_ref,'')); p_claim_key:=btrim(coalesce(p_claim_key,''));
  if char_length(p_claim_key)<3 or char_length(p_claim_key)>160 then raise exception 'Claim inválido.'; end if;
  begin
    insert into public.designer_drop_claims_v16(user_id,claim_key,source_kind,source_ref) values(v_uid,p_claim_key,p_source_kind,p_source_ref);
  exception when unique_violation then
    return jsonb_build_object('ok',false,'already_claimed',true,'design_id',null);
  end;
  for r in select dr.*,d.name,d.rarity from public.live_drop_rules_v16 dr join public.live_designs_v16 d on d.design_id=dr.design_id where dr.enabled=true and d.enabled=true and dr.source_kind=p_source_kind and dr.source_ref=p_source_ref order by dr.chance asc,dr.drop_key loop
    if random() < r.chance then v_design:=r.design_id; v_qty:=greatest(1,coalesce((r.metadata->>'qty')::integer,1)); exit; end if;
  end loop;
  if v_design is not null then
    insert into public.player_design_inventory_v16(user_id,design_id,quantity) values(v_uid,v_design,v_qty)
    on conflict(user_id,design_id) do update set quantity=public.player_design_inventory_v16.quantity+excluded.quantity,updated_at=now();
    update public.designer_drop_claims_v16 set design_id=v_design where user_id=v_uid and claim_key=p_claim_key;
  end if;
  return jsonb_build_object('ok',true,'already_claimed',false,'design_id',v_design,'quantity',case when v_design is null then 0 else v_qty end);
end $function$
;
CREATE OR REPLACE FUNCTION public.save_player_location_v1774(p_map_id text, p_territory_faction text, p_x double precision, p_y double precision, p_angle double precision, p_client_saved_at bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_map text:=coalesce(nullif(trim(p_map_id),''),'x1');
  v_x double precision:=coalesce(p_x,0);
  v_y double precision:=coalesce(p_y,0);
  v_angle double precision:=coalesce(p_angle,0);
  v_stamp bigint:=greatest(0,coalesce(p_client_saved_at,0));
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if v_map not in ('x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3','b41','b42','b43','ggAlpha','ggBeta','ggGamma') then raise exception 'Mapa inválido.'; end if;
  if v_x<>v_x or v_y<>v_y or abs(v_x)>100000 or abs(v_y)>100000 then raise exception 'Coordenadas inválidas.'; end if;
  if v_angle<>v_angle then v_angle:=0; end if;

  insert into public.player_location_v1774(user_id,map_id,territory_faction,x,y,angle,client_saved_at,updated_at)
  values(v_uid,v_map,nullif(trim(coalesce(p_territory_faction,'')),''),v_x,v_y,v_angle,v_stamp,now())
  on conflict(user_id) do update set
    map_id=excluded.map_id,
    territory_faction=excluded.territory_faction,
    x=excluded.x,
    y=excluded.y,
    angle=excluded.angle,
    client_saved_at=excluded.client_saved_at,
    updated_at=now()
  where excluded.client_saved_at>=public.player_location_v1774.client_saved_at;

  return jsonb_build_object('ok',true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.schedule_map_event_v132(p_event_key text, p_name text, p_kind text, p_map_id text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_config jsonb DEFAULT '{}'::jsonb)
 RETURNS map_event_instances_v132
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_row public.map_event_instances_v132%rowtype;
  v_status text;
begin
  if coalesce(trim(p_event_key),'')='' or coalesce(trim(p_name),'')='' then raise exception 'Evento inválido.'; end if;
  if p_map_id not in ('b41','b42','b43') then raise exception 'Eventos só podem usar os setores 4-X.'; end if;
  if p_ends_at<=p_starts_at then raise exception 'Janela de evento inválida.'; end if;
  v_status:=case when p_ends_at<=now() then 'finished' when p_starts_at<=now() then 'active' else 'scheduled' end;
  if exists(
    select 1 from public.map_event_instances_v132 e
    where e.map_id=p_map_id and e.status<>'cancelled'
      and not (e.event_key=left(trim(p_event_key),80) and e.starts_at=p_starts_at)
      and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then raise exception 'Este setor 4-X já possui evento nessa janela.'; end if;
  insert into public.map_event_instances_v132(event_key,name,kind,map_id,starts_at,ends_at,status,config)
  values(left(trim(p_event_key),80),left(trim(p_name),120),left(coalesce(nullif(trim(p_kind),''),'event'),40),p_map_id,p_starts_at,p_ends_at,v_status,coalesce(p_config,'{}'::jsonb)||jsonb_build_object('exclusive_4x',true))
  on conflict(event_key,starts_at) do update set
    name=excluded.name,kind=excluded.kind,map_id=excluded.map_id,ends_at=excluded.ends_at,
    status=case when public.map_event_instances_v132.status='cancelled' then 'cancelled' else excluded.status end,
    config=public.map_event_instances_v132.config||excluded.config
  returning * into v_row;
  return v_row;
end;$function$
;
CREATE OR REPLACE FUNCTION public.search_battle_group_players_v1793(p_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_q text:=lower(trim(coalesce(p_query,'')));
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;

  select group_id,role into v_gid,v_role
  from public.battle_group_members_v179
  where user_id=v_uid
  limit 1;

  if v_gid is null then raise exception 'Crie um Grupo de Batalha primeiro.'; end if;
  if v_role<>'leader' then raise exception 'Somente o líder pode buscar e convidar pilotos.'; end if;
  if length(v_q)<2 then return jsonb_build_object('players','[]'::jsonb); end if;

  select coalesce(jsonb_agg(row_to_json(x) order by x.online desc,x.callsign),'[]'::jsonb)
  into v_rows
  from (
    select
      p.id::text as user_id,
      p.callsign,
      p.faction,
      (pp.updated_at>now()-interval '20 seconds') as online,
      case when pp.updated_at>now()-interval '20 seconds' then pp.map_id else null end as map_id,
      case when pp.updated_at>now()-interval '20 seconds' then pp.territory_faction else null end as territory_faction,
      case when gm.user_id is not null then true else false end as in_group,
      case when gm.user_id is null then true else false end as can_invite
    from public.profiles p
    left join public.player_presence pp on pp.user_id=p.id
    left join public.battle_group_members_v179 gm on gm.user_id=p.id
    where p.id<>v_uid
      and lower(coalesce(p.callsign,'')) like '%'||v_q||'%'
    order by
      case when lower(coalesce(p.callsign,''))=v_q then 0 else 1 end,
      (pp.updated_at>now()-interval '20 seconds') desc,
      p.callsign
    limit 12
  ) x;

  return jsonb_build_object('players',coalesce(v_rows,'[]'::jsonb),'query',v_q);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.send_chat_message_v16(p_channel text, p_body text, p_recipient_callsign text DEFAULT NULL::text)
 RETURNS game_chat_messages_v16
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_callsign text; v_clan uuid; v_recipient uuid; v_recipient_callsign text; v_row public.game_chat_messages_v16;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  p_channel:=lower(btrim(coalesce(p_channel,'')));
  p_body:=btrim(regexp_replace(coalesce(p_body,''),'\s+',' ','g'));
  if p_channel not in ('global','clan','private') then raise exception 'Canal inválido.'; end if;
  if char_length(p_body)<1 or char_length(p_body)>240 then raise exception 'Mensagem deve ter 1 a 240 caracteres.'; end if;
  if exists(select 1 from public.game_chat_messages_v16 where sender_user_id=v_uid and created_at>now()-interval '700 milliseconds') then raise exception 'Aguarde um instante antes de enviar outra mensagem.'; end if;
  select callsign into v_callsign from public.profiles where id=v_uid;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if p_channel='clan' and v_clan is null then raise exception 'Você não pertence a uma aliança.'; end if;
  if p_channel='private' then
    select id,callsign into v_recipient,v_recipient_callsign from public.profiles where lower(btrim(callsign))=lower(btrim(coalesce(p_recipient_callsign,''))) limit 1;
    if v_recipient is null then raise exception 'Piloto não encontrado.'; end if;
    if v_recipient=v_uid then raise exception 'Escolha outro piloto.'; end if;
  end if;
  insert into public.game_chat_messages_v16(channel,sender_user_id,sender_callsign,clan_id,recipient_user_id,recipient_callsign,body)
  values(p_channel,v_uid,coalesce(v_callsign,'Pilot'),case when p_channel='clan' then v_clan else null end,case when p_channel='private' then v_recipient else null end,case when p_channel='private' then v_recipient_callsign else null end,p_body)
  returning * into v_row;
  return v_row;
end $function$
;
CREATE OR REPLACE FUNCTION public.set_battle_group_rally_v179(p_map_id text, p_territory_faction text, p_x double precision, p_y double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select group_id,role into v_gid,v_role from public.battle_group_members_v179 where user_id=v_uid;
  if v_gid is null then raise exception 'Você não está em um grupo.'; end if;
  if v_role<>'leader' then raise exception 'Somente o líder pode marcar o rally.'; end if;
  if p_x<>p_x or p_y<>p_y or abs(p_x)>100000 or abs(p_y)>100000 then raise exception 'Coordenadas inválidas.'; end if;

  update public.battle_groups_v179
  set rally_map_id=left(coalesce(p_map_id,''),24),
      rally_territory_faction=nullif(left(coalesce(p_territory_faction,''),24),''),
      rally_x=p_x,rally_y=p_y,rally_at=now(),updated_at=now()
  where id=v_gid;

  return public.get_my_battle_group_v179();
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_clan_member_role_v19(p_target_user_id uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_clan uuid;v_role text;v_target_role text;v_target_name text;v_new text:=lower(trim(coalesce(p_role,'')));
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_role not in('owner','deputy') or v_clan is null then raise exception 'Sem permissão para cargos.'; end if;
  if v_new not in('deputy','elite','member') then raise exception 'Cargo inválido.'; end if;
  if p_target_user_id=v_uid then raise exception 'Não é possível alterar seu próprio cargo.'; end if;
  select cm.role,p.callsign into v_target_role,v_target_name from public.clan_members cm left join public.profiles p on p.id=cm.user_id
    where cm.user_id=p_target_user_id and cm.clan_id=v_clan for update of cm;
  if v_target_role is null then raise exception 'Jogador não pertence à sua aliança.'; end if;
  if v_target_role='owner' then raise exception 'Não é possível alterar o cargo do líder.'; end if;
  if v_role='deputy' and (v_new='deputy' or v_target_role='deputy') then raise exception 'Apenas o líder pode alterar vice-lideranças.'; end if;
  if v_new in ('deputy','elite') then perform public.clan_check_entry_level_v19(p_target_user_id); end if;
  update public.clan_members set role=v_new where user_id=p_target_user_id and clan_id=v_clan;
  return jsonb_build_object('ok',true,'role',v_new,'callsign',v_target_name);
end;$function$
;
CREATE OR REPLACE FUNCTION public.set_design_loadout_v16(p_kind text, p_design_id text DEFAULT NULL::text, p_drone_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_design_kind text;
  v_eligibility jsonb;
  v_owned integer:=0;
  v_used integer:=0;
  v_state jsonb;
  v_ship_id text;
  v_pet_owned boolean:=false;
  v_allowed_ship boolean:=false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  p_kind:=lower(btrim(coalesce(p_kind,'')));
  IF p_kind NOT IN ('ship','pet','drone') THEN RAISE EXCEPTION 'Tipo de design inválido.'; END IF;

  SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid;
  v_ship_id := coalesce(v_state->>'activeShipId','');
  v_pet_owned := coalesce((v_state->'pet'->>'owned')::boolean,false);
  v_allowed_ship := v_ship_id = ANY(ARRAY[
    'leonov','vengeance','goliath','pusat',
    'aegis','basilisk','berserker','centurion','citadel','cyborg','defcom','defcomRaven',
    'diminisher','disruptor','goliathX','hammerclaw','hecate','holo','hyperion','keres',
    'mimesis','orcus','paladin','retiarus','sentinel','solace','solaris','spearhead',
    'spectrum','tartarus','tempest','venom','yamato','yRonin','zephyr'
  ]);

  IF p_design_id IS NOT NULL AND btrim(p_design_id)<>'' THEN
    SELECT kind,eligibility INTO v_design_kind,v_eligibility
    FROM public.live_designs_v16
    WHERE design_id=p_design_id AND enabled=true;

    IF v_design_kind IS NULL OR v_design_kind<>p_kind THEN
      RAISE EXCEPTION 'Design incompatível ou desativado.';
    END IF;

    SELECT quantity INTO v_owned
    FROM public.player_design_inventory_v16
    WHERE user_id=v_uid AND design_id=p_design_id;
    IF coalesce(v_owned,0)<=0 THEN RAISE EXCEPTION 'Você não possui esse design.'; END IF;

    IF p_kind='ship' THEN
      IF NOT v_allowed_ship OR coalesce((v_eligibility->>'elite_or_event')::boolean,false)=false THEN
        RAISE EXCEPTION 'Designer de nave exige nave ELITE ou ESPECIAL DE EVENTO.';
      END IF;
    ELSIF p_kind='pet' THEN
      IF NOT v_pet_owned OR coalesce((v_eligibility->>'event_only')::boolean,false)=false THEN
        RAISE EXCEPTION 'Designer AUX-9 indisponível para este equipamento.';
      END IF;
    END IF;
  ELSE
    p_design_id:=null;
  END IF;

  IF p_kind='ship' THEN
    INSERT INTO public.player_design_loadout_v16(user_id,ship_design_id)
    VALUES(v_uid,p_design_id)
    ON CONFLICT(user_id) DO UPDATE SET ship_design_id=excluded.ship_design_id,updated_at=now();

  ELSIF p_kind='pet' THEN
    INSERT INTO public.player_design_loadout_v16(user_id,pet_design_id)
    VALUES(v_uid,p_design_id)
    ON CONFLICT(user_id) DO UPDATE SET pet_design_id=excluded.pet_design_id,updated_at=now();

  ELSE
    IF coalesce(btrim(p_drone_id),'')='' THEN RAISE EXCEPTION 'Drone não informado.'; END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(coalesce(v_state->'drones','[]'::jsonb)) d
      WHERE d->>'id'=p_drone_id
    ) THEN
      RAISE EXCEPTION 'Drone não pertence ao seu hangar.';
    END IF;

    IF p_design_id IS NULL THEN
      DELETE FROM public.player_drone_designs_v16
      WHERE user_id=v_uid AND drone_id=p_drone_id;
    ELSE
      SELECT count(*) INTO v_used
      FROM public.player_drone_designs_v16
      WHERE user_id=v_uid AND design_id=p_design_id AND drone_id<>p_drone_id;

      IF v_used>=v_owned THEN RAISE EXCEPTION 'Todas as cópias desse design já estão equipadas.'; END IF;

      INSERT INTO public.player_drone_designs_v16(user_id,drone_id,design_id)
      VALUES(v_uid,p_drone_id,p_design_id)
      ON CONFLICT(user_id,drone_id) DO UPDATE SET design_id=excluded.design_id,updated_at=now();
    END IF;
  END IF;

  RETURN public.get_my_designers_v16();
END
$function$
;
CREATE OR REPLACE FUNCTION public.ship_rank_value(p_ship_id text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case lower(coalesce(p_ship_id, 'phoenix'))
    when 'phoenix' then 3
    when 'yamato' then 6
    when 'leonov' then 12
    when 'defcom' then 18
    when 'liberator' then 24
    when 'piranha' then 30
    when 'nostromo' then 36
    when 'bigboy' then 44
    when 'vengeance' then 49
    when 'goliath' then 65
    when 'goliathx' then 68
    when 'goliath-x' then 68
    when 'diminisher' then 69
    when 'sentinel' then 69
    when 'spectrum' then 69
    when 'venom' then 69
    when 'solace' then 70
    when 'pusat' then 70
    when 'aegis' then 71
    when 'citadel' then 71
    when 'spearhead' then 71
    when 'cyborg' then 72
    when 'orcus' then 72
    when 'centurion' then 73
    when 'hammerclaw' then 73
    when 'hecate' then 73
    when 'hyperion' then 74
    when 'keres' then 74
    when 'mimesis' then 74
    when 'solaris' then 74
    when 'tempest' then 74
    when 'tartarus' then 75
    when 'berserker' then 75
    when 'basilisk' then 75
    when 'disruptor' then 75
    when 'paladin' then 75
    when 'retiarus' then 75
    when 'zephyr' then 75
    when 'nambassador' then 62
    when 'nenvoy' then 58
    when 'ndiplomat' then 52
    else 55
  end;
$function$
;
CREATE OR REPLACE FUNCTION public.sl2d_claim_daily()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT sl2d_private.sl2d_claim_daily_impl(); $function$
;
CREATE OR REPLACE FUNCTION public.stellar_admin_set_astral_v381(p_gate text, p_config jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE c jsonb; k text; limits jsonb:='{"referenceWaves":100,"credits":50000000,"stl":50000,"cores":500,"ammoQty":40000,"rocketQty":1000,"voidite":200,"resourceQty":200,"weeklyBonusPct":100}'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ASTRAL_ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_gate NOT IN ('alpha','beta','gamma') OR jsonb_typeof(p_config)<>'object' THEN RAISE EXCEPTION 'ASTRAL_CONFIG_INVALID'; END IF;
 SELECT config INTO c FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 IF c IS NULL THEN RAISE EXCEPTION 'ASTRAL_GATE_INVALID'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_config) LOOP
  IF NOT (limits ? k OR k IN ('ammoId','rocketId')) THEN RAISE EXCEPTION 'ASTRAL_FIELD_INVALID %',k; END IF;
  IF limits ? k THEN
    IF jsonb_typeof(p_config->k)<>'number' OR (p_config->>k)::numeric<0 OR (p_config->>k)::numeric>(limits->>k)::numeric OR (p_config->>k)::numeric<>trunc((p_config->>k)::numeric)
    THEN RAISE EXCEPTION 'ASTRAL_AMOUNT_INVALID %',k; END IF;
    IF k='referenceWaves' AND (p_config->>k)::integer<1 THEN RAISE EXCEPTION 'ASTRAL_WAVES_INVALID'; END IF;
  ELSIF k='ammoId' AND (p_config->>k) NOT IN ('lcb10','mcb25','mcb50','ucb100','sab50') THEN RAISE EXCEPTION 'ASTRAL_AMMO_INVALID';
  ELSIF k='rocketId' AND (p_config->>k) NOT IN ('r310','plt2026','plt2021','plt3030') THEN RAISE EXCEPTION 'ASTRAL_ROCKET_INVALID'; END IF;
 END LOOP;
 UPDATE public.stellar_astral_config_v381 SET config=c||p_config,revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE gate=p_gate;
 RETURN public.stellar_astral_dashboard_v381();
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_astral_dashboard_v381()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u uuid:=auth.uid(); row record; s jsonb; result jsonb:='{}'::jsonb; history jsonb; current_count bigint; last_count bigint; wk text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'ASTRAL_AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 SELECT state INTO s FROM public.game_saves WHERE user_id=u;
 FOR row IN SELECT gate,config,revision FROM public.stellar_astral_config_v381 ORDER BY gate LOOP
  current_count:=GREATEST(0,COALESCE((s#>>ARRAY['galaxyGate',row.gate,'completed'])::bigint,0));
  SELECT last_completed INTO last_count FROM public.stellar_astral_cursor_v381 WHERE user_id=u AND gate=row.gate;
  -- Se o SQL for aplicado antes do cadastro, cursor ausente equivale a zero.
  result:=jsonb_set(result,ARRAY[row.gate],jsonb_build_object(
   'quote',COALESCE((SELECT ql.quote FROM public.stellar_astral_quote_lock_v381 ql
      WHERE ql.user_id=u AND ql.gate=row.gate AND ql.completion_number=coalesce(last_count,0)+1),
      public.stellar_astral_quote_v381(row.gate,NOT EXISTS(
      SELECT 1 FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.gate=row.gate AND l.week_id=wk))),
   'config',row.config,'revision',row.revision,
   'pending',greatest(0,current_count-coalesce(last_count,0)),
   'materialBalance',coalesce((s#>>ARRAY['cargo',row.config->>'resource'])::bigint,0)),true);
 END LOOP;
 SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.claimed_at DESC),'[]'::jsonb) INTO history FROM
  (SELECT gate,completion_number,week_id,first_weekly,quote,claimed_at FROM public.stellar_astral_ledger_v381
   WHERE user_id=u ORDER BY claimed_at DESC LIMIT 20) t;
 RETURN jsonb_build_object('gates',result,'history',history,'week',wk);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_astral_lock_quote_v381(p_gate text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u uuid:=auth.uid(); s jsonb; n bigint; last_n bigint; q jsonb; rev bigint; wk text;
BEGIN
 IF u IS NULL OR p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_LOCK_INVALID' USING ERRCODE='42501'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u;
 IF s IS NULL THEN RAISE EXCEPTION 'ASTRAL_SAVE_MISSING'; END IF;
 n:=greatest(0,coalesce((s#>>ARRAY['galaxyGate',p_gate,'completed'])::bigint,0));
 SELECT last_completed INTO last_n FROM public.stellar_astral_cursor_v381 WHERE user_id=u AND gate=p_gate;
 last_n:=coalesce(last_n,0);
 IF n>last_n THEN
   SELECT quote INTO q FROM public.stellar_astral_quote_lock_v381 WHERE user_id=u AND gate=p_gate AND completion_number=last_n+1;
   RETURN jsonb_build_object('locked',q IS NOT NULL,'pending',n-last_n,'quote',q);
 END IF;
 IF n<last_n THEN RAISE EXCEPTION 'ASTRAL_SAVE_STALE'; END IF;
 IF coalesce((s#>>ARRAY['galaxyGate',p_gate,'built'])::boolean,false)=false THEN
   RETURN jsonb_build_object('locked',false,'pending',0,'reason','GATE_NOT_BUILT');
 END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 q:=public.stellar_astral_quote_v381(p_gate,NOT EXISTS(
 SELECT 1 FROM public.stellar_astral_ledger_v381 WHERE user_id=u AND gate=p_gate AND week_id=wk));
 SELECT revision INTO rev FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 INSERT INTO public.stellar_astral_quote_lock_v381(user_id,gate,completion_number,quote,config_revision,week_id)
 VALUES(u,p_gate,last_n+1,q,rev,wk) ON CONFLICT DO NOTHING;
 SELECT quote INTO q FROM public.stellar_astral_quote_lock_v381 WHERE user_id=u AND gate=p_gate AND completion_number=last_n+1;
 RETURN jsonb_build_object('locked',true,'pending',0,'quote',q);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_astral_quote_v381(p_gate text, p_first_weekly boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE c jsonb; live jsonb; v_waves integer; v_enemy numeric:=1; v_damage numeric:=1; v_mult numeric; v_bonus numeric;
BEGIN
 IF p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_GATE_INVALID'; END IF;
 SELECT config INTO c FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 IF c IS NULL THEN RAISE EXCEPTION 'ASTRAL_CONFIG_MISSING'; END IF;
 SELECT config->p_gate INTO live FROM public.galaxy_gate_config_v1906 WHERE id=1;
 SELECT COALESCE(sum(jsonb_array_length(r.value->'waves')),0)::integer INTO v_waves
 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(live->'rounds')='array' THEN live->'rounds' ELSE '[]'::jsonb END) r;
 IF v_waves<1 THEN v_waves:=(c->>'referenceWaves')::integer; END IF;
 IF (live->>'enemyScale') ~ '^[0-9]+(\.[0-9]+)?$' THEN v_enemy:=least(3,greatest(0.25,(live->>'enemyScale')::numeric)); END IF;
 IF (live->>'damageScale') ~ '^[0-9]+(\.[0-9]+)?$' THEN v_damage:=least(3,greatest(0.25,(live->>'damageScale')::numeric)); END IF;
 v_mult:=round(greatest(0.5,least(3,(v_waves::numeric/(c->>'referenceWaves')::numeric)*sqrt(v_enemy*v_damage))),3);
 v_bonus:=CASE WHEN p_first_weekly THEN 1+(c->>'weeklyBonusPct')::numeric/100 ELSE 1 END;
 RETURN jsonb_build_object('gate',p_gate,'label',c->>'label','resource',c->>'resource',
  'waves',v_waves,'difficultyMult',v_mult,'firstWeekly',p_first_weekly,'weeklyBonusPct',(c->>'weeklyBonusPct')::integer,
  'credits',round((c->>'credits')::numeric*v_mult*v_bonus)::bigint,
  'stl',round((c->>'stl')::numeric*v_mult*v_bonus)::bigint,
  'cores',round((c->>'cores')::numeric*v_mult*v_bonus)::bigint,
  'ammoId',c->>'ammoId','ammoQty',round((c->>'ammoQty')::numeric*v_mult)::bigint,
  'rocketId',c->>'rocketId','rocketQty',round((c->>'rocketQty')::numeric*v_mult)::bigint,
  'voidite',round((c->>'voidite')::numeric*v_mult)::bigint,
  'resourceQty',round((c->>'resourceQty')::numeric*v_mult*v_bonus)::bigint);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_auto_sale_cpu_guard_v1065()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_has_cpu boolean := false;
BEGIN
  IF NEW.auto_sell IS TRUE THEN
    SELECT COALESCE((state->'shipLoadout'->'extras') ? 'remoteTraderCpuElite',false)
      INTO v_has_cpu FROM public.game_saves WHERE user_id=NEW.user_id;
    IF NOT COALESCE(v_has_cpu,false) THEN
      RAISE EXCEPTION 'Venda automática offline exige Terminal Mercante Remoto Elite EQUIPADO.' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_capture_canonical_save_v119()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_now timestamptz:=clock_timestamp();
 v_hash text;
 v_before text;
 v_rev bigint;
 v_previous public.stellar_player_save_checkpoint_v119%rowtype;
 v_b public.stellar_player_save_checkpoint_v119%rowtype;
 v_important boolean:=false;
 v_modules text[]:=ARRAY[]::text[];
BEGIN
 v_hash:=md5(NEW.state::text);
 IF TG_OP='UPDATE' THEN
  IF NEW.state IS NOT DISTINCT FROM OLD.state THEN RETURN NULL; END IF;
  v_before:=md5(OLD.state::text);
  IF NEW.state->'drones' IS DISTINCT FROM OLD.state->'drones' OR
     NEW.state->'shipLoadout' IS DISTINCT FROM OLD.state->'shipLoadout' OR
     NEW.state->'combatConfigsV2013' IS DISTINCT FROM OLD.state->'combatConfigsV2013' OR
     NEW.state->'pet' IS DISTINCT FROM OLD.state->'pet' OR
     NEW.state->'inventory' IS DISTINCT FROM OLD.state->'inventory' THEN
     v_modules:=array_append(v_modules,'hangar');v_important:=true;
  END IF;
  IF NEW.state->'missions' IS DISTINCT FROM OLD.state->'missions' OR
     NEW.state->'battlePass' IS DISTINCT FROM OLD.state->'battlePass' THEN
     v_modules:=array_append(v_modules,'missoes');v_important:=true;
  END IF;
  IF NEW.state->'auction' IS DISTINCT FROM OLD.state->'auction' THEN
     v_modules:=array_append(v_modules,'leilao');v_important:=true;
  END IF;
  IF NEW.state->'serverPurchaseRevision' IS DISTINCT FROM OLD.state->'serverPurchaseRevision' OR
     NEW.state->'profile'->'credits' IS DISTINCT FROM OLD.state->'profile'->'credits' OR
     NEW.state->'profile'->'uridium' IS DISTINCT FROM OLD.state->'profile'->'uridium' THEN
     v_modules:=array_append(v_modules,'economia');
  END IF;
  IF NEW.state->'serverNpcRewardRevision' IS DISTINCT FROM OLD.state->'serverNpcRewardRevision' OR
     NEW.state->'serverOreRevision' IS DISTINCT FROM OLD.state->'serverOreRevision' THEN
     v_modules:=array_append(v_modules,'combate');
  END IF;
 ELSE
  v_before:=NULL;v_modules:=ARRAY['criacao']::text[];v_important:=true;
 END IF;
 IF array_length(v_modules,1) IS NULL THEN v_modules:=ARRAY['progresso']::text[]; END IF;
 INSERT INTO public.stellar_player_save_head_v119(user_id,revision,state_hash,changed_at)
 VALUES(NEW.user_id,1,v_hash,v_now)
 ON CONFLICT(user_id) DO UPDATE SET revision=public.stellar_player_save_head_v119.revision+1,
 state_hash=EXCLUDED.state_hash,changed_at=EXCLUDED.changed_at
 RETURNING revision INTO v_rev;
 SELECT * INTO v_previous FROM public.stellar_player_save_checkpoint_v119
   WHERE user_id=NEW.user_id AND slot='A' FOR UPDATE;
 IF v_previous.user_id IS NOT NULL AND v_previous.state_hash<>v_hash THEN
   SELECT * INTO v_b FROM public.stellar_player_save_checkpoint_v119
     WHERE user_id=NEW.user_id AND slot='B' FOR UPDATE;
   IF v_important OR v_b.user_id IS NULL OR v_now-v_b.captured_at>=interval '60 seconds' THEN
     IF v_b.user_id IS NOT NULL THEN
       INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
       (user_id,slot,revision,state,state_hash,captured_at)
       VALUES(NEW.user_id,'C',v_b.revision,v_b.state,v_b.state_hash,v_b.captured_at)
       ON CONFLICT(user_id,slot) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state,
       state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
     END IF;
     INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
     (user_id,slot,revision,state,state_hash,captured_at)
     VALUES(NEW.user_id,'B',v_previous.revision,v_previous.state,v_previous.state_hash,v_previous.captured_at)
     ON CONFLICT(user_id,slot) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state,
       state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
   END IF;
 END IF;
 INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
 (user_id,slot,revision,state,state_hash,captured_at)
 VALUES(NEW.user_id,'A',v_rev,NEW.state,v_hash,v_now)
 ON CONFLICT(user_id,slot) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state,
 state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
 INSERT INTO public.stellar_player_save_journal_v119
 (user_id,revision,modules,before_hash,after_hash,created_at)
 VALUES(NEW.user_id,v_rev,v_modules,v_before,v_hash,v_now);
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_claim_astral_v381(p_user_id uuid, p_gate text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE s jsonb; n bigint; last_n bigint; wk text; lock_week text; weekly boolean; q jsonb; rev bigint; cr bigint; stl bigint; cores bigint;
        c jsonb; a jsonb; rockets jsonb; bio jsonb; prof jsonb; res text; v bigint;
BEGIN
 IF p_user_id IS NULL OR p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_INVALID_CLAIM'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ASTRAL_SAVE_MISSING'; END IF;
 n:=greatest(0,coalesce((s#>>ARRAY['galaxyGate',p_gate,'completed'])::bigint,0));
 INSERT INTO public.stellar_astral_cursor_v381(user_id,gate,last_completed) VALUES(p_user_id,p_gate,0) ON CONFLICT DO NOTHING;
 SELECT last_completed INTO last_n FROM public.stellar_astral_cursor_v381 WHERE user_id=p_user_id AND gate=p_gate FOR UPDATE;
 IF n<=last_n THEN RETURN jsonb_build_object('claimed',false,'reason','NO_PENDING_COMPLETION'); END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 weekly:=NOT EXISTS(SELECT 1 FROM public.stellar_astral_ledger_v381 WHERE user_id=p_user_id AND gate=p_gate AND week_id=wk);
 SELECT locked.quote,locked.config_revision,locked.week_id INTO q,rev,lock_week
 FROM public.stellar_astral_quote_lock_v381 locked
 WHERE locked.user_id=p_user_id AND locked.gate=p_gate AND locked.completion_number=last_n+1 FOR UPDATE;
 IF q IS NULL THEN
   q:=public.stellar_astral_quote_v381(p_gate,weekly);
   SELECT revision INTO rev FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 ELSE
   wk:=lock_week;
   weekly:=(q->>'firstWeekly')::boolean;
 END IF;
 INSERT INTO public.stellar_astral_ledger_v381(user_id,gate,completion_number,week_id,first_weekly,quote,config_revision)
 VALUES(p_user_id,p_gate,last_n+1,wk,weekly,q,rev);
 cr:=(q->>'credits')::bigint;stl:=(q->>'stl')::bigint;cores:=(q->>'cores')::bigint;res:=q->>'resource';
 prof:=coalesce(s->'profile','{}'::jsonb);
 prof:=prof||jsonb_build_object('credits',coalesce((prof->>'credits')::bigint,0)+cr,'uridium',coalesce((prof->>'uridium')::bigint,0)+stl);
 s:=jsonb_set(s,'{profile}',prof,true);
 bio:=coalesce(s->'pilotBio','{}'::jsonb);
 bio:=bio||jsonb_build_object('logDisks',coalesce((bio->>'logDisks')::bigint,0)+cores);
 s:=jsonb_set(s,'{pilotBio}',bio,true);
 c:=coalesce(s->'cargo','{}'::jsonb);
 c:=c||jsonb_build_object('Xenomit',coalesce((c->>'Xenomit')::bigint,0)+(q->>'voidite')::bigint,
   res,coalesce((c->>res)::bigint,0)+(q->>'resourceQty')::bigint);
 s:=jsonb_set(s,'{cargo}',c,true);
 a:=coalesce(s->'ammo','{}'::jsonb);
 a:=a||jsonb_build_object(q->>'ammoId',coalesce((a->>(q->>'ammoId'))::bigint,0)+(q->>'ammoQty')::bigint);
 s:=jsonb_set(s,'{ammo}',a,true);
 rockets:=coalesce(s->'rockets','{}'::jsonb);
 rockets:=rockets||jsonb_build_object(q->>'rocketId',coalesce((rockets->>(q->>'rocketId'))::bigint,0)+(q->>'rocketQty')::bigint);
 s:=jsonb_set(s,'{rockets}',rockets,true);
 -- Usa a revisão de compras já reconhecida pelo backend para bloquear saves antigos.
 s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(coalesce((s->>'serverPurchaseRevision')::bigint,0)+1),true);
 UPDATE public.game_saves SET state=s,updated_at=now() WHERE user_id=p_user_id;
 UPDATE public.profiles SET credits=(prof->>'credits')::bigint,uridium=(prof->>'uridium')::bigint,updated_at=now() WHERE id=p_user_id;
 UPDATE public.stellar_astral_cursor_v381 SET last_completed=last_n+1,updated_at=now() WHERE user_id=p_user_id AND gate=p_gate;
 DELETE FROM public.stellar_astral_quote_lock_v381 WHERE user_id=p_user_id AND gate=p_gate AND completion_number=last_n+1;
 RETURN jsonb_build_object('claimed',true,'quote',q,'completion',last_n+1,'revision',s->'serverPurchaseRevision');
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_claim_clan_operation(p_operation_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_uid uuid:=auth.uid();v_clan uuid;v_objective public.stellar_clan_operations;
 v_progress bigint;v_old bigint;v_claimed boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT id INTO v_clan FROM public.clans WHERE owner_id=v_uid ORDER BY created_at LIMIT 1;
 IF v_clan IS NULL THEN RAISE EXCEPTION 'CLAN_OWNER_REQUIRED';END IF;
 SELECT * INTO v_objective FROM public.stellar_clan_operations WHERE id=p_operation_id AND enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_OPERATION_NOT_FOUND';END IF;
 SELECT vault_credits INTO v_old FROM public.clans WHERE id=v_clan AND owner_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_NOT_FOUND';END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_clan_operation_claims WHERE clan_id=v_clan AND operation_id=p_operation_id) THEN
   RETURN jsonb_build_object('ok',true,'already_claimed',true,'clan_id',v_clan,'vault_credits',v_old);
 END IF;
 SELECT count(*) INTO v_progress FROM public.stellar_war_actions WHERE clan_id=v_clan AND kind=v_objective.metric;
 IF v_progress<v_objective.target THEN RAISE EXCEPTION 'CLAN_OBJECTIVE_NOT_COMPLETE';END IF;
 INSERT INTO public.stellar_clan_operation_claims(clan_id,operation_id,claimed_by,credits)
 VALUES(v_clan,p_operation_id,v_uid,v_objective.vault_credits);
 UPDATE public.clans SET vault_credits=coalesce(vault_credits,0)+v_objective.vault_credits,updated_at=now()
 WHERE id=v_clan RETURNING vault_credits INTO v_old;
 RETURN jsonb_build_object('ok',true,'already_claimed',false,'clan_id',v_clan,'credits',v_objective.vault_credits,'vault_credits',v_old);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_claim_competitive_season(p_season_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_season public.stellar_competitive_seasons;
 v_rank bigint;v_points bigint;v_state jsonb;v_profile jsonb;v_rev bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_season from public.stellar_competitive_seasons where id=p_season_id and enabled for share;
 if not found or now()<v_season.ends_at then raise exception 'SEASON_NOT_CLOSED';end if;
 select scores.rnk,scores.points into v_rank,v_points from (
  select user_id,points,row_number() over(order by points desc,user_id) as rnk from (
   select a.actor_user_id as user_id,sum(case when a.kind='capture' then 10 else 3 end)::bigint as points
   from public.stellar_war_actions a where a.occurred_at>=v_season.starts_at and a.occurred_at<v_season.ends_at and a.actor_user_id is not null
   group by a.actor_user_id
  ) raw
 ) scores where scores.user_id=v_uid;
 if v_rank is null or v_rank>v_season.top_n or v_points<v_season.min_points then raise exception 'SEASON_REWARD_NOT_ELIGIBLE';end if;
 select state into v_state from public.game_saves where user_id=v_uid for update;
 if v_state is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_competitive_claims where season_id=p_season_id and user_id=v_uid) then
  return jsonb_build_object('ok',true,'already_claimed',true,'state',v_state);
 end if;
 insert into public.stellar_competitive_claims(season_id,user_id,points,rank,credits,stl)
 values(p_season_id,v_uid,v_points,v_rank,v_season.reward_credits,v_season.reward_stl);
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_profile:=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce((v_profile->>'credits')::numeric,0))+v_season.reward_credits),true);
 v_profile:=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce((v_profile->>'uridium')::numeric,0))+v_season.reward_stl),true);
 v_rev:=coalesce((v_state->>'serverEliteRevision')::bigint,0)+1;
 v_state:=jsonb_set(jsonb_set(v_state,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_rev),true);
 update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'rank',v_rank,'points',v_points,'credits',v_season.reward_credits,'stl',v_season.reward_stl,'state',v_state);
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_claim_elite_objective(p_objective_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_uid uuid:=auth.uid();v_counters public.stellar_elite_counters;
 v_metric bigint;v_target bigint;v_cr bigint;v_stl bigint;v_title text;
 v_state jsonb;v_profile jsonb;v_rev bigint;v_objective public.stellar_elite_objectives;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_objective from public.stellar_elite_objectives where objective_id=p_objective_id and enabled=true for share;
 if not found then raise exception 'UNKNOWN_ELITE_OBJECTIVE';end if;
 v_target:=v_objective.target;v_cr:=v_objective.credits;v_stl:=v_objective.stl;v_title:=v_objective.title;
 select * into v_counters from public.stellar_elite_counters where user_id=v_uid for update;
 v_metric:=case when v_objective.metric='sector_captures' then coalesce(v_counters.sector_captures,0) else coalesce(v_counters.npc_kills,0) end;
 if v_metric<v_target then raise exception 'ELITE_OBJECTIVE_NOT_COMPLETE';end if;
 select state into v_state from public.game_saves where user_id=v_uid for update;
 if v_state is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_elite_claims where user_id=v_uid and objective_id=p_objective_id) then
  return jsonb_build_object('ok',true,'already_claimed',true,'objective_id',p_objective_id,'state',v_state);
 end if;
 insert into public.stellar_elite_claims(user_id,objective_id,title,credits,stl) values(v_uid,p_objective_id,v_title,v_cr,v_stl);
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_profile:=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce(floor((v_profile->>'credits')::numeric)::bigint,0))+v_cr),true);
 v_profile:=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce(floor((v_profile->>'uridium')::numeric)::bigint,0))+v_stl),true);
 v_rev:=coalesce((v_state->>'serverEliteRevision')::bigint,0)+1;
 v_state:=jsonb_set(jsonb_set(v_state,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_rev),true);
 update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'objective_id',p_objective_id,'title',v_title,'credits',v_cr,'stl',v_stl,'state',v_state);
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_claim_war_campaign(p_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid();v_campaign public.stellar_war_campaigns;v_score public.stellar_war_scores;v_best bigint;v_team bigint;v_winner boolean;v_credits bigint;v_stl bigint;v_save jsonb;v_profile jsonb;v_revision bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_campaign from public.stellar_war_campaigns where id=p_campaign_id and enabled=true and ends_at<=now();
 if not found then raise exception 'CAMPAIGN_NOT_FINISHED';end if;
 select * into v_score from public.stellar_war_scores where campaign_id=p_campaign_id and user_id=v_uid;
 if not found or v_score.points<v_campaign.min_points then raise exception 'CAMPAIGN_NOT_ELIGIBLE';end if;
 select max(total) into v_best from (select sum(points) as total from public.stellar_war_scores where campaign_id=p_campaign_id group by faction) teams;
 select sum(points) into v_team from public.stellar_war_scores where campaign_id=p_campaign_id and faction=v_score.faction;
 v_winner=coalesce(v_team,0)=coalesce(v_best,0) and coalesce(v_team,0)>0;
 v_credits=case when v_winner then v_campaign.reward_credits else floor(v_campaign.reward_credits::numeric/4)::bigint end;
 v_stl=case when v_winner then v_campaign.reward_stl else 0 end;
 select state into v_save from public.game_saves where user_id=v_uid for update;
 if v_save is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_war_campaign_claims where user_id=v_uid and campaign_id=p_campaign_id) then
 return jsonb_build_object('ok',true,'already_claimed',true,'state',v_save);
 end if;
 insert into public.stellar_war_campaign_claims(campaign_id,user_id,faction,points,victorious,credits,stl)
 values(p_campaign_id,v_uid,v_score.faction,v_score.points,v_winner,v_credits,v_stl);
 v_profile=coalesce(v_save->'profile','{}'::jsonb);
 v_profile=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce((v_profile->>'credits')::bigint,0))+v_credits),true);
 v_profile=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce((v_profile->>'uridium')::bigint,0))+v_stl),true);
 v_revision=coalesce((v_save->>'serverEliteRevision')::bigint,0)+1;
 v_save=jsonb_set(jsonb_set(v_save,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_revision),true);
 update public.game_saves set state=v_save,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'victorious',v_winner,'credits',v_credits,'stl',v_stl,'state',v_save);
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_claim_war_supply()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid();v_save jsonb;v_profile jsonb;v_faction text;v_count int;v_credits bigint;v_day date:=(now() at time zone 'America/Sao_Paulo')::date;v_revision bigint;v_previous bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select state into v_save from public.game_saves where user_id=v_uid for update;
 if v_save is null then raise exception 'SAVE_NOT_FOUND';end if;
 v_faction=v_save#>>'{profile,faction}';if v_faction not in('earth','mars','jupiter') then raise exception 'FACTION_REQUIRED';end if;
 select count(*) into v_count from public.stellar_warfront_nodes where owner=v_faction;
 if v_count=0 then raise exception 'NO_TERRITORY';end if;
 select least(daily_credits_cap,daily_credits_per_node*v_count) into v_credits from public.stellar_war_rules where id=1;
 v_credits:=coalesce(v_credits,0);
 if exists(select 1 from public.stellar_war_supply_claims where user_id=v_uid and claim_day=v_day) then
 return jsonb_build_object('ok',true,'already_claimed',true,'credits',0,'owned_nodes',v_count,'state',v_save);
 end if;
 insert into public.stellar_war_supply_claims(user_id,claim_day,faction,owned_nodes,credits) values(v_uid,v_day,v_faction,v_count,v_credits);
 v_profile=coalesce(v_save->'profile','{}'::jsonb);
 v_previous=greatest(0,coalesce((v_profile->>'credits')::bigint,0));
 v_profile=jsonb_set(v_profile,'{credits}',to_jsonb(v_previous+v_credits),true);
 v_revision=coalesce((v_save->>'serverEliteRevision')::bigint,0)+1;
 v_save=jsonb_set(jsonb_set(v_save,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_revision),true);
 update public.game_saves set state=v_save,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'credits',v_credits,'owned_nodes',v_count,'state',v_save);
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_clan_operation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
 IF EXISTS(SELECT 1 FROM public.stellar_clan_operation_claims WHERE operation_id=old.id)
    AND (new.metric,new.target,new.vault_credits,new.id) IS DISTINCT FROM
        (old.metric,old.target,old.vault_credits,old.id) THEN
  RAISE EXCEPTION 'CLAN_OPERATION_LOCKED_AFTER_CLAIM';
 END IF;
 RETURN new;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_command_v1332(p_user_id uuid, p_command_id text, p_module text, p_request_hash text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE previous record; result jsonb; current_state jsonb; current_at timestamptz;
BEGIN
 IF p_user_id IS NULL OR p_command_id IS NULL OR length(p_command_id) NOT BETWEEN 10 AND 160 OR p_module IS NULL OR p_module NOT IN ('economy','auction') OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'COMMAND_ARGUMENTS_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,1332));
 SELECT * INTO previous FROM public.stellar_command_receipts_v1332 WHERE user_id=p_user_id AND command_id=p_command_id;
 IF FOUND THEN
  IF previous.module IS DISTINCT FROM p_module OR previous.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"COMMAND_ID_REUSED"}'::jsonb;END IF;
  SELECT state,updated_at INTO current_state,current_at FROM public.game_saves WHERE user_id=p_user_id;
  RETURN previous.receipt||jsonb_build_object('ok',true,'replayed',true,'state',current_state,'updated_at',current_at);
 END IF;
 PERFORM set_config('stellar.writer','command_v1332:'||p_module,true);
 IF p_module='economy' THEN
  result:=public.stellar_commit_economy_operation_v125(p_user_id,p_command_id,p_payload->>'operation',p_request_hash,(p_payload->>'expected_updated_at')::timestamptz,p_payload->'state',p_payload->>'callsign',p_payload->'receipt');
 ELSE
  result:=public.stellar_settle_auction_bid_v1182(p_user_id,p_payload->>'hour_key',p_payload->>'lot_ref');
 END IF;
 IF result->>'ok'='true' THEN
  INSERT INTO public.stellar_command_receipts_v1332(user_id,command_id,module,request_hash,receipt)
   VALUES(p_user_id,p_command_id,p_module,p_request_hash,result-'state'-'updated_at');
 END IF;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_economy_operation_v125(p_user_id uuid, p_request_id text, p_operation text, p_request_hash text, p_expected_updated_at timestamp with time zone, p_state jsonb, p_callsign text, p_receipt jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 saved public.game_saves%rowtype;
 previous public.stellar_economy_receipts_v125%rowtype;
 save_result jsonb;
 now_at timestamptz;
 from_rev bigint;
 to_rev bigint;
 currency text;
 val text;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL
    OR p_request_id !~ '^[A-Za-z0-9_-]{10,90}$'
    OR p_operation IS NULL OR p_operation !~ '^(economy:[a-z_]{3,45}|bulk:(ammo|rocket):[A-Za-z0-9_-]{2,50})$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
    OR p_expected_updated_at IS NULL
    OR p_state IS NULL OR jsonb_typeof(p_state)<>'object'
    OR p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
 THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_ARGUMENTS_INVALID');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,125));
 -- Receipts are immutable. The per-player advisory lock already serializes retries.
 SELECT * INTO previous FROM public.stellar_economy_receipts_v125
  WHERE user_id=p_user_id AND request_id=p_request_id;
 IF FOUND THEN
   IF previous.operation IS DISTINCT FROM p_operation OR previous.request_hash IS DISTINCT FROM p_request_hash THEN
     RETURN jsonb_build_object('ok',false,'code','ECONOMY_ID_REUSED');
   END IF;
   SELECT * INTO saved FROM public.game_saves WHERE user_id=p_user_id;
   RETURN jsonb_build_object('ok',true,'replayed',true,
     'receipt',previous.receipt,'state',saved.state,'updated_at',saved.updated_at);
 END IF;
 SELECT * INTO saved FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_SAVE_MISSING');END IF;
 IF saved.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_STALE');END IF;
 IF saved.state->>'accountOwnerId' IS NOT NULL AND saved.state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_OWNER_MISMATCH');END IF;
 -- Reject invalid monetary values and any unexpected revision skips.
 FOREACH currency IN ARRAY ARRAY['credits','uridium'] LOOP
   val:=p_state#>>array['profile',currency];
   IF val IS NULL OR val !~ '^[0-9]{1,15}$' THEN
     RETURN jsonb_build_object('ok',false,'code','ECONOMY_BALANCE_INVALID');END IF;
 END LOOP;
 from_rev:=coalesce((saved.state->>'serverPurchaseRevision')::bigint,0);
 to_rev:=coalesce((p_state->>'serverPurchaseRevision')::bigint,0);
 IF to_rev<>from_rev+1 THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_REVISION_INVALID');END IF;
 -- Canonical save + profile + checkpoint and durable receipt are ONE transaction.
 now_at:=clock_timestamp();
 save_result:=public.stellar_commit_player_save_v118(p_user_id,p_state,now_at,p_callsign);
 IF coalesce((save_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_SAVE_REJECTED');END IF;
 INSERT INTO public.stellar_economy_receipts_v125(user_id,request_id,operation,request_hash,receipt)
 VALUES(p_user_id,p_request_id,p_operation,p_request_hash,p_receipt);
 RETURN jsonb_build_object('ok',true,'replayed',false,
   'receipt',p_receipt,'state',p_state,'updated_at',now_at);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_live_purchase_v123(p_user_id uuid, p_request_id uuid, p_catalog_key text, p_expected_updated_at timestamp with time zone, p_state jsonb, p_callsign text, p_receipt jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_existing public.stellar_live_purchase_receipts_v123%rowtype;
 v_state jsonb; v_updated_at timestamptz; v_committed jsonb; v_at timestamptz;
 v_currency text; v_cost bigint; v_old bigint; v_new bigint;
 v_old_revision bigint; v_new_revision bigint;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR length(p_catalog_key)<2
    OR p_state IS NULL OR jsonb_typeof(p_state)<>'object'
    OR p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
    OR p_expected_updated_at IS NULL
 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_ARGUMENTS_INVALID'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,123));
 SELECT * INTO v_existing FROM public.stellar_live_purchase_receipts_v123
 WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
   IF v_existing.catalog_key IS DISTINCT FROM p_catalog_key THEN
     RETURN jsonb_build_object('ok',false,'code','PURCHASE_ID_REUSED');
   END IF;
   SELECT state,updated_at INTO v_state,v_updated_at FROM public.game_saves WHERE user_id=p_user_id;
   RETURN jsonb_build_object('ok',true,'replayed',true,'state',v_state,
     'updated_at',v_updated_at,'receipt',v_existing.receipt);
 END IF;
 SELECT state,updated_at INTO v_state,v_updated_at FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_SAVE_MISSING');END IF;
 IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_STALE');
 END IF;
 v_currency:=p_receipt->>'currency';
 IF v_currency IS NULL OR v_currency NOT IN ('credits','uridium') THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_CURRENCY_INVALID');
 END IF;
 IF p_receipt->>'catalog_key' IS DISTINCT FROM p_catalog_key THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_CATALOG_MISMATCH');
 END IF;
 IF p_receipt->>'price' IS NULL OR (p_receipt->>'price') !~ '^[0-9]{1,15}$' THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_PRICE_INVALID');
 END IF;
 v_cost:=(p_receipt->>'price')::bigint;
 IF v_cost < 1 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_PRICE_INVALID'); END IF;
 v_old:=coalesce((v_state#>>array['profile',v_currency])::bigint,0);
 v_new:=coalesce((p_state#>>array['profile',v_currency])::bigint,0);
 IF v_old < v_cost OR v_new IS DISTINCT FROM v_old-v_cost THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_DEBIT_MISMATCH');
 END IF;
 IF v_currency='credits' AND
   (p_state#>>'{profile,uridium}') IS DISTINCT FROM (v_state#>>'{profile,uridium}')
 OR v_currency='uridium' AND
   (p_state#>>'{profile,credits}') IS DISTINCT FROM (v_state#>>'{profile,credits}')
 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_OTHER_CURRENCY_CHANGED'); END IF;
 v_old_revision:=coalesce((v_state->>'serverPurchaseRevision')::bigint,0);
 v_new_revision:=coalesce((p_state->>'serverPurchaseRevision')::bigint,0);
 IF v_new_revision<>v_old_revision+1 THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_REVISION_INVALID');
 END IF;
 v_at:=clock_timestamp();
 v_committed:=public.stellar_commit_player_save_v118(p_user_id,p_state,v_at,p_callsign);
 IF coalesce((v_committed->>'ok')::boolean,false) IS NOT TRUE THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_SAVE_REJECTED');
 END IF;
 INSERT INTO public.stellar_live_purchase_receipts_v123(user_id,request_id,catalog_key,receipt)
 VALUES(p_user_id,p_request_id,p_catalog_key,p_receipt);
 RETURN jsonb_build_object('ok',true,'replayed',false,'state',p_state,
   'updated_at',v_at,'receipt',p_receipt);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_player_command_v119(p_user_id uuid, p_operation_id uuid, p_module text, p_action text, p_state jsonb, p_callsign text, p_expected_revision bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_existing public.stellar_player_save_operation_v119%rowtype;
 v_head public.stellar_player_save_head_v119%rowtype;
 v_hash text;
 v_result jsonb;
 v_rev bigint;
BEGIN
 IF p_user_id IS NULL OR p_operation_id IS NULL OR p_state IS NULL OR
    jsonb_typeof(p_state)<>'object' OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
 THEN RAISE EXCEPTION 'SAVE_COMMAND_INVALID'; END IF;
 IF p_module NOT IN ('checkpoint','hangar','missoes','economia','leilao','farm','combate','server')
   OR p_action NOT IN ('save','commit') THEN RAISE EXCEPTION 'SAVE_ACTION_NOT_ALLOWED'; END IF;
 v_hash:=md5(p_state::text);
 PERFORM 1 FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 SELECT * INTO v_existing FROM public.stellar_player_save_operation_v119
 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF v_existing.user_id IS NOT NULL THEN
   IF v_existing.request_hash<>v_hash OR v_existing.module<>p_module OR v_existing.action<>p_action
   THEN RAISE EXCEPTION 'SAVE_IDEMPOTENCY_ID_REUSED'; END IF;
   RETURN v_existing.result||jsonb_build_object('replayed',true);
 END IF;
 SELECT * INTO v_head FROM public.stellar_player_save_head_v119 WHERE user_id=p_user_id FOR UPDATE;
 IF v_head.user_id IS NULL THEN RAISE EXCEPTION 'SAVE_HEAD_NOT_INITIALIZED';END IF;
 IF p_module IN ('checkpoint','hangar') AND p_expected_revision IS NULL THEN
   RETURN jsonb_build_object('ok',false,'code','SAVE_REVISION_REQUIRED',
      'message','Atualize o jogo para confirmar a alteracao com a revisao oficial.');
 END IF;
 IF p_expected_revision IS NOT NULL AND p_expected_revision<>v_head.revision THEN
   RETURN jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT','revision',v_head.revision,
     'message','O estado do jogador mudou. Atualize para confirmar sua acao sem perder progresso.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.game_saves'::regclass
       AND tgname='stellar_capture_save_update_v119' AND tgenabled<>'D') THEN
   RAISE EXCEPTION 'SAVE_CAPTURE_NOT_ACTIVE';
 END IF;
 v_result:=public.stellar_commit_player_save_v118(p_user_id,p_state,clock_timestamp(),p_callsign);
 IF v_result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'SAVE_COMMIT_NOT_CONFIRMED';END IF;
 SELECT revision INTO v_rev FROM public.stellar_player_save_head_v119 WHERE user_id=p_user_id;
 INSERT INTO public.stellar_player_save_operation_v119
 (user_id,operation_id,module,action,request_hash,result,revision)
 VALUES(p_user_id,p_operation_id,p_module,p_action,v_hash,
   jsonb_build_object('ok',true,'revision',v_rev,'operation_id',p_operation_id),v_rev);
 RETURN jsonb_build_object('ok',true,'revision',v_rev,'operation_id',p_operation_id,'replayed',false);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_player_save_v118(p_user_id uuid, p_state jsonb, p_updated_at timestamp with time zone, p_callsign text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 old_save jsonb;
 old_updated_at timestamptz;
 a public.stellar_player_save_abc_v118%rowtype;
 b public.stellar_player_save_abc_v118%rowtype;
 v_rotate boolean;
 v_profile jsonb;
 v_signature text;
begin
 if p_user_id is null or p_state is null or jsonb_typeof(p_state)<>'object'
   or p_state->>'accountOwnerId' is distinct from p_user_id::text
 then raise exception 'SAVE_OWNER_OR_PAYLOAD_INVALID' using errcode='23514'; end if;
 if p_callsign is null or length(trim(p_callsign))=0 or length(p_callsign)>60
 then raise exception 'SAVE_CALLSIGN_INVALID' using errcode='23514'; end if;
 if p_updated_at is null then raise exception 'SAVE_TIME_INVALID' using errcode='23514'; end if;
 v_profile:=p_state->'profile';
 if jsonb_typeof(v_profile)<>'object' then raise exception 'SAVE_PROFILE_INVALID' using errcode='23514';end if;
 select state,updated_at into old_save,old_updated_at from public.game_saves where user_id=p_user_id for update;
 insert into public.game_saves(user_id,state,updated_at)
 values(p_user_id,p_state,p_updated_at)
 on conflict(user_id) do update set state=excluded.state,updated_at=excluded.updated_at;
 insert into public.profiles(id,callsign,faction,level,xp,credits,uridium,aliens_killed,gg_completed,updated_at)
 values(p_user_id,p_callsign,
   nullif(v_profile->>'faction',''),
   greatest(1,coalesce((v_profile->>'level')::integer,1)),
   coalesce((v_profile->>'xp')::bigint,0),
   coalesce((v_profile->>'credits')::bigint,0),
   coalesce((v_profile->>'uridium')::bigint,0),
   coalesce((v_profile->>'aliensKilled')::bigint,0),
   coalesce((p_state#>>'{galaxyGate,alpha,completed}')::integer,(v_profile->>'ggCompleted')::integer,0),
   p_updated_at)
 on conflict(id) do update set
   callsign=excluded.callsign,faction=excluded.faction,level=excluded.level,
   xp=excluded.xp,credits=excluded.credits,uridium=excluded.uridium,
   aliens_killed=excluded.aliens_killed,gg_completed=excluded.gg_completed,
   updated_at=excluded.updated_at;

 select * into a from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='A' for update;
 select * into b from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='B' for update;
 v_signature:=md5(p_state::text);
 v_rotate:= a.user_id is null or b.user_id is null or
   p_updated_at >= b.captured_at+interval '30 seconds' or
   a.state->'shipLoadout' is distinct from p_state->'shipLoadout' or
   a.state->'drones' is distinct from p_state->'drones' or
   a.state->'combatConfigsV2013' is distinct from p_state->'combatConfigsV2013' or
   a.state->'pet' is distinct from p_state->'pet' or
   a.state->>'serverPurchaseRevision' is distinct from p_state->>'serverPurchaseRevision';
 if v_rotate and b.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'C',b.state,b.save_updated_at,b.state_hash,b.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 end if;
 if v_rotate and a.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',a.state,a.save_updated_at,a.state_hash,a.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 elsif a.user_id is null and old_save is not null then
   insert into public.stellar_player_save_abc_v118
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',old_save,old_updated_at,md5(old_save::text),clock_timestamp())
   on conflict(user_id,slot) do nothing;
 end if;
 insert into public.stellar_player_save_abc_v118 as ss
 (user_id,slot,state,save_updated_at,state_hash,captured_at)
 values(p_user_id,'A',p_state,p_updated_at,v_signature,clock_timestamp())
 on conflict(user_id,slot) do update set
 state=excluded.state,save_updated_at=excluded.save_updated_at,
 state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 return jsonb_build_object('ok',true,'updated_at',p_updated_at,'checkpoint','A');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_save_v131(p_user_id uuid, p_state jsonb, p_updated_at timestamp with time zone, p_callsign text, p_expected_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  current_token text;
  result jsonb;
begin
  select md5(state::text) into current_token from public.game_saves
    where user_id=p_user_id for update;
  if p_expected_token is distinct from coalesce(current_token,'new') then
    return jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT');
  end if;
  if current_token is null then
    -- Reserve a missing row atomically. A competing first save cannot overwrite it.
    insert into public.game_saves(user_id,state,updated_at) values(p_user_id,p_state,p_updated_at)
      on conflict(user_id) do nothing;
    if not found then return jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT'); end if;
  end if;
  result := public.stellar_commit_player_save_v118(p_user_id,p_state,p_updated_at,p_callsign);
  if (result->>'ok')::boolean is distinct from true then raise exception 'SAVE_NOT_CONFIRMED'; end if;
  select md5(state::text) into current_token from public.game_saves where user_id=p_user_id;
  return result || jsonb_build_object('save_token',current_token);
end; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_save_v133(p_user_id uuid, p_state jsonb, p_updated_at timestamp with time zone, p_callsign text, p_expected_token text, p_operation_id uuid, p_request_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE stored record; r jsonb;
BEGIN
 IF p_operation_id IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'SAVE_OPERATION_ID_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,133));
 SELECT * INTO stored FROM public.stellar_save_receipts_v133 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF FOUND THEN
 IF stored.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"SAVE_IDEMPOTENCY_ID_REUSED"}'::jsonb;END IF;
 RETURN stored.receipt||jsonb_build_object('replayed',true);
 END IF;
 PERFORM set_config('stellar.writer','checkpoint_v133',true);
 r:=public.stellar_commit_save_v131(p_user_id,p_state,p_updated_at,p_callsign,p_expected_token);
 IF r->>'ok'='true' THEN INSERT INTO public.stellar_save_receipts_v133 VALUES(p_user_id,p_operation_id,p_request_hash,r,clock_timestamp());END IF;
 RETURN r;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_commit_warfront_capture(p_map_id text, p_node_id text, p_faction text, p_expected_revision bigint, p_actor uuid)
 RETURNS stellar_warfront_nodes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_row public.stellar_warfront_nodes;v_campaign uuid;v_points int;v_old text;v_clan uuid;
begin
 if p_map_id not in ('b41','b42','b43') or p_node_id not in ('A','B','C') or p_faction not in ('earth','mars','jupiter') or p_actor is null then raise exception 'INVALID_WARFRONT_CAPTURE';end if;
 select owner into v_old from public.stellar_warfront_nodes where map_id=p_map_id and node_id=p_node_id for update;
 update public.stellar_warfront_nodes set owner=p_faction,captured_at=now(),captured_by=p_actor,revision=revision+1
 where map_id=p_map_id and node_id=p_node_id and revision=p_expected_revision and owner is distinct from p_faction returning * into v_row;
 if not found then raise exception 'WARFRONT_REVISION_CONFLICT';end if;
 select id into v_campaign from public.stellar_war_campaigns where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 select clan_id into v_clan from public.clan_members where user_id=p_actor limit 1;
 select capture_points into v_points from public.stellar_war_rules where id=1;
 v_points:=coalesce(v_points,10);
 insert into public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points,clan_id)
 values(v_campaign,'capture',p_map_id,p_node_id,p_faction,v_old,p_actor,case when v_campaign is null then 0 else v_points end,v_clan);
 if v_campaign is not null then
   insert into public.stellar_war_scores(campaign_id,user_id,faction,captures,points,clan_id)
   values(v_campaign,p_actor,p_faction,1,v_points,v_clan)
   on conflict(campaign_id,user_id) do update set captures=public.stellar_war_scores.captures+1,points=public.stellar_war_scores.points+excluded.points,updated_at=now();
 end if;
 return v_row;
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_competitive_season_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if tg_op='UPDATE' and old.enabled and now()>=old.starts_at
    and (new.title,new.starts_at,new.ends_at,new.enabled,new.min_points,new.top_n,new.reward_credits,new.reward_stl)
      is distinct from
        (old.title,old.starts_at,old.ends_at,old.enabled,old.min_points,old.top_n,old.reward_credits,old.reward_stl) then
   raise exception 'SEASON_CONFIG_LOCKED_AFTER_START';
 end if;
 new.updated_at:=now();
 return new;
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_dominion_claim_v360(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cl public.clans; cfg public.stellar_dominion_rules_v360;
 day_start date; period date; owned integer; war_count integer; award bigint; inserted integer:=0;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 IF p_kind NOT IN('daily','weekly') OR p_kind IS NULL THEN RAISE EXCEPTION 'INVALID_REWARD_KIND';END IF;
 SELECT c.* INTO cl FROM public.clan_members cm JOIN public.clans c ON c.id=cm.clan_id
 WHERE cm.user_id=uid FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_REQUIRED';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'DOMINION_DISABLED';END IF;
 day_start:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 period:=CASE WHEN p_kind='weekly' THEN date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date ELSE day_start END;
 IF p_kind='daily' THEN
   SELECT count(*) INTO owned FROM public.stellar_relay_state_v346 WHERE owner_clan_id=cl.id AND hp>0;
   IF owned=0 THEN RAISE EXCEPTION 'NO_ACTIVE_CLAN_RELAY';END IF;
   award:=LEAST(cfg.daily_credits_cap,owned*cfg.daily_credits_per_relay);
 ELSE
   SELECT count(*) INTO war_count FROM public.stellar_war_actions
   WHERE clan_id=cl.id AND kind IN('capture','defense') AND occurred_at >= (period::timestamp AT TIME ZONE 'America/Sao_Paulo')
   AND occurred_at<((period+7)::timestamp AT TIME ZONE 'America/Sao_Paulo');
   IF war_count<cfg.weekly_war_actions THEN RAISE EXCEPTION 'WEEKLY_OBJECTIVE_INCOMPLETE';END IF;
   award:=cfg.weekly_credits;
 END IF;
 INSERT INTO public.stellar_dominion_claims_v360(clan_id,claim_kind,period_start,actor,credits)
 VALUES(cl.id,p_kind,period,uid,award) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'DOMINION_REWARD_ALREADY_CLAIMED';END IF;
 UPDATE public.clans SET vault_credits=vault_credits+award,updated_at=now() WHERE id=cl.id;
 RETURN jsonb_build_object('ok',true,'kind',p_kind,'credits',award,'period',period);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_dominion_declare_v360(p_defender uuid, p_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cl public.clans; target public.clans; cfg public.stellar_dominion_rules_v360; w public.stellar_dominion_wars_v360; battle_start timestamptz;battle_end timestamptz;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT * INTO cl FROM public.clans WHERE owner_id=uid ORDER BY created_at LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 IF p_defender IS NULL OR p_defender=cl.id THEN RAISE EXCEPTION 'INVALID_RIVAL_CLAN';END IF;
 SELECT * INTO target FROM public.clans WHERE id=p_defender;
 IF NOT FOUND THEN RAISE EXCEPTION 'RIVAL_CLAN_NOT_FOUND';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'DOMINION_DISABLED';END IF;
 battle_start:=COALESCE(p_starts_at,now());
 IF p_starts_at IS NOT NULL AND (battle_start<now()+interval '2 minutes' OR battle_start>now()+interval '7 days')
 THEN RAISE EXCEPTION 'WAR_SCHEDULE_OUT_OF_RANGE';END IF;
 battle_end:=battle_start+make_interval(hours=>cfg.war_hours);
 PERFORM pg_advisory_xact_lock(hashtext(LEAST(cl.id::text,p_defender::text)||':'||GREATEST(cl.id::text,p_defender::text))::bigint);
 IF EXISTS(SELECT 1 FROM public.stellar_dominion_wars_v360
  WHERE ((attacker=cl.id AND defender=p_defender) OR (attacker=p_defender AND defender=cl.id))
  AND ends_at>battle_start-make_interval(hours=>cfg.war_cooldown_hours)
  AND starts_at<battle_end+make_interval(hours=>cfg.war_cooldown_hours)) THEN RAISE EXCEPTION 'WAR_ACTIVE_OR_COOLDOWN';END IF;
 -- Limit unbounded spam: an attacker can have only one live offensive war.
 IF EXISTS(SELECT 1 FROM public.stellar_dominion_wars_v360 WHERE attacker=cl.id AND ends_at>battle_start AND starts_at<battle_end) THEN RAISE EXCEPTION 'ATTACKER_ALREADY_AT_WAR';END IF;
 INSERT INTO public.stellar_dominion_wars_v360(attacker,defender,declared_by,starts_at,ends_at)
 VALUES(cl.id,p_defender,uid,battle_start,battle_end) RETURNING * INTO w;
 RETURN jsonb_build_object('ok',true,'war_id',w.id,'starts_at',w.starts_at,'ends_at',w.ends_at);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_dominion_regen_v360()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE cfg public.stellar_dominion_rules_v360; changed integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'DOMINION_SERVICE_ONLY';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RETURN jsonb_build_object('ok',true,'updated',0);END IF;
 WITH loadouts AS (
   SELECT s.map_id,s.node_id,
    COALESCE(MAX(m.level) FILTER(WHERE m.category='hp' AND m.attribute='nanobots'),0)::integer AS nano_lv,
    COALESCE(MAX(m.level) FILTER(WHERE m.category='shield' AND m.attribute='regenerator'),0)::integer AS regen_lv
   FROM public.stellar_relay_state_v346 s
   LEFT JOIN public.stellar_relay_modules_v346 m ON m.map_id=s.map_id AND m.node_id=s.node_id
   WHERE s.owner_clan_id IS NOT NULL AND s.hp>0 AND
    (s.last_hit_at IS NULL OR s.last_hit_at<now()-make_interval(secs=>cfg.regen_idle_seconds))
   GROUP BY s.map_id,s.node_id
 ), applied AS (
   UPDATE public.stellar_relay_state_v346 s SET
    hp=LEAST(s.max_hp,s.hp+cfg.regen_hp_tick*(1+l.nano_lv)),
    shield=LEAST(s.max_shield,s.shield+cfg.regen_shield_tick*(1+l.regen_lv)),
    revision=s.revision+1,updated_at=now()
   FROM loadouts l WHERE s.map_id=l.map_id AND s.node_id=l.node_id
   AND (s.last_hit_at IS NULL OR s.last_hit_at<now()-make_interval(secs=>cfg.regen_idle_seconds))
   AND s.hp>0 AND s.owner_clan_id IS NOT NULL
   AND (s.hp<s.max_hp AND cfg.regen_hp_tick>0 OR s.shield<s.max_shield AND cfg.regen_shield_tick>0)
   RETURNING s.map_id
 ) SELECT count(*) INTO changed FROM applied;
 RETURN jsonb_build_object('ok',true,'updated',changed);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_dominion_war_prize_v360(p_war_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cl public.clans; w public.stellar_dominion_wars_v360; cfg public.stellar_dominion_rules_v360;
 sa bigint;sb bigint;award bigint;inserted integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT c.* INTO cl FROM public.clan_members cm JOIN public.clans c ON c.id=cm.clan_id WHERE cm.user_id=uid FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_REQUIRED';END IF;
 SELECT * INTO w FROM public.stellar_dominion_wars_v360 WHERE id=p_war_id FOR UPDATE;
 IF NOT FOUND OR cl.id NOT IN (w.attacker,w.defender) THEN RAISE EXCEPTION 'WAR_NOT_FOUND_FOR_CLAN';END IF;
 IF w.ends_at>now() THEN RAISE EXCEPTION 'WAR_NOT_FINISHED';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'DOMINION_DISABLED';END IF;
 SELECT coalesce(sum(CASE WHEN kind='capture' THEN 5 ELSE 2 END),0) INTO sa
 FROM public.stellar_war_actions WHERE clan_id=w.attacker AND kind IN('capture','defense') AND occurred_at>=w.starts_at AND occurred_at<w.ends_at;
 SELECT coalesce(sum(CASE WHEN kind='capture' THEN 5 ELSE 2 END),0) INTO sb
 FROM public.stellar_war_actions WHERE clan_id=w.defender AND kind IN('capture','defense') AND occurred_at>=w.starts_at AND occurred_at<w.ends_at;
 IF sa=sb OR greatest(sa,sb)=0 OR (cl.id=w.attacker AND sa<=sb) OR (cl.id=w.defender AND sb<=sa) THEN
   RAISE EXCEPTION 'WAR_PRIZE_NOT_WON';END IF;
 award:=cfg.war_reward_credits;
 INSERT INTO public.stellar_dominion_war_claims_v360(war_id,clan_id,actor,credits) VALUES(w.id,cl.id,uid,award) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'WAR_PRIZE_ALREADY_CLAIMED';END IF;
 UPDATE public.clans SET vault_credits=vault_credits+award,updated_at=now() WHERE id=cl.id;
 RETURN jsonb_build_object('ok',true,'war_id',w.id,'credits',award,'attacker_score',sa,'defender_score',sb);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_equip_elite_title(p_objective_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_title text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select title into v_title from public.stellar_elite_claims where user_id=v_uid and objective_id=p_objective_id;
 if v_title is null then raise exception 'ELITE_TITLE_NOT_EARNED';end if;
 insert into public.stellar_elite_selected_titles(user_id,objective_id,title)
 values(v_uid,p_objective_id,v_title)
 on conflict(user_id) do update set objective_id=excluded.objective_id,title=excluded.title,equipped_at=now();
 return jsonb_build_object('ok',true,'title',v_title,'objective_id',p_objective_id);
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_frontier_claim_v370(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); r public.stellar_frontier_contracts_v370; s jsonb; tech public.stellar_frontier_ship_tech_v370;
 p date; cnt bigint; inserted integer; reward_cr bigint;reward_stl bigint; current_cr bigint;current_stl bigint; rev bigint; new_shards integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_SAVE_MISSING';END IF;
 SELECT * INTO r FROM public.stellar_frontier_contracts_v370 WHERE id=p_id AND enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_CONTRACT_MISSING';END IF;
 IF coalesce((s#>>'{profile,level}')::integer,1)<r.min_level THEN RAISE EXCEPTION 'FRONTIER_LEVEL_REQUIRED';END IF;
 p:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 IF r.task_kind='npc' THEN
  SELECT count(*) INTO cnt FROM public.stellar_npc_reward_ledger n WHERE n.user_id=uid AND n.npc_type=r.target_type AND n.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
 ELSE
  SELECT count(*) INTO cnt FROM public.stellar_ore_reward_ledger o WHERE o.user_id=uid AND o.resource=r.target_type AND o.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
 END IF;
 IF cnt<r.target_count THEN RAISE EXCEPTION 'FRONTIER_OBJECTIVE_INCOMPLETE';END IF;
 INSERT INTO public.stellar_frontier_ship_tech_v370(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO tech FROM public.stellar_frontier_ship_tech_v370 WHERE user_id=uid FOR UPDATE;
 reward_cr:=round(r.reward_credits*(1+(tech.level-1)*0.1));reward_stl:=round(r.reward_stl*(1+(tech.level-1)*0.1));
 current_cr:=coalesce((s#>>'{profile,credits}')::bigint,0);current_stl:=coalesce((s#>>'{profile,uridium}')::bigint,0);
 rev:=coalesce((s->>'serverNpcRewardRevision')::bigint,0);
 IF current_cr+reward_cr>1000000000000 OR current_stl+reward_stl>10000000000 OR rev>=1000000000 THEN RAISE EXCEPTION 'FRONTIER_BALANCE_LIMIT';END IF;
 INSERT INTO public.stellar_frontier_claims_v370(user_id,contract_id,week_start,credits,stl,shards)
 VALUES(uid,p_id,p,reward_cr,reward_stl,r.reward_shards) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'FRONTIER_ALREADY_CLAIMED';END IF;
 UPDATE public.stellar_frontier_ship_tech_v370 SET shards=shards+r.reward_shards,updated_at=now() WHERE user_id=uid;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(jsonb_set(s,'{profile,credits}',to_jsonb(current_cr+reward_cr),true),'{profile,uridium}',to_jsonb(current_stl+reward_stl),true),'{serverNpcRewardRevision}',to_jsonb(rev+1),true),updated_at=now() WHERE user_id=uid;
 UPDATE public.profiles SET credits=current_cr+reward_cr,uridium=current_stl+reward_stl,updated_at=now() WHERE id=uid;
 RETURN jsonb_build_object('ok',true,'credits',reward_cr,'stl',reward_stl,'shards',r.reward_shards,'revision',rev+1,'contract',p_id);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_frontier_clan_claim_v370()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cl public.clans; kills integer; week date; inserted integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT * INTO cl FROM public.clans WHERE owner_id=uid ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_ONLY_CLAN_OWNER';END IF;
 week:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 SELECT count(*) INTO kills FROM public.stellar_npc_reward_ledger n JOIN public.clan_members cm ON cm.user_id=n.user_id
 WHERE cm.clan_id=cl.id AND n.npc_type IN ('bossVoidCorsair','bossNexusWarden','bossAstralReaper')
 AND n.issued_at>=(week::timestamp AT TIME ZONE 'America/Sao_Paulo');
 IF kills<8 THEN RAISE EXCEPTION 'FRONTIER_CLAN_OBJECTIVE_INCOMPLETE'; END IF;
 INSERT INTO public.stellar_frontier_clan_claims_v370(clan_id,week_start,actor,credits)
 VALUES(cl.id,week,uid,125000) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'FRONTIER_CLAN_ALREADY_CLAIMED';END IF;
 UPDATE public.clans SET vault_credits=vault_credits+125000,updated_at=now() WHERE id=cl.id;
 RETURN jsonb_build_object('ok',true,'credits',125000,'week',week);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_frontier_craft_v370()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); tech public.stellar_frontier_ship_tech_v370; cost integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 INSERT INTO public.stellar_frontier_ship_tech_v370(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO tech FROM public.stellar_frontier_ship_tech_v370 WHERE user_id=uid FOR UPDATE;
 IF tech.level>=3 THEN RAISE EXCEPTION 'FRONTIER_TECH_MAX_LEVEL';END IF;
 cost:=CASE tech.level WHEN 1 THEN 5 ELSE 15 END;
 IF tech.shards<cost THEN RAISE EXCEPTION 'FRONTIER_INSUFFICIENT_SHARDS';END IF;
 UPDATE public.stellar_frontier_ship_tech_v370 SET level=level+1,shards=shards-cost,updated_at=now() WHERE user_id=uid;
 RETURN jsonb_build_object('ok',true,'level',tech.level+1,'spent',cost);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_frontier_state_v370()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); s jsonb; p date; r public.stellar_frontier_contracts_v370; row_json jsonb; contracts jsonb:='[]'::jsonb;
 cnt bigint; userlevel integer; tech public.stellar_frontier_ship_tech_v370; cid uuid; team_kills bigint:=0; team_claimed boolean:=false;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_SAVE_MISSING';END IF;
 userlevel:=coalesce((s#>>'{profile,level}')::integer,1);
 p:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 SELECT * INTO tech FROM public.stellar_frontier_ship_tech_v370 WHERE user_id=uid;
 FOR r IN SELECT * FROM public.stellar_frontier_contracts_v370 ORDER BY min_level,id LOOP
  IF r.task_kind='npc' THEN
   SELECT count(*) INTO cnt FROM public.stellar_npc_reward_ledger n
   WHERE n.user_id=uid AND n.npc_type=r.target_type AND n.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
  ELSE
   SELECT count(*) INTO cnt FROM public.stellar_ore_reward_ledger o
   WHERE o.user_id=uid AND o.resource=r.target_type AND o.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
  END IF;
  row_json:=jsonb_build_object('id',r.id,'title',r.title,'sector',r.sector,'minLevel',r.min_level,
   'kind',r.task_kind,'targetType',r.target_type,'count',least(cnt,r.target_count),'target',r.target_count,
   'credits',r.reward_credits,'stl',r.reward_stl,'shards',r.reward_shards,'unlocked',userlevel>=r.min_level,
   'enabled',r.enabled,'claimed',EXISTS(SELECT 1 FROM public.stellar_frontier_claims_v370 c WHERE c.user_id=uid AND c.contract_id=r.id AND c.week_start=p));
  contracts:=contracts||jsonb_build_array(row_json);
 END LOOP;
 SELECT cm.clan_id INTO cid FROM public.clan_members cm WHERE cm.user_id=uid;
 IF cid IS NOT NULL THEN
  SELECT count(*) INTO team_kills FROM public.stellar_npc_reward_ledger n
  JOIN public.clan_members cm ON cm.user_id=n.user_id
  WHERE cm.clan_id=cid AND n.npc_type IN ('bossVoidCorsair','bossNexusWarden','bossAstralReaper')
    AND n.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
  SELECT EXISTS(SELECT 1 FROM public.stellar_frontier_clan_claims_v370 c WHERE c.clan_id=cid AND c.week_start=p) INTO team_claimed;
 END IF;
 RETURN jsonb_build_object('ok',true,'week',p,'level',userlevel,'contracts',contracts,
 'tech',jsonb_build_object('level',coalesce(tech.level,1),'shards',coalesce(tech.shards,0),'nextCost',CASE coalesce(tech.level,1) WHEN 1 THEN 5 WHEN 2 THEN 15 ELSE 0 END),
 'clan',jsonb_build_object('kills',least(team_kills,8),'target',8,'claimed',team_claimed,'hasClan',cid IS NOT NULL),
 'serverTime',now());
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_grant_npc_reward_v1131(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_reward jsonb; v_kind text; v_chance numeric; v_qty integer; v_insert_count integer:=0;
 v_created boolean:=false; v_save jsonb; v_old integer; v_balance integer;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF p_user_id IS NULL OR p_kill_key IS NULL OR length(p_kill_key)>180 OR length(p_kill_key)<3
 THEN RAISE EXCEPTION 'NPC_REWARD_ID_INVALID'; END IF;
 v_reward:=public.stellar_grant_npc_reward_v228(p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl);
 IF NOT p_owner_eligible THEN RETURN v_reward; END IF;
 IF p_npc_type='apexOverlord' THEN v_kind:='apex';
 ELSIF p_kill_key ~ '^(earth|mars|jupiter):u[123]:' THEN v_kind:='universo';
 ELSE RETURN v_reward; END IF;
 SELECT chance INTO v_chance FROM public.stellar_aux_protocol_drop_rules_v1131 WHERE source=v_kind AND enabled=true;
 IF NOT FOUND THEN RETURN v_reward; END IF;
 IF coalesce((v_reward->>'granted')::boolean,false) THEN
  v_qty:=CASE WHEN random()<v_chance THEN 1 ELSE 0 END;
  INSERT INTO public.stellar_aux_protocol_drop_receipts_v1131(user_id,kill_key,npc_type,fragment_kind,qty)
   VALUES(p_user_id,p_kill_key,p_npc_type,v_kind,v_qty) ON CONFLICT(user_id,kill_key) DO NOTHING;
  GET DIAGNOSTICS v_insert_count=ROW_COUNT;
  v_created:=v_insert_count=1;
 END IF;
 SELECT fragment_kind,qty INTO v_kind,v_qty FROM public.stellar_aux_protocol_drop_receipts_v1131
 WHERE user_id=p_user_id AND kill_key=p_kill_key;
 IF NOT FOUND OR v_qty<>1 THEN RETURN v_reward; END IF;
 SELECT state INTO v_save FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF v_save IS NULL THEN RAISE EXCEPTION 'AUX_FRAGMENT_SAVE_MISSING'; END IF;
 v_old:=GREATEST(0,LEAST(1000000,coalesce((v_save#>>ARRAY['pet','advancedProtocolFragmentsV1131',v_kind])::integer,0)));
 IF v_created THEN
  IF v_old>=1000000 THEN RAISE EXCEPTION 'AUX_FRAGMENT_STOCK_LIMIT'; END IF;
  v_balance:=v_old+1;
  v_save:=jsonb_set(v_save,'{pet}',coalesce(v_save->'pet','{}'::jsonb),true);
  v_save:=jsonb_set(v_save,'{pet,advancedProtocolFragmentsV1131}',
   coalesce(v_save#>'{pet,advancedProtocolFragmentsV1131}','{}'::jsonb)||jsonb_build_object(v_kind,v_balance),true);
  UPDATE public.game_saves SET state=v_save,updated_at=now() WHERE user_id=p_user_id;
 ELSE v_balance:=v_old; END IF;
 RETURN v_reward||jsonb_build_object('protocolFragment',
  jsonb_build_object('kind',v_kind,'qty',1,'balance',v_balance));
END;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_grant_npc_reward_v228(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_state jsonb; v_profile jsonb; v_prior public.stellar_npc_reward_ledger%ROWTYPE;
 v_skills jsonb; v_greed int; v_c1 int; v_c2 int; v_bon_cr int; v_bon_stl int;
 v_cr bigint; v_stl bigint; v_balance_cr bigint; v_balance_stl bigint; v_rev bigint;
BEGIN
 IF p_user_id IS NULL OR p_kill_key IS NULL OR length(p_kill_key) NOT BETWEEN 12 AND 180 OR p_npc_type IS NULL OR length(p_npc_type)>80 OR
    p_base_credits IS NULL OR p_base_stl IS NULL OR p_base_credits<0 OR p_base_credits>75000000 OR p_base_stl<0 OR p_base_stl>750000
 THEN RAISE EXCEPTION 'NPC_REWARD_INVALID'; END IF;
 -- Serialized by player: simultaneous NPC kills, saves and purchases cannot claim twice.
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NPC_REWARD_SAVE_MISSING'; END IF;
 SELECT * INTO v_prior FROM public.stellar_npc_reward_ledger WHERE user_id=p_user_id AND kill_key=p_kill_key;
 IF FOUND THEN RETURN jsonb_build_object('granted',false,'credits',0,'stl',0,'revision',coalesce((v_state->>'serverNpcRewardRevision')::bigint,0),'kill_key',p_kill_key); END IF;
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_skills:=coalesce(v_state#>'{pilotBio,skills}','{}'::jsonb);
 v_greed:=greatest(0,least(5,coalesce((v_skills->>'greed')::int,0)));
 v_c1:=greatest(0,least(2,coalesce((v_skills->>'cruelty1')::int,0)));
 v_c2:=greatest(0,least(3,coalesce((v_skills->>'cruelty2')::int,0)));
 v_bon_cr:=(array[0,4,8,12,18,25])[v_greed+1];
 v_bon_stl:=(array[0,4,8])[v_c1+1]+(array[0,4,10,17])[v_c2+1];
 v_cr:=round(p_base_credits*(100+v_bon_cr)/100.0);
 v_stl:=round(p_base_stl*(100+v_bon_stl)/100.0);
 v_balance_cr:=coalesce((v_profile->>'credits')::bigint,0)+v_cr;
 v_balance_stl:=coalesce((v_profile->>'uridium')::bigint,0)+v_stl;
 v_rev:=coalesce((v_state->>'serverNpcRewardRevision')::bigint,0)+1;
 IF v_balance_cr>1000000000000 OR v_balance_stl>10000000000 OR v_rev>1000000000 THEN RAISE EXCEPTION 'NPC_REWARD_BALANCE_LIMIT'; END IF;
 INSERT INTO public.stellar_npc_reward_ledger(user_id,kill_key,npc_type,credits,stl)
 VALUES (p_user_id,p_kill_key,p_npc_type,v_cr,v_stl);
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(jsonb_set(v_state,'{profile,credits}',to_jsonb(v_balance_cr),true),'{profile,uridium}',to_jsonb(v_balance_stl),true),'{serverNpcRewardRevision}',to_jsonb(v_rev),true),updated_at=now() WHERE user_id=p_user_id;
 UPDATE public.profiles SET credits=v_balance_cr,uridium=v_balance_stl,updated_at=now() WHERE id=p_user_id;
 RETURN jsonb_build_object('granted',true,'credits',v_cr,'stl',v_stl,'revision',v_rev,'kill_key',p_kill_key);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'NPC_REWARD_INVALID_STATE';
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_grant_ore_reward_v229(p_user_id uuid, p_ore_key text, p_resource text, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_save jsonb;v_prior public.stellar_ore_reward_ledger%ROWTYPE;
 v_cargo jsonb;v_prev bigint;v_rev bigint;v_total bigint;
BEGIN
 IF p_user_id IS NULL OR length(trim(coalesce(p_ore_key,''))) NOT BETWEEN 8 AND 180
 OR length(trim(coalesce(p_resource,''))) NOT BETWEEN 2 AND 64
 OR NOT EXISTS (SELECT 1 FROM public.game_resource_config_v1814 r WHERE r.resource_key=p_resource AND r.enabled IS TRUE)
 OR p_amount NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'ORE_GRANT_INVALID'; END IF;
 SELECT state INTO v_save FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORE_GRANT_SAVE_MISSING'; END IF;
 SELECT * INTO v_prior FROM public.stellar_ore_reward_ledger WHERE user_id=p_user_id AND ore_key=p_ore_key;
 v_rev:=coalesce((v_save->>'serverOreRevision')::bigint,0);
 IF FOUND THEN RETURN jsonb_build_object('granted',false,'amount',0,'revision',v_rev,'resource',v_prior.resource); END IF;
 v_cargo:=coalesce(v_save->'cargo','{}'::jsonb);
 IF jsonb_typeof(v_cargo)<>'object' THEN RAISE EXCEPTION 'ORE_GRANT_CARGO_INVALID'; END IF;
 v_prev:=coalesce((v_cargo->>p_resource)::bigint,0);
 v_total:=v_prev+p_amount;
 IF v_total>1000000000 OR v_rev>=1000000000 THEN RAISE EXCEPTION 'ORE_GRANT_LIMIT'; END IF;
 INSERT INTO public.stellar_ore_reward_ledger(user_id,ore_key,resource,amount) VALUES(p_user_id,p_ore_key,p_resource,p_amount);
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(v_save,ARRAY['cargo',p_resource],to_jsonb(v_total),true),'{serverOreRevision}',to_jsonb(v_rev+1),true),updated_at=now() WHERE user_id=p_user_id;
 RETURN jsonb_build_object('granted',true,'amount',p_amount,'revision',v_rev+1,'resource',p_resource);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'ORE_GRANT_INVALID_STATE';
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_guard_elite_save_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if coalesce((new.state->>'serverEliteRevision')::bigint,0)<coalesce((old.state->>'serverEliteRevision')::bigint,0) then
   raise exception 'SAVE_ELITE_STALE';
 end if;
 return new;
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_guard_inventory_v226()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_group text; v_payload jsonb; v_item record; v_max numeric;
BEGIN
 IF auth.role()='service_role' THEN RETURN NEW; END IF;
 FOREACH v_group IN ARRAY ARRAY['inventory','ammo','rockets','cargo'] LOOP
  v_payload:=NEW.state->v_group;
  IF v_payload IS NULL THEN CONTINUE; END IF;
  IF jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'SECURITY_INVALID_INVENTORY_FORMAT'; END IF;
  v_max:=CASE WHEN v_group='ammo' THEN 1000000000000::numeric ELSE 1000000000::numeric END;
  FOR v_item IN SELECT key,value FROM jsonb_each(v_payload) LOOP
   IF jsonb_typeof(v_item.value)<>'number' THEN RAISE EXCEPTION 'SECURITY_INVALID_ITEM_TYPE'; END IF;
   IF (v_item.value#>>'{}')::numeric<0 OR (v_item.value#>>'{}')::numeric>v_max
      OR (v_item.value#>>'{}')::numeric<>trunc((v_item.value#>>'{}')::numeric) THEN
      RAISE EXCEPTION 'SECURITY_INVALID_ITEM_QUANTITY';
   END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'SECURITY_INVALID_ITEM_QUANTITY';
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_guard_npc_reward_revision_v228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE old_rev numeric; new_rev numeric;
BEGIN
 IF NEW.state ? 'serverNpcRewardRevision' AND jsonb_typeof(NEW.state->'serverNpcRewardRevision')<>'number' THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION'; END IF;
 new_rev:=coalesce((NEW.state->>'serverNpcRewardRevision')::numeric,0);
 IF new_rev<0 OR new_rev>1000000000 OR new_rev<>trunc(new_rev) THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION'; END IF;
 IF TG_OP='UPDATE' THEN
   old_rev:=coalesce((OLD.state->>'serverNpcRewardRevision')::numeric,0);
   IF new_rev<old_rev THEN RAISE EXCEPTION 'SAVE_NPC_STALE'; END IF;
   IF new_rev>old_rev+1 THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION'; END IF;
 END IF;
 RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION';
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_guard_ore_reward_revision_v229()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_new numeric;v_old numeric;
BEGIN
 IF NEW.state ? 'serverOreRevision' AND jsonb_typeof(NEW.state->'serverOreRevision')<>'number' THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION'; END IF;
 v_new:=coalesce((NEW.state->>'serverOreRevision')::numeric,0);
 IF v_new<0 OR v_new>1000000000 OR v_new<>trunc(v_new) THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION'; END IF;
 IF TG_OP='UPDATE' THEN
 v_old:=coalesce((OLD.state->>'serverOreRevision')::numeric,0);
 IF v_new<v_old THEN RAISE EXCEPTION 'SAVE_ORE_STALE';END IF;
 IF v_new>v_old+1 THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION';END IF;
 END IF;
 RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION';
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_guard_purchase_revision_v227()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE old_rev numeric; new_rev numeric;
BEGIN
  IF NEW.state IS NULL OR jsonb_typeof(NEW.state)<>'object' THEN RAISE EXCEPTION 'SECURITY_SAVE_INVALID'; END IF;
  IF NEW.state ? 'serverPurchaseRevision' AND jsonb_typeof(NEW.state->'serverPurchaseRevision')<>'number' THEN RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID'; END IF;
  new_rev:=COALESCE((NEW.state->>'serverPurchaseRevision')::numeric,0);
  IF new_rev<0 OR new_rev>1000000000 OR new_rev<>trunc(new_rev) THEN RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID'; END IF;
  IF TG_OP='UPDATE' THEN
    old_rev:=COALESCE((OLD.state->>'serverPurchaseRevision')::numeric,0);
    IF new_rev<old_rev THEN RAISE EXCEPTION 'SAVE_ECONOMY_STALE'; END IF;
    IF new_rev>old_rev+1 THEN RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID'; END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID';
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_guard_saves_antifraud_v226()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_credits numeric;v_stl numeric;v_old_credits numeric;v_old_stl numeric;
BEGIN
 IF new.state IS NULL OR jsonb_typeof(new.state)<>'object' THEN RAISE EXCEPTION 'SECURITY_SAVE_INVALID'; END IF;
 IF new.state ? 'accountOwnerId' AND nullif(new.state->>'accountOwnerId','') IS NOT NULL
    AND new.state->>'accountOwnerId' <> new.user_id::text THEN RAISE EXCEPTION 'SECURITY_OWNER_MISMATCH'; END IF;
 IF auth.role() = 'service_role' THEN RETURN new; END IF;
 IF coalesce(new.state->'profile','{}'::jsonb) ? 'credits' THEN
  IF jsonb_typeof(new.state#>'{profile,credits}') <> 'number' THEN RAISE EXCEPTION 'SECURITY_CREDITS_FORMAT'; END IF;
 END IF;
 IF coalesce(new.state->'profile','{}'::jsonb) ? 'uridium' THEN
  IF jsonb_typeof(new.state#>'{profile,uridium}') <> 'number' THEN RAISE EXCEPTION 'SECURITY_STL_FORMAT'; END IF;
 END IF;
 v_credits:=coalesce((new.state#>>'{profile,credits}')::numeric,0);
 v_stl:=coalesce((new.state#>>'{profile,uridium}')::numeric,0);
 IF v_credits<0 OR v_credits>1000000000000 OR v_stl<0 OR v_stl>10000000000 THEN RAISE EXCEPTION 'SECURITY_BALANCE_RANGE'; END IF;
 IF TG_OP='UPDATE' THEN
  IF old.state IS NOT NULL THEN
   v_old_credits:=coalesce((old.state#>>'{profile,credits}')::numeric,0);
   v_old_stl:=coalesce((old.state#>>'{profile,uridium}')::numeric,0);
   IF v_credits-v_old_credits>100000000 OR v_stl-v_old_stl>1000000 THEN
     RAISE EXCEPTION 'SECURITY_UNVERIFIED_BALANCE_INCREASE';
   END IF;
  END IF;
 END IF;
 RETURN new;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
 RAISE EXCEPTION 'SECURITY_INVALID_ECONOMY_FORMAT';
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_natal_action_v132(p_user_id uuid, p_key text, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE s jsonb; old jsonb; r jsonb:='{}'; reward jsonb:='{}'; d jsonb; cfg record; player record; faction text; n bigint; b bigint; step int; goals jsonb; v record; roll numeric; total numeric; qty int; cores int:=0; result jsonb; at timestamptz:=clock_timestamp(); target text; price bigint; action_key text;
BEGIN
 IF p_user_id IS NULL OR length(p_key)>240 OR length(p_key)<1 THEN RAISE EXCEPTION 'Operação inválida';END IF;
 SELECT * INTO cfg FROM stellar_natal_config_v132 WHERE id=1;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,132));
 SELECT state INTO s FROM game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF s IS NULL THEN RAISE EXCEPTION 'Save não encontrado';END IF;
 SELECT receipt INTO old FROM stellar_natal_actions_v132 WHERE user_id=p_user_id AND key=p_key;
 IF FOUND THEN RETURN old||jsonb_build_object('ok',true,'replayed',true,'state',s);END IF;
 IF NOT cfg.enabled OR at<cfg.starts_at OR at>=cfg.ends_at THEN RAISE EXCEPTION 'Temporada encerrada';END IF;
 faction:=coalesce(s#>>'{profile,faction}','earth');
 INSERT INTO stellar_natal_players_v132(user_id,faction) VALUES(p_user_id,faction) ON CONFLICT DO NOTHING;
 SELECT * INTO player FROM stellar_natal_players_v132 WHERE user_id=p_user_id FOR UPDATE;
 IF p_action='coupon' THEN
  IF p_key<>'coupon:NATALESTELAR' THEN RAISE EXCEPTION 'Cupom inválido';END IF;
  reward:='{"credits":10000000,"uridium":10000,"cores":5,"fireworks":10}';
 ELSIF p_action='mission' THEN
  SELECT definition INTO d FROM stellar_natal_rewards_v132 WHERE id=p_key AND id LIKE 'mission:%';
  IF d IS NULL OR player.npc<(d->>'npc')::int OR player.box<(d->>'box')::int OR player.boss<(d->>'boss')::int THEN RAISE EXCEPTION 'Missão incompleta';END IF;
  reward:=d->'reward';
 ELSIF p_action IN ('faction','global') THEN
  IF p_key !~ ('^'||p_action||':[123]$') THEN RAISE EXCEPTION 'Etapa inválida';END IF;
  step:=split_part(p_key,':',2)::int;
  IF player.npc<20 AND player.box<10 THEN RAISE EXCEPTION 'Participe: 20 NPCs ou 10 boxes';END IF;
  SELECT count(*) FILTER(WHERE kind='npc'),count(*) FILTER(WHERE kind='box') INTO n,b FROM stellar_natal_counts_v132 c WHERE p_action='global' OR c.faction=player.faction;
  IF p_action='faction' THEN goals:=cfg.goals->player.faction;
  ELSE SELECT jsonb_build_object('npc',jsonb_build_array(sum((value#>>'{npc,0}')::bigint),sum((value#>>'{npc,1}')::bigint),sum((value#>>'{npc,2}')::bigint)),'box',jsonb_build_array(sum((value#>>'{box,0}')::bigint),sum((value#>>'{box,1}')::bigint),sum((value#>>'{box,2}')::bigint))) INTO goals FROM jsonb_each(cfg.goals);END IF;
  IF n<(goals->'npc'->>(step-1))::bigint OR b<(goals->'box'->>(step-1))::bigint THEN RAISE EXCEPTION 'Meta coletiva incompleta';END IF;
  reward:=jsonb_build_object('credits',step*2000000,'uridium',step*1500,'cores',step,'fireworks',step*3);
  IF p_action='global' AND step=3 THEN s:=jsonb_set(s,'{natalTitleV132}','"Guardião do Natal 2026"');END IF;
  IF p_action='faction' AND step=3 THEN s:=jsonb_set(s,'{natalBadgeV132}',to_jsonb(player.faction));END IF;
 ELSIF p_action='fire' THEN
  IF player.fireworks<1 THEN RAISE EXCEPTION 'Sem cargas de fogos';END IF;
  IF player.last_firework IS NOT NULL AND at<player.last_firework+interval '5 seconds' THEN RAISE EXCEPTION 'Aguarde o fogo anterior';END IF;
  UPDATE stellar_natal_players_v132 SET fireworks=fireworks-1,last_firework=at WHERE user_id=p_user_id;
  r:=jsonb_build_object('ok',true,'launched_at',at,'fireworks',player.fireworks-1);
  INSERT INTO stellar_natal_actions_v132(user_id,key,receipt) VALUES(p_user_id,p_key,r);RETURN r;
 ELSIF p_action='box' THEN
  IF p_key NOT LIKE 'box:%' THEN RAISE EXCEPTION 'Box inválida';END IF;
  -- One shared box can only be credited to one player, even across workers.
  INSERT INTO stellar_natal_counts_v132(key,faction,kind) VALUES(p_key,player.faction,'box') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'Box já coletada';END IF;
  SELECT config->'rewards' INTO d FROM bonus_box_config_v1825 WHERE id=1;
  SELECT sum((value->>'weight')::numeric) INTO total FROM jsonb_array_elements(d) WHERE (value->>'weight')::numeric>0;
  IF coalesce(total,0)<=0 THEN RAISE EXCEPTION 'Tabela de boxes indisponível';END IF;
  roll:=random()*total;
  FOR v IN SELECT value FROM jsonb_array_elements(d) WHERE (value->>'weight')::numeric>0 LOOP roll:=roll-(v.value->>'weight')::numeric;EXIT WHEN roll<0;END LOOP;
  qty:=2*((v.value->>'min')::int+floor(random()*((v.value->>'max')::int-(v.value->>'min')::int+1))::int);
  roll:=random();cores:=CASE WHEN roll<.01 THEN 2 WHEN roll<.05 THEN 1 ELSE 0 END;
  reward:=jsonb_build_object('cores',cores);
  IF v.value->>'kind'='ammo' THEN s:=jsonb_set(s,'{ammo}',coalesce(s->'ammo','{}')||jsonb_build_object(v.value->>'id',coalesce((s#>>ARRAY['ammo',v.value->>'id'])::bigint,0)+qty));
  ELSIF v.value->>'kind'='stellarDust' THEN s:=jsonb_set(s,'{stellarDust}',to_jsonb(coalesce((s->>'stellarDust')::bigint,0)+qty));
  ELSIF v.value->>'kind' IN ('credits','uridium') THEN reward:=reward||jsonb_build_object(v.value->>'kind',qty);
  ELSE RAISE EXCEPTION 'Tipo de prêmio desconhecido';END IF;
  r:=jsonb_build_object('kind',v.value->>'kind','item',v.value->>'id','qty',qty,'cores',cores);
  UPDATE stellar_natal_players_v132 SET box=box+1 WHERE user_id=p_user_id;
 ELSIF p_action='design' THEN
  SELECT definition INTO d FROM stellar_natal_rewards_v132 WHERE id=p_key AND id LIKE 'design:%';
  IF d IS NULL THEN RAISE EXCEPTION 'Designer inválido';END IF;
  target:=d#>>'{eligibility,ship_id}';
  IF NOT coalesce(s->'ownedShips','[]') ? target THEN RAISE EXCEPTION 'Adquira a nave primeiro';END IF;
  IF d#>>'{eligibility,source}'='december_pass' THEN RAISE EXCEPTION 'Exclusivo do passe de dezembro';END IF;
  price:=(d->>'price')::bigint;
  IF coalesce((s#>>'{profile,uridium}')::bigint,0)<price THEN RAISE EXCEPTION 'STL insuficiente';END IF;
  IF EXISTS(SELECT 1 FROM player_design_inventory_v16 WHERE user_id=p_user_id AND design_id=d->>'design_id' AND quantity>0) THEN RAISE EXCEPTION 'Designer já adquirido';END IF;
  s:=jsonb_set(s,'{profile,uridium}',to_jsonb((s#>>'{profile,uridium}')::bigint-price));
  INSERT INTO player_design_inventory_v16(user_id,design_id,quantity) VALUES(p_user_id,d->>'design_id',1) ON CONFLICT(user_id,design_id) DO UPDATE SET quantity=greatest(player_design_inventory_v16.quantity,1);
 ELSIF p_action='pass' THEN
  IF at<'2026-12-01 03:00Z' OR at>='2027-01-01 03:00Z' OR s#>>'{battlePass,season}'<>'2026-12' THEN RAISE EXCEPTION 'Passe exclusivo de dezembro';END IF;
  step:=CASE p_key WHEN 'pass:cristal' THEN 15 WHEN 'pass:vulcao' THEN 30 ELSE 999 END;
  IF coalesce((s#>>'{battlePass,points}')::bigint,0)<step*450 OR step=999 THEN RAISE EXCEPTION 'Tier do passe bloqueado';END IF;
  target:=CASE step WHEN 15 THEN 'n132_spearhead_cristal' ELSE 'n132_yamato_vulcao' END;
  INSERT INTO player_design_inventory_v16(user_id,design_id,quantity) VALUES(p_user_id,target,1) ON CONFLICT(user_id,design_id) DO UPDATE SET quantity=greatest(player_design_inventory_v16.quantity,1);
 ELSE RAISE EXCEPTION 'Ação inválida';END IF;
 s:=jsonb_set(s,'{profile}',coalesce(s->'profile','{}')||jsonb_build_object('credits',coalesce((s#>>'{profile,credits}')::bigint,0)+coalesce((reward->>'credits')::bigint,0),'uridium',coalesce((s#>>'{profile,uridium}')::bigint,0)+coalesce((reward->>'uridium')::bigint,0)));
 s:=jsonb_set(s,'{pilotBio}',coalesce(s->'pilotBio','{}')||jsonb_build_object('logDisks',coalesce((s#>>'{pilotBio,logDisks}')::bigint,0)+coalesce((reward->>'cores')::bigint,0)));
 UPDATE stellar_natal_players_v132 SET fireworks=fireworks+coalesce((reward->>'fireworks')::int,0) WHERE user_id=p_user_id;
 s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(coalesce((s->>'serverPurchaseRevision')::bigint,0)+1));
 result:=public.stellar_commit_player_save_v118(p_user_id,s,at,s#>>'{profile,callsign}');
 IF coalesce((result->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Save natalino não confirmado';END IF;
 r:=r||jsonb_build_object('ok',true,'reward',reward);
 INSERT INTO stellar_natal_actions_v132(user_id,key,receipt) VALUES(p_user_id,p_key,r);
 RETURN r||jsonb_build_object('state',s,'updated_at',at);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_natal_design_guard_v132()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE ship text; target text;
BEGIN
 IF NEW.ship_design_id IS NULL THEN RETURN NEW;END IF;
 SELECT state->>'activeShipId' INTO ship FROM public.game_saves WHERE user_id=NEW.user_id;
 SELECT eligibility->>'ship_id' INTO target FROM public.live_designs_v16 WHERE design_id=NEW.ship_design_id;
 IF target IS DISTINCT FROM ship THEN RAISE EXCEPTION 'Designer exclusivo de outra nave.'; END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_natal_npc_v132(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r jsonb; f text; inserted int;
BEGIN
 r:=public.stellar_grant_npc_reward_v1131(p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl,p_owner_eligible);
 IF p_npc_type NOT IN ('natalFloco','natalNevasca','natalGlacial','natalRei') THEN RETURN r;END IF;
 SELECT state#>>'{profile,faction}' INTO f FROM game_saves WHERE user_id=p_user_id;
 INSERT INTO stellar_natal_players_v132(user_id,faction) VALUES(p_user_id,coalesce(f,'earth')) ON CONFLICT DO NOTHING;
 INSERT INTO stellar_natal_actions_v132(user_id,key) VALUES(p_user_id,'npc:'||p_kill_key) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=1 THEN
 UPDATE stellar_natal_players_v132 SET npc=npc+1,boss=boss+CASE WHEN p_npc_type='natalRei' THEN 1 ELSE 0 END WHERE user_id=p_user_id;
 IF p_owner_eligible THEN INSERT INTO stellar_natal_counts_v132(key,faction,kind) SELECT 'npc:'||p_kill_key,faction,'npc' FROM stellar_natal_players_v132 WHERE user_id=p_user_id ON CONFLICT DO NOTHING;END IF;
 END IF;
 RETURN r;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_natal_remember_design_v132()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE target text;
BEGIN
 IF NEW.ship_design_id IS NOT NULL THEN
 SELECT eligibility->>'ship_id' INTO target FROM live_designs_v16 WHERE design_id=NEW.ship_design_id;
 INSERT INTO stellar_ship_design_selection_v132 VALUES(NEW.user_id,target,NEW.ship_design_id) ON CONFLICT(user_id,ship_id) DO UPDATE SET design_id=excluded.design_id;
 ELSIF TG_OP='UPDATE' AND OLD.ship_design_id IS NOT NULL THEN
 DELETE FROM stellar_ship_design_selection_v132 d USING game_saves s,live_designs_v16 l WHERE s.user_id=NEW.user_id AND d.user_id=NEW.user_id AND l.design_id=OLD.ship_design_id AND d.ship_id=l.eligibility->>'ship_id' AND d.ship_id=s.state->>'activeShipId';
 END IF;RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_natal_status_v132(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT jsonb_build_object('config',(SELECT to_jsonb(c) FROM stellar_natal_config_v132 c WHERE id=1),'player',(SELECT to_jsonb(p) FROM stellar_natal_players_v132 p WHERE user_id=p_user_id),'counts',(SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT faction,kind,count(*) qty FROM stellar_natal_counts_v132 GROUP BY faction,kind) t),'claims',(SELECT coalesce(jsonb_agg(key),'[]') FROM stellar_natal_actions_v132 WHERE user_id=p_user_id AND key NOT LIKE 'box:%' AND key NOT LIKE 'npc:%' AND key NOT LIKE 'fire:%'));
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_natal_switch_ship_v132()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE selected text;
BEGIN
 IF NEW.state->>'activeShipId' IS DISTINCT FROM OLD.state->>'activeShipId' THEN
 SELECT d.design_id INTO selected FROM stellar_ship_design_selection_v132 d JOIN player_design_inventory_v16 i ON i.user_id=d.user_id AND i.design_id=d.design_id AND i.quantity>0 WHERE d.user_id=NEW.user_id AND d.ship_id=NEW.state->>'activeShipId';
 UPDATE player_design_loadout_v16 SET ship_design_id=selected WHERE user_id=NEW.user_id;
 END IF;RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_observe_save_v133()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF TG_OP='UPDATE' AND NEW.state IS NOT DISTINCT FROM OLD.state THEN RETURN NEW;END IF;
 INSERT INTO public.stellar_save_clock_v133(user_id,revision,updated_at,writer) VALUES(NEW.user_id,1,clock_timestamp(),coalesce(nullif(current_setting('stellar.writer',true),''),'legacy_rpc'))
 ON CONFLICT(user_id) DO UPDATE SET revision=public.stellar_save_clock_v133.revision+1,updated_at=excluded.updated_at,writer=excluded.writer;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_cancel_v484(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO s FROM public.stellar_offline_farm_v484 WHERE user_id=p_user AND status='running' FOR UPDATE;
 IF s.id IS NULL THEN RETURN jsonb_build_object('ok',true,'status','none'); END IF;
 UPDATE public.stellar_offline_farm_v484 SET status='cancelled',completed_at=now(),report='{"reason":"cancelled","kills":0}'::jsonb WHERE id=s.id;
 RETURN jsonb_build_object('ok',true,'status','cancelled');
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v1111(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f public.stellar_offline_farm_v484%rowtype;
 sv record; p record; original_profile_at timestamptz;
 ledger_activity boolean; same_economy boolean; midnight_change boolean;
 eligible boolean:=false; v_recovery text; result jsonb; midnight_local timestamp;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484
 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status <> 'running' THEN
   RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report);
 END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at,credits,uridium,xp,aliens_killed INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL OR p.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 original_profile_at:=(f.snapshot->>'profile_updated_at')::timestamptz;
 IF sv.updated_at IS NOT DISTINCT FROM f.baseline_save_at AND p.updated_at IS NOT DISTINCT FROM original_profile_at THEN
   RETURN public.stellar_offline_farm_claim_v49(p_user);
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
 OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
 INTO ledger_activity;
 IF ledger_activity THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_ONLINE_REWARDS'; END IF;
 same_economy :=
   p.credits IS NOT DISTINCT FROM (sv.state#>>'{profile,credits}')::bigint
   AND p.uridium IS NOT DISTINCT FROM (sv.state#>>'{profile,uridium}')::bigint
   AND p.xp IS NOT DISTINCT FROM (sv.state#>>'{profile,xp}')::bigint
   AND p.aliens_killed IS NOT DISTINCT FROM (sv.state#>>'{profile,aliensKilled}')::bigint;
 IF NOT same_economy THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_ECONOMY_DESYNC'; END IF;
 midnight_local:=sv.updated_at AT TIME ZONE 'America/Sao_Paulo';
 midnight_change :=
   sv.updated_at=p.updated_at
   AND midnight_local>=date_trunc('day',midnight_local)
   AND midnight_local<date_trunc('day',midnight_local)+interval '2 seconds'
   AND sv.updated_at>=f.started_at AND sv.updated_at<=f.ends_at;
 IF f.snapshot ? 'recovery_fingerprint_v1111' THEN
   eligible := public.stellar_offline_farm_fingerprint_v1111(sv.state)=f.snapshot->>'recovery_fingerprint_v1111';
   v_recovery:='economy_unchanged_v1111';
   -- Um sincronismo diário legítimo pode alterar somente o hash do save
   -- enquanto o jogador está em Farm Offline. Os controles logo acima
   -- já impedem recompensas online e divergências de saldo.
   -- Só reconhecer sync simultâneo de save+perfil nos 2s iniciais
   -- da meia-noite de São Paulo, dentro da sessão deste Farm.
   if not eligible and midnight_change is true
      and ledger_activity is false and same_economy is true
      and sv.updated_at=p.updated_at
   then
     eligible:=true;
     v_recovery:='verified_midnight_sync_v1181';
   end if;
 ELSE
   eligible := midnight_change;
   v_recovery:='legacy_midnight_sync_v1111';
 END IF;
 
 IF NOT eligible
   AND f.id='cbfb4535-d1d3-4021-a47a-9c38a2112543'::uuid
   AND f.user_id='7fe74c4a-7fdd-4c41-ab06-07eda2a3c0d5'::uuid
   AND f.started_at='2026-11-02T00:56:37.119639Z'::timestamptz
   AND f.ends_at='2026-11-02T08:56:37.119639Z'::timestamptz
   AND now()>=f.ends_at
   AND midnight_change IS TRUE
   AND ledger_activity IS FALSE
   AND same_economy IS TRUE
   AND sv.updated_at=p.updated_at
 THEN
  eligible:=true;
  v_recovery:='felp22_verified_midnight_sync_20261102';
 END IF;

 IF NOT eligible THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_UNVERIFIED_CHANGE'; END IF;
 IF NOT (f.snapshot ? 'recovery_fingerprint_v1111') AND now()<f.ends_at THEN
   RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_WAIT_END';
 END IF;
 UPDATE public.stellar_offline_farm_v484 SET
   baseline_save_at=sv.updated_at,
   snapshot=jsonb_set(snapshot,'{profile_updated_at}',to_jsonb(p.updated_at::text),true)
 WHERE id=f.id AND status='running';
 result:=public.stellar_offline_farm_claim_v49(p_user);
 IF result->>'status' <> 'settled' THEN RAISE EXCEPTION 'FARM_RECOVERY_NOT_SETTLED'; END IF;
 UPDATE public.stellar_offline_farm_v484 SET report=report ||
  jsonb_build_object('recovery_v1111',v_recovery,'original_save_baseline',f.baseline_save_at,
   'original_profile_baseline',original_profile_at)
 WHERE id=f.id AND status='settled';
 RETURN result || jsonb_build_object('recovered',true,'recovery_reason',v_recovery);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v484(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb);
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   IF ammo_qty < shots THEN
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Mesmo estoque oficial e preço do snapshot salvo. Sem compra de STL.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END IF;
   IF elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end);
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v487(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 IF f.snapshot->>'combat_model'='v487' THEN
   shots:=greatest(1,least(320000,coalesce((f.snapshot->>'ammo_per_kill')::integer,0)));
   kill_seconds:=greatest(1,least(30000,coalesce((f.snapshot->>'combat_kill_seconds')::integer,30000)));
   capacity:=greatest(100,least(15000,coalesce((f.snapshot->>'cargo_capacity')::bigint,1500)));
   trip_seconds:=greatest(45,least(600,ceil(trip_seconds*350.0/greatest(100,(f.snapshot->>'ship_speed')::numeric))::integer));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb);
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   WHILE ammo_qty < shots LOOP
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price OR bought>=100 THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Cada pacote exige uma viagem virtual com débito oficial de créditos.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END LOOP;
   IF ammo_qty<shots OR elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end,'npc_name',coalesce(f.snapshot->>'npc_name',(SELECT name FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key)),'combat_model',coalesce(f.snapshot->>'combat_model','v485'),'laser_count',coalesce((f.snapshot->>'laser_count')::integer,0),'ammo_per_kill',shots,'move_seconds',coalesce((f.snapshot->>'move_between_seconds')::integer,0));
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v49(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
 sale_limit bigint:=9223372036854775807; orig_remaining jsonb:='{}'::jsonb; sale_from_prior bigint:=0; orig_part bigint:=0;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 IF f.snapshot->>'combat_model'='v487' THEN
   shots:=greatest(1,least(320000,coalesce((f.snapshot->>'ammo_per_kill')::integer,0)));
   kill_seconds:=greatest(1,least(30000,coalesce((f.snapshot->>'combat_kill_seconds')::integer,30000)));
   capacity:=greatest(100,least(15000,coalesce((f.snapshot->>'cargo_capacity')::bigint,1500)));
   trip_seconds:=greatest(45,least(600,ceil(trip_seconds*350.0/greatest(100,(f.snapshot->>'ship_speed')::numeric))::integer));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb); orig_remaining:=cargo;
 IF f.snapshot->>'economic_model'='v49' THEN sale_limit:=greatest(0,least(1000000000000,coalesce((f.snapshot->>'max_sale_credits')::bigint,30000000))); END IF;
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   WHILE ammo_qty < shots LOOP
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price OR bought>=100 THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Cada pacote exige uma viagem virtual com débito oficial de créditos.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END LOOP;
   IF ammo_qty<shots OR elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       IF f.snapshot->>'economic_model'='v49' AND sale_cr + q*v_price > sale_limit THEN
         reason:='sale_limit_reached';EXIT;
       END IF;
       orig_part:=least(q,greatest(0,coalesce((orig_remaining->>res.key)::bigint,0)));
       orig_remaining:=jsonb_set(orig_remaining,ARRAY[res.key],to_jsonb(greatest(0,coalesce((orig_remaining->>res.key)::bigint,0)-orig_part)),true);
       sale_from_prior:=sale_from_prior+orig_part*v_price;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
     IF reason='sale_limit_reached' THEN EXIT; END IF;
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'starting_cargo_sale_credits',sale_from_prior,'farm_generated_sale_credits',sale_cr-sale_from_prior,'audit_sale_cap',CASE WHEN f.snapshot->>'economic_model'='v49' THEN sale_limit ELSE NULL END,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end,'npc_name',coalesce(f.snapshot->>'npc_name',(SELECT name FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key)),'combat_model',coalesce(f.snapshot->>'combat_model','v485'),'laser_count',coalesce((f.snapshot->>'laser_count')::integer,0),'ammo_per_kill',shots,'move_seconds',coalesce((f.snapshot->>'move_between_seconds')::integer,0));
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_fingerprint_v1111(s jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT md5(jsonb_build_object(
  'profile',s->'profile','ammo',s->'ammo','rockets',s->'rockets',
  'cargo',s->'cargo','inventory',s->'inventory',
  'shipLoadout',s->'shipLoadout','drones',s->'drones','pet',s->'pet',
  'serverNpcRewardRevision',s->'serverNpcRewardRevision',
  'serverOreRevision',s->'serverOreRevision',
  'serverPurchaseRevision',s->'serverPurchaseRevision')::text);
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v1111(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r jsonb; sv record;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 r:=public.stellar_offline_farm_start_v49(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key,p_combat,p_baseline_save_at);
 IF r->>'status' <> 'running' THEN RETURN r; END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user;
 IF sv.state IS NULL OR sv.updated_at IS DISTINCT FROM p_baseline_save_at THEN
  RAISE EXCEPTION 'FARM_SAVE_CHANGED_DURING_START';
 END IF;
 UPDATE public.stellar_offline_farm_v484
 SET snapshot=jsonb_set(snapshot,'{recovery_fingerprint_v1111}',to_jsonb(public.stellar_offline_farm_fingerprint_v1111(sv.state)),true)
 WHERE id=(r->>'id')::uuid AND user_id=p_user AND status='running';
 IF NOT FOUND THEN RAISE EXCEPTION 'FARM_START_NOT_COMMITTED'; END IF;
 RETURN r;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v484(p_user uuid, p_minutes integer, p_auto_sell boolean DEFAULT true, p_auto_buy boolean DEFAULT true, p_mine boolean DEFAULT true, p_npc_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record; c record; q record; v_npc record; v_map text; v_ammo text; v_id uuid; v_level integer;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF p_minutes NOT IN (60,120,240) THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=p_user AND status='running') THEN RAISE EXCEPTION 'FARM_ALREADY_RUNNING'; END IF;
 SELECT state,updated_at INTO s FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO c FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF c.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_PROFILE_MISSING'; END IF;
 IF s.state IS NULL OR s.state->'profile' IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 v_map:=s.state->>'mapId'; v_ammo:=coalesce(nullif(s.state->>'selectedLaserAmmo',''),'lcb10');
 v_level:=greatest(1,least(50,coalesce((s.state#>>'{profile,level}')::integer,1)));
 IF v_map !~ '^x[1-8]$' OR coalesce(s.state->>'repairRequired','false') NOT IN ('false','null') THEN RAISE EXCEPTION 'FARM_MAP_OR_REPAIR_UNSUPPORTED'; END IF;
 IF v_level < (CASE v_map WHEN 'x1' THEN 1 WHEN 'x2' THEN 3 WHEN 'x3' THEN 5 WHEN 'x4' THEN 7 WHEN 'x5' THEN 9 WHEN 'x6' THEN 12 WHEN 'x7' THEN 15 WHEN 'x8' THEN 18 ELSE 99 END)
 THEN RAISE EXCEPTION 'FARM_LEVEL_INSUFFICIENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_autopilot_access_v48 a WHERE a.user_id=p_user AND a.enabled=true AND (a.expires_at IS NULL OR a.expires_at>now()))
   AND NOT EXISTS(SELECT 1 FROM public.game_admins WHERE user_id=p_user) THEN
   RAISE EXCEPTION 'FARM_ACCESS_REQUIRED';
 END IF;
 SELECT n.npc_key,n.hp,n.shield,n.credits,n.stl,n.xp,n.resources INTO v_npc
 FROM public.game_map_npc_spawns_v1811 m
 JOIN public.game_npc_config_v1811 n ON n.npc_key=m.npc_key
 WHERE m.map_id=v_map AND m.enabled=true AND n.enabled=true AND n.npc_key !~* '^(boss|rift|elite)' AND coalesce(m.spawn_count,0)>0 AND (p_npc_key IS NULL OR n.npc_key=p_npc_key)
 ORDER BY n.hp+n.shield ASC,n.npc_key ASC LIMIT 1;
 IF v_npc.npc_key IS NULL THEN RAISE EXCEPTION 'FARM_NO_ELIGIBLE_NPCS'; END IF;
 -- Munição apenas de crédito; STL/premium é consumido se houver estoque, nunca comprado aqui.
 SELECT catalog_key,price,currency,(meta#>>'{grant,qty}')::integer AS qty INTO q FROM public.live_shop_prices_v16
 WHERE kind='ammo' AND ref_id=v_ammo AND enabled=true AND shop_visible=true LIMIT 1;
 INSERT INTO public.stellar_offline_farm_v484(user_id,map_id,npc_key,ammo_key,minutes,auto_sell,auto_buy,mine,snapshot,baseline_save_at,ends_at)
 VALUES(p_user,v_map,v_npc.npc_key,v_ammo,p_minutes,coalesce(p_auto_sell,true),coalesce(p_auto_buy,true),coalesce(p_mine,true),
 jsonb_build_object('npc',to_jsonb(v_npc),'level',v_level,'profile_updated_at',c.updated_at,'shop',CASE WHEN q.catalog_key IS NOT NULL THEN to_jsonb(q) ELSE '{}'::jsonb END),s.updated_at,now()+make_interval(mins=>p_minutes))
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'id',v_id,'status','running','map',v_map,'npc',v_npc.npc_key,'minutes',p_minutes,'ends_at',(SELECT ends_at FROM public.stellar_offline_farm_v484 WHERE id=v_id));
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v485(p_user uuid, p_minutes integer, p_auto_sell boolean DEFAULT true, p_auto_buy boolean DEFAULT true, p_mine boolean DEFAULT true, p_npc_key text DEFAULT NULL::text, p_ammo_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record; c record; q record; cfg record; v_npc record; v_map text; v_ammo text; v_id uuid; v_level integer; v_factor numeric; v_damage numeric;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT max_minutes,damage_percent,max_kills,travel_seconds INTO STRICT cfg FROM public.stellar_offline_farm_settings_v485 WHERE id=1;
 IF p_minutes < 30 OR p_minutes > cfg.max_minutes OR p_minutes % 30 <> 0 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=p_user AND status='running') THEN RAISE EXCEPTION 'FARM_ALREADY_RUNNING'; END IF;
 SELECT state,updated_at INTO s FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO c FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF c.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_PROFILE_MISSING'; END IF;
 IF s.state IS NULL OR s.state->'profile' IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 v_map:=s.state->>'mapId'; v_ammo:=coalesce(nullif(p_ammo_key,''),nullif(s.state->>'selectedLaserAmmo',''),'lcb10');
 IF v_ammo NOT IN ('lcb10','mcb25','mcb50','ucb100') THEN RAISE EXCEPTION 'INVALID_AMMO'; END IF;
 v_level:=greatest(1,least(50,coalesce((s.state#>>'{profile,level}')::integer,1)));
 IF v_map !~ '^x[1-8]$' OR coalesce(s.state->>'repairRequired','false') NOT IN ('false','null') THEN RAISE EXCEPTION 'FARM_MAP_OR_REPAIR_UNSUPPORTED'; END IF;
 IF v_level < (CASE v_map WHEN 'x1' THEN 1 WHEN 'x2' THEN 3 WHEN 'x3' THEN 5 WHEN 'x4' THEN 7 WHEN 'x5' THEN 9 WHEN 'x6' THEN 12 WHEN 'x7' THEN 15 WHEN 'x8' THEN 18 ELSE 99 END)
 THEN RAISE EXCEPTION 'FARM_LEVEL_INSUFFICIENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_offline_farm_access_v488 a WHERE a.user_id=p_user AND a.enabled=true AND (a.expires_at IS NULL OR a.expires_at>now()) AND (a.max_minutes IS NULL OR p_minutes<=a.max_minutes))
   AND NOT EXISTS(SELECT 1 FROM public.game_admins WHERE user_id=p_user) THEN
   RAISE EXCEPTION 'FARM_ACCESS_REQUIRED';
 END IF;
 SELECT n.npc_key,n.hp,n.shield,n.credits,n.stl,n.xp,n.resources INTO v_npc
 FROM public.game_map_npc_spawns_v1811 m
 JOIN public.game_npc_config_v1811 n ON n.npc_key=m.npc_key
 WHERE m.map_id=v_map AND m.enabled=true AND n.enabled=true AND n.npc_key !~* '(boss|rift|elite|suprem|legend|lend|uber|ultra|titan)' AND n.name !~* '(boss|suprem|legend|lend|elite|uber|ultra)' AND coalesce(m.spawn_count,0)>0 AND (p_npc_key IS NULL OR n.npc_key=p_npc_key)
 ORDER BY n.hp+n.shield ASC,n.npc_key ASC LIMIT 1;
 IF v_npc.npc_key IS NULL THEN RAISE EXCEPTION 'FARM_NO_ELIGIBLE_NPCS'; END IF;
 -- Munição apenas de crédito; STL/premium é consumido se houver estoque, nunca comprado aqui.
 SELECT catalog_key,price,currency,(meta#>>'{grant,qty}')::integer AS qty INTO q FROM public.live_shop_prices_v16
 WHERE kind='ammo' AND ref_id=v_ammo AND enabled=true AND shop_visible=true LIMIT 1;
 IF q.catalog_key IS NULL THEN RAISE EXCEPTION 'FARM_AMMO_UNAVAILABLE'; END IF;
 v_factor:= CASE v_ammo WHEN 'lcb10' THEN 1 WHEN 'mcb25' THEN 2 WHEN 'mcb50' THEN 3 WHEN 'ucb100' THEN 4 ELSE 1 END;
 v_damage:=greatest(1,(175+v_level*80)*v_factor*cfg.damage_percent/100.0);
 INSERT INTO public.stellar_offline_farm_v484(user_id,map_id,npc_key,ammo_key,minutes,auto_sell,auto_buy,mine,snapshot,baseline_save_at,ends_at)
 VALUES(p_user,v_map,v_npc.npc_key,v_ammo,p_minutes,coalesce(p_auto_sell,true),coalesce(p_auto_buy,true),coalesce(p_mine,true),
 jsonb_build_object('npc',to_jsonb(v_npc),'level',v_level,'damage_per_shot',v_damage,'damage_per_second',round(v_damage/7,2),'max_kills',cfg.max_kills,'trip_seconds',cfg.travel_seconds,'damage_percent',cfg.damage_percent,'profile_updated_at',c.updated_at,'shop',CASE WHEN q.catalog_key IS NOT NULL THEN to_jsonb(q) ELSE '{}'::jsonb END),s.updated_at,now()+make_interval(mins=>p_minutes))
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'id',v_id,'status','running','map',v_map,'npc',v_npc.npc_key,'minutes',p_minutes,'ammo',v_ammo,'damage_per_second',round(v_damage/7,2),'ends_at',(SELECT ends_at FROM public.stellar_offline_farm_v484 WHERE id=v_id));
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v487(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r jsonb; f record; n record; v_volley integer; v_shots integer; v_lasers integer;
 v_hp numeric; v_accuracy numeric; v_damage numeric; v_interval numeric;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF coalesce(p_combat->>'combat_model','') <> 'v487' THEN RAISE EXCEPTION 'FARM_COMBAT_MODEL_REQUIRED'; END IF;
 v_lasers:=(p_combat->>'laser_count')::integer;
 v_accuracy:=(p_combat->>'hit_chance')::numeric;
 v_damage:=(p_combat->>'damage_per_volley')::numeric;
 v_interval:=(p_combat->>'fire_interval_ms')::numeric;
 IF v_lasers NOT BETWEEN 1 AND 64 OR v_accuracy NOT BETWEEN 0.5 AND 1
  OR v_damage NOT BETWEEN 1 AND 2000000 OR v_interval<>420
  OR (p_combat->>'move_between_seconds')::integer NOT BETWEEN 3 AND 45
  OR (p_combat->>'cargo_capacity')::integer NOT BETWEEN 100 AND 15000 THEN
  RAISE EXCEPTION 'FARM_COMBAT_INVALID'; END IF;
 r:=public.stellar_offline_farm_start_v485(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key);
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE id=(r->>'id')::uuid FOR UPDATE;
 IF f.id IS NULL OR f.baseline_save_at IS DISTINCT FROM p_baseline_save_at THEN
  RAISE EXCEPTION 'FARM_SAVE_CHANGED_DURING_START';
 END IF;
 -- Respeitar o controle ADM congelado por sessao, sem alteracoes retroativas.
 v_damage:=greatest(1,least(2000000,round(v_damage*coalesce((f.snapshot->>'damage_percent')::numeric,100)/100)));
 SELECT name,damage INTO n FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key AND enabled=true;
 v_hp:=coalesce((f.snapshot#>>'{npc,hp}')::numeric,0)+coalesce((f.snapshot#>>'{npc,shield}')::numeric,0);
 IF v_hp<=0 THEN RAISE EXCEPTION 'FARM_NPC_INVALID'; END IF;
 v_volley:=ceil(v_hp/greatest(1,v_damage * v_accuracy * (1 + least(0.3,greatest(0,coalesce((p_combat->>'shield_pressure')::numeric,0))) * coalesce((f.snapshot#>>'{npc,shield}')::numeric,0)/v_hp)))::integer;
 IF v_volley>50000 THEN RAISE EXCEPTION 'FARM_TARGET_TOO_TOUGH'; END IF;
 v_volley:=greatest(1,v_volley);
 v_shots:=v_volley*v_lasers;
 IF v_shots>320000 THEN RAISE EXCEPTION 'FARM_TARGET_TOO_TOUGH'; END IF;
 UPDATE public.stellar_offline_farm_v484 SET snapshot= snapshot || p_combat ||
 jsonb_build_object('npc_name',n.name,'damage_per_volley',v_damage,'ammo_per_kill',v_shots,'combat_kill_seconds',
   greatest(1,least(30000,ceil(v_volley*.42)::integer + (p_combat->>'move_between_seconds')::integer)),
   'enemy_damage',coalesce(n.damage,0),'damage_per_second',round(v_damage*v_accuracy/.42,2))
 WHERE id=f.id;
 RETURN r || jsonb_build_object('npc_name',n.name,'laser_count',v_lasers,'damage_per_second',round(v_damage*v_accuracy/.42,2));
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v49(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r jsonb; cfg record; v_limit bigint;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT max_sale_credits INTO STRICT cfg FROM public.stellar_offline_farm_settings_v485 WHERE id=1;
 r:=public.stellar_offline_farm_start_v487(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key,p_combat,p_baseline_save_at);
 v_limit:=least(1000000000000, greatest(0,cfg.max_sale_credits) * ceil(p_minutes / 60.0)::bigint);
 UPDATE public.stellar_offline_farm_v484 SET snapshot=snapshot || jsonb_build_object('economic_model','v49','max_sale_credits',v_limit)
 WHERE id=(r->>'id')::uuid AND user_id=p_user;
 RETURN r || jsonb_build_object('economic_model','v49','max_sale_credits',v_limit);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_status_v484(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record; v_name text;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT * INTO s FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1;
 IF s.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 SELECT name INTO v_name FROM public.game_npc_config_v1811 WHERE npc_key=s.npc_key LIMIT 1;
 RETURN jsonb_build_object('id',s.id,'status',s.status,'map',s.map_id,
 'npc',s.npc_key,'npc_name',coalesce(nullif(v_name,''),s.npc_key),'ammo',s.ammo_key,'minutes',s.minutes,
 'started_at',s.started_at,'ends_at',s.ends_at,'report',s.report);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_read_player_save_v119(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT jsonb_build_object('state',g.state,'updated_at',g.updated_at,'revision',h.revision,
   'verified',h.state_hash=md5(g.state::text))
 FROM public.game_saves g JOIN public.stellar_player_save_head_v119 h ON h.user_id=g.user_id
 WHERE g.user_id=p_user_id;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_read_save_v131(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce((select jsonb_build_object('state',state,'updated_at',updated_at,
    'save_token',md5(state::text)) from public.game_saves where user_id=p_user_id),
    jsonb_build_object('save_token','new'));
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_read_save_v133(p_user_id uuid, p_operation_id uuid DEFAULT NULL::uuid, p_request_hash text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r jsonb; stored record;
BEGIN
 r:=public.stellar_read_save_v131(p_user_id);
 IF p_operation_id IS NOT NULL THEN
 SELECT * INTO stored FROM public.stellar_save_receipts_v133 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF FOUND THEN
 IF stored.request_hash IS DISTINCT FROM p_request_hash THEN RETURN r||'{"receipt_error":"SAVE_IDEMPOTENCY_ID_REUSED"}'::jsonb;END IF;
 RETURN r||jsonb_build_object('replayed',true,'receipt',stored.receipt);
 END IF;END IF;
 RETURN r;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_record_elite_event(p_user_id uuid, p_kind text, p_amount integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if p_user_id is null or p_kind not in ('npc_kill','sector_capture') or p_amount<1 or p_amount>100 then
   raise exception 'INVALID_ELITE_EVENT';
 end if;
 insert into public.stellar_elite_counters(user_id,npc_kills,sector_captures)
 values(p_user_id,case when p_kind='npc_kill' then p_amount else 0 end,case when p_kind='sector_capture' then p_amount else 0 end)
 on conflict(user_id) do update set
 npc_kills=public.stellar_elite_counters.npc_kills+excluded.npc_kills,
 sector_captures=public.stellar_elite_counters.sector_captures+excluded.sector_captures,
 updated_at=now();
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_record_war_defense(p_map_id text, p_node_id text, p_faction text, p_actor uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_campaign uuid;v_points int;v_clan uuid;
begin
 if p_map_id not in('b41','b42','b43') or p_node_id not in('A','B','C') or p_faction not in('earth','mars','jupiter') or p_actor is null then raise exception 'INVALID_DEFENSE';end if;
 if not exists(select 1 from public.stellar_warfront_nodes where map_id=p_map_id and node_id=p_node_id and owner=p_faction) then return false;end if;
 insert into public.stellar_war_defense_cooldowns(user_id,map_id,node_id,defended_at) values(p_actor,p_map_id,p_node_id,now())
 on conflict(user_id,map_id,node_id) do update set defended_at=excluded.defended_at
 where public.stellar_war_defense_cooldowns.defended_at<now()-interval '10 minutes';
 if not found then return false;end if;
 select id into v_campaign from public.stellar_war_campaigns where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 select clan_id into v_clan from public.clan_members where user_id=p_actor limit 1;
 select defense_points into v_points from public.stellar_war_rules where id=1;v_points:=coalesce(v_points,3);
 insert into public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points,clan_id)
 values(v_campaign,'defense',p_map_id,p_node_id,p_faction,p_faction,p_actor,case when v_campaign is null then 0 else v_points end,v_clan);
 if v_campaign is not null then
 insert into public.stellar_war_scores(campaign_id,user_id,faction,defenses,points,clan_id) values(v_campaign,p_actor,p_faction,1,v_points,v_clan)
 on conflict(campaign_id,user_id) do update set defenses=public.stellar_war_scores.defenses+1,points=public.stellar_war_scores.points+excluded.points,updated_at=now();
 end if;
 return true;
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_active_bonus_v346(p_user_id uuid, p_map_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE cid uuid;fac text;winner record;faction_all boolean;
BEGIN
 IF auth.role()<>'service_role' OR p_user_id IS NULL THEN RAISE EXCEPTION 'RELAY_BONUS_DENIED';END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_user_id;
 SELECT faction INTO fac FROM public.profiles WHERE id=p_user_id;
 SELECT count(*)=9 INTO faction_all FROM public.stellar_warfront_nodes WHERE owner=fac;
 SELECT m.attribute,m.level,
   b.bonus_pct AS value
 INTO winner
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_module_balance_v3463 b ON b.category=m.category AND b.attribute=m.attribute AND b.level=m.level
 JOIN public.stellar_relay_state_v346 s ON s.map_id=m.map_id AND s.node_id=m.node_id
 JOIN public.stellar_warfront_nodes n ON n.map_id=s.map_id AND n.node_id=s.node_id
 WHERE m.category='bonus' AND
   ((cid IS NOT NULL AND s.owner_clan_id=cid AND (
       s.map_id=p_map_id OR
       (SELECT count(*) FROM public.stellar_relay_state_v346 sc WHERE sc.map_id=s.map_id AND sc.owner_clan_id=cid)=3
   )) OR (faction_all AND n.owner=fac))
 ORDER BY m.level DESC,value DESC,m.attribute ASC LIMIT 1;
 IF winner IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('attribute',winner.attribute,'level',winner.level,'value',winner.value);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_admin_release_v3461(p_map_id text, p_node_id text, p_clear_faction boolean, p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 st public.stellar_relay_state_v346;
 previous public.stellar_warfront_nodes;
 rules public.stellar_relay_rules_v346;
 modules_returned int;
BEGIN
 IF auth.role()<>'service_role' OR p_actor IS NULL OR p_clear_faction IS NULL
    OR p_map_id NOT IN ('b41','b42','b43') OR p_node_id NOT IN ('A','B','C')
 THEN RAISE EXCEPTION 'RELAY_ADMIN_RELEASE_DENIED'; END IF;
 -- Defense-in-depth: caller is also checked using user's JWT at the HTTP route.
 IF NOT public.is_game_admin_v1763(p_actor) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT * INTO rules FROM public.stellar_relay_rules_v346 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_RULES_UNAVAILABLE'; END IF;
 SELECT * INTO st FROM public.stellar_relay_state_v346
 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND'; END IF;
 SELECT * INTO previous FROM public.stellar_warfront_nodes
 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WARFRONT_NOT_FOUND'; END IF;
 -- Inventory retains category, attribute and upgrade level; only slots are unassigned.
 UPDATE public.stellar_relay_modules_v346
 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
 GET DIAGNOSTICS modules_returned = ROW_COUNT;
 UPDATE public.stellar_relay_state_v346 SET
   owner_clan_id=NULL,
   max_hp=rules.max_hp,max_shield=rules.max_shield,
   hp=rules.max_hp,shield=rules.max_shield,
   protected_until=NULL,last_hit_at=NULL,
   revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
 IF p_clear_faction THEN
   UPDATE public.stellar_warfront_nodes SET
     owner=NULL,captured_by=NULL,captured_at=NULL,revision=revision+1
   WHERE map_id=p_map_id AND node_id=p_node_id;
 END IF;
 INSERT INTO public.stellar_relay_audit_v346
   (actor,clan_id,action,map_id,node_id,details)
 VALUES (p_actor,st.owner_clan_id,'admin_release',p_map_id,p_node_id,
   jsonb_build_object('clear_faction',p_clear_faction,'previous_faction',previous.owner,
     'previous_clan',st.owner_clan_id,'modules_returned',modules_returned));
 RETURN jsonb_build_object('ok',true,'map_id',p_map_id,'node_id',p_node_id,
   'faction_released',p_clear_faction,'modules_returned',modules_returned);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_capture_v346(p_map_id text, p_node_id text, p_faction text, p_expected_revision bigint, p_actor uuid)
 RETURNS stellar_warfront_nodes
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE st public.stellar_relay_state_v346; roww public.stellar_warfront_nodes;cid uuid; old_owner text;campaign uuid;points integer;
BEGIN
 IF auth.role()<>'service_role' OR p_actor IS NULL OR p_faction NOT IN('earth','mars','jupiter') THEN RAISE EXCEPTION 'RELAY_CAPTURE_DENIED';END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_actor;
 IF cid IS NULL THEN RAISE EXCEPTION 'CLAN_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND faction=p_faction) THEN RAISE EXCEPTION 'FACTION_MISMATCH';END IF;
 SELECT * INTO st FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND OR st.hp>0 OR st.protected_until>now() THEN RAISE EXCEPTION 'RELAY_NOT_VULNERABLE';END IF;
 SELECT * INTO roww FROM public.stellar_warfront_nodes WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND OR roww.revision<>p_expected_revision THEN RAISE EXCEPTION 'WARFRONT_REVISION_CONFLICT';END IF;
 IF st.owner_clan_id=cid THEN RAISE EXCEPTION 'ALREADY_OWNED';END IF;
 old_owner:=roww.owner;
 UPDATE public.stellar_warfront_nodes SET owner=p_faction,captured_at=now(),captured_by=p_actor,revision=revision+1 WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO roww;
 -- Previous clan does not lose upgrades: modules safely return to inventory.
 UPDATE public.stellar_relay_modules_v346 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346 SET owner_clan_id=cid,
  max_hp=(SELECT max_hp FROM public.stellar_relay_rules_v346 WHERE id=1),max_shield=(SELECT max_shield FROM public.stellar_relay_rules_v346 WHERE id=1),
  hp=(SELECT max_hp FROM public.stellar_relay_rules_v346 WHERE id=1),shield=(SELECT max_shield FROM public.stellar_relay_rules_v346 WHERE id=1),
  protected_until=now()+((SELECT protection_ms FROM public.stellar_relay_rules_v346 WHERE id=1)*interval '1 millisecond'),revision=revision+1,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id;
 SELECT id INTO campaign FROM public.stellar_war_campaigns WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1;
 SELECT capture_points INTO points FROM public.stellar_war_rules WHERE id=1; points:=coalesce(points,10);
 IF EXTRACT(ISODOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')) IN (6,7) THEN
  points:=floor(points*(SELECT weekend_multiplier FROM public.stellar_relay_rules_v346 WHERE id=1))::int;
 END IF;
 INSERT INTO public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points,clan_id) VALUES(campaign,'capture',p_map_id,p_node_id,p_faction,old_owner,p_actor,CASE WHEN campaign IS NULL THEN 0 ELSE points END,cid);
 IF campaign IS NOT NULL THEN
  INSERT INTO public.stellar_war_scores(campaign_id,user_id,faction,captures,points,clan_id) VALUES(campaign,p_actor,p_faction,1,points,cid)
  ON CONFLICT(campaign_id,user_id) DO UPDATE SET captures=public.stellar_war_scores.captures+1,points=public.stellar_war_scores.points+EXCLUDED.points,updated_at=now();
 END IF;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,map_id,node_id,details) VALUES(p_actor,cid,'capture',p_map_id,p_node_id,jsonb_build_object('faction',p_faction,'previous_faction',old_owner));
 RETURN roww;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_claim_mission_v346(p_mission_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid();cid uuid;counted bigint;pt text;reward int;start_date date:=(date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT id INTO cid FROM public.clans WHERE owner_id=uid;
 IF cid IS NULL THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 IF p_mission_id='capture_week' THEN
  SELECT count(*) INTO counted FROM public.stellar_war_actions WHERE clan_id=cid AND kind='capture' AND occurred_at >= (start_date::timestamp AT TIME ZONE 'America/Sao_Paulo');pt:='weapon_parts';reward:=5;
 ELSIF p_mission_id='defend_week' THEN
  SELECT count(*) INTO counted FROM public.stellar_war_actions WHERE clan_id=cid AND kind='defense' AND occurred_at >= (start_date::timestamp AT TIME ZONE 'America/Sao_Paulo');pt:='shield_parts';reward:=5;
 ELSIF p_mission_id='hunter_week' THEN
  SELECT coalesce(sum(e.npc_kills),0) INTO counted FROM public.stellar_relay_clan_pve_v346 e WHERE e.clan_id=cid AND e.period_start=start_date;pt:='hull_parts';reward:=5;
 ELSIF p_mission_id='domination_week' THEN
  SELECT count(*) INTO counted FROM public.stellar_war_actions WHERE clan_id=cid AND kind='capture' AND occurred_at >= (start_date::timestamp AT TIME ZONE 'America/Sao_Paulo');pt:='circuit_parts';reward:=5;
 ELSE RAISE EXCEPTION 'UNKNOWN_MISSION';END IF;
 IF counted<(CASE p_mission_id WHEN 'capture_week' THEN 2 WHEN 'defend_week' THEN 3 WHEN 'domination_week' THEN 5 ELSE 100 END) THEN RAISE EXCEPTION 'MISSION_NOT_COMPLETE';END IF;
 INSERT INTO public.stellar_relay_mission_claims_v346(clan_id,mission_id,period_start,actor) VALUES(cid,p_mission_id,start_date,uid);
 INSERT INTO public.stellar_relay_clan_parts_v346(clan_id,part_type,quantity) VALUES(cid,pt,reward)
 ON CONFLICT(clan_id,part_type) DO UPDATE SET quantity=public.stellar_relay_clan_parts_v346.quantity+EXCLUDED.quantity;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,details) VALUES(uid,cid,'mission',jsonb_build_object('mission',p_mission_id,'parts',reward));
 RETURN jsonb_build_object('ok',true,'mission',p_mission_id,'parts',reward,'part_type',pt);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_damage_v346(p_map_id text, p_node_id text, p_damage integer, p_attacker uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE s public.stellar_relay_state_v346; old_s bigint; actual bigint; rem bigint;
BEGIN
 IF auth.role() <> 'service_role' OR p_attacker IS NULL OR p_damage NOT BETWEEN 1 AND 500000 THEN RAISE EXCEPTION 'RELAY_DAMAGE_DENIED'; END IF;
 SELECT * INTO s FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND';END IF;
 IF s.protected_until>now() OR s.hp=0 THEN RETURN jsonb_build_object('ok',false,'protected',s.protected_until>now(),'hp',s.hp,'shield',s.shield);END IF;
 old_s:=LEAST(s.shield,p_damage);rem:=p_damage-old_s;actual:=old_s+LEAST(s.hp,rem);
 UPDATE public.stellar_relay_state_v346 SET shield=shield-old_s,hp=hp-LEAST(hp,rem),last_hit_at=now(),revision=revision+1,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO s;
 RETURN jsonb_build_object('ok',true,'actual',actual,'hp',s.hp,'shield',s.shield,'revision',s.revision);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_fortification_transfer_v350()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.owner_clan_id IS NOT DISTINCT FROM OLD.owner_clan_id THEN RETURN NEW;END IF;
 PERFORM public.stellar_relay_recompute_v346(NEW.map_id,NEW.node_id);
 -- Conquest/admin release already heals to the base. Finish reconstruction
 -- to the correct FULL max (no free healing on ordinary equipment switches).
 UPDATE public.stellar_relay_state_v346
 SET hp=max_hp,shield=max_shield,revision=revision+1,updated_at=now()
 WHERE map_id=NEW.map_id AND node_id=NEW.node_id;
 RETURN NEW;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_fortification_upgrade_v350(p_map_id text, p_node_id text, p_expected_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cl public.clans; st public.stellar_relay_state_v346;
 fort public.stellar_relay_fortifications_v350; cfg public.stellar_relay_fortification_tiers_v350;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 IF p_map_id NOT IN('b41','b42','b43') OR p_node_id NOT IN('A','B','C') THEN RAISE EXCEPTION 'INVALID_RELAY';END IF;
 SELECT * INTO cl FROM public.clans WHERE owner_id=uid ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER'; END IF;
 SELECT * INTO st FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND';END IF;
 IF st.owner_clan_id IS DISTINCT FROM cl.id THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
 SELECT * INTO fort FROM public.stellar_relay_fortifications_v350 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORTIFICATION_NOT_READY';END IF;
 IF fort.level>=3 THEN RAISE EXCEPTION 'MAX_LEVEL';END IF;
 IF p_expected_level NOT BETWEEN 1 AND 2 OR fort.level IS DISTINCT FROM p_expected_level THEN RAISE EXCEPTION 'STALE_FORTIFICATION_LEVEL';END IF;
 SELECT * INTO cfg FROM public.stellar_relay_fortification_tiers_v350 WHERE level=fort.level+1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORTIFICATION_PRICE_MISSING';END IF;
 IF cl.level<cfg.min_clan_level THEN RAISE EXCEPTION 'CLAN_LEVEL_REQUIRED_%',cfg.min_clan_level;END IF;
 UPDATE public.stellar_relay_clan_parts_v346 SET quantity=quantity-cfg.parts_each
 WHERE clan_id=cl.id AND part_type='hull_parts' AND quantity>=cfg.parts_each;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_HULL_PARTS';END IF;
 UPDATE public.stellar_relay_clan_parts_v346 SET quantity=quantity-cfg.parts_each
 WHERE clan_id=cl.id AND part_type='shield_parts' AND quantity>=cfg.parts_each;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_SHIELD_PARTS';END IF;
 UPDATE public.clans SET vault_credits=vault_credits-cfg.credits
 WHERE id=cl.id AND vault_credits>=cfg.credits;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_CLAN_VAULT';END IF;
 UPDATE public.stellar_relay_fortifications_v350 SET level=cfg.level,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
 PERFORM public.stellar_relay_recompute_v346(p_map_id,p_node_id);
 INSERT INTO public.stellar_relay_fortification_audit_v350(actor,clan_id,map_id,node_id,previous_level,new_level,credits_spent,parts_each_used)
 VALUES(uid,cl.id,p_map_id,p_node_id,fort.level,cfg.level,cfg.credits,cfg.parts_each);
 RETURN jsonb_build_object('ok',true,'map_id',p_map_id,'node_id',p_node_id,
  'level',cfg.level,'spent_credits',cfg.credits,'parts_each_used',cfg.parts_each,
  'hp_bonus',cfg.hp_bonus,'shield_bonus',cfg.shield_bonus);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_mission_progress_v3463()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid();cid uuid;week_date date:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 captures bigint;defenses bigint;hunts bigint; claimed text[];
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=uid;
 IF cid IS NULL THEN RETURN jsonb_build_object('week',week_date,'capture_week',jsonb_build_object('count',0,'target',2,'claimed',false),'defend_week',jsonb_build_object('count',0,'target',3,'claimed',false),'hunter_week',jsonb_build_object('count',0,'target',100,'claimed',false),'domination_week',jsonb_build_object('count',0,'target',5,'claimed',false));END IF;
 SELECT count(*) FILTER (WHERE kind='capture'),count(*) FILTER (WHERE kind='defense') INTO captures,defenses
 FROM public.stellar_war_actions WHERE clan_id=cid AND kind IN ('capture','defense') AND occurred_at>=(week_date::timestamp AT TIME ZONE 'America/Sao_Paulo');
 SELECT coalesce(npc_kills,0) INTO hunts FROM public.stellar_relay_clan_pve_v346 WHERE clan_id=cid AND period_start=week_date;
 SELECT array_agg(mission_id) INTO claimed FROM public.stellar_relay_mission_claims_v346 WHERE clan_id=cid AND period_start=week_date;
 claimed:=coalesce(claimed,ARRAY[]::text[]);
 RETURN jsonb_build_object('week',week_date,
  'capture_week',jsonb_build_object('count',captures,'target',2,'claimed','capture_week'=ANY(claimed)),
  'defend_week',jsonb_build_object('count',defenses,'target',3,'claimed','defend_week'=ANY(claimed)),
  'hunter_week',jsonb_build_object('count',coalesce(hunts,0),'target',100,'claimed','hunter_week'=ANY(claimed)),
  'domination_week',jsonb_build_object('count',captures,'target',5,'claimed','domination_week'=ANY(claimed)));
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_module_action_v346(p_action text, p_module_id uuid DEFAULT NULL::uuid, p_category text DEFAULT NULL::text, p_attribute text DEFAULT NULL::text, p_map_id text DEFAULT NULL::text, p_node_id text DEFAULT NULL::text, p_slot integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cid uuid; cl public.clans; mod public.stellar_relay_modules_v346; part text;cost bigint;need int;minimum int;next_level int; ident uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT c.* INTO cl FROM public.clans c WHERE c.owner_id=uid ORDER BY c.created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 cid:=cl.id;
 IF p_action='craft' THEN
  IF p_category NOT IN('weapon','shield','hp','bonus') THEN RAISE EXCEPTION 'INVALID_CATEGORY';END IF;
  IF NOT ((p_category='bonus' AND p_attribute IN('damage','shield','hp','speed','xp','resources')) OR (p_category='weapon' AND p_attribute IN('laser','missile')) OR (p_category='shield' AND p_attribute IN('capacitor','regenerator')) OR (p_category='hp' AND p_attribute IN('armor','nanobots'))) THEN RAISE EXCEPTION 'INVALID_ATTRIBUTE';END IF;
  next_level:=1;
 ELSE
  SELECT * INTO mod FROM public.stellar_relay_modules_v346 WHERE id=p_module_id AND clan_id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MODULE_NOT_OWNED';END IF;
  IF p_action='upgrade' THEN
   IF mod.level>=3 THEN RAISE EXCEPTION 'MAX_LEVEL';END IF;
   next_level:=mod.level+1;
  ELSIF p_action='equip' THEN
   IF p_map_id NOT IN('b41','b42','b43') OR p_node_id NOT IN('A','B','C') OR p_slot NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'INVALID_RELAY_OR_SLOT';END IF;
   IF NOT ((mod.category='weapon' AND p_slot IN(1,2)) OR (mod.category='shield' AND p_slot IN(3,4)) OR (mod.category='hp' AND p_slot IN(5,6)) OR (mod.category='bonus' AND p_slot IN(7,8))) THEN RAISE EXCEPTION 'SLOT_CATEGORY_MISMATCH'; END IF;
   IF mod.category<>'bonus' AND mod.attribute <> (CASE p_slot WHEN 1 THEN 'laser' WHEN 2 THEN 'missile' WHEN 3 THEN 'capacitor' WHEN 4 THEN 'regenerator' WHEN 5 THEN 'armor' WHEN 6 THEN 'nanobots' ELSE '?' END) THEN RAISE EXCEPTION 'SLOT_SUBTYPE_MISMATCH'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.stellar_relay_state_v346 s JOIN public.stellar_warfront_nodes n ON n.map_id=s.map_id AND n.node_id=s.node_id WHERE s.map_id=p_map_id AND s.node_id=p_node_id AND s.owner_clan_id=cid) THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
   -- Equipar em um slot ocupado faz troca atomica: modulo anterior volta ao inventario.
   UPDATE public.stellar_relay_modules_v346 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now()
   WHERE map_id=p_map_id AND node_id=p_node_id AND slot=p_slot AND id<>mod.id AND clan_id=cid;
   UPDATE public.stellar_relay_modules_v346 SET map_id=p_map_id,node_id=p_node_id,slot=p_slot,updated_at=now() WHERE id=mod.id;
   PERFORM public.stellar_relay_recompute_v346(p_map_id,p_node_id);
   IF mod.map_id IS NOT NULL AND (mod.map_id IS DISTINCT FROM p_map_id OR mod.node_id IS DISTINCT FROM p_node_id) THEN PERFORM public.stellar_relay_recompute_v346(mod.map_id,mod.node_id);END IF;
   INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,module_id,map_id,node_id) VALUES(uid,cid,'equip',mod.id,p_map_id,p_node_id);
   RETURN jsonb_build_object('ok',true,'action','equip','id',mod.id);
  ELSIF p_action='unequip' THEN
   UPDATE public.stellar_relay_modules_v346 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now() WHERE id=mod.id;
   IF mod.map_id IS NOT NULL THEN PERFORM public.stellar_relay_recompute_v346(mod.map_id,mod.node_id);END IF;
   INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,module_id) VALUES(uid,cid,'unequip',mod.id);
   RETURN jsonb_build_object('ok',true,'action','unequip','id',mod.id);
  ELSE RAISE EXCEPTION 'INVALID_ACTION';END IF;
 END IF;
 part:=CASE WHEN coalesce(mod.category,p_category)='weapon' THEN 'weapon_parts' WHEN coalesce(mod.category,p_category)='shield' THEN 'shield_parts' WHEN coalesce(mod.category,p_category)='hp' THEN 'hull_parts' ELSE 'circuit_parts' END;
 SELECT b.parts,b.credits,b.min_clan_level INTO need,cost,minimum
 FROM public.stellar_relay_module_balance_v3463 b
 WHERE b.category=coalesce(mod.category,p_category) AND b.attribute=coalesce(mod.attribute,p_attribute) AND b.level=next_level;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_MODULE_BALANCE_MISSING';END IF;
 IF cl.level<minimum THEN RAISE EXCEPTION 'CLAN_LEVEL_REQUIRED_%',minimum;END IF;
 UPDATE public.stellar_relay_clan_parts_v346 SET quantity=quantity-need WHERE clan_id=cid AND part_type=part AND quantity>=need;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_RELAY_PARTS';END IF;
 IF cost>0 THEN
  UPDATE public.clans SET vault_credits=vault_credits-cost WHERE id=cid AND vault_credits>=cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_CLAN_VAULT';END IF;
 END IF;
 IF p_action='craft' THEN
  INSERT INTO public.stellar_relay_modules_v346(clan_id,category,attribute) VALUES(cid,p_category,p_attribute) RETURNING id INTO ident;
 ELSE
  UPDATE public.stellar_relay_modules_v346 SET level=next_level,updated_at=now() WHERE id=mod.id;ident:=mod.id;
  IF mod.map_id IS NOT NULL THEN PERFORM public.stellar_relay_recompute_v346(mod.map_id,mod.node_id);END IF;
 END IF;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,module_id,details) VALUES(uid,cid,p_action,ident,jsonb_build_object('level',next_level,'parts',need,'credits',cost));
 RETURN jsonb_build_object('ok',true,'id',ident,'level',next_level,'parts_used',need,'vault_spent',cost);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_recompute_v346(p_map_id text, p_node_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE bh bigint;bs bigint;mh bigint;ms bigint;th bigint;ts bigint;
BEGIN
 SELECT max_hp,max_shield INTO bh,bs FROM public.stellar_relay_rules_v346 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_RULES_UNAVAILABLE'; END IF;
 SELECT coalesce(sum(b.hp_bonus),0),coalesce(sum(b.shield_bonus),0) INTO mh,ms
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_module_balance_v3463 b
 ON b.category=m.category AND b.attribute=m.attribute AND b.level=m.level
 WHERE m.map_id=p_map_id AND m.node_id=p_node_id;
 SELECT coalesce(t.hp_bonus,0),coalesce(t.shield_bonus,0) INTO th,ts
 FROM public.stellar_relay_fortifications_v350 f
 JOIN public.stellar_relay_fortification_tiers_v350 t ON t.level=f.level
 WHERE f.map_id=p_map_id AND f.node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346 SET
   max_hp=LEAST(16000000,bh+mh+coalesce(th,0)),
   max_shield=LEAST(10000000,bs+ms+coalesce(ts,0)),
   hp=LEAST(hp,LEAST(16000000,bh+mh+coalesce(th,0))),
   shield=LEAST(shield,LEAST(10000000,bs+ms+coalesce(ts,0))),
   revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_record_pve_v346(p_user_id uuid, p_event_key text, p_kind text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE cid uuid;start_date date:=(date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
 IF auth.role()<>'service_role' OR p_user_id IS NULL OR length(p_event_key) NOT BETWEEN 8 AND 180 OR p_kind NOT IN ('npc','ore') THEN RAISE EXCEPTION 'RELAY_PVE_DENIED'; END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_user_id;
 IF cid IS NULL THEN RETURN false;END IF;
 INSERT INTO public.stellar_relay_pve_events_v346(event_key,actor) VALUES(p_event_key,p_user_id) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false;END IF;
 INSERT INTO public.stellar_relay_clan_pve_v346(clan_id,period_start,npc_kills,ore_collections) VALUES(cid,start_date,CASE WHEN p_kind='npc' THEN 1 ELSE 0 END,CASE WHEN p_kind='ore' THEN 1 ELSE 0 END)
 ON CONFLICT(clan_id,period_start) DO UPDATE SET npc_kills=public.stellar_relay_clan_pve_v346.npc_kills+EXCLUDED.npc_kills,ore_collections=public.stellar_relay_clan_pve_v346.ore_collections+EXCLUDED.ore_collections;
 RETURN true;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_relay_repair_v346(p_map_id text, p_node_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); cid uuid;s public.stellar_relay_state_v346;cost bigint:=3000;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT id INTO cid FROM public.clans WHERE owner_id=uid FOR UPDATE;
 IF cid IS NULL THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 SELECT * INTO s FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND OR s.owner_clan_id IS DISTINCT FROM cid THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
 IF s.last_hit_at>now()-interval '15 seconds' THEN RAISE EXCEPTION 'RELAY_IN_COMBAT';END IF;
 IF s.hp>=s.max_hp AND s.shield>=s.max_shield THEN RAISE EXCEPTION 'RELAY_FULL';END IF;
 UPDATE public.clans SET vault_credits=vault_credits-cost WHERE id=cid AND vault_credits>=cost;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_CLAN_VAULT';END IF;
 UPDATE public.stellar_relay_state_v346 SET hp=LEAST(max_hp,hp+100000),shield=LEAST(max_shield,shield+100000),revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO s;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,map_id,node_id,details) VALUES(uid,cid,'repair',p_map_id,p_node_id,jsonb_build_object('credits',cost));
 RETURN jsonb_build_object('ok',true,'hp',s.hp,'shield',s.shield,'cost',cost);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_save_release_readiness_v120()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 WITH counts AS (
  SELECT
   (SELECT count(*) FROM public.game_saves) AS saves,
   (SELECT count(*) FROM public.stellar_player_save_head_v119) AS heads,
   (SELECT count(*) FROM public.stellar_player_save_operation_v119) AS receipts,
   (SELECT count(*) FROM public.stellar_offline_farm_v484 WHERE status='running') AS active_farms,
   (SELECT count(*) FROM public.game_saves g LEFT JOIN public.stellar_player_save_head_v119 h
      ON h.user_id=g.user_id WHERE h.user_id IS NULL OR h.state_hash IS DISTINCT FROM md5(g.state::text)) AS hash_mismatches,
   (SELECT count(*) FROM public.game_saves g LEFT JOIN public.stellar_player_save_checkpoint_v119 c
      ON c.user_id=g.user_id AND c.slot='A' WHERE c.user_id IS NULL) AS missing_a,
   (SELECT count(*) FROM public.stellar_player_save_checkpoint_v119 c
      WHERE c.state_hash IS DISTINCT FROM md5(c.state::text)) AS corrupted_checkpoints,
   (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.game_saves'::regclass
      AND tgname IN ('stellar_capture_save_insert_v119','stellar_capture_save_update_v119')
      AND tgenabled IN ('O','A')) AS capture_triggers
 )
 SELECT jsonb_build_object(
  'readonly',true,'version','V120.0-RC','canonical_saves',saves,
  'revision_heads',heads,'command_receipts',receipts,'active_farms',active_farms,
  'hash_mismatches',hash_mismatches,'missing_checkpoint_a',missing_a,
  'corrupted_checkpoints',corrupted_checkpoints,'active_capture_triggers',capture_triggers,
  'db_preflight_passed',(saves=heads AND hash_mismatches=0 AND missing_a=0
                        AND corrupted_checkpoints=0 AND active_farms=0 AND capture_triggers=2),
  'cutover_certified',false,
  'note','Preflight database only. Legacy writers must be migrated and load-tested before enforce.'
 ) FROM counts;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_security_report_server(p_user_id uuid, p_code text, p_severity text, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_last timestamptz; v_count integer; v_event bigint; v_banned boolean:=false; v_admin boolean:=false;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Somente servidor autorizado'; END IF;
 IF p_user_id IS NULL OR p_code !~ '^[A-Z_]{4,64}$' OR p_severity NOT IN ('warn','critical') THEN RAISE EXCEPTION 'Evento inválido'; END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Conta inexistente'; END IF;
 -- Nunca aplicar suspensão automática a admins, nem por eventos de severidade warning.
 SELECT EXISTS (SELECT 1 FROM public.game_admins WHERE user_id=p_user_id) INTO v_admin;
 SELECT max(created_at) INTO v_last FROM public.stellar_security_events WHERE user_id=p_user_id AND code=p_code AND created_at>now()-interval '1 minute';
 IF v_last IS NOT NULL THEN RETURN jsonb_build_object('recorded',false,'deduplicated',true,'auto_suspended',false); END IF;
 INSERT INTO public.stellar_security_events(user_id,code,severity,context)
 VALUES(p_user_id,p_code,p_severity,coalesce(p_context,'{}'::jsonb)) RETURNING id INTO v_event;
 IF p_severity='critical' AND NOT v_admin THEN
  SELECT count(*) INTO v_count FROM public.stellar_security_events
  WHERE user_id=p_user_id AND severity='critical' AND created_at>now()-interval '2 hours' AND reviewed_at IS NULL;
  IF v_count>=3 THEN
    INSERT INTO public.account_moderation_v1763(user_id,is_banned,banned_until,banned_reason,banned_by,updated_at)
    VALUES(p_user_id,true,now()+interval '24 hours','Proteção antifraude: violações graves recorrentes. Revisão disponível.',NULL,now())
    ON CONFLICT(user_id) DO UPDATE SET is_banned=true,banned_until=excluded.banned_until,banned_reason=excluded.banned_reason,banned_by=NULL,updated_at=now();
    DELETE FROM public.game_login_sessions_v1214 WHERE user_id=p_user_id;
    DELETE FROM public.player_presence WHERE user_id=p_user_id;
    UPDATE public.stellar_security_events SET auto_suspended=true WHERE id=v_event;
    v_banned:=true;
  END IF;
 END IF;
 RETURN jsonb_build_object('recorded',true,'event_id',v_event,'auto_suspended',v_banned,'critical_strikes',coalesce(v_count,0));
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_security_review_incident(p_event_id bigint, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_row public.stellar_security_events;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado'; END IF;
 IF p_note IS NULL OR length(btrim(p_note))<3 THEN RAISE EXCEPTION 'Motivo da revisão obrigatório'; END IF;
 UPDATE public.stellar_security_events SET reviewed_at=now(),reviewed_by=auth.uid(),review_note=left(btrim(p_note),200)
 WHERE id=p_event_id RETURNING * INTO v_row;
 IF NOT FOUND THEN RAISE EXCEPTION 'Incidente inexistente'; END IF;
 RETURN jsonb_build_object('ok',true,'event_id',v_row.id,'user_id',v_row.user_id,'reviewed_at',v_row.reviewed_at);
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_settle_auction_bid_v1182(p_user_id uuid, p_hour_key text, p_lot_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_bid public.auction_bids%rowtype;
 v_winner public.auction_bids%rowtype;
 v_catalog public.live_shop_prices_v16%rowtype;
 v_existing public.stellar_auction_settlements_v1182%rowtype;
 v_state jsonb;
 v_id text;
 v_prefix text;
 v_catalog_key text;
 v_grant jsonb;
 v_kind text;
 v_count int;
 v_qty int;
 v_slots int;
 v_credits bigint;
 v_available bigint;
 v_label text;
 v_callsign text;
 v_new_drone_id text;
 v_history jsonb;
 v_now timestamptz:=clock_timestamp();
 v_result jsonb;
begin
 if p_user_id is null or p_hour_key !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}$'
   or p_lot_ref !~ '^(item|ship|ammo|rocket|petGear):[a-zA-Z0-9_]+$'
 then raise exception 'AUCTION_REQUEST_INVALID'; end if;
 if p_hour_key >= to_char(v_now at time zone 'America/Sao_Paulo','YYYY-MM-DD-HH24')
 then return jsonb_build_object('ok',false,'code','AUCTION_STILL_ACTIVE','message','Este leilão ainda está em andamento.');end if;
 perform pg_advisory_xact_lock(hashtextextended(p_hour_key||'|'||p_lot_ref,1182));
 select * into v_bid from public.auction_bids
 where user_id=p_user_id and hour_key=p_hour_key and lot_ref=p_lot_ref for update;
 if not found then return jsonb_build_object('ok',false,'code','AUCTION_BID_NOT_FOUND','message','Este lance não foi encontrado.');end if;
 select * into v_existing from public.stellar_auction_settlements_v1182 where bid_id=v_bid.id;
 if found then
    select state into v_state from public.game_saves where user_id=p_user_id;
    return jsonb_build_object('ok',true,'replayed',true,'code','AUCTION_ALREADY_SETTLED',
       'receipt',jsonb_build_object('bid_id',v_bid.id,'paid_credits',v_existing.paid_credits,'grant',v_existing.award),
       'state',v_state);
 end if;
 if v_bid.status='won' then
   return jsonb_build_object('ok',false,'code','AUCTION_LEGACY_REVIEW',
     'message','Lance antigo marcado como vencedor. A entrega precisa ser conferida sem cobrança duplicada.');
 end if;
 if v_bid.status not in ('active','lost') then
   return jsonb_build_object('ok',false,'code','AUCTION_NOT_ACTIVE','message','Este lance já foi encerrado.');
 end if;
 select * into v_winner from public.auction_bids
 where hour_key=p_hour_key and lot_ref=p_lot_ref and status in ('active','won')
 order by user_bid desc, updated_at asc, id asc limit 1;
 if v_winner.id is distinct from v_bid.id then
   update public.auction_bids set status='lost',updated_at=v_now where id=v_bid.id and status='active';
   return jsonb_build_object('ok',false,'code','AUCTION_OUTBID','message','Outro piloto venceu este lote. Nenhum valor foi descontado.');
 end if;
 if v_bid.status<>'active' or v_bid.user_bid is null or v_bid.user_bid<=0 then
   return jsonb_build_object('ok',false,'code','AUCTION_INVALID_BID','message','Lance inválido; não foi cobrado.');
 end if;
 v_prefix:=split_part(p_lot_ref,':',1);v_id:=split_part(p_lot_ref,':',2);
 v_catalog_key:=case when v_prefix='item' and v_id in ('iris','flax') then 'drone:'||v_id
                     when v_prefix='petGear' then 'pet_gear:'||v_id
                     else p_lot_ref end;
 select * into v_catalog from public.live_shop_prices_v16 where catalog_key=v_catalog_key;
 if not found or v_catalog.enabled is false then
   return jsonb_build_object('ok',false,'code','AUCTION_CATALOG_UNAVAILABLE','message','Produto indisponível no catálogo oficial. O lance permanece guardado.');
 end if;
 v_grant:=v_catalog.meta->'grant'; v_kind:=v_grant->>'kind';
 if v_grant is null or v_grant->>'id' is distinct from v_id or
   ((v_prefix='ship' and v_kind<>'ship') or
    (v_prefix='item' and v_id in ('iris','flax') and v_kind<>'drone') or
    (v_prefix='item' and v_id not in ('iris','flax') and v_kind<>'inventory') or
    (v_prefix='ammo' and v_kind<>'ammo') or
    (v_prefix='rocket' and v_kind<>'rocket') or
    (v_prefix='petGear' and v_kind<>'pet_gear'))
 then raise exception 'AUCTION_CATALOG_MISMATCH';end if;
 if v_bid.user_bid < public.auction_minimum_floor_v1916(p_lot_ref)
 then return jsonb_build_object('ok',false,'code','AUCTION_BELOW_FLOOR','message','Lance abaixo do preço mínimo confirmado.');end if;
 if v_bid.lot->>'ref' is distinct from p_lot_ref or v_bid.lot->>'id' is distinct from v_id
 then raise exception 'AUCTION_LOT_MISMATCH';end if;
 select g.state,p.callsign into v_state,v_callsign from public.game_saves g
 join public.profiles p on p.id=g.user_id where g.user_id=p_user_id for update of g,p;
 if v_state is null or v_state->>'accountOwnerId' is distinct from p_user_id::text
 then raise exception 'AUCTION_SAVE_OWNER_INVALID';end if;
 v_credits:=coalesce((v_state#>>'{profile,credits}')::bigint,0);
 if v_credits < v_bid.user_bid then
   return jsonb_build_object('ok',false,'code','AUCTION_INSUFFICIENT_CREDITS',
      'message','Créditos insuficientes para pagar o lance vencedor. Nenhuma cobrança feita.');
 end if;
 v_qty:=coalesce((v_grant->>'qty')::int,1);
 if v_qty<1 or v_qty>1000000 then raise exception 'AUCTION_GRANT_QTY_INVALID';end if;
 if v_prefix in ('ammo','rocket') and coalesce((v_bid.lot->>'qty')::int,0)<>v_qty
 then raise exception 'AUCTION_LOT_QTY_MISMATCH';end if;
 if v_kind='drone' then
   v_count:=jsonb_array_length(coalesce(v_state->'drones','[]'::jsonb));
   if v_count>=8 then return jsonb_build_object('ok',false,'code','AUCTION_FLEET_FULL',
      'message','Sua frota está completa. Libere uma vaga para receber o drone vencedor.');end if;
   v_slots:=greatest(1,least(10,coalesce((v_grant->>'slots')::int,1)));
   v_new_drone_id:='d_auc_'||(extract(epoch from v_now)*1000)::bigint||'_'||substr(md5(v_bid.id::text||p_user_id::text),1,6);
   v_state:=jsonb_set(v_state,'{drones}',coalesce(v_state->'drones','[]'::jsonb)||
      jsonb_build_array(jsonb_build_object('id',v_new_drone_id,'type',v_id,
      'slots',(select jsonb_agg(null::text) from generate_series(1,v_slots)))),true);
 elsif v_kind='ship' then
   if coalesce(v_state->'ownedShips','[]'::jsonb) ? v_id then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Nave já adquirida. O lance precisa de revisão.');end if;
   v_state:=jsonb_set(v_state,'{ownedShips}',coalesce(v_state->'ownedShips','[]'::jsonb)||to_jsonb(v_id),true);
 elsif v_kind='inventory' then
   if v_catalog.kind='extra' and (coalesce((v_state->'inventory'->>v_id)::int,0)>0 or
     coalesce(v_state#>'{shipLoadout,extras}','[]'::jsonb) ? v_id) then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Extra já adquirido. Nenhuma cobrança efetuada.');end if;
   v_state:=jsonb_set(v_state,array['inventory',v_id],to_jsonb(coalesce((v_state->'inventory'->>v_id)::int,0)+v_qty),true);
 elsif v_kind in ('ammo','rocket') then
   v_available:=coalesce((v_state->(case when v_kind='ammo' then 'ammo' else 'rockets' end)->>v_id)::bigint,0);
   if v_available+v_qty>1000000000 then raise exception 'AUCTION_STOCK_OVERFLOW';end if;
   v_state:=jsonb_set(v_state,array[case when v_kind='ammo' then 'ammo' else 'rockets' end,v_id],to_jsonb(v_available+v_qty),true);
 elsif v_kind='pet_gear' then
   if coalesce((v_state#>>'{pet,owned}')::boolean,false) is false then
      return jsonb_build_object('ok',false,'code','AUCTION_PET_REQUIRED','message','Você precisa possuir o AUX-9 para receber este módulo.');end if;
   if coalesce((v_state#>>array['pet','gearsOwned',v_id])::boolean,false) then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Módulo AUX já adquirido.');end if;
   v_state:=jsonb_set(v_state,array['pet','gearsOwned',v_id],'true'::jsonb,true);
 else raise exception 'AUCTION_GRANT_UNSUPPORTED';end if;
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(v_credits-v_bid.user_bid),true);
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',
    to_jsonb(coalesce((v_state->>'serverPurchaseRevision')::bigint,0)+1),true);
 v_label:=coalesce(nullif(v_bid.lot->>'name',''),v_catalog.display_name,v_id);
 v_history:=jsonb_build_array(jsonb_build_object('at',(extract(epoch from v_now)*1000)::bigint,
    'bid',v_bid.user_bid,'name',v_label,'result','VENCEU')) || coalesce(v_state#>'{auction,history}','[]'::jsonb);
 select coalesce(jsonb_agg(value order by rn),'[]'::jsonb) into v_history
 from jsonb_array_elements(v_history) with ordinality as x(value,rn) where rn<=12;
 v_state:=jsonb_set(v_state,'{auction,history}',v_history,true);
 v_result:=public.stellar_commit_player_save_v118(p_user_id,v_state,v_now,v_callsign);
 if v_result->>'ok'<>'true' then raise exception 'AUCTION_SAVE_NOT_CONFIRMED';end if;
 insert into public.stellar_auction_settlements_v1182
 (bid_id,user_id,hour_key,lot_ref,paid_credits,award,save_hash)
 values(v_bid.id,p_user_id,p_hour_key,p_lot_ref,v_bid.user_bid,
    jsonb_build_object('kind',v_kind,'id',v_id,'qty',v_qty,'drone_id',v_new_drone_id),md5(v_state::text));
 update public.auction_bids set status='won',updated_at=v_now where id=v_bid.id and status='active';
 if not found then raise exception 'AUCTION_STATUS_RACE';end if;
 return jsonb_build_object('ok',true,'replayed',false,'state',v_state,'receipt',
    jsonb_build_object('bid_id',v_bid.id,'paid_credits',v_bid.user_bid,'product',v_label,
     'grant',jsonb_build_object('kind',v_kind,'id',v_id,'qty',v_qty,'drone_id',v_new_drone_id)));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u423_equip(p_config integer, p_slot text, p_item text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); slot_found text; owned bigint; needed bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_config NOT IN (1,2) OR p_slot NOT IN ('defense','engine','weapon','utility')
    OR length(coalesce(p_item,''))>48 THEN RAISE EXCEPTION 'INVALID_LOADOUT'; END IF;
 -- Bloqueio da linha central impede equipagens simultaneas acima da quantidade fabricada.
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_REQUIRED'; END IF;
 IF p_item IS NULL THEN
  DELETE FROM public.stellar_u423_loadouts WHERE user_id=u AND config=p_config AND slot=p_slot;
 ELSE
  SELECT m.slot INTO slot_found FROM public.stellar_u423_module_rules m WHERE m.item=p_item;
  IF slot_found IS DISTINCT FROM p_slot THEN RAISE EXCEPTION 'MODULE_SLOT_MISMATCH'; END IF;
  SELECT quantity INTO owned FROM public.stellar_u42_inventory WHERE user_id=u AND item=p_item;
  SELECT count(*) INTO needed FROM public.stellar_u423_loadouts
   WHERE user_id=u AND item=p_item AND NOT(config=p_config AND slot=p_slot);
  IF coalesce(owned,0)<=needed THEN RAISE EXCEPTION 'MODULE_NOT_OWNED_OR_BUSY'; END IF;
  INSERT INTO public.stellar_u423_loadouts(user_id,config,slot,item) VALUES(u,p_config,p_slot,p_item)
  ON CONFLICT(user_id,config,slot) DO UPDATE SET item=excluded.item,equipped_at=now();
 END IF;
 RETURN jsonb_build_object('ok',true,'config',p_config,'slot',p_slot,'item',p_item);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u423_loadout_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',i.item,'qty',i.quantity)),'[]'::jsonb)
          FROM public.stellar_u42_inventory i WHERE i.user_id=u AND i.quantity>0),
 'definitions',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',m.item,'slot',m.slot,'proposal',m.proposed_bonus,'combatEnabled',m.combat_enabled)),'[]'::jsonb)
                FROM public.stellar_u423_module_rules m),
 'equipped',(SELECT coalesce(jsonb_agg(jsonb_build_object('config',l.config,'slot',l.slot,'code',l.item)),'[]'::jsonb)
             FROM public.stellar_u423_loadouts l WHERE l.user_id=u));
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u423_operation_admin(p_tier integer, p_goal integer, p_min integer, p_reward integer, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_tier NOT IN (1,2,3) OR p_goal NOT BETWEEN 10 AND 10000 OR p_min NOT BETWEEN 1 AND 2000 OR p_min>p_goal
  OR p_reward NOT BETWEEN 1 AND 5000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_RULE'; END IF;
 UPDATE public.stellar_u423_ops_config SET goal_kills=p_goal,personal_min=p_min,research_points=p_reward,
 enabled=p_enabled,updated_at=now() WHERE tier=p_tier;
 RETURN jsonb_build_object('ok',true,'tier',p_tier);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u423_operation_claim(p_tier integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); p jsonb; c jsonb; v_id uuid; w date; inserted uuid; v_kills bigint; v_team bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_tier NOT IN (1,2,3) THEN RAISE EXCEPTION 'INVALID_TIER'; END IF;
 -- A elegibilidade e apurada no banco; UNIQUE permite so um resgate por piloto/semana/tier.
 p:=public.stellar_u423_operation_progress();
 SELECT t.val INTO c FROM jsonb_array_elements(p->'tiers') AS t(val) WHERE (t.val->>'tier')::integer=p_tier;
 IF c IS NULL THEN RAISE EXCEPTION 'TIER_DISABLED'; END IF;
 IF (c->>'claimed')::boolean THEN RETURN jsonb_build_object('ok',true,'alreadyClaimed',true); END IF;
 IF NOT (c->>'ready')::boolean THEN RAISE EXCEPTION 'MISSION_INCOMPLETE'; END IF;
 w:=(p->>'weekStart')::date;
 v_kills:=(p->>'personalKills')::bigint;
 v_team:=(p->>'teamKills')::bigint;
 SELECT squad_id INTO v_id FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF v_id IS NULL THEN RAISE EXCEPTION 'SQUAD_REQUIRED'; END IF;
 INSERT INTO public.stellar_u423_ops_claims(user_id,week_start,tier,squad_id,personal_kills,team_kills,granted_research)
 VALUES(u,w,p_tier,v_id,v_kills,v_team,(c->>'reward')::integer)
 ON CONFLICT(user_id,week_start,tier) DO NOTHING RETURNING user_id INTO inserted;
 IF inserted IS NULL THEN RETURN jsonb_build_object('ok',true,'alreadyClaimed',true); END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,(c->>'reward')::integer)
 ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
 RETURN jsonb_build_object('ok',true,'claimed',true,'tier',p_tier,'rewardResearch',(c->>'reward')::integer);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u423_operation_progress()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); s_id uuid; w date:=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date;
 personal bigint:=0; team bigint:=0; tiers jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT squad_id INTO s_id FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF s_id IS NOT NULL THEN
  SELECT coalesce(sum(x.kills),0),coalesce(max(x.kills) FILTER (WHERE x.player=u),0)
  INTO team,personal FROM (
   SELECT m.user_id player,count(n.kill_key)::bigint kills
   FROM public.stellar_u42_squad_members m
   JOIN public.stellar_u42_squads s ON s.id=m.squad_id
   LEFT JOIN public.stellar_npc_reward_ledger n ON n.user_id=m.user_id
    AND n.issued_at>=GREATEST(w::timestamptz,m.joined_at,s.created_at)
   WHERE m.squad_id=s_id GROUP BY m.user_id
  ) x;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('tier',c.tier,'goal',c.goal_kills,'mineRequired',c.personal_min,
  'reward',c.research_points,'enabled',c.enabled,'claimed',EXISTS(
   SELECT 1 FROM public.stellar_u423_ops_claims z WHERE z.user_id=u AND z.week_start=w AND z.tier=c.tier),
  'ready',(s_id IS NOT NULL AND c.enabled AND team>=c.goal_kills AND personal>=c.personal_min AND NOT EXISTS(
   SELECT 1 FROM public.stellar_u423_ops_claims z WHERE z.user_id=u AND z.week_start=w AND z.tier=c.tier))) ORDER BY c.tier),'[]'::jsonb)
 INTO tiers FROM public.stellar_u423_ops_config c;
 RETURN jsonb_build_object('inSquad',s_id IS NOT NULL,'weekStart',w,'teamKills',team,'personalKills',personal,'tiers',tiers);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_admin_clan(p_structure text, p_goal integer, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_goal NOT BETWEEN 100 AND 100000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS'; END IF;
 UPDATE public.stellar_u426_clan_rules SET research_goal=p_goal,enabled=p_enabled,updated_at=now() WHERE structure=p_structure;
 IF NOT FOUND THEN RAISE EXCEPTION 'STRUCTURE_UNKNOWN'; END IF;
 RETURN jsonb_build_object('ok',true);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_admin_market(p_fee integer, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_fee NOT BETWEEN 0 AND 1500 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS'; END IF;
 UPDATE public.stellar_u426_market_rules SET fee_bps=p_fee,enabled=p_enabled,updated_at=now() WHERE id=1;
 RETURN jsonb_build_object('ok',true);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_admin_sector(p_code text, p_minutes integer, p_kills integer, p_cost integer, p_reward integer, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_minutes NOT BETWEEN 5 AND 1440 OR p_kills NOT BETWEEN 5 AND 10000 OR p_cost NOT BETWEEN 0 AND 10000 OR p_reward NOT BETWEEN 1 AND 5000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS'; END IF;
 UPDATE public.stellar_u426_sectors SET minutes=p_minutes,kills_required=p_kills,research_cost=p_cost,research_reward=p_reward,enabled=p_enabled,updated_at=now() WHERE code=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'SECTOR_UNKNOWN'; END IF;
 RETURN jsonb_build_object('ok',true,'code',p_code);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_clan_fund(p_structure text, p_points integer, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); c uuid; balance bigint; total bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_points NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'INVALID_CONTRIBUTION'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_u426_clan_donations WHERE user_id=u AND request_id=p_request) THEN
  RETURN jsonb_build_object('ok',true,'alreadyFunded',true); END IF;
 SELECT clan_id INTO c FROM public.clan_members WHERE user_id=u;
 IF c IS NULL THEN RAISE EXCEPTION 'CLAN_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_u426_clan_rules WHERE structure=p_structure AND enabled) THEN RAISE EXCEPTION 'STRUCTURE_UNAVAILABLE'; END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,0) ON CONFLICT(user_id) DO NOTHING;
 SELECT points INTO balance FROM public.stellar_u42_research WHERE user_id=u FOR UPDATE;
 IF balance<p_points THEN RAISE EXCEPTION 'RESEARCH_INSUFFICIENT'; END IF;
 UPDATE public.stellar_u42_research SET points=points-p_points,updated_at=now() WHERE user_id=u;
 INSERT INTO public.stellar_u426_clan_funding(clan_id,structure,research_total) VALUES(c,p_structure,p_points)
 ON CONFLICT(clan_id,structure) DO UPDATE SET research_total=public.stellar_u426_clan_funding.research_total+excluded.research_total,updated_at=now()
 RETURNING research_total INTO total;
 INSERT INTO public.stellar_u426_clan_donations(user_id,clan_id,structure,research_points,request_id) VALUES(u,c,p_structure,p_points,p_request);
 RETURN jsonb_build_object('ok',true,'total',total,'spent',p_points);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_clan_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); c uuid; balance bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT clan_id INTO c FROM public.clan_members WHERE user_id=u;
 SELECT coalesce(points,0) INTO balance FROM public.stellar_u42_research WHERE user_id=u;
 RETURN jsonb_build_object('ok',true,'hasClan',c IS NOT NULL,'research',coalesce(balance,0),
 'structures',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',r.structure,'title',r.title,'goal',r.research_goal,
 'enabled',r.enabled,'total',coalesce(f.research_total,0)) ORDER BY r.structure),'[]'::jsonb)
 FROM public.stellar_u426_clan_rules r LEFT JOIN public.stellar_u426_clan_funding f ON f.structure=r.structure AND f.clan_id=c));
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_exploration()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); p bigint; active jsonb; history jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT coalesce(points,0) INTO p FROM public.stellar_u42_research WHERE user_id=u;
 SELECT jsonb_build_object('id',r.id,'sector',r.sector,'startedAt',r.started_at,'readyAt',r.ready_at,
 'required',r.kills_required,'reward',r.research_reward,
 'verifiedKills',(SELECT count(*) FROM public.stellar_npc_reward_ledger l WHERE l.user_id=u AND l.issued_at>=r.started_at),
 'completed',r.claimed_at IS NOT NULL)
 INTO active FROM public.stellar_u426_sector_runs r WHERE r.user_id=u AND r.claimed_at IS NULL LIMIT 1;
 SELECT coalesce(jsonb_agg(jsonb_build_object('sector',h.sector,'claimedAt',h.claimed_at) ORDER BY h.claimed_at DESC),'[]'::jsonb)
 INTO history FROM (SELECT sector,claimed_at FROM public.stellar_u426_sector_runs WHERE user_id=u AND claimed_at IS NOT NULL ORDER BY claimed_at DESC LIMIT 12) h;
 RETURN jsonb_build_object('ok',true,'research',coalesce(p,0),'active',active,'history',history,
 'sectors',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',code,'title',title,'lore',lore,'minutes',minutes,
 'kills',kills_required,'cost',research_cost,'reward',research_reward,'enabled',enabled) ORDER BY code),'[]'::jsonb)
 FROM public.stellar_u426_sectors));
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_market_buy(p_offer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); o public.stellar_u426_market_offers%ROWTYPE; rules record;
 buyer_state jsonb; seller_state jsonb; buyer_cash bigint; seller_cash bigint;
 total bigint; fee bigint; net bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.stellar_u426_market_offers WHERE id=p_offer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_MISSING'; END IF;
 IF o.status='sold' AND o.buyer=u THEN RETURN jsonb_build_object('ok',true,'alreadyPurchased',true); END IF;
 IF o.status<>'open' OR o.seller=u THEN RAISE EXCEPTION 'OFFER_NOT_AVAILABLE'; END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 IF NOT rules.enabled THEN RAISE EXCEPTION 'MARKET_PAUSED'; END IF;
 -- Stable UUID ordering prevents buyer/seller concurrent purchases deadlocking wallets.
 PERFORM 1 FROM public.game_saves WHERE user_id IN (u,o.seller) ORDER BY user_id FOR UPDATE;
 SELECT state INTO buyer_state FROM public.game_saves WHERE user_id=u;
 SELECT state INTO seller_state FROM public.game_saves WHERE user_id=o.seller;
 IF buyer_state IS NULL OR seller_state IS NULL THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 buyer_cash:=coalesce((buyer_state#>>'{profile,credits}')::bigint,0);
 seller_cash:=coalesce((seller_state#>>'{profile,credits}')::bigint,0);
 total:=o.unit_price*o.quantity;
 fee:=(total*rules.fee_bps+9999)/10000;
 net:=total-fee;
 IF buyer_cash<total THEN RAISE EXCEPTION 'CREDITS_INSUFFICIENT'; END IF;
 IF seller_cash>9000000000000000-net THEN RAISE EXCEPTION 'SELLER_WALLET_CAP'; END IF;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(state,'{profile,credits}',to_jsonb(buyer_cash-total),true),
 '{serverPurchaseRevision}',to_jsonb(coalesce((state->>'serverPurchaseRevision')::bigint,0)+1),true),updated_at=now() WHERE user_id=u;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(state,'{profile,credits}',to_jsonb(seller_cash+net),true),
 '{serverPurchaseRevision}',to_jsonb(coalesce((state->>'serverPurchaseRevision')::bigint,0)+1),true),updated_at=now() WHERE user_id=o.seller;
 UPDATE public.profiles SET credits=buyer_cash-total,updated_at=now() WHERE id=u;
 UPDATE public.profiles SET credits=seller_cash+net,updated_at=now() WHERE id=o.seller;
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,o.item,o.quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
 UPDATE public.stellar_u426_market_offers SET status='sold',buyer=u,fee_credits=fee,closed_at=now() WHERE id=o.id;
 RETURN jsonb_build_object('ok',true,'item',o.item,'quantity',o.quantity,'paid',total,'fee',fee);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_market_cancel(p_offer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); o public.stellar_u426_market_offers%ROWTYPE;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.stellar_u426_market_offers WHERE id=p_offer AND seller=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_MISSING'; END IF;
 IF o.status='cancelled' THEN RETURN jsonb_build_object('ok',true,'alreadyCancelled',true); END IF;
 IF o.status<>'open' THEN RAISE EXCEPTION 'OFFER_CLOSED'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 UPDATE public.stellar_u426_market_offers SET status='cancelled',closed_at=now() WHERE id=o.id;
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,o.item,o.quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
 RETURN jsonb_build_object('ok',true,'returned',o.quantity);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_market_sell(p_item text, p_qty integer, p_unit bigint, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); have bigint; used bigint; v_id uuid; rules record;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_qty NOT BETWEEN 1 AND 5 OR p_unit NOT BETWEEN 1000 AND 100000000 THEN RAISE EXCEPTION 'INVALID_OFFER'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT id INTO v_id FROM public.stellar_u426_market_offers WHERE seller=u AND request_id=p_request;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'alreadyListed',true,'offerId',v_id); END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 IF NOT rules.enabled THEN RAISE EXCEPTION 'MARKET_PAUSED'; END IF;
 IF (SELECT count(*) FROM public.stellar_u426_market_offers WHERE seller=u AND status='open')>=10 THEN RAISE EXCEPTION 'OFFER_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_u42_catalog WHERE code=p_item AND kind='forge') THEN RAISE EXCEPTION 'ITEM_NOT_TRADABLE'; END IF;
 SELECT quantity INTO have FROM public.stellar_u42_inventory WHERE user_id=u AND item=p_item FOR UPDATE;
 SELECT count(*) INTO used FROM public.stellar_u423_loadouts WHERE user_id=u AND item=p_item;
 IF coalesce(have,0)-used<p_qty THEN RAISE EXCEPTION 'ITEM_NOT_AVAILABLE'; END IF;
 UPDATE public.stellar_u42_inventory SET quantity=quantity-p_qty WHERE user_id=u AND item=p_item;
 INSERT INTO public.stellar_u426_market_offers(seller,item,quantity,unit_price,request_id)
 VALUES(u,p_item,p_qty,p_unit,p_request) RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'offerId',v_id,'escrowed',p_qty);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_market_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); rules record; cash bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 SELECT coalesce((state#>>'{profile,credits}')::bigint,0) INTO cash FROM public.game_saves WHERE user_id=u;
 RETURN jsonb_build_object('ok',true,'credits',coalesce(cash,0),'feeBps',rules.fee_bps,'enabled',rules.enabled,
 'offers',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'item',o.item,'quantity',o.quantity,'unitPrice',o.unit_price,
 'sellerName',coalesce(p.callsign,'Piloto'),'mine',o.seller=u,'listedAt',o.listed_at) ORDER BY o.listed_at DESC),'[]'::jsonb)
 FROM (SELECT * FROM public.stellar_u426_market_offers WHERE status='open' ORDER BY listed_at DESC LIMIT 60) o
 LEFT JOIN public.profiles p ON p.id=o.seller),
 'mine',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'item',item,'status',status,'quantity',quantity,
 'price',unit_price,'fee',fee_credits) ORDER BY listed_at DESC),'[]'::jsonb)
 FROM (SELECT * FROM public.stellar_u426_market_offers WHERE seller=u ORDER BY listed_at DESC LIMIT 20) x),
 'stock',(SELECT coalesce(jsonb_agg(jsonb_build_object('item',i.item,'quantity',i.quantity,
 'equipped',(SELECT count(*) FROM public.stellar_u423_loadouts l WHERE l.user_id=u AND l.item=i.item))),'[]'::jsonb)
 FROM public.stellar_u42_inventory i WHERE i.user_id=u AND i.quantity>0));
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_sector_claim(p_run uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); r public.stellar_u426_sector_runs%ROWTYPE; kills bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.stellar_u426_sector_runs WHERE id=p_run AND user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RUN_MISSING'; END IF;
 IF r.claimed_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'alreadyClaimed',true); END IF;
 IF r.ready_at>now() THEN RAISE EXCEPTION 'SCAN_IN_PROGRESS'; END IF;
 SELECT count(*) INTO kills FROM public.stellar_npc_reward_ledger WHERE user_id=u AND issued_at>=r.started_at;
 IF kills<r.kills_required THEN RAISE EXCEPTION 'VERIFIED_KILLS_INCOMPLETE'; END IF;
 UPDATE public.stellar_u426_sector_runs SET claimed_at=now() WHERE id=r.id;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,r.research_reward)
 ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
 RETURN jsonb_build_object('ok',true,'researchGranted',r.research_reward,'sector',r.sector);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u426_sector_start(p_sector text, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); c public.stellar_u426_sectors%ROWTYPE; r public.stellar_u426_sector_runs%ROWTYPE; have bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_sector IS NULL THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT * INTO r FROM public.stellar_u426_sector_runs WHERE user_id=u AND created_request=p_request;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'alreadyStarted',true,'runId',r.id); END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_u426_sector_runs WHERE user_id=u AND claimed_at IS NULL) THEN RAISE EXCEPTION 'SECTOR_ALREADY_ACTIVE'; END IF;
 SELECT * INTO c FROM public.stellar_u426_sectors WHERE code=p_sector AND enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'SECTOR_UNAVAILABLE'; END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,0) ON CONFLICT(user_id) DO NOTHING;
 SELECT points INTO have FROM public.stellar_u42_research WHERE user_id=u FOR UPDATE;
 IF have<c.research_cost THEN RAISE EXCEPTION 'RESEARCH_INSUFFICIENT'; END IF;
 UPDATE public.stellar_u42_research SET points=points-c.research_cost,updated_at=now() WHERE user_id=u;
 INSERT INTO public.stellar_u426_sector_runs(user_id,sector,ready_at,kills_required,research_reward,created_request)
 VALUES(u,p_sector,now()+make_interval(mins=>c.minutes),c.kills_required,c.research_reward,p_request) RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'runId',r.id,'readyAt',r.ready_at);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_action(p_action text, p_code text, p_quantity integer, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u uuid:=auth.uid(); s jsonb; cfg jsonb; kind text; f text;
 v_mat record; res_name text; have bigint; debit bigint; issued bigint; spent bigint; cargo jsonb; prof jsonb;
 exp_row public.stellar_u42_expeditions%ROWTYPE; prior jsonb; outcome jsonb;
 cost bigint; revision bigint; research_award integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_action NOT IN ('forge','expedition_start','expedition_claim','donate')
 OR p_quantity NOT BETWEEN 1 AND 100 OR p_code !~ '^[a-z0-9_]{2,48}$' THEN RAISE EXCEPTION 'ACTION_INVALID'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT result INTO prior FROM public.stellar_u42_actions WHERE user_id=u AND request_id=p_request_id;
 IF FOUND THEN RETURN prior; END IF;
 SELECT c.rule,c.kind INTO cfg,kind FROM public.stellar_u42_catalog c WHERE c.code=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'CATALOG_MISSING'; END IF;
 prof:=coalesce(s->'profile','{}'::jsonb);
 cargo:=coalesce(s->'cargo','{}'::jsonb);
 IF p_action='forge' THEN
  IF kind<>'forge' OR p_quantity>5 THEN RAISE EXCEPTION 'FORGE_INVALID'; END IF;
  FOR v_mat IN SELECT key,value FROM jsonb_each_text(cfg->'cost') LOOP
   debit:=v_mat.value::bigint*p_quantity;
   have:=coalesce((cargo->>v_mat.key)::bigint,0);
   -- Não confiar no cargo isoladamente: somente materiais creditados no ledger Astral V38.1.
   SELECT coalesce(sum((l.quote->>'resourceQty')::bigint),0) INTO issued
     FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.quote->>'resource'=v_mat.key;
   SELECT coalesce(sum(t.quantity),0) INTO spent FROM public.stellar_u42_material_spends t
     WHERE t.user_id=u AND t.material=v_mat.key;
   IF have<debit OR issued-spent<debit THEN RAISE EXCEPTION 'MATERIAL_NOT_VERIFIED: %',v_mat.key; END IF;
   cargo:=jsonb_set(cargo,ARRAY[v_mat.key],to_jsonb(have-debit),true);
   IF debit>0 THEN INSERT INTO public.stellar_u42_material_spends(user_id,request_id,material,quantity)
      VALUES(u,p_request_id,v_mat.key,debit); END IF;
  END LOOP;
  INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,p_code,p_quantity)
  ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
  outcome:=jsonb_build_object('ok',true,'action',p_action,'code',p_code,'quantity',p_quantity,
   'notice','Protótipo criado no inventário de pesquisa. Bônus de combate ainda não ativados.');
 ELSIF p_action='expedition_start' THEN
  IF kind<>'expedition' OR p_quantity<>1 THEN RAISE EXCEPTION 'EXPEDITION_INVALID'; END IF;
  IF EXISTS(SELECT 1 FROM public.stellar_u42_expeditions WHERE user_id=u AND claimed_at IS NULL) THEN
   RAISE EXCEPTION 'EXPEDITION_ALREADY_RUNNING'; END IF;
  cost:=(cfg->>'credits')::bigint;
  have:=coalesce((prof->>'credits')::bigint,0);
  IF have<cost THEN RAISE EXCEPTION 'CREDITS_INSUFFICIENT'; END IF;
  prof:=jsonb_set(prof,'{credits}',to_jsonb(have-cost),true);
  INSERT INTO public.stellar_u42_expeditions(user_id,code,ready_at,reward_points)
  VALUES(u,p_code,now()+make_interval(mins=>(cfg->>'minutes')::integer),(cfg->>'research')::integer)
  RETURNING * INTO exp_row;
  UPDATE public.profiles SET credits=have-cost,updated_at=now() WHERE id=u;
  outcome:=jsonb_build_object('ok',true,'action',p_action,'readyAt',exp_row.ready_at,'expeditionId',exp_row.id);
 ELSIF p_action='expedition_claim' THEN
  IF kind<>'expedition' OR p_quantity<>1 THEN RAISE EXCEPTION 'EXPEDITION_INVALID'; END IF;
  SELECT * INTO exp_row FROM public.stellar_u42_expeditions
  WHERE user_id=u AND code=p_code AND claimed_at IS NULL ORDER BY started_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXPEDITION_MISSING'; END IF;
  IF exp_row.ready_at>now() THEN RAISE EXCEPTION 'EXPEDITION_NOT_READY'; END IF;
  UPDATE public.stellar_u42_expeditions SET claimed_at=now() WHERE id=exp_row.id;
  research_award:=exp_row.reward_points;
  INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,research_award)
   ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
  outcome:=jsonb_build_object('ok',true,'action',p_action,'researchPoints',research_award);
 ELSIF p_action='donate' THEN
  IF kind<>'project' THEN RAISE EXCEPTION 'PROJECT_INVALID'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS NULL OR length(f)<2 THEN RAISE EXCEPTION 'FACTION_MISSING'; END IF;
  res_name:=cfg->>'resource';
  have:=coalesce((cargo->>res_name)::bigint,0);
  debit:=(cfg->>'perPoint')::bigint*p_quantity;
  SELECT coalesce(sum((l.quote->>'resourceQty')::bigint),0) INTO issued
    FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.quote->>'resource'=res_name;
  SELECT coalesce(sum(t.quantity),0) INTO spent FROM public.stellar_u42_material_spends t
    WHERE t.user_id=u AND t.material=res_name;
  IF have<debit OR issued-spent<debit THEN RAISE EXCEPTION 'MATERIAL_NOT_VERIFIED: %',res_name; END IF;
  cargo:=jsonb_set(cargo,ARRAY[res_name],to_jsonb(have-debit),true);
  INSERT INTO public.stellar_u42_material_spends(user_id,request_id,material,quantity)
    VALUES(u,p_request_id,res_name,debit);
  INSERT INTO public.stellar_u42_donations(user_id,faction,project_code,quantity) VALUES(u,f,p_code,p_quantity);
  outcome:=jsonb_build_object('ok',true,'action',p_action,'project',p_code,'contribution',p_quantity);
 END IF;
 IF p_action IN ('forge','donate','expedition_start') THEN
  revision:=coalesce((s->>'serverPurchaseRevision')::bigint,0)+1;
  s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(revision),true);
  s:=jsonb_set(s,'{cargo}',cargo,true);
  s:=jsonb_set(s,'{profile}',prof,true);
  UPDATE public.game_saves SET state=s,updated_at=now() WHERE user_id=u;
 END IF;
 INSERT INTO public.stellar_u42_actions(user_id,request_id,action,result) VALUES(u,p_request_id,p_action,outcome);
 RETURN outcome;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_admin_price(p_code text, p_cost jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE row public.stellar_u42_catalog%ROWTYPE; k text; n numeric; merged jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 SELECT * INTO row FROM public.stellar_u42_catalog WHERE code=p_code FOR UPDATE;
 IF NOT FOUND OR jsonb_typeof(p_cost)<>'object' THEN RAISE EXCEPTION 'INVALID_CONFIG'; END IF;
 merged:=row.rule;
 IF row.kind='forge' THEN
  IF p_cost ? 'cost' AND jsonb_typeof(p_cost->'cost')='object' THEN
    FOR k IN SELECT jsonb_object_keys(p_cost->'cost') LOOP
      IF k NOT IN ('Aurorium','Nexium','Eclipsium') THEN RAISE EXCEPTION 'INVALID_RESOURCE'; END IF;
      n:=(p_cost->'cost'->>k)::numeric;
      IF n<0 OR n>10000 OR n<>trunc(n) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
    END LOOP;
    merged:=jsonb_set(merged,'{cost}',p_cost->'cost',true);
  ELSE RAISE EXCEPTION 'INVALID_FORGE_COST'; END IF;
 ELSIF row.kind='expedition' THEN
  FOR k IN SELECT jsonb_object_keys(p_cost) LOOP
    IF k NOT IN ('credits','minutes','research') THEN RAISE EXCEPTION 'INVALID_FIELD'; END IF;
    n:=(p_cost->>k)::numeric;
    IF n<1 OR n>(CASE k WHEN 'credits' THEN 10000000 WHEN 'minutes' THEN 1440 ELSE 10000 END) OR n<>trunc(n) THEN RAISE EXCEPTION 'INVALID_NUMBER'; END IF;
  END LOOP;
  merged:=merged||p_cost;
 ELSE
  IF NOT (p_cost ? 'perPoint') THEN RAISE EXCEPTION 'INVALID_PROJECT_COST'; END IF;
  n:=(p_cost->>'perPoint')::numeric;
  IF n<1 OR n>100 OR n<>trunc(n) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  merged:=jsonb_set(merged,'{perPoint}',to_jsonb(n::integer),true);
 END IF;
 UPDATE public.stellar_u42_catalog SET rule=merged,updated_at=now() WHERE code=p_code;
 RETURN jsonb_build_object('ok',true,'code',p_code,'rule',merged);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u uuid:=auth.uid(); s jsonb; f text; squad_data jsonb; expeditions_data jsonb;
 item_data jsonb; score_data jsonb; project_data jsonb; research_value bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u;
 SELECT faction INTO f FROM public.profiles WHERE id=u;
 IF s IS NULL THEN RETURN jsonb_build_object('error','SAVE_MISSING'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',c.code,'quantity',i.quantity)),'[]'::jsonb)
 INTO item_data FROM public.stellar_u42_inventory i JOIN public.stellar_u42_catalog c ON c.code=i.item WHERE i.user_id=u;
 SELECT coalesce((SELECT jsonb_build_object('code',q.invite_code,'faction',q.faction,'owner',q.owner_id=u,
  'members',(SELECT count(*) FROM public.stellar_u42_squad_members m WHERE m.squad_id=q.id))
  FROM public.stellar_u42_squads q JOIN public.stellar_u42_squad_members m ON m.squad_id=q.id WHERE m.user_id=u),'null'::jsonb)
 INTO squad_data;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',e.code,'readyAt',e.ready_at,'reward',e.reward_points,
 'claimed',e.claimed_at IS NOT NULL) ORDER BY e.started_at DESC),'[]'::jsonb)
 INTO expeditions_data FROM (SELECT * FROM public.stellar_u42_expeditions WHERE user_id=u ORDER BY started_at DESC LIMIT 12) e;
 SELECT coalesce(points,0) INTO research_value FROM public.stellar_u42_research WHERE user_id=u;
 SELECT coalesce(jsonb_agg(jsonb_build_object('faction',t.faction,'verifiedKills',t.kills) ORDER BY t.kills DESC),'[]'::jsonb)
 INTO score_data FROM (
  SELECT p.faction,count(*)::bigint AS kills FROM public.stellar_npc_reward_ledger n
  JOIN public.profiles p ON p.id=n.user_id
  WHERE n.issued_at >= now()-interval '7 days' AND p.faction IS NOT NULL
  GROUP BY p.faction ORDER BY kills DESC LIMIT 8
 ) t;
 SELECT coalesce(jsonb_agg(jsonb_build_object('faction',x.faction,'project',x.project_code,'total',x.total)),'[]'::jsonb)
 INTO project_data FROM (SELECT faction,project_code,sum(quantity)::bigint AS total
 FROM public.stellar_u42_donations GROUP BY faction,project_code ORDER BY faction,project_code LIMIT 60) x;
 RETURN jsonb_build_object(
 'catalog',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',code,'kind',kind,'title',title,'rule',rule) ORDER BY kind,code),'[]'::jsonb) FROM public.stellar_u42_catalog),
 'materials',jsonb_build_object('Aurorium',coalesce(s#>'{cargo,Aurorium}','0'::jsonb),'Nexium',coalesce(s#>'{cargo,Nexium}','0'::jsonb),'Eclipsium',coalesce(s#>'{cargo,Eclipsium}','0'::jsonb)),
 'credits',coalesce(s#>'{profile,credits}','0'::jsonb),'faction',f,'isAdmin',public.is_game_admin_v1763(u),'items',item_data,'squad',squad_data,
 'expeditions',expeditions_data,'researchPoints',coalesce(research_value,0),'warScores',score_data,'projects',project_data);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_squad(p_action text, p_invite_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u uuid:=auth.uid(); existing uuid; q public.stellar_u42_squads%ROWTYPE;
 f text; new_owner uuid; n integer; code text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT squad_id INTO existing FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF p_action='create' THEN
  IF existing IS NOT NULL THEN RAISE EXCEPTION 'SQUAD_ALREADY_MEMBER'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS NULL OR length(f)<2 THEN RAISE EXCEPTION 'FACTION_MISSING'; END IF;
  code:=substr(md5(gen_random_uuid()::text),1,8);
  INSERT INTO public.stellar_u42_squads(invite_code,faction,owner_id) VALUES(code,f,u) RETURNING * INTO q;
  INSERT INTO public.stellar_u42_squad_members(user_id,squad_id) VALUES(u,q.id);
  RETURN jsonb_build_object('ok',true,'inviteCode',q.invite_code,'members',1);
 ELSIF p_action='join' THEN
  IF existing IS NOT NULL THEN RAISE EXCEPTION 'SQUAD_ALREADY_MEMBER'; END IF;
  IF p_invite_code !~ '^[a-f0-9]{8}$' THEN RAISE EXCEPTION 'INVITE_CODE_INVALID'; END IF;
  SELECT * INTO q FROM public.stellar_u42_squads WHERE invite_code=p_invite_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SQUAD_NOT_FOUND'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS DISTINCT FROM q.faction THEN RAISE EXCEPTION 'SQUAD_OTHER_FACTION'; END IF;
  SELECT count(*) INTO n FROM public.stellar_u42_squad_members WHERE squad_id=q.id;
  IF n>=4 THEN RAISE EXCEPTION 'SQUAD_FULL'; END IF;
  INSERT INTO public.stellar_u42_squad_members(user_id,squad_id) VALUES(u,q.id);
  RETURN jsonb_build_object('ok',true,'inviteCode',q.invite_code,'members',n+1);
 ELSIF p_action='leave' THEN
  IF existing IS NULL THEN RAISE EXCEPTION 'SQUAD_NOT_MEMBER'; END IF;
  SELECT * INTO q FROM public.stellar_u42_squads WHERE id=existing FOR UPDATE;
  DELETE FROM public.stellar_u42_squad_members WHERE user_id=u;
  SELECT user_id INTO new_owner FROM public.stellar_u42_squad_members WHERE squad_id=existing ORDER BY joined_at LIMIT 1;
  IF new_owner IS NULL THEN DELETE FROM public.stellar_u42_squads WHERE id=existing;
  ELSIF q.owner_id=u THEN UPDATE public.stellar_u42_squads SET owner_id=new_owner WHERE id=existing; END IF;
  RETURN jsonb_build_object('ok',true,'left',true);
 ELSE RAISE EXCEPTION 'SQUAD_ACTION_INVALID'; END IF;
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_squad_claim_v421()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 u uuid:=auth.uid(); progress jsonb; v_week date; v_squad uuid; v_new uuid; v_reward integer; v_kills bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 progress:=public.stellar_u42_squad_objective_v421();
 IF coalesce((progress->>'inSquad')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'SQUAD_REQUIRED'; END IF;
 IF coalesce((progress->>'claimed')::boolean,false) THEN RETURN jsonb_build_object('ok',true,'claimed',false,'alreadyClaimed',true); END IF;
 IF coalesce((progress->>'eligible')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'OBJECTIVE_NOT_MET'; END IF;
 v_week:=(progress->>'weekStart')::date;
 SELECT squad_id INTO v_squad FROM public.stellar_u42_squad_members WHERE user_id=u;
 v_reward:=(progress->>'rewardResearch')::integer;
 v_kills:=(progress->>'personalKills')::bigint;
 INSERT INTO public.stellar_u42_squad_objective_claims_v421(user_id,week_start,squad_id,credited_kills,granted_research)
 VALUES(u,v_week,v_squad,v_kills,v_reward)
 ON CONFLICT(user_id,week_start) DO NOTHING RETURNING user_id INTO v_new;
 IF v_new IS NULL THEN RETURN jsonb_build_object('ok',true,'claimed',false,'alreadyClaimed',true); END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,v_reward)
 ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
 RETURN jsonb_build_object('ok',true,'claimed',true,'rewardResearch',v_reward,'weekStart',v_week);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_squad_config_v421(p_weekly_kills integer, p_minimum_player integer, p_reward integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_weekly_kills NOT BETWEEN 20 AND 10000 OR p_minimum_player NOT BETWEEN 1 AND 1000
  OR p_reward NOT BETWEEN 1 AND 1000 OR p_minimum_player>p_weekly_kills THEN
  RAISE EXCEPTION 'INVALID_CONFIG'; END IF;
 UPDATE public.stellar_u42_squad_objective_config_v421
 SET weekly_kills=p_weekly_kills,minimum_player_kills=p_minimum_player,research_points=p_reward,updated_at=now()
 WHERE id=1;
 RETURN jsonb_build_object('ok',true,'goal',p_weekly_kills,'minimumPersonal',p_minimum_player,'rewardResearch',p_reward);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u42_squad_objective_v421()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 u uuid:=auth.uid(); v_squad uuid; v_week date:=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date;
 v_total bigint:=0; v_personal bigint:=0; v_goal integer; v_min integer; v_reward integer;
 v_claimed boolean:=false; v_team jsonb:='[]'::jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT m.squad_id INTO v_squad FROM public.stellar_u42_squad_members m WHERE m.user_id=u;
 SELECT weekly_kills,minimum_player_kills,research_points INTO v_goal,v_min,v_reward
 FROM public.stellar_u42_squad_objective_config_v421 WHERE id=1;
 IF v_squad IS NULL THEN
  RETURN jsonb_build_object('inSquad',false,'weekStart',v_week,'goal',v_goal,'minimumPersonal',v_min,'rewardResearch',v_reward);
 END IF;
 SELECT coalesce(sum(kills),0),coalesce(max(kills) FILTER (WHERE player_id=u),0),
        coalesce(jsonb_agg(jsonb_build_object('callsign',callsign,'kills',kills) ORDER BY kills DESC),'[]'::jsonb)
 INTO v_total,v_personal,v_team
 FROM (
  SELECT m.user_id AS player_id,p.callsign, count(n.kill_key)::bigint AS kills
  FROM public.stellar_u42_squad_members m
  JOIN public.stellar_u42_squads s ON s.id=m.squad_id
  LEFT JOIN public.profiles p ON p.id=m.user_id
  LEFT JOIN public.stellar_npc_reward_ledger n ON n.user_id=m.user_id
    AND n.issued_at >= GREATEST(v_week::timestamptz,m.joined_at,s.created_at)
  WHERE m.squad_id=v_squad
  GROUP BY m.user_id,p.callsign
 ) team;
 SELECT EXISTS(SELECT 1 FROM public.stellar_u42_squad_objective_claims_v421
 WHERE user_id=u AND week_start=v_week) INTO v_claimed;
 RETURN jsonb_build_object('inSquad',true,'weekStart',v_week,'goal',v_goal,'minimumPersonal',v_min,
 'rewardResearch',v_reward,'verifiedKills',v_total,'personalKills',v_personal,'team',v_team,
 'claimed',v_claimed,'eligible',NOT v_claimed AND v_total>=v_goal AND v_personal>=v_min);
END;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_u431_admin_weapon(p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501';
 END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_ENABLED'; END IF;
 UPDATE public.stellar_u423_module_rules
 SET combat_enabled=p_enabled,updated_at=now()
 WHERE item='eclipse_lance' AND slot='weapon';
 IF NOT FOUND THEN RAISE EXCEPTION 'MODULE_MISSING'; END IF;
 RETURN jsonb_build_object('ok',true,'enabled',p_enabled);
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u431_combat_profile(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE active_config integer:=1; buff numeric:=0; item_count integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ONLY' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(nullif(state #>> '{combatConfigsV2013,active}','')::integer,1)
 INTO active_config FROM public.game_saves WHERE user_id=p_user;
 active_config:=CASE WHEN active_config=2 THEN 2 ELSE 1 END;
 SELECT coalesce(i.quantity,0),
        CASE WHEN m.combat_enabled IS TRUE THEN least(4,greatest(0,coalesce((m.proposed_bonus->>'npcDamagePercent')::numeric,0))) ELSE 0 END
 INTO item_count,buff
 FROM public.stellar_u423_loadouts l
 JOIN public.stellar_u423_module_rules m ON m.item=l.item AND m.slot=l.slot
 LEFT JOIN public.stellar_u42_inventory i ON i.user_id=l.user_id AND i.item=l.item
 WHERE l.user_id=p_user AND l.config=active_config AND l.slot='weapon' AND l.item='eclipse_lance'
 LIMIT 1;
 IF item_count<1 OR item_count IS NULL THEN buff:=0; END IF;
 RETURN jsonb_build_object('enabled',coalesce(buff,0)>0,'npcDamagePercent',coalesce(buff,0),'activeConfig',active_config);
END; $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u435_admin_module(p_code text, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_code NOT IN ('astral_guard','nexus_drive','eclipse_lance','trinity_matrix') OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_MODULE'; END IF;
 UPDATE public.stellar_u423_module_rules SET combat_enabled=p_enabled,updated_at=now() WHERE item=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'MODULE_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('ok',true,'item',p_code,'enabled',p_enabled);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u435_raid_admin(p_target integer, p_minimum integer, p_reward integer, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_target NOT BETWEEN 1 AND 50 OR p_minimum NOT BETWEEN 1 AND 10 OR p_reward NOT BETWEEN 1 AND 5000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_RAID_RULES'; END IF;
 UPDATE public.stellar_u435_raid_config SET target_kills=p_target,min_player_kills=p_minimum,research_reward=p_reward,enabled=p_enabled,updated_at=now() WHERE id=1;
 RETURN jsonb_build_object('ok',true);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u435_raid_claim()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); row jsonb; wk date; sq uuid; reward integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('stellar_raid_435:'||u::text));
 row:=public.stellar_u435_raid_snapshot();
 IF coalesce((row->>'ready')::boolean,false) IS DISTINCT FROM true THEN RAISE EXCEPTION 'RAID_NOT_READY_OR_CLAIMED'; END IF;
 wk:=(timezone('America/Sao_Paulo',now()))::date -(extract(isodow from timezone('America/Sao_Paulo',now()))::int-1);
 sq:=(row->>'squadId')::uuid; reward:=(row->>'reward')::integer;
 INSERT INTO public.stellar_u435_raid_claims(user_id,week_start,squad_id,personal_kills,squad_kills,reward)
 VALUES(u,wk,sq,(row->>'personal')::bigint,(row->>'kills')::bigint,reward);
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,reward)
 ON CONFLICT(user_id) DO UPDATE SET points=least(100000000,public.stellar_u42_research.points+excluded.points),updated_at=now();
 RETURN jsonb_build_object('ok',true,'reward',reward,'weekStart',wk);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u435_raid_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); sq uuid; wk date;
 total bigint:=0; mine bigint:=0; cfg record; done boolean:=false;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO cfg FROM public.stellar_u435_raid_config WHERE id=1;
 wk:=(timezone('America/Sao_Paulo',now()))::date -(extract(isodow from timezone('America/Sao_Paulo',now()))::int-1);
 SELECT squad_id INTO sq FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF sq IS NULL THEN RETURN jsonb_build_object('ok',true,'inSquad',false,'ready',false,'target',cfg.target_kills,'minimum',cfg.min_player_kills,'reward',cfg.research_reward,'enabled',cfg.enabled); END IF;
 SELECT count(DISTINCT n.kill_key),count(DISTINCT n.kill_key) FILTER(WHERE n.user_id=u)
 INTO total,mine
 FROM public.stellar_npc_reward_ledger n
 JOIN public.stellar_u42_squad_members m ON m.user_id=n.user_id AND m.squad_id=sq
 WHERE n.npc_type LIKE 'boss%' AND n.issued_at>=wk::timestamp AT TIME ZONE 'America/Sao_Paulo'
 AND n.issued_at>=m.joined_at;
 SELECT EXISTS(SELECT 1 FROM public.stellar_u435_raid_claims c WHERE c.user_id=u AND c.week_start=wk) INTO done;
 RETURN jsonb_build_object('ok',true,'inSquad',true,'squadId',sq,'kills',total,'personal',mine,'target',cfg.target_kills,
 'minimum',cfg.min_player_kills,'reward',cfg.research_reward,'enabled',cfg.enabled,'claimed',done,
 'ready',cfg.enabled AND total>=cfg.target_kills AND mine>=cfg.min_player_kills AND NOT done);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u440_admin_test_kit(p_code text, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); q integer;
BEGIN
 IF u IS NULL OR NOT public.is_game_admin_v1763(u) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_code IS NULL OR p_code NOT IN ('astral_guard','nexus_drive','eclipse_lance','trinity_matrix')
 OR p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'INVALID_TEST_ITEM'; END IF;
 -- There is deliberately no target_user parameter: admins can only grant to themselves.
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,p_code,p_quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity
 WHERE public.stellar_u42_inventory.quantity+excluded.quantity<=30
 RETURNING quantity INTO q;
 IF q IS NULL THEN RAISE EXCEPTION 'TEST_INVENTORY_LIMIT_30'; END IF;
 INSERT INTO public.stellar_u440_admin_test_grants(user_id,item,quantity) VALUES(u,p_code,p_quantity);
 RETURN jsonb_build_object('ok',true,'item',p_code,'quantity',q,'added',p_quantity);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_u450_admin_diagnostics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_maps jsonb;v_routes jsonb;v_raid jsonb;v_total integer;v_world bigint;v_npc bigint;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid)
 THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',m.map_id,'label',m.label,'name',m.name,'enabled',m.enabled,
  'spawnTypes',(SELECT count(*) FROM public.game_map_npc_spawns_v1811 n WHERE n.map_id=m.map_id AND n.enabled AND n.spawn_count>0),
  'resourceTypes',(SELECT count(*) FROM public.game_map_resource_pool_v1814 r WHERE r.map_id=m.map_id AND r.enabled)
 ) ORDER BY m.map_id),'[]'::jsonb) INTO v_maps
 FROM public.game_map_config_v1814 m WHERE m.map_id IN ('u1','u2','u3');
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'from',p.from_sector,'to',p.to_sector,'enabled',p.enabled,'bidirectional',p.bidirectional
 ) ORDER BY p.sort_order),'[]'::jsonb) INTO v_routes
 FROM public.game_portal_links_v1814 p
 WHERE p.portal_key IN ('stellar_u440_earth','stellar_u440_mars','stellar_u440_jupiter','stellar_u440_veil_ion','stellar_u440_ion_void');
 SELECT jsonb_build_object('enabled',r.enabled,'target',r.target_kills,'minimum',r.min_player_kills,'reward',r.research_reward)
 INTO v_raid FROM public.stellar_u435_raid_config r WHERE r.id=1;
 SELECT count(*) INTO v_total FROM public.game_map_config_v1814;
 SELECT version INTO v_world FROM public.game_runtime_meta_v1810 WHERE config_key='world';
 SELECT version INTO v_npc FROM public.game_runtime_meta_v1810 WHERE config_key='npc';
 RETURN jsonb_build_object('maps',v_maps,'routes',v_routes,'raid',coalesce(v_raid,'{}'::jsonb),
   'totalMaps',v_total,'worldRevision',v_world,'npcRevision',v_npc);
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_unequip_elite_title()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 delete from public.stellar_elite_selected_titles where user_id=v_uid;
 return jsonb_build_object('ok',true,'title',null);
end;$function$
;
CREATE OR REPLACE FUNCTION public.stellar_verify_save_reset_epoch_v478()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_epoch bigint;
BEGIN
 SELECT epoch INTO v_epoch FROM public.stellar_account_reset_epochs_v478 WHERE user_id=NEW.user_id;
 IF FOUND AND COALESCE(NULLIF(NEW.state->>'adminResetEpoch','')::bigint,0) <> v_epoch THEN
   RAISE EXCEPTION 'SAVE_RESET_STALE: save anterior ao reset administrativo.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.stellar_war_validate_campaign()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 perform pg_advisory_xact_lock(552150021);
 if exists(select 1 from public.stellar_war_campaigns c where c.enabled and new.enabled and c.id is distinct from new.id and c.starts_at<new.ends_at and c.ends_at>new.starts_at)
 then raise exception 'WAR_CAMPAIGN_DATE_CONFLICT'; end if;
 if tg_op='UPDATE' then
  if now()>=old.starts_at or exists(select 1 from public.stellar_war_scores s where s.campaign_id=old.id) then
   if row(old.title,old.starts_at,old.ends_at,old.min_points,old.reward_credits,old.reward_stl,old.enabled)
   is distinct from row(new.title,new.starts_at,new.ends_at,new.min_points,new.reward_credits,new.reward_stl,new.enabled)
   then raise exception 'WAR_CAMPAIGN_LOCKED'; end if;
  end if;
 end if;
 new.updated_at=now();return new;
end;$function$
;
CREATE OR REPLACE FUNCTION public.sync_arena_profile(p_callsign text, p_faction text, p_level integer, p_ship_id text, p_hp bigint, p_shield bigint, p_laser_damage bigint, p_speed integer)
 RETURNS TABLE(power bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_power bigint;v_level integer;
begin
  if v_uid is null then raise exception 'Sessão ausente.'; end if;
  select coalesce(nullif(s.state #>> '{profile,level}','')::integer,p.level,1) into v_level
  from public.profiles p left join public.game_saves s on s.user_id=p.id where p.id=v_uid;
  v_level:=greatest(1,least(44,coalesce(v_level,1)));
  v_power:=greatest(1,greatest(1,coalesce(p_hp,1))+round(greatest(0,coalesce(p_shield,0))*0.9)
      +greatest(0,coalesce(p_laser_damage,0))*65+greatest(0,coalesce(p_speed,0))*120+v_level*5000);
  insert into public.arena_profiles(user_id,callsign,faction,level,ship_id,hp,shield,laser_damage,speed,power,updated_at)
    values(v_uid,left(coalesce(nullif(trim(p_callsign),''),'Pilot'),24),p_faction,v_level,coalesce(nullif(p_ship_id,''),'phoenix'),
      greatest(1,coalesce(p_hp,1)),greatest(0,coalesce(p_shield,0)),greatest(0,coalesce(p_laser_damage,0)),greatest(0,coalesce(p_speed,0)),v_power,now())
    on conflict(user_id) do update set callsign=excluded.callsign,faction=excluded.faction,level=excluded.level,
      ship_id=excluded.ship_id,hp=excluded.hp,shield=excluded.shield,laser_damage=excluded.laser_damage,
      speed=excluded.speed,power=excluded.power,updated_at=now();
  insert into public.arena_stats(user_id) values(v_uid) on conflict(user_id) do nothing;
  return query select v_power;
end;$function$
;
CREATE OR REPLACE FUNCTION public.sync_event_flow_v132()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  perform public.ensure_daily_event_v132();
  update public.map_event_instances_v132
    set status='active'
    where status='scheduled' and starts_at<=now() and ends_at>now();
  update public.map_event_instances_v132
    set status='finished'
    where status in ('scheduled','active') and ends_at<=now();
end;$function$
;
CREATE OR REPLACE FUNCTION public.telemetry_num_v1771(p_doc jsonb, p_path text[], p_min bigint DEFAULT 0, p_max bigint DEFAULT '1000000000000'::bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v text; n numeric;
begin
  v:=p_doc#>>p_path;
  if v is null or v !~ '^-?[0-9]+([.][0-9]+)?$' then return 0; end if;
  n:=trunc(v::numeric);
  if n<p_min then return p_min; end if;
  if n>p_max then return p_max; end if;
  return n::bigint;
exception when others then return 0;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.test_purchase_premium_v12(p_product_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid(); v_admin boolean:=false; v_product public.premium_catalog_v12%rowtype;
  v_state jsonb; v_inv jsonb; v_have integer:=0; v_until timestamptz;
  v_season text; v_pass_price numeric; v_effective_price numeric;
  v_days integer:=30; v_level integer:=1;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  if not v_admin then raise exception 'Compras reais ainda não foram liberadas. A Loja Premium está em modo de visualização.'; end if;
  select greatest(coalesce(level,1),1) into v_level from public.profiles where id=v_uid;
  v_level:=coalesce(v_level,1);

  select * into v_product from public.premium_catalog_v12 where id=p_product_id and active;
  if not found then raise exception 'Produto Premium inválido.'; end if;
  if v_level<v_product.min_level then raise exception 'Nível insuficiente para este produto Premium.'; end if;

  if v_product.category='battle_pass' then
    select season_key,premium_price_brl into v_season,v_pass_price
    from public.game_battle_pass_seasons_v1817b
    where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
    if v_season is null then raise exception 'Nenhuma temporada do Passe está ativa.'; end if;
    v_effective_price:=v_pass_price;
  else
    v_effective_price:=v_product.price_brl;
  end if;

  insert into public.premium_purchases_v12(user_id,product_id,price_brl,test_purchase)
  values(v_uid,v_product.id,v_effective_price,true);
  insert into public.premium_accounts_v12(user_id) values(v_uid) on conflict(user_id) do nothing;

  if v_product.category='premium' then
    v_days:=greatest(1,least(3650,coalesce((v_product.meta->>'days')::integer,30)));
    update public.premium_accounts_v12
    set premium_until=greatest(coalesce(premium_until,now()),now())+make_interval(days=>v_days),updated_at=now()
    where user_id=v_uid returning premium_until into v_until;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'premium_until',v_until,'days',v_days,'price_brl',v_effective_price);
  elsif v_product.category='battle_pass' then
    update public.premium_accounts_v12 set battle_pass_season=v_season,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'battle_pass_season',v_season,'price_brl',v_effective_price);
  else
    select state into v_state from public.game_saves where user_id=v_uid for update;
    if v_state is null then raise exception 'Entre no jogo e salve seu progresso antes de testar compra de item.'; end if;
    v_inv:=case when jsonb_typeof(v_state->'inventory')='object' then v_state->'inventory' else '{}'::jsonb end;
    v_have:=coalesce((v_inv->>v_product.item_id)::integer,0);
    v_inv:=jsonb_set(v_inv,array[v_product.item_id],to_jsonb(v_have+v_product.quantity),true);
    v_state:=jsonb_set(v_state,'{inventory}',v_inv,true);
    update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'item_id',v_product.item_id,
      'quantity',v_product.quantity,'new_quantity',v_have+v_product.quantity,'price_brl',v_effective_price);
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.transfer_clan_credits_v12(p_target_callsign text, p_amount bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_target uuid; v_target_name text; v_matches integer; v_vault bigint; v_net bigint; v_fee bigint;
begin
 if v_uid is null then raise exception 'Sessão inválida.'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Informe um valor maior que zero.'; end if;
 select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
 if v_clan is null then raise exception 'Você não pertence a um clã.'; end if;
  perform public.clan_check_entry_level_v19(v_uid);
 if v_role not in('owner','deputy') then raise exception 'Somente o líder ou vice-líder pode usar o cofre.'; end if;
 select count(*) into v_matches from public.profiles where lower(callsign)=lower(trim(p_target_callsign));
 if v_matches=0 then raise exception 'Jogador não encontrado.'; end if;
 if v_matches>1 then raise exception 'Há mais de um jogador com esse callsign. Use um callsign único.'; end if;
 select id,callsign into v_target,v_target_name from public.profiles where lower(callsign)=lower(trim(p_target_callsign));
 if v_target=v_uid then raise exception 'Escolha outro jogador.'; end if;
 select vault_credits into v_vault from public.clans where id=v_clan for update;
 if coalesce(v_vault,0)<p_amount then raise exception 'Saldo insuficiente no cofre do clã.'; end if;
 v_net:=floor(p_amount*0.95)::bigint; v_fee:=p_amount-v_net;
 update public.clans set vault_credits=vault_credits-p_amount,total_transfer_fees=total_transfer_fees+v_fee,updated_at=now()
   where id=v_clan returning vault_credits into v_vault;
 insert into public.clan_credit_grants(clan_id,sender_id,recipient_id,amount) values(v_clan,v_uid,v_target,v_net);
 insert into public.clan_transactions(clan_id,actor_id,target_user_id,kind,gross_amount,net_amount,burn_amount)
   values(v_clan,v_uid,v_target,'transfer',p_amount,v_net,v_fee);
 return jsonb_build_object('ok',true,'target_user_id',v_target,'target_callsign',v_target_name,
   'gross_amount',p_amount,'net_amount',v_net,'fee',v_fee,'vault_credits',v_vault);
end;$function$
;
CREATE OR REPLACE FUNCTION public.validate_game_session_v1214(p_session_id uuid, p_touch boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_current uuid;
  v_issued timestamptz;
  v_last_seen timestamptz;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select session_id, issued_at, last_seen
    into v_current, v_issued, v_last_seen
  from public.game_login_sessions_v1214
  where user_id = v_uid;

  if v_current is null or p_session_id is null or v_current <> p_session_id then
    return jsonb_build_object(
      'valid', false,
      'reason', 'replaced'
    );
  end if;

  if p_touch then
    update public.game_login_sessions_v1214
    set last_seen = now()
    where user_id = v_uid and session_id = p_session_id
    returning last_seen into v_last_seen;
  end if;

  return jsonb_build_object(
    'valid', true,
    'issued_at', v_issued,
    'last_seen', v_last_seen
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.weekend_event_slot_v341(p_at timestamp with time zone)
 RETURNS TABLE(event_key text, event_start timestamp with time zone, event_end timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  local_ts timestamp:=p_at AT TIME ZONE 'America/Sao_Paulo';
  local_date date:=local_ts::date;
  week_day int:=extract(dow FROM local_ts)::int;
  local_clock time:=local_ts::time;
  entry jsonb; ord bigint; count_slots int; index_slots bigint;
  saturday_date date; weeks_since_anchor int; serial bigint; count_events int;
  start_minutes int; duration_minutes int;
BEGIN
  SELECT t.slots INTO entry FROM public.live_event_weekend_settings_v3411 t WHERE id=1 AND enabled=true;
  IF entry IS NULL OR jsonb_typeof(entry)<>'array' OR jsonb_array_length(entry)<1 THEN RETURN; END IF;
  count_slots:=jsonb_array_length(entry);
  SELECT t.value,t.ordinality INTO entry,ord FROM public.live_event_weekend_settings_v3411 cfg,
    jsonb_array_elements(cfg.slots) WITH ORDINALITY t(value,ordinality)
    WHERE cfg.id=1 AND cfg.enabled=true AND (t.value->>'day')::int=week_day
    AND local_clock>=(t.value->>'start')::time
    AND local_clock<((t.value->>'start')::time+make_interval(mins=>(t.value->>'duration')::int))
    ORDER BY t.ordinality LIMIT 1;
  IF entry IS NULL THEN RETURN; END IF;
  saturday_date:=local_date-((week_day+1)%7);
  weeks_since_anchor:=(saturday_date-date '2026-10-24')/7;
  IF weeks_since_anchor<0 THEN RETURN; END IF;
  serial:=weeks_since_anchor*count_slots+ord-1;
  SELECT count(*) INTO count_events FROM public.live_event_config_v16
    WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb;
  IF count_events=0 THEN RETURN; END IF;
  SELECT cfg.event_key INTO event_key FROM public.live_event_config_v16 cfg
    WHERE cfg.enabled=true AND cfg.schedule_mode='interval' AND cfg.rules @> '{"weekend_rotation":true}'::jsonb
    ORDER BY cfg.priority,cfg.event_key OFFSET (serial % count_events)::int LIMIT 1;
  start_minutes:=split_part(entry->>'start',':',1)::int*60+split_part(entry->>'start',':',2)::int;
  duration_minutes:=(entry->>'duration')::int;
  event_start:=(local_date::timestamp+make_interval(mins=>start_minutes)) AT TIME ZONE 'America/Sao_Paulo';
  event_end:=event_start+make_interval(mins=>duration_minutes);
  RETURN NEXT;
END;
$function$
;

CREATE SCHEMA sl2d_private;
CREATE OR REPLACE FUNCTION private.arena_reward_snapshot(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_rating integer := 1000;
  v_level integer := 1;
  v_rank integer := 0;
  v_admin boolean := false;
  v_league text; v_next_league text; v_next_rating integer;
  v_base_credits bigint; v_base_uridium bigint; v_base_xp bigint; v_base_repair integer;
  v_level_bonus integer; v_rank_bonus integer; v_total_bonus integer;
  v_credits bigint; v_uridium bigint; v_xp bigint; v_repair integer;
  v_claimed boolean := false; v_claimed_at timestamptz;
begin
  if p_user_id is null then raise exception 'Usuário não autenticado.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=p_user_id and lower(coalesce(ga.role,''))='admin') into v_admin;

  select coalesce(s.rating,1000) into v_rating from public.arena_stats s where s.user_id=p_user_id;
  v_rating:=coalesce(v_rating,1000);
  select coalesce(p.level,1) into v_level from public.profiles p where p.id=p_user_id;
  v_level:=greatest(1,least(44,coalesce(v_level,1)));

  if not v_admin then
    select ranked.pos into v_rank
    from (
      select s.user_id,row_number() over(order by s.rating desc,s.wins desc,s.losses asc,s.battles desc,s.user_id)::integer pos
      from public.arena_stats s
      where not exists (
        select 1 from public.game_admins ga
        where ga.user_id=s.user_id and lower(coalesce(ga.role,''))='admin'
      )
    ) ranked where ranked.user_id=p_user_id;
    if v_rank is null then
      select count(*)::integer+1 into v_rank
      from public.arena_stats s
      where not exists (
        select 1 from public.game_admins ga
        where ga.user_id=s.user_id and lower(coalesce(ga.role,''))='admin'
      );
    end if;
  else
    v_rank:=0;
  end if;

  if v_rating < 1000 then
    v_league:='CADETE';v_next_league:='BRONZE';v_next_rating:=1000;v_base_credits:=25000;v_base_uridium:=250;v_base_xp:=1000;v_base_repair:=0;
  elsif v_rating < 1200 then
    v_league:='BRONZE';v_next_league:='PRATA';v_next_rating:=1200;v_base_credits:=50000;v_base_uridium:=500;v_base_xp:=2000;v_base_repair:=1;
  elsif v_rating < 1400 then
    v_league:='PRATA';v_next_league:='OURO';v_next_rating:=1400;v_base_credits:=100000;v_base_uridium:=1000;v_base_xp:=4000;v_base_repair:=1;
  elsif v_rating < 1600 then
    v_league:='OURO';v_next_league:='PLATINA';v_next_rating:=1600;v_base_credits:=200000;v_base_uridium:=2000;v_base_xp:=8000;v_base_repair:=2;
  elsif v_rating < 1800 then
    v_league:='PLATINA';v_next_league:='DIAMANTE';v_next_rating:=1800;v_base_credits:=400000;v_base_uridium:=4000;v_base_xp:=15000;v_base_repair:=2;
  elsif v_rating < 2100 then
    v_league:='DIAMANTE';v_next_league:='LENDA';v_next_rating:=2100;v_base_credits:=750000;v_base_uridium:=7500;v_base_xp:=25000;v_base_repair:=3;
  else
    v_league:='LENDA';v_next_league:=null;v_next_rating:=null;v_base_credits:=1250000;v_base_uridium:=12500;v_base_xp:=40000;v_base_repair:=5;
  end if;

  v_level_bonus:=least(20,floor(v_level/10.0)::integer*5);
  v_rank_bonus:=case when v_admin then 0 when v_rank=1 then 50 when v_rank=2 then 35 when v_rank=3 then 25 when v_rank between 4 and 10 then 15 when v_rank between 11 and 25 then 5 else 0 end;
  v_total_bonus:=v_level_bonus+v_rank_bonus;
  v_credits:=round(v_base_credits*(100+v_total_bonus)/100.0)::bigint;
  v_uridium:=round(v_base_uridium*(100+v_total_bonus)/100.0)::bigint;
  v_xp:=round(v_base_xp*(100+v_total_bonus)/100.0)::bigint;
  v_repair:=v_base_repair+case when v_admin then 0 when v_rank=1 then 2 when v_rank in (2,3) then 1 else 0 end;

  select true,r.claimed_at into v_claimed,v_claimed_at
  from public.arena_daily_rewards r where r.user_id=p_user_id and r.reward_date=v_today;

  return jsonb_build_object(
    'reward_date',v_today,'rating',v_rating,'rank_position',v_rank,'is_admin',v_admin,'league',v_league,
    'next_league',v_next_league,'next_rating',v_next_rating,
    'points_to_next',case when v_next_rating is null then 0 else greatest(0,v_next_rating-v_rating) end,
    'player_level',v_level,'level_bonus_percent',v_level_bonus,'rank_bonus_percent',v_rank_bonus,'total_bonus_percent',v_total_bonus,
    'credits',v_credits,'uridium',v_uridium,'xp',v_xp,'repair_bonus',v_repair,
    'claimed_today',coalesce(v_claimed,false),'claimable',not coalesce(v_claimed,false),'claimed_at',v_claimed_at,
    'next_claim_at',(((v_today+1)::timestamp) at time zone 'America/Sao_Paulo')
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION private.stellar_restore_level1_20261015(p_force boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_ddl text; v_current_def text;
BEGIN
 IF NOT p_force AND now()<timestamptz '2026-10-16 03:00:00+00' THEN RETURN; END IF;
 IF (SELECT count(*) FROM private.stellar_level1_snapshot_20261015 WHERE scope='map')<>11
   OR (SELECT count(*) FROM private.stellar_level1_snapshot_20261015 WHERE scope='sector')<>27 THEN
     RAISE EXCEPTION 'Backup incompleto; nao restaurar valores automaticamente.';
 END IF;
 UPDATE public.game_map_config_v1814 m SET min_level=b.original_level,updated_at=now()
 FROM private.stellar_level1_snapshot_20261015 b
 WHERE b.scope='map' AND b.ref=m.map_id
  AND b.original_level<>1 AND m.min_level=1;
 UPDATE public.game_sector_nodes_v1814 s SET min_level=b.original_level,updated_at=now()
 FROM private.stellar_level1_snapshot_20261015 b
 WHERE b.scope='sector' AND b.ref=s.sector_label
  AND b.original_level<>1 AND s.min_level=1;
 SELECT b.original_ddl INTO v_ddl FROM private.stellar_level1_snapshot_20261015 b
 WHERE b.scope='rpc' AND b.ref='queue_pvp_attack';
 SELECT pg_get_functiondef(p.oid) INTO v_current_def FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='queue_pvp_attack';
 IF v_ddl IS NULL OR v_current_def IS NULL THEN RAISE EXCEPTION 'Nao foi possivel restaurar a RPC PvP.'; END IF;
 IF position('v_attacker.level<1 OR v_target.level<1' in v_current_def)>0
 THEN EXECUTE v_ddl; END IF;
 PERFORM cron.unschedule('stellar_level1_restore_20261015');
END;
$function$
;
CREATE OR REPLACE FUNCTION sl2d_private.enroll_player()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 INSERT INTO public.sl2d_player_state(user_id) VALUES(NEW.user_id);
 INSERT INTO public.sl2d_rankings(user_id,callsign,faction,level,power) VALUES(NEW.user_id,NEW.callsign,NEW.faction,1,100);
 INSERT INTO public.sl2d_inventory(user_id,item_id,amount) SELECT NEW.user_id,c.id,1 FROM public.sl2d_catalog AS c WHERE c.available=true;
 RETURN NEW;
END;$function$
;
CREATE OR REPLACE FUNCTION sl2d_private.sl2d_claim_daily_impl()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 uid uuid := (SELECT auth.uid());
 today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
 inserted_id uuid;
 balance bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Login required' USING ERRCODE='28000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sl2d_profiles WHERE user_id=uid) THEN RAISE EXCEPTION 'Game profile required' USING ERRCODE='28000'; END IF;
 INSERT INTO public.sl2d_daily_claims(user_id,claimed_on,reward) VALUES(uid,today,'250 credits')
 ON CONFLICT(user_id,claimed_on) DO NOTHING RETURNING user_id INTO inserted_id;
 IF inserted_id IS NULL THEN
  SELECT credits INTO balance FROM public.sl2d_player_state WHERE user_id=uid;
  RETURN jsonb_build_object('claimed',false,'already_claimed',true,'credits',balance,'date',today);
 END IF;
 UPDATE public.sl2d_player_state SET credits=credits+250,updated_at=now()
 WHERE user_id=uid RETURNING credits INTO balance;
 IF balance IS NULL THEN RAISE EXCEPTION 'Player state unavailable'; END IF;
 RETURN jsonb_build_object('claimed',true,'already_claimed',false,'credits',balance,'date',today,'reward',250);
END;$function$
;
CREATE OR REPLACE FUNCTION sl2d_private.sync_profile_ranking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 UPDATE public.sl2d_rankings SET callsign=NEW.callsign,faction=NEW.faction,updated_at=now() WHERE user_id=NEW.user_id;
 RETURN NEW;
END;$function$
;
CREATE OR REPLACE FUNCTION sl2d_private.sync_stats_ranking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 UPDATE public.sl2d_rankings SET level=NEW.level,power=NEW.power,updated_at=now() WHERE user_id=NEW.user_id;
 RETURN NEW;
END;$function$
;
CREATE TRIGGER battle_pass_seasons_bump_v1817b AFTER INSERT OR DELETE OR UPDATE ON public.game_battle_pass_seasons_v1817b FOR EACH STATEMENT EXECUTE FUNCTION bump_pass_runtime_config_v1817b();
CREATE TRIGGER battle_pass_tiers_bump_v1817b AFTER INSERT OR DELETE OR UPDATE ON public.game_battle_pass_tiers_v1817b FOR EACH STATEMENT EXECUTE FUNCTION bump_pass_runtime_config_v1817b();
CREATE TRIGGER crafting_recipe_bump_v1815 AFTER INSERT OR DELETE OR UPDATE ON public.game_crafting_recipe_v1815 FOR EACH STATEMENT EXECUTE FUNCTION bump_systems_runtime_config_v1815();
CREATE TRIGGER economy_service_bump_v1815 AFTER INSERT OR DELETE OR UPDATE ON public.game_economy_service_v1815 FOR EACH STATEMENT EXECUTE FUNCTION bump_systems_runtime_config_v1815();
CREATE TRIGGER game_feature_flags_bump_v1810 AFTER INSERT OR DELETE OR UPDATE ON public.game_feature_flags_v1810 FOR EACH STATEMENT EXECUTE FUNCTION bump_runtime_config_v1810();
CREATE TRIGGER map_config_bump_v1814 AFTER INSERT OR DELETE OR UPDATE ON public.game_map_config_v1814 FOR EACH STATEMENT EXECUTE FUNCTION bump_world_runtime_config_v1814();
CREATE TRIGGER game_map_npc_spawns_bump_v1811 AFTER INSERT OR DELETE OR UPDATE ON public.game_map_npc_spawns_v1811 FOR EACH STATEMENT EXECUTE FUNCTION bump_npc_runtime_config_v1811();
CREATE TRIGGER map_resource_bump_v1814 AFTER INSERT OR DELETE OR UPDATE ON public.game_map_resource_pool_v1814 FOR EACH STATEMENT EXECUTE FUNCTION bump_world_runtime_config_v1814();
CREATE TRIGGER mission_category_bump_v1815 AFTER INSERT OR DELETE OR UPDATE ON public.game_mission_category_v1815 FOR EACH STATEMENT EXECUTE FUNCTION bump_systems_runtime_config_v1815();
CREATE TRIGGER mission_custom_bump_v1815 AFTER INSERT OR DELETE OR UPDATE ON public.game_mission_custom_v1815 FOR EACH STATEMENT EXECUTE FUNCTION bump_systems_runtime_config_v1815();
CREATE TRIGGER game_npc_config_bump_v1811 AFTER INSERT OR DELETE OR UPDATE ON public.game_npc_config_v1811 FOR EACH STATEMENT EXECUTE FUNCTION bump_npc_runtime_config_v1811();
CREATE TRIGGER portal_links_bump_v1814 AFTER INSERT OR DELETE OR UPDATE ON public.game_portal_links_v1814 FOR EACH STATEMENT EXECUTE FUNCTION bump_world_runtime_config_v1814();
CREATE TRIGGER resource_config_bump_v1814 AFTER INSERT OR DELETE OR UPDATE ON public.game_resource_config_v1814 FOR EACH STATEMENT EXECUTE FUNCTION bump_world_runtime_config_v1814();
CREATE TRIGGER galaxy_event_save_guard_v1826 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION galaxy_event_save_guard_v1826();
CREATE TRIGGER game_coupon_protect_save_v1821 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION game_coupon_protect_save_v1821();
CREATE TRIGGER game_saves_admin_guard BEFORE INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION enforce_admin_game_save();
CREATE TRIGGER game_saves_drone_history_v1829 BEFORE UPDATE ON public.game_saves FOR EACH ROW EXECUTE FUNCTION guard_drone_purchase_history_v1829();
CREATE TRIGGER natal_switch_ship AFTER UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_natal_switch_ship_v132();
CREATE TRIGGER stellar_guard_elite_save_revision BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_elite_save_revision();
CREATE TRIGGER stellar_guard_npc_reward_revision_insert_v228 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_npc_reward_revision_v228();
CREATE TRIGGER stellar_guard_npc_reward_revision_update_v228 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_npc_reward_revision_v228();
CREATE TRIGGER stellar_guard_ore_revision_insert_v229 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_ore_reward_revision_v229();
CREATE TRIGGER stellar_guard_ore_revision_update_v229 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_ore_reward_revision_v229();
CREATE TRIGGER stellar_inventory_guard_insert_v226 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_inventory_v226();
CREATE TRIGGER stellar_inventory_guard_update_v226 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_inventory_v226();
CREATE TRIGGER stellar_purchase_revision_insert_v227 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_purchase_revision_v227();
CREATE TRIGGER stellar_purchase_revision_update_v227 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_purchase_revision_v227();
CREATE TRIGGER stellar_save_antifraud_insert_v226 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_saves_antifraud_v226();
CREATE TRIGGER stellar_save_antifraud_v226 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_guard_saves_antifraud_v226();
CREATE TRIGGER stellar_save_clock_v133 AFTER INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_observe_save_v133();
CREATE TRIGGER stellar_save_reset_epoch_guard_v478 BEFORE INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION stellar_verify_save_reset_epoch_v478();
CREATE TRIGGER sector_nodes_bump_v1814 AFTER INSERT OR DELETE OR UPDATE ON public.game_sector_nodes_v1814 FOR EACH STATEMENT EXECUTE FUNCTION bump_world_runtime_config_v1814();
CREATE TRIGGER game_ui_modules_bump_v1810 AFTER INSERT OR DELETE OR UPDATE ON public.game_ui_modules_v1810 FOR EACH STATEMENT EXECUTE FUNCTION bump_runtime_config_v1810();
CREATE TRIGGER live_shop_bump_v1817c AFTER INSERT OR DELETE OR UPDATE ON public.live_shop_prices_v16 FOR EACH STATEMENT EXECUTE FUNCTION bump_shops_runtime_config_v1817c();
CREATE TRIGGER natal_design_guard BEFORE INSERT OR UPDATE OF ship_design_id ON public.player_design_loadout_v16 FOR EACH ROW EXECUTE FUNCTION stellar_natal_design_guard_v132();
CREATE TRIGGER natal_design_remember AFTER INSERT OR UPDATE OF ship_design_id ON public.player_design_loadout_v16 FOR EACH ROW EXECUTE FUNCTION stellar_natal_remember_design_v132();
CREATE TRIGGER premium_shop_bump_v1817c AFTER INSERT OR DELETE OR UPDATE ON public.premium_catalog_v12 FOR EACH STATEMENT EXECUTE FUNCTION bump_shops_runtime_config_v1817c();
CREATE TRIGGER enforce_unique_equipment_stage_checkout_v1836 BEFORE INSERT ON public.premium_checkout_tests_v1832 FOR EACH ROW EXECUTE FUNCTION enforce_unique_equipment_stage_checkout_v1836();
CREATE TRIGGER sl2d_stats_rank_sync AFTER UPDATE OF level, power ON public.sl2d_player_state FOR EACH ROW EXECUTE FUNCTION sl2d_private.sync_stats_ranking();
CREATE TRIGGER sl2d_profile_enroll AFTER INSERT ON public.sl2d_profiles FOR EACH ROW EXECUTE FUNCTION sl2d_private.enroll_player();
CREATE TRIGGER sl2d_profile_rank_sync AFTER UPDATE OF callsign, faction ON public.sl2d_profiles FOR EACH ROW EXECUTE FUNCTION sl2d_private.sync_profile_ranking();
CREATE TRIGGER stellar_clan_operation_guard BEFORE UPDATE ON public.stellar_clan_operations FOR EACH ROW EXECUTE FUNCTION stellar_clan_operation_guard();
CREATE TRIGGER stellar_competitive_season_guard BEFORE UPDATE ON public.stellar_competitive_seasons FOR EACH ROW EXECUTE FUNCTION stellar_competitive_season_guard();
CREATE TRIGGER trg_stellar_auto_sale_cpu_guard_v1065 BEFORE INSERT OR UPDATE OF auto_sell ON public.stellar_offline_farm_v484 FOR EACH ROW EXECUTE FUNCTION stellar_auto_sale_cpu_guard_v1065();
CREATE TRIGGER stellar_relay_fortification_transfer_v350 AFTER UPDATE OF owner_clan_id ON public.stellar_relay_state_v346 FOR EACH ROW WHEN ((old.owner_clan_id IS DISTINCT FROM new.owner_clan_id)) EXECUTE FUNCTION stellar_relay_fortification_transfer_v350();
CREATE TRIGGER stellar_war_campaign_guard BEFORE INSERT OR UPDATE ON public.stellar_war_campaigns FOR EACH ROW EXECUTE FUNCTION stellar_war_validate_campaign();