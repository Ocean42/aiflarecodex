# todoTests – Complete Rust test inventory

Each entry lists the Rust test functions we need to mirror in TypeScript. Descriptions are derived from the test names to capture the scenario at a glance.

### codex-rs/app-server/src/bespoke_event_handling.rs
- `test_construct_mcp_tool_call_begin_notification_with_args` – covers 'test construct mcp tool call begin notification with args'.
- `test_construct_mcp_tool_call_begin_notification_without_args` – covers 'test construct mcp tool call begin notification without args'.
- `test_construct_mcp_tool_call_end_notification_success` – covers 'test construct mcp tool call end notification success'.
- `test_construct_mcp_tool_call_end_notification_error` – covers 'test construct mcp tool call end notification error'.

### codex-rs/app-server/src/codex_message_processor.rs
- `extract_conversation_summary_prefers_plain_user_messages` – covers 'extract conversation summary prefers plain user messages'.
- `read_summary_from_rollout_returns_empty_preview_when_no_user_message` – covers 'read summary from rollout returns empty preview when no user message'.

### codex-rs/app-server/src/outgoing_message.rs
- `verify_server_notification_serialization` – covers 'verify server notification serialization'.
- `verify_account_login_completed_notification_serialization` – covers 'verify account login completed notification serialization'.
- `verify_account_rate_limits_notification_serialization` – covers 'verify account rate limits notification serialization'.
- `verify_account_updated_notification_serialization` – covers 'verify account updated notification serialization'.

### codex-rs/app-server/tests/suite/archive_conversation.rs
- `archive_conversation_moves_rollout_into_archived_directory` – covers 'archive conversation moves rollout into archived directory'.

### codex-rs/app-server/tests/suite/auth.rs
- `get_auth_status_no_auth` – covers 'get auth status no auth'.
- `get_auth_status_with_api_key` – covers 'get auth status with api key'.
- `get_auth_status_with_api_key_when_auth_not_required` – covers 'get auth status with api key when auth not required'.
- `get_auth_status_with_api_key_no_include_token` – covers 'get auth status with api key no include token'.
- `login_api_key_rejected_when_forced_chatgpt` – covers 'login api key rejected when forced chatgpt'.

### codex-rs/app-server/tests/suite/codex_message_processor_flow.rs
- `test_codex_jsonrpc_conversation_flow` – covers 'test codex jsonrpc conversation flow'.
- `test_send_user_turn_changes_approval_policy_behavior` – covers 'test send user turn changes approval policy behavior'.
- `test_send_user_turn_updates_sandbox_and_cwd_between_turns` – covers 'test send user turn updates sandbox and cwd between turns'.

### codex-rs/app-server/tests/suite/config.rs
- `get_config_toml_parses_all_fields` – covers 'get config toml parses all fields'.
- `get_config_toml_empty` – covers 'get config toml empty'.

### codex-rs/app-server/tests/suite/create_conversation.rs
- `test_conversation_create_and_send_message_ok` – covers 'test conversation create and send message ok'.

### codex-rs/app-server/tests/suite/fuzzy_file_search.rs
- `test_fuzzy_file_search_sorts_and_includes_indices` – covers 'test fuzzy file search sorts and includes indices'.
- `test_fuzzy_file_search_accepts_cancellation_token` – covers 'test fuzzy file search accepts cancellation token'.

### codex-rs/app-server/tests/suite/interrupt.rs
- `test_shell_command_interruption` – covers 'test shell command interruption'.

### codex-rs/app-server/tests/suite/list_resume.rs
- `test_list_and_resume_conversations` – covers 'test list and resume conversations'.

### codex-rs/app-server/tests/suite/login.rs
- `logout_chatgpt_removes_auth` – covers 'logout chatgpt removes auth'.
- `login_chatgpt_rejected_when_forced_api` – covers 'login chatgpt rejected when forced api'.

### codex-rs/app-server/tests/suite/send_message.rs
- `test_send_message_success` – covers 'test send message success'.
- `test_send_message_raw_notifications_opt_in` – covers 'test send message raw notifications opt in'.
- `test_send_message_session_not_found` – covers 'test send message session not found'.

### codex-rs/app-server/tests/suite/set_default_model.rs
- `set_default_model_persists_overrides` – covers 'set default model persists overrides'.

### codex-rs/app-server/tests/suite/user_agent.rs
- `get_user_agent_returns_current_codex_user_agent` – covers 'get user agent returns current codex user agent'.

### codex-rs/app-server/tests/suite/user_info.rs
- `user_info_returns_email_from_auth_json` – covers 'user info returns email from auth json'.

### codex-rs/app-server/tests/suite/v2/account.rs
- `logout_account_removes_auth_and_notifies` – covers 'logout account removes auth and notifies'.
- `login_account_api_key_succeeds_and_notifies` – covers 'login account api key succeeds and notifies'.
- `login_account_api_key_rejected_when_forced_chatgpt` – covers 'login account api key rejected when forced chatgpt'.
- `login_account_chatgpt_rejected_when_forced_api` – covers 'login account chatgpt rejected when forced api'.
- `get_account_no_auth` – covers 'get account no auth'.
- `get_account_with_api_key` – covers 'get account with api key'.
- `get_account_when_auth_not_required` – covers 'get account when auth not required'.
- `get_account_with_chatgpt` – covers 'get account with chatgpt'.

### codex-rs/app-server/tests/suite/v2/model_list.rs
- `list_models_returns_all_models_with_large_limit` – covers 'list models returns all models with large limit'.
- `list_models_pagination_works` – covers 'list models pagination works'.
- `list_models_rejects_invalid_cursor` – covers 'list models rejects invalid cursor'.

### codex-rs/app-server/tests/suite/v2/rate_limits.rs
- `get_account_rate_limits_requires_auth` – covers 'get account rate limits requires auth'.
- `get_account_rate_limits_requires_chatgpt_auth` – covers 'get account rate limits requires chatgpt auth'.
- `get_account_rate_limits_returns_snapshot` – covers 'get account rate limits returns snapshot'.

### codex-rs/app-server/tests/suite/v2/thread_archive.rs
- `thread_archive_moves_rollout_into_archived_directory` – covers 'thread archive moves rollout into archived directory'.

### codex-rs/app-server/tests/suite/v2/thread_list.rs
- `thread_list_basic_empty` – covers 'thread list basic empty'.
- `thread_list_pagination_next_cursor_none_on_last_page` – covers 'thread list pagination next cursor none on last page'.
- `thread_list_respects_provider_filter` – covers 'thread list respects provider filter'.

### codex-rs/app-server/tests/suite/v2/thread_resume.rs
- `thread_resume_returns_original_thread` – covers 'thread resume returns original thread'.
- `thread_resume_prefers_path_over_thread_id` – covers 'thread resume prefers path over thread id'.
- `thread_resume_supports_history_and_overrides` – covers 'thread resume supports history and overrides'.

### codex-rs/app-server/tests/suite/v2/thread_start.rs
- `thread_start_creates_thread_and_emits_started` – covers 'thread start creates thread and emits started'.

### codex-rs/app-server/tests/suite/v2/turn_interrupt.rs
- `turn_interrupt_aborts_running_turn` – covers 'turn interrupt aborts running turn'.

### codex-rs/app-server/tests/suite/v2/turn_start.rs
- `turn_start_emits_notifications_and_accepts_model_override` – covers 'turn start emits notifications and accepts model override'.
- `turn_start_accepts_local_image_input` – covers 'turn start accepts local image input'.
- `turn_start_exec_approval_toggle_v2` – covers 'turn start exec approval toggle v2'.
- `turn_start_updates_sandbox_and_cwd_between_turns_v2` – covers 'turn start updates sandbox and cwd between turns v2'.

### codex-rs/app-server-protocol/src/export.rs
- `generated_ts_has_no_optional_nullable_fields` – covers 'generated ts has no optional nullable fields'.

### codex-rs/app-server-protocol/src/protocol/common.rs
- `serialize_new_conversation` – covers 'serialize new conversation'.
- `conversation_id_serializes_as_plain_string` – covers 'conversation id serializes as plain string'.
- `conversation_id_deserializes_from_plain_string` – covers 'conversation id deserializes from plain string'.
- `serialize_client_notification` – covers 'serialize client notification'.
- `serialize_server_request` – covers 'serialize server request'.
- `serialize_get_account_rate_limits` – covers 'serialize get account rate limits'.
- `serialize_account_login_api_key` – covers 'serialize account login api key'.
- `serialize_account_login_chatgpt` – covers 'serialize account login chatgpt'.
- `serialize_account_logout` – covers 'serialize account logout'.
- `serialize_get_account` – covers 'serialize get account'.
- `account_serializes_fields_in_camel_case` – covers 'account serializes fields in camel case'.
- `serialize_list_models` – covers 'serialize list models'.

### codex-rs/app-server-protocol/src/protocol/v2.rs
- `core_turn_item_into_thread_item_converts_supported_variants` – covers 'core turn item into thread item converts supported variants'.

### codex-rs/apply-patch/src/lib.rs
- `test_implicit_patch_single_arg_is_error` – covers 'test implicit patch single arg is error'.
- `test_implicit_patch_bash_script_is_error` – covers 'test implicit patch bash script is error'.
- `test_literal` – covers 'test literal'.
- `test_literal_applypatch` – covers 'test literal applypatch'.
- `test_heredoc` – covers 'test heredoc'.
- `test_heredoc_applypatch` – covers 'test heredoc applypatch'.
- `test_heredoc_with_leading_cd` – covers 'test heredoc with leading cd'.
- `test_cd_with_semicolon_is_ignored` – covers 'test cd with semicolon is ignored'.
- `test_cd_or_apply_patch_is_ignored` – covers 'test cd or apply patch is ignored'.
- `test_cd_pipe_apply_patch_is_ignored` – covers 'test cd pipe apply patch is ignored'.
- `test_cd_single_quoted_path_with_spaces` – covers 'test cd single quoted path with spaces'.
- `test_cd_double_quoted_path_with_spaces` – covers 'test cd double quoted path with spaces'.
- `test_echo_and_apply_patch_is_ignored` – covers 'test echo and apply patch is ignored'.
- `test_apply_patch_with_arg_is_ignored` – covers 'test apply patch with arg is ignored'.
- `test_double_cd_then_apply_patch_is_ignored` – covers 'test double cd then apply patch is ignored'.
- `test_cd_two_args_is_ignored` – covers 'test cd two args is ignored'.
- `test_cd_then_apply_patch_then_extra_is_ignored` – covers 'test cd then apply patch then extra is ignored'.
- `test_echo_then_cd_and_apply_patch_is_ignored` – covers 'test echo then cd and apply patch is ignored'.
- `test_add_file_hunk_creates_file_with_contents` – covers 'test add file hunk creates file with contents'.
- `test_delete_file_hunk_removes_file` – covers 'test delete file hunk removes file'.
- `test_update_file_hunk_modifies_content` – covers 'test update file hunk modifies content'.
- `test_update_file_hunk_can_move_file` – covers 'test update file hunk can move file'.
- `test_multiple_update_chunks_apply_to_single_file` – covers 'test multiple update chunks apply to single file'.
- `test_update_file_hunk_interleaved_changes` – covers 'test update file hunk interleaved changes'.
- `test_pure_addition_chunk_followed_by_removal` – covers 'test pure addition chunk followed by removal'.
- `test_update_line_with_unicode_dash` – covers 'test update line with unicode dash'.
- `test_unified_diff` – covers 'test unified diff'.
- `test_unified_diff_first_line_replacement` – covers 'test unified diff first line replacement'.
- `test_unified_diff_last_line_replacement` – covers 'test unified diff last line replacement'.
- `test_unified_diff_insert_at_eof` – covers 'test unified diff insert at eof'.
- `test_unified_diff_interleaved_changes` – covers 'test unified diff interleaved changes'.
- `test_apply_patch_should_resolve_absolute_paths_in_cwd` – covers 'test apply patch should resolve absolute paths in cwd'.
- `test_apply_patch_resolves_move_path_with_effective_cwd` – covers 'test apply patch resolves move path with effective cwd'.
- `test_apply_patch_fails_on_write_error` – covers 'test apply patch fails on write error'.

### codex-rs/apply-patch/src/parser.rs
- `test_parse_patch` – covers 'test parse patch'.
- `test_parse_patch_lenient` – covers 'test parse patch lenient'.
- `test_parse_one_hunk` – covers 'test parse one hunk'.
- `test_update_file_chunk` – covers 'test update file chunk'.

### codex-rs/apply-patch/src/seek_sequence.rs
- `test_exact_match_finds_sequence` – covers 'test exact match finds sequence'.
- `test_rstrip_match_ignores_trailing_whitespace` – covers 'test rstrip match ignores trailing whitespace'.
- `test_trim_match_ignores_leading_and_trailing_whitespace` – covers 'test trim match ignores leading and trailing whitespace'.
- `test_pattern_longer_than_input_returns_none` – covers 'test pattern longer than input returns none'.

### codex-rs/apply-patch/tests/suite/cli.rs
- `test_apply_patch_cli_add_and_update` – covers 'test apply patch cli add and update'.
- `test_apply_patch_cli_stdin_add_and_update` – covers 'test apply patch cli stdin add and update'.

### codex-rs/apply-patch/tests/suite/tool.rs
- `test_apply_patch_cli_applies_multiple_operations` – covers 'test apply patch cli applies multiple operations'.
- `test_apply_patch_cli_applies_multiple_chunks` – covers 'test apply patch cli applies multiple chunks'.
- `test_apply_patch_cli_moves_file_to_new_directory` – covers 'test apply patch cli moves file to new directory'.
- `test_apply_patch_cli_rejects_empty_patch` – covers 'test apply patch cli rejects empty patch'.
- `test_apply_patch_cli_reports_missing_context` – covers 'test apply patch cli reports missing context'.
- `test_apply_patch_cli_rejects_missing_file_delete` – covers 'test apply patch cli rejects missing file delete'.
- `test_apply_patch_cli_rejects_empty_update_hunk` – covers 'test apply patch cli rejects empty update hunk'.
- `test_apply_patch_cli_requires_existing_file_for_update` – covers 'test apply patch cli requires existing file for update'.
- `test_apply_patch_cli_move_overwrites_existing_destination` – covers 'test apply patch cli move overwrites existing destination'.
- `test_apply_patch_cli_add_overwrites_existing_file` – covers 'test apply patch cli add overwrites existing file'.
- `test_apply_patch_cli_delete_directory_fails` – covers 'test apply patch cli delete directory fails'.
- `test_apply_patch_cli_rejects_invalid_hunk_header` – covers 'test apply patch cli rejects invalid hunk header'.
- `test_apply_patch_cli_updates_file_appends_trailing_newline` – covers 'test apply patch cli updates file appends trailing newline'.
- `test_apply_patch_cli_failure_after_partial_success_leaves_changes` – covers 'test apply patch cli failure after partial success leaves changes'.

### codex-rs/async-utils/src/lib.rs
- `returns_ok_when_future_completes_first` – covers 'returns ok when future completes first'.
- `returns_err_when_token_cancelled_first` – covers 'returns err when token cancelled first'.
- `returns_err_when_token_already_cancelled` – covers 'returns err when token already cancelled'.

### codex-rs/backend-client/src/types.rs
- `unified_diff_prefers_current_diff_task_turn` – covers 'unified diff prefers current diff task turn'.
- `unified_diff_falls_back_to_pr_output_diff` – covers 'unified diff falls back to pr output diff'.
- `assistant_text_messages_extracts_text_content` – covers 'assistant text messages extracts text content'.
- `user_text_prompt_joins_parts_with_spacing` – covers 'user text prompt joins parts with spacing'.
- `assistant_error_message_combines_code_and_message` – covers 'assistant error message combines code and message'.

### codex-rs/chatgpt/tests/suite/apply_command_e2e.rs
- `test_apply_command_creates_fibonacci_file` – covers 'test apply command creates fibonacci file'.
- `test_apply_command_with_merge_conflicts` – covers 'test apply command with merge conflicts'.

### codex-rs/cli/src/debug_sandbox/pid_tracker.rs
- `pid_is_alive_detects_current_process` – covers 'pid is alive detects current process'.
- `list_child_pids_includes_spawned_child` – covers 'list child pids includes spawned child'.
- `pid_tracker_collects_spawned_children` – covers 'pid tracker collects spawned children'.
- `pid_tracker_collects_bash_subshell_descendants` – covers 'pid tracker collects bash subshell descendants'.

### codex-rs/cli/src/login.rs
- `formats_long_key` – covers 'formats long key'.
- `short_key_returns_stars` – covers 'short key returns stars'.

### codex-rs/cli/src/main.rs
- `format_exit_messages_skips_zero_usage` – covers 'format exit messages skips zero usage'.
- `format_exit_messages_includes_resume_hint_without_color` – covers 'format exit messages includes resume hint without color'.
- `format_exit_messages_applies_color_when_enabled` – covers 'format exit messages applies color when enabled'.
- `resume_model_flag_applies_when_no_root_flags` – covers 'resume model flag applies when no root flags'.
- `resume_picker_logic_none_and_not_last` – covers 'resume picker logic none and not last'.
- `resume_picker_logic_last` – covers 'resume picker logic last'.
- `resume_picker_logic_with_session_id` – covers 'resume picker logic with session id'.
- `resume_merges_option_flags_and_full_auto` – covers 'resume merges option flags and full auto'.
- `resume_merges_dangerously_bypass_flag` – covers 'resume merges dangerously bypass flag'.
- `feature_toggles_known_features_generate_overrides` – covers 'feature toggles known features generate overrides'.
- `feature_toggles_unknown_feature_errors` – covers 'feature toggles unknown feature errors'.

### codex-rs/cli/src/wsl_paths.rs
- `win_to_wsl_basic` – covers 'win to wsl basic'.
- `normalize_is_noop_on_unix_paths` – covers 'normalize is noop on unix paths'.

### codex-rs/cli/tests/mcp_add_remove.rs
- `add_and_remove_server_updates_global_config` – covers 'add and remove server updates global config'.
- `add_with_env_preserves_key_order_and_values` – covers 'add with env preserves key order and values'.
- `add_streamable_http_without_manual_token` – covers 'add streamable http without manual token'.
- `add_streamable_http_with_custom_env_var` – covers 'add streamable http with custom env var'.
- `add_streamable_http_rejects_removed_flag` – covers 'add streamable http rejects removed flag'.
- `add_cant_add_command_and_url` – covers 'add cant add command and url'.

### codex-rs/cli/tests/mcp_list.rs
- `list_shows_empty_state` – covers 'list shows empty state'.
- `list_and_get_render_expected_output` – covers 'list and get render expected output'.
- `get_disabled_server_shows_single_line` – covers 'get disabled server shows single line'.

### codex-rs/cloud-tasks/src/app.rs
- `load_tasks_uses_env_parameter` – covers 'load tasks uses env parameter'.

### codex-rs/cloud-tasks/tests/env_filter.rs
- `mock_backend_varies_by_env` – covers 'mock backend varies by env'.

### codex-rs/common/src/config_override.rs
- `parses_basic_scalar` – covers 'parses basic scalar'.
- `parses_bool` – covers 'parses bool'.
- `fails_on_unquoted_string` – covers 'fails on unquoted string'.
- `parses_array` – covers 'parses array'.
- `parses_inline_table` – covers 'parses inline table'.

### codex-rs/common/src/elapsed.rs
- `test_format_duration_subsecond` – covers 'test format duration subsecond'.
- `test_format_duration_seconds` – covers 'test format duration seconds'.
- `test_format_duration_minutes` – covers 'test format duration minutes'.
- `test_format_duration_one_hour_has_space` – covers 'test format duration one hour has space'.

### codex-rs/common/src/format_env_display.rs
- `returns_dash_when_empty` – covers 'returns dash when empty'.
- `formats_sorted_env_pairs` – covers 'formats sorted env pairs'.
- `formats_env_vars_with_dollar_prefix` – covers 'formats env vars with dollar prefix'.
- `combines_env_pairs_and_vars` – covers 'combines env pairs and vars'.

### codex-rs/common/src/fuzzy_match.rs
- `ascii_basic_indices` – covers 'ascii basic indices'.
- `unicode_dotted_i_istanbul_highlighting` – covers 'unicode dotted i istanbul highlighting'.
- `unicode_german_sharp_s_casefold` – covers 'unicode german sharp s casefold'.
- `prefer_contiguous_match_over_spread` – covers 'prefer contiguous match over spread'.
- `start_of_string_bonus_applies` – covers 'start of string bonus applies'.
- `empty_needle_matches_with_max_score_and_no_indices` – covers 'empty needle matches with max score and no indices'.
- `case_insensitive_matching_basic` – covers 'case insensitive matching basic'.
- `indices_are_deduped_for_multichar_lowercase_expansion` – covers 'indices are deduped for multichar lowercase expansion'.

### codex-rs/common/src/model_presets.rs
- `only_one_default_model_is_configured` – covers 'only one default model is configured'.

### codex-rs/common/src/oss.rs
- `test_get_default_model_for_provider_lmstudio` – covers 'test get default model for provider lmstudio'.
- `test_get_default_model_for_provider_ollama` – covers 'test get default model for provider ollama'.
- `test_get_default_model_for_provider_unknown` – covers 'test get default model for provider unknown'.

### codex-rs/core/src/apply_patch.rs
- `convert_apply_patch_maps_add_variant` – covers 'convert apply patch maps add variant'.

### codex-rs/core/src/auth/storage.rs
- `file_storage_load_returns_auth_dot_json` – covers 'file storage load returns auth dot json'.
- `file_storage_save_persists_auth_dot_json` – covers 'file storage save persists auth dot json'.
- `file_storage_delete_removes_auth_file` – covers 'file storage delete removes auth file'.
- `keyring_auth_storage_load_returns_deserialized_auth` – covers 'keyring auth storage load returns deserialized auth'.
- `keyring_auth_storage_compute_store_key_for_home_directory` – covers 'keyring auth storage compute store key for home directory'.
- `keyring_auth_storage_save_persists_and_removes_fallback_file` – covers 'keyring auth storage save persists and removes fallback file'.
- `keyring_auth_storage_delete_removes_keyring_and_file` – covers 'keyring auth storage delete removes keyring and file'.
- `auto_auth_storage_load_prefers_keyring_value` – covers 'auto auth storage load prefers keyring value'.
- `auto_auth_storage_load_uses_file_when_keyring_empty` – covers 'auto auth storage load uses file when keyring empty'.
- `auto_auth_storage_load_falls_back_when_keyring_errors` – covers 'auto auth storage load falls back when keyring errors'.
- `auto_auth_storage_save_prefers_keyring` – covers 'auto auth storage save prefers keyring'.
- `auto_auth_storage_save_falls_back_when_keyring_errors` – covers 'auto auth storage save falls back when keyring errors'.
- `auto_auth_storage_delete_removes_keyring_and_file` – covers 'auto auth storage delete removes keyring and file'.

### codex-rs/core/src/auth.rs
- `refresh_without_id_token` – covers 'refresh without id token'.
- `login_with_api_key_overwrites_existing_auth_json` – covers 'login with api key overwrites existing auth json'.
- `missing_auth_json_returns_none` – covers 'missing auth json returns none'.
- `logout_removes_auth_file` – covers 'logout removes auth file'.
- `enforce_login_restrictions_logs_out_for_method_mismatch` – covers 'enforce login restrictions logs out for method mismatch'.
- `enforce_login_restrictions_allows_api_key_if_login_method_not_set_but_forced_chatgpt_workspace_id_is_set` – covers 'enforce login restrictions allows api key if login method not set but forced chatgpt workspace id is set'.
- `plan_type_maps_known_plan` – covers 'plan type maps known plan'.
- `plan_type_maps_unknown_to_unknown` – covers 'plan type maps unknown to unknown'.

### codex-rs/core/src/bash.rs
- `accepts_single_simple_command` – covers 'accepts single simple command'.
- `accepts_multiple_commands_with_allowed_operators` – covers 'accepts multiple commands with allowed operators'.
- `extracts_double_and_single_quoted_strings` – covers 'extracts double and single quoted strings'.
- `accepts_numbers_as_words` – covers 'accepts numbers as words'.
- `rejects_parentheses_and_subshells` – covers 'rejects parentheses and subshells'.
- `rejects_redirections_and_unsupported_operators` – covers 'rejects redirections and unsupported operators'.
- `rejects_command_and_process_substitutions_and_expansions` – covers 'rejects command and process substitutions and expansions'.
- `rejects_variable_assignment_prefix` – covers 'rejects variable assignment prefix'.
- `rejects_trailing_operator_parse_error` – covers 'rejects trailing operator parse error'.
- `parse_zsh_lc_plain_commands` – covers 'parse zsh lc plain commands'.

### codex-rs/core/src/client.rs
- `parses_items_and_completed` – covers 'parses items and completed'.
- `error_when_missing_completed` – covers 'error when missing completed'.
- `error_when_error_event` – covers 'error when error event'.
- `context_window_error_is_fatal` – covers 'context window error is fatal'.
- `context_window_error_with_newline_is_fatal` – covers 'context window error with newline is fatal'.
- `quota_exceeded_error_is_fatal` – covers 'quota exceeded error is fatal'.
- `table_driven_event_kinds` – covers 'table driven event kinds'.
- `test_try_parse_retry_after` – covers 'test try parse retry after'.
- `test_try_parse_retry_after_no_delay` – covers 'test try parse retry after no delay'.
- `test_try_parse_retry_after_azure` – covers 'test try parse retry after azure'.
- `error_response_deserializes_schema_known_plan_type_and_serializes_back` – covers 'error response deserializes schema known plan type and serializes back'.
- `error_response_deserializes_schema_unknown_plan_type_and_serializes_back` – covers 'error response deserializes schema unknown plan type and serializes back'.

### codex-rs/core/src/client_common.rs
- `get_full_instructions_no_user_content` – covers 'get full instructions no user content'.
- `serializes_text_verbosity_when_set` – covers 'serializes text verbosity when set'.
- `serializes_text_schema_with_strict_format` – covers 'serializes text schema with strict format'.
- `omits_text_when_not_set` – covers 'omits text when not set'.

### codex-rs/core/src/codex.rs
- `reconstruct_history_matches_live_compactions` – covers 'reconstruct history matches live compactions'.
- `record_initial_history_reconstructs_resumed_transcript` – covers 'record initial history reconstructs resumed transcript'.
- `record_initial_history_reconstructs_forked_transcript` – covers 'record initial history reconstructs forked transcript'.
- `prefers_structured_content_when_present` – covers 'prefers structured content when present'.
- `includes_timed_out_message` – covers 'includes timed out message'.
- `falls_back_to_content_when_structured_is_null` – covers 'falls back to content when structured is null'.
- `success_flag_reflects_is_error_true` – covers 'success flag reflects is error true'.
- `success_flag_true_with_no_error_and_content_used` – covers 'success flag true with no error and content used'.
- `abort_regular_task_emits_turn_aborted_only` – covers 'abort regular task emits turn aborted only'.
- `abort_gracefuly_emits_turn_aborted_only` – covers 'abort gracefuly emits turn aborted only'.
- `abort_review_task_emits_exited_then_aborted_and_records_history` – covers 'abort review task emits exited then aborted and records history'.
- `fatal_tool_error_stops_turn_and_reports_error` – covers 'fatal tool error stops turn and reports error'.
- `rejects_escalated_permissions_when_policy_not_on_request` – covers 'rejects escalated permissions when policy not on request'.
- `unified_exec_rejects_escalated_permissions_when_policy_not_on_request` – covers 'unified exec rejects escalated permissions when policy not on request'.

### codex-rs/core/src/command_safety/is_dangerous_command.rs
- `git_reset_is_dangerous` – covers 'git reset is dangerous'.
- `bash_git_reset_is_dangerous` – covers 'bash git reset is dangerous'.
- `zsh_git_reset_is_dangerous` – covers 'zsh git reset is dangerous'.
- `git_status_is_not_dangerous` – covers 'git status is not dangerous'.
- `bash_git_status_is_not_dangerous` – covers 'bash git status is not dangerous'.
- `sudo_git_reset_is_dangerous` – covers 'sudo git reset is dangerous'.
- `usr_bin_git_is_dangerous` – covers 'usr bin git is dangerous'.
- `rm_rf_is_dangerous` – covers 'rm rf is dangerous'.
- `rm_f_is_dangerous` – covers 'rm f is dangerous'.

### codex-rs/core/src/command_safety/is_safe_command.rs
- `known_safe_examples` – covers 'known safe examples'.
- `zsh_lc_safe_command_sequence` – covers 'zsh lc safe command sequence'.
- `unknown_or_partial` – covers 'unknown or partial'.
- `ripgrep_rules` – covers 'ripgrep rules'.
- `bash_lc_safe_examples` – covers 'bash lc safe examples'.
- `bash_lc_safe_examples_with_operators` – covers 'bash lc safe examples with operators'.
- `bash_lc_unsafe_examples` – covers 'bash lc unsafe examples'.

### codex-rs/core/src/command_safety/windows_safe_commands.rs
- `recognizes_safe_powershell_wrappers` – covers 'recognizes safe powershell wrappers'.
- `allows_read_only_pipelines_and_git_usage` – covers 'allows read only pipelines and git usage'.
- `rejects_powershell_commands_with_side_effects` – covers 'rejects powershell commands with side effects'.

### codex-rs/core/src/compact.rs
- `content_items_to_text_joins_non_empty_segments` – covers 'content items to text joins non empty segments'.
- `content_items_to_text_ignores_image_only_content` – covers 'content items to text ignores image only content'.
- `collect_user_messages_extracts_user_text_only` – covers 'collect user messages extracts user text only'.
- `collect_user_messages_filters_session_prefix_entries` – covers 'collect user messages filters session prefix entries'.
- `build_compacted_history_truncates_overlong_user_messages` – covers 'build compacted history truncates overlong user messages'.
- `build_compacted_history_appends_summary_message` – covers 'build compacted history appends summary message'.

### codex-rs/core/src/config/edit.rs
- `blocking_set_model_top_level` – covers 'blocking set model top level'.
- `blocking_set_model_preserves_inline_table_contents` – covers 'blocking set model preserves inline table contents'.
- `blocking_clear_model_removes_inline_table_entry` – covers 'blocking clear model removes inline table entry'.
- `blocking_set_model_scopes_to_active_profile` – covers 'blocking set model scopes to active profile'.
- `blocking_set_model_with_explicit_profile` – covers 'blocking set model with explicit profile'.
- `blocking_set_hide_full_access_warning_preserves_table` – covers 'blocking set hide full access warning preserves table'.
- `blocking_set_hide_rate_limit_model_nudge_preserves_table` – covers 'blocking set hide rate limit model nudge preserves table'.
- `blocking_set_hide_gpt5_1_migration_prompt_preserves_table` – covers 'blocking set hide gpt5 1 migration prompt preserves table'.
- `blocking_replace_mcp_servers_round_trips` – covers 'blocking replace mcp servers round trips'.
- `blocking_clear_path_noop_when_missing` – covers 'blocking clear path noop when missing'.
- `blocking_set_path_updates_notifications` – covers 'blocking set path updates notifications'.
- `async_builder_set_model_persists` – covers 'async builder set model persists'.
- `blocking_builder_set_model_round_trips_back_and_forth` – covers 'blocking builder set model round trips back and forth'.
- `blocking_set_asynchronous_helpers_available` – covers 'blocking set asynchronous helpers available'.
- `replace_mcp_servers_blocking_clears_table_when_empty` – covers 'replace mcp servers blocking clears table when empty'.

### codex-rs/core/src/config/mod.rs
- `test_toml_parsing` – covers 'test toml parsing'.
- `tui_config_missing_notifications_field_defaults_to_enabled` – covers 'tui config missing notifications field defaults to enabled'.
- `test_sandbox_config_parsing` – covers 'test sandbox config parsing'.
- `add_dir_override_extends_workspace_writable_roots` – covers 'add dir override extends workspace writable roots'.
- `config_defaults_to_file_cli_auth_store_mode` – covers 'config defaults to file cli auth store mode'.
- `config_honors_explicit_keyring_auth_store_mode` – covers 'config honors explicit keyring auth store mode'.
- `config_defaults_to_auto_oauth_store_mode` – covers 'config defaults to auto oauth store mode'.
- `profile_legacy_toggles_override_base` – covers 'profile legacy toggles override base'.
- `profile_sandbox_mode_overrides_base` – covers 'profile sandbox mode overrides base'.
- `cli_override_takes_precedence_over_profile_sandbox_mode` – covers 'cli override takes precedence over profile sandbox mode'.
- `feature_table_overrides_legacy_flags` – covers 'feature table overrides legacy flags'.
- `legacy_toggles_map_to_features` – covers 'legacy toggles map to features'.
- `config_honors_explicit_file_oauth_store_mode` – covers 'config honors explicit file oauth store mode'.
- `managed_config_overrides_oauth_store_mode` – covers 'managed config overrides oauth store mode'.
- `load_global_mcp_servers_returns_empty_if_missing` – covers 'load global mcp servers returns empty if missing'.
- `replace_mcp_servers_round_trips_entries` – covers 'replace mcp servers round trips entries'.
- `managed_config_wins_over_cli_overrides` – covers 'managed config wins over cli overrides'.
- `load_global_mcp_servers_accepts_legacy_ms_field` – covers 'load global mcp servers accepts legacy ms field'.
- `load_global_mcp_servers_rejects_inline_bearer_token` – covers 'load global mcp servers rejects inline bearer token'.
- `replace_mcp_servers_serializes_env_sorted` – covers 'replace mcp servers serializes env sorted'.
- `replace_mcp_servers_serializes_env_vars` – covers 'replace mcp servers serializes env vars'.
- `replace_mcp_servers_serializes_cwd` – covers 'replace mcp servers serializes cwd'.
- `replace_mcp_servers_streamable_http_serializes_bearer_token` – covers 'replace mcp servers streamable http serializes bearer token'.
- `replace_mcp_servers_streamable_http_serializes_custom_headers` – covers 'replace mcp servers streamable http serializes custom headers'.
- `replace_mcp_servers_streamable_http_removes_optional_sections` – covers 'replace mcp servers streamable http removes optional sections'.
- `replace_mcp_servers_streamable_http_isolates_headers_between_servers` – covers 'replace mcp servers streamable http isolates headers between servers'.
- `replace_mcp_servers_serializes_disabled_flag` – covers 'replace mcp servers serializes disabled flag'.
- `replace_mcp_servers_serializes_tool_filters` – covers 'replace mcp servers serializes tool filters'.
- `set_model_updates_defaults` – covers 'set model updates defaults'.
- `set_model_overwrites_existing_model` – covers 'set model overwrites existing model'.
- `set_model_updates_profile` – covers 'set model updates profile'.
- `set_model_updates_existing_profile` – covers 'set model updates existing profile'.
- `cli_override_sets_compact_prompt` – covers 'cli override sets compact prompt'.
- `loads_compact_prompt_from_file` – covers 'loads compact prompt from file'.
- `test_precedence_fixture_with_o3_profile` – covers 'test precedence fixture with o3 profile'.
- `test_precedence_fixture_with_gpt3_profile` – covers 'test precedence fixture with gpt3 profile'.
- `test_precedence_fixture_with_zdr_profile` – covers 'test precedence fixture with zdr profile'.
- `test_precedence_fixture_with_gpt5_profile` – covers 'test precedence fixture with gpt5 profile'.
- `test_did_user_set_custom_approval_policy_or_sandbox_mode_defaults_no` – covers 'test did user set custom approval policy or sandbox mode defaults no'.
- `test_set_project_trusted_writes_explicit_tables` – covers 'test set project trusted writes explicit tables'.
- `test_set_project_trusted_converts_inline_to_explicit` – covers 'test set project trusted converts inline to explicit'.
- `test_set_project_trusted_migrates_top_level_inline_projects_preserving_entries` – covers 'test set project trusted migrates top level inline projects preserving entries'.
- `test_set_default_oss_provider` – covers 'test set default oss provider'.
- `test_untrusted_project_gets_workspace_write_sandbox` – covers 'test untrusted project gets workspace write sandbox'.
- `test_resolve_oss_provider_explicit_override` – covers 'test resolve oss provider explicit override'.
- `test_resolve_oss_provider_from_profile` – covers 'test resolve oss provider from profile'.
- `test_resolve_oss_provider_from_global_config` – covers 'test resolve oss provider from global config'.
- `test_resolve_oss_provider_profile_fallback_to_global` – covers 'test resolve oss provider profile fallback to global'.
- `test_resolve_oss_provider_none_when_not_configured` – covers 'test resolve oss provider none when not configured'.
- `test_resolve_oss_provider_explicit_overrides_all` – covers 'test resolve oss provider explicit overrides all'.
- `test_untrusted_project_gets_unless_trusted_approval_policy` – covers 'test untrusted project gets unless trusted approval policy'.
- `test_tui_notifications_true` – covers 'test tui notifications true'.
- `test_tui_notifications_custom_array` – covers 'test tui notifications custom array'.

### codex-rs/core/src/config/types.rs
- `deserialize_stdio_command_server_config` – covers 'deserialize stdio command server config'.
- `deserialize_stdio_command_server_config_with_args` – covers 'deserialize stdio command server config with args'.
- `deserialize_stdio_command_server_config_with_arg_with_args_and_env` – covers 'deserialize stdio command server config with arg with args and env'.
- `deserialize_stdio_command_server_config_with_env_vars` – covers 'deserialize stdio command server config with env vars'.
- `deserialize_stdio_command_server_config_with_cwd` – covers 'deserialize stdio command server config with cwd'.
- `deserialize_disabled_server_config` – covers 'deserialize disabled server config'.
- `deserialize_streamable_http_server_config` – covers 'deserialize streamable http server config'.
- `deserialize_streamable_http_server_config_with_env_var` – covers 'deserialize streamable http server config with env var'.
- `deserialize_streamable_http_server_config_with_headers` – covers 'deserialize streamable http server config with headers'.
- `deserialize_server_config_with_tool_filters` – covers 'deserialize server config with tool filters'.
- `deserialize_rejects_command_and_url` – covers 'deserialize rejects command and url'.
- `deserialize_rejects_env_for_http_transport` – covers 'deserialize rejects env for http transport'.
- `deserialize_rejects_headers_for_stdio` – covers 'deserialize rejects headers for stdio'.
- `deserialize_rejects_inline_bearer_token_field` – covers 'deserialize rejects inline bearer token field'.

### codex-rs/core/src/config_loader/mod.rs
- `merges_managed_config_layer_on_top` – covers 'merges managed config layer on top'.
- `returns_empty_when_all_layers_missing` – covers 'returns empty when all layers missing'.
- `managed_preferences_take_highest_precedence` – covers 'managed preferences take highest precedence'.

### codex-rs/core/src/context_manager/history_tests.rs
- `filters_non_api_messages` – covers 'filters non api messages'.
- `get_history_for_prompt_drops_ghost_commits` – covers 'get history for prompt drops ghost commits'.
- `remove_first_item_removes_matching_output_for_function_call` – covers 'remove first item removes matching output for function call'.
- `remove_first_item_removes_matching_call_for_output` – covers 'remove first item removes matching call for output'.
- `remove_first_item_handles_local_shell_pair` – covers 'remove first item handles local shell pair'.
- `remove_first_item_handles_custom_tool_pair` – covers 'remove first item handles custom tool pair'.
- `normalization_retains_local_shell_outputs` – covers 'normalization retains local shell outputs'.
- `record_items_truncates_function_call_output_content` – covers 'record items truncates function call output content'.
- `record_items_truncates_custom_tool_call_output_content` – covers 'record items truncates custom tool call output content'.
- `format_exec_output_truncates_large_error` – covers 'format exec output truncates large error'.
- `format_exec_output_marks_byte_truncation_without_omitted_lines` – covers 'format exec output marks byte truncation without omitted lines'.
- `format_exec_output_returns_original_when_within_limits` – covers 'format exec output returns original when within limits'.
- `format_exec_output_reports_omitted_lines_and_keeps_head_and_tail` – covers 'format exec output reports omitted lines and keeps head and tail'.
- `format_exec_output_prefers_line_marker_when_both_limits_exceeded` – covers 'format exec output prefers line marker when both limits exceeded'.
- `truncates_across_multiple_under_limit_texts_and_reports_omitted` – covers 'truncates across multiple under limit texts and reports omitted'.
- `normalize_adds_missing_output_for_function_call` – covers 'normalize adds missing output for function call'.
- `normalize_adds_missing_output_for_custom_tool_call` – covers 'normalize adds missing output for custom tool call'.
- `normalize_adds_missing_output_for_local_shell_call_with_id` – covers 'normalize adds missing output for local shell call with id'.
- `normalize_removes_orphan_function_call_output` – covers 'normalize removes orphan function call output'.
- `normalize_removes_orphan_custom_tool_call_output` – covers 'normalize removes orphan custom tool call output'.
- `normalize_mixed_inserts_and_removals` – covers 'normalize mixed inserts and removals'.

### codex-rs/core/src/conversation_manager.rs
- `drops_from_last_user_only` – covers 'drops from last user only'.
- `ignores_session_prefix_messages_when_truncating` – covers 'ignores session prefix messages when truncating'.

### codex-rs/core/src/custom_prompts.rs
- `empty_when_dir_missing` – covers 'empty when dir missing'.
- `discovers_and_sorts_files` – covers 'discovers and sorts files'.
- `excludes_builtins` – covers 'excludes builtins'.
- `skips_non_utf8_files` – covers 'skips non utf8 files'.
- `parses_frontmatter_and_strips_from_body` – covers 'parses frontmatter and strips from body'.
- `parse_frontmatter_preserves_body_newlines` – covers 'parse frontmatter preserves body newlines'.

### codex-rs/core/src/default_client.rs
- `test_get_codex_user_agent` – covers 'test get codex user agent'.
- `test_create_client_sets_default_headers` – covers 'test create client sets default headers'.
- `test_invalid_suffix_is_sanitized` – covers 'test invalid suffix is sanitized'.
- `test_invalid_suffix_is_sanitized2` – covers 'test invalid suffix is sanitized2'.

### codex-rs/core/src/environment_context.rs
- `serialize_workspace_write_environment_context` – covers 'serialize workspace write environment context'.
- `serialize_read_only_environment_context` – covers 'serialize read only environment context'.
- `serialize_full_access_environment_context` – covers 'serialize full access environment context'.
- `equals_except_shell_compares_approval_policy` – covers 'equals except shell compares approval policy'.
- `equals_except_shell_compares_sandbox_policy` – covers 'equals except shell compares sandbox policy'.
- `equals_except_shell_compares_workspace_write_policy` – covers 'equals except shell compares workspace write policy'.
- `equals_except_shell_ignores_shell` – covers 'equals except shell ignores shell'.

### codex-rs/core/src/error.rs
- `usage_limit_reached_error_formats_plus_plan` – covers 'usage limit reached error formats plus plan'.
- `sandbox_denied_uses_aggregated_output_when_stderr_empty` – covers 'sandbox denied uses aggregated output when stderr empty'.
- `sandbox_denied_reports_both_streams_when_available` – covers 'sandbox denied reports both streams when available'.
- `sandbox_denied_reports_stdout_when_no_stderr` – covers 'sandbox denied reports stdout when no stderr'.
- `sandbox_denied_reports_exit_code_when_no_output_available` – covers 'sandbox denied reports exit code when no output available'.
- `usage_limit_reached_error_formats_free_plan` – covers 'usage limit reached error formats free plan'.
- `usage_limit_reached_error_formats_default_when_none` – covers 'usage limit reached error formats default when none'.
- `usage_limit_reached_error_formats_team_plan` – covers 'usage limit reached error formats team plan'.
- `usage_limit_reached_error_formats_business_plan_without_reset` – covers 'usage limit reached error formats business plan without reset'.
- `usage_limit_reached_error_formats_default_for_other_plans` – covers 'usage limit reached error formats default for other plans'.
- `usage_limit_reached_error_formats_pro_plan_with_reset` – covers 'usage limit reached error formats pro plan with reset'.
- `usage_limit_reached_includes_minutes_when_available` – covers 'usage limit reached includes minutes when available'.
- `unexpected_status_cloudflare_html_is_simplified` – covers 'unexpected status cloudflare html is simplified'.
- `unexpected_status_non_html_is_unchanged` – covers 'unexpected status non html is unchanged'.
- `usage_limit_reached_includes_hours_and_minutes` – covers 'usage limit reached includes hours and minutes'.
- `usage_limit_reached_includes_days_hours_minutes` – covers 'usage limit reached includes days hours minutes'.
- `usage_limit_reached_less_than_minute` – covers 'usage limit reached less than minute'.

### codex-rs/core/src/event_mapping.rs
- `parses_user_message_with_text_and_two_images` – covers 'parses user message with text and two images'.
- `skips_user_instructions_and_env` – covers 'skips user instructions and env'.
- `parses_agent_message` – covers 'parses agent message'.
- `parses_reasoning_summary_and_raw_content` – covers 'parses reasoning summary and raw content'.
- `parses_reasoning_including_raw_content` – covers 'parses reasoning including raw content'.
- `parses_web_search_call` – covers 'parses web search call'.

### codex-rs/core/src/exec.rs
- `sandbox_detection_requires_keywords` – covers 'sandbox detection requires keywords'.
- `sandbox_detection_identifies_keyword_in_stderr` – covers 'sandbox detection identifies keyword in stderr'.
- `sandbox_detection_respects_quick_reject_exit_codes` – covers 'sandbox detection respects quick reject exit codes'.
- `sandbox_detection_ignores_non_sandbox_mode` – covers 'sandbox detection ignores non sandbox mode'.
- `sandbox_detection_uses_aggregated_output` – covers 'sandbox detection uses aggregated output'.
- `sandbox_detection_flags_sigsys_exit_code` – covers 'sandbox detection flags sigsys exit code'.
- `kill_child_process_group_kills_grandchildren_on_timeout` – covers 'kill child process group kills grandchildren on timeout'.

### codex-rs/core/src/exec_env.rs
- `test_core_inherit_and_default_excludes` – covers 'test core inherit and default excludes'.
- `test_include_only` – covers 'test include only'.
- `test_set_overrides` – covers 'test set overrides'.
- `test_inherit_all` – covers 'test inherit all'.
- `test_inherit_all_with_default_excludes` – covers 'test inherit all with default excludes'.
- `test_inherit_none` – covers 'test inherit none'.

### codex-rs/core/src/git_info.rs
- `test_recent_commits_non_git_directory_returns_empty` – covers 'test recent commits non git directory returns empty'.
- `test_recent_commits_orders_and_limits` – covers 'test recent commits orders and limits'.
- `test_collect_git_info_non_git_directory` – covers 'test collect git info non git directory'.
- `test_collect_git_info_git_repository` – covers 'test collect git info git repository'.
- `test_collect_git_info_with_remote` – covers 'test collect git info with remote'.
- `test_collect_git_info_detached_head` – covers 'test collect git info detached head'.
- `test_collect_git_info_with_branch` – covers 'test collect git info with branch'.
- `test_get_git_working_tree_state_clean_repo` – covers 'test get git working tree state clean repo'.
- `test_get_git_working_tree_state_with_changes` – covers 'test get git working tree state with changes'.
- `test_get_git_working_tree_state_branch_fallback` – covers 'test get git working tree state branch fallback'.
- `resolve_root_git_project_for_trust_returns_none_outside_repo` – covers 'resolve root git project for trust returns none outside repo'.
- `resolve_root_git_project_for_trust_regular_repo_returns_repo_root` – covers 'resolve root git project for trust regular repo returns repo root'.
- `resolve_root_git_project_for_trust_detects_worktree_and_returns_main_root` – covers 'resolve root git project for trust detects worktree and returns main root'.
- `resolve_root_git_project_for_trust_non_worktrees_gitdir_returns_none` – covers 'resolve root git project for trust non worktrees gitdir returns none'.
- `test_get_git_working_tree_state_unpushed_commit` – covers 'test get git working tree state unpushed commit'.
- `test_git_info_serialization` – covers 'test git info serialization'.
- `test_git_info_serialization_with_nones` – covers 'test git info serialization with nones'.

### codex-rs/core/src/mcp_connection_manager.rs
- `test_qualify_tools_short_non_duplicated_names` – covers 'test qualify tools short non duplicated names'.
- `test_qualify_tools_duplicated_names_skipped` – covers 'test qualify tools duplicated names skipped'.
- `test_qualify_tools_long_names_same_server` – covers 'test qualify tools long names same server'.
- `tool_filter_allows_by_default` – covers 'tool filter allows by default'.
- `tool_filter_applies_enabled_list` – covers 'tool filter applies enabled list'.
- `tool_filter_applies_disabled_list` – covers 'tool filter applies disabled list'.
- `tool_filter_applies_enabled_then_disabled` – covers 'tool filter applies enabled then disabled'.
- `filter_tools_applies_per_server_filters` – covers 'filter tools applies per server filters'.
- `mcp_init_error_display_prompts_for_github_pat` – covers 'mcp init error display prompts for github pat'.
- `mcp_init_error_display_prompts_for_login_when_auth_required` – covers 'mcp init error display prompts for login when auth required'.
- `mcp_init_error_display_reports_generic_errors` – covers 'mcp init error display reports generic errors'.
- `mcp_init_error_display_includes_startup_timeout_hint` – covers 'mcp init error display includes startup timeout hint'.

### codex-rs/core/src/model_provider_info.rs
- `test_deserialize_ollama_model_provider_toml` – covers 'test deserialize ollama model provider toml'.
- `test_deserialize_azure_model_provider_toml` – covers 'test deserialize azure model provider toml'.
- `test_deserialize_example_model_provider_toml` – covers 'test deserialize example model provider toml'.
- `detects_azure_responses_base_urls` – covers 'detects azure responses base urls'.

### codex-rs/core/src/parse_command.rs
- `git_status_is_unknown` – covers 'git status is unknown'.
- `handles_git_pipe_wc` – covers 'handles git pipe wc'.
- `bash_lc_redirect_not_quoted` – covers 'bash lc redirect not quoted'.
- `handles_complex_bash_command_head` – covers 'handles complex bash command head'.
- `supports_searching_for_navigate_to_route` – covers 'supports searching for navigate to route'.
- `handles_complex_bash_command` – covers 'handles complex bash command'.
- `supports_rg_files_with_path_and_pipe` – covers 'supports rg files with path and pipe'.
- `supports_rg_files_then_head` – covers 'supports rg files then head'.
- `supports_cat` – covers 'supports cat'.
- `zsh_lc_supports_cat` – covers 'zsh lc supports cat'.
- `cd_then_cat_is_single_read` – covers 'cd then cat is single read'.
- `bash_cd_then_bar_is_same_as_bar` – covers 'bash cd then bar is same as bar'.
- `bash_cd_then_cat_is_read` – covers 'bash cd then cat is read'.
- `supports_ls_with_pipe` – covers 'supports ls with pipe'.
- `supports_head_n` – covers 'supports head n'.
- `supports_cat_sed_n` – covers 'supports cat sed n'.
- `supports_tail_n_plus` – covers 'supports tail n plus'.
- `supports_tail_n_last_lines` – covers 'supports tail n last lines'.
- `supports_npm_run_build_is_unknown` – covers 'supports npm run build is unknown'.
- `supports_grep_recursive_current_dir` – covers 'supports grep recursive current dir'.
- `supports_grep_recursive_specific_file` – covers 'supports grep recursive specific file'.
- `supports_grep_query_with_slashes_not_shortened` – covers 'supports grep query with slashes not shortened'.
- `supports_grep_weird_backtick_in_query` – covers 'supports grep weird backtick in query'.
- `supports_cd_and_rg_files` – covers 'supports cd and rg files'.
- `small_formatting_always_true_commands` – covers 'small formatting always true commands'.
- `head_behavior` – covers 'head behavior'.
- `tail_behavior` – covers 'tail behavior'.
- `sed_behavior` – covers 'sed behavior'.
- `empty_tokens_is_not_small` – covers 'empty tokens is not small'.
- `supports_nl_then_sed_reading` – covers 'supports nl then sed reading'.
- `supports_sed_n` – covers 'supports sed n'.
- `filters_out_printf` – covers 'filters out printf'.
- `drops_yes_in_pipelines` – covers 'drops yes in pipelines'.
- `supports_sed_n_then_nl_as_search` – covers 'supports sed n then nl as search'.
- `preserves_rg_with_spaces` – covers 'preserves rg with spaces'.
- `ls_with_glob` – covers 'ls with glob'.
- `trim_on_semicolon` – covers 'trim on semicolon'.
- `split_on_or_connector` – covers 'split on or connector'.
- `parses_mixed_sequence_with_pipes_semicolons_and_or` – covers 'parses mixed sequence with pipes semicolons and or'.
- `strips_true_in_sequence` – covers 'strips true in sequence'.
- `strips_true_inside_bash_lc` – covers 'strips true inside bash lc'.
- `shorten_path_on_windows` – covers 'shorten path on windows'.
- `head_with_no_space` – covers 'head with no space'.
- `bash_dash_c_pipeline_parsing` – covers 'bash dash c pipeline parsing'.
- `tail_with_no_space` – covers 'tail with no space'.
- `grep_with_query_and_path` – covers 'grep with query and path'.
- `rg_with_equals_style_flags` – covers 'rg with equals style flags'.
- `cat_with_double_dash_and_sed_ranges` – covers 'cat with double dash and sed ranges'.
- `drop_trailing_nl_in_pipeline` – covers 'drop trailing nl in pipeline'.
- `ls_with_time_style_and_path` – covers 'ls with time style and path'.
- `fd_file_finder_variants` – covers 'fd file finder variants'.
- `find_basic_name_filter` – covers 'find basic name filter'.
- `find_type_only_path` – covers 'find type only path'.
- `bin_bash_lc_sed` – covers 'bin bash lc sed'.
- `bin_zsh_lc_sed` – covers 'bin zsh lc sed'.
- `powershell_command_is_stripped` – covers 'powershell command is stripped'.
- `pwsh_with_noprofile_and_c_alias_is_stripped` – covers 'pwsh with noprofile and c alias is stripped'.
- `powershell_with_path_is_stripped` – covers 'powershell with path is stripped'.

### codex-rs/core/src/powershell.rs
- `extracts_basic_powershell_command` – covers 'extracts basic powershell command'.
- `extracts_lowercase_flags` – covers 'extracts lowercase flags'.
- `extracts_full_path_powershell_command` – covers 'extracts full path powershell command'.
- `extracts_with_noprofile_and_alias` – covers 'extracts with noprofile and alias'.

### codex-rs/core/src/project_doc.rs
- `no_doc_file_returns_none` – covers 'no doc file returns none'.
- `doc_smaller_than_limit_is_returned` – covers 'doc smaller than limit is returned'.
- `doc_larger_than_limit_is_truncated` – covers 'doc larger than limit is truncated'.
- `finds_doc_in_repo_root` – covers 'finds doc in repo root'.
- `zero_byte_limit_disables_docs` – covers 'zero byte limit disables docs'.
- `merges_existing_instructions_with_project_doc` – covers 'merges existing instructions with project doc'.
- `keeps_existing_instructions_when_doc_missing` – covers 'keeps existing instructions when doc missing'.
- `concatenates_root_and_cwd_docs` – covers 'concatenates root and cwd docs'.
- `agents_local_md_preferred` – covers 'agents local md preferred'.
- `uses_configured_fallback_when_agents_missing` – covers 'uses configured fallback when agents missing'.
- `agents_md_preferred_over_fallbacks` – covers 'agents md preferred over fallbacks'.

### codex-rs/core/src/rollout/tests.rs
- `test_list_conversations_latest_first` – covers 'test list conversations latest first'.
- `test_pagination_cursor` – covers 'test pagination cursor'.
- `test_get_conversation_contents` – covers 'test get conversation contents'.
- `test_tail_includes_last_response_items` – covers 'test tail includes last response items'.
- `test_tail_handles_short_sessions` – covers 'test tail handles short sessions'.
- `test_tail_skips_trailing_non_responses` – covers 'test tail skips trailing non responses'.
- `test_stable_ordering_same_second_pagination` – covers 'test stable ordering same second pagination'.
- `test_source_filter_excludes_non_matching_sessions` – covers 'test source filter excludes non matching sessions'.
- `test_model_provider_filter_selects_only_matching_sessions` – covers 'test model provider filter selects only matching sessions'.

### codex-rs/core/src/safety.rs
- `test_writable_roots_constraint` – covers 'test writable roots constraint'.

### codex-rs/core/src/seatbelt.rs
- `create_seatbelt_args_with_read_only_git_subpath` – covers 'create seatbelt args with read only git subpath'.
- `create_seatbelt_args_for_cwd_as_git_repo` – covers 'create seatbelt args for cwd as git repo'.

### codex-rs/core/src/shell.rs
- `test_detect_shell_type` – covers 'test detect shell type'.
- `detects_bash` – covers 'detects bash'.
- `test_current_shell_detects_zsh` – covers 'test current shell detects zsh'.
- `detects_powershell_as_default` – covers 'detects powershell as default'.
- `finds_poweshell` – covers 'finds poweshell'.

### codex-rs/core/src/token_data.rs
- `id_token_info_parses_email_and_plan` – covers 'id token info parses email and plan'.
- `id_token_info_handles_missing_fields` – covers 'id token info handles missing fields'.

### codex-rs/core/src/tools/context.rs
- `custom_tool_calls_should_roundtrip_as_custom_outputs` – covers 'custom tool calls should roundtrip as custom outputs'.
- `function_payloads_remain_function_outputs` – covers 'function payloads remain function outputs'.
- `telemetry_preview_returns_original_within_limits` – covers 'telemetry preview returns original within limits'.
- `telemetry_preview_truncates_by_bytes` – covers 'telemetry preview truncates by bytes'.
- `telemetry_preview_truncates_by_lines` – covers 'telemetry preview truncates by lines'.

### codex-rs/core/src/tools/handlers/grep_files.rs
- `parses_basic_results` – covers 'parses basic results'.
- `parse_truncates_after_limit` – covers 'parse truncates after limit'.
- `run_search_returns_results` – covers 'run search returns results'.
- `run_search_with_glob_filter` – covers 'run search with glob filter'.
- `run_search_respects_limit` – covers 'run search respects limit'.
- `run_search_handles_no_matches` – covers 'run search handles no matches'.

### codex-rs/core/src/tools/handlers/list_dir.rs
- `lists_directory_entries` – covers 'lists directory entries'.
- `errors_when_offset_exceeds_entries` – covers 'errors when offset exceeds entries'.
- `respects_depth_parameter` – covers 'respects depth parameter'.
- `handles_large_limit_without_overflow` – covers 'handles large limit without overflow'.
- `indicates_truncated_results` – covers 'indicates truncated results'.
- `bfs_truncation` – covers 'bfs truncation'.

### codex-rs/core/src/tools/handlers/mcp_resource.rs
- `resource_with_server_serializes_server_field` – covers 'resource with server serializes server field'.
- `list_resources_payload_from_single_server_copies_next_cursor` – covers 'list resources payload from single server copies next cursor'.
- `list_resources_payload_from_all_servers_is_sorted` – covers 'list resources payload from all servers is sorted'.
- `call_tool_result_from_content_marks_success` – covers 'call tool result from content marks success'.
- `parse_arguments_handles_empty_and_json` – covers 'parse arguments handles empty and json'.
- `template_with_server_serializes_server_field` – covers 'template with server serializes server field'.

### codex-rs/core/src/tools/handlers/read_file.rs
- `reads_requested_range` – covers 'reads requested range'.
- `errors_when_offset_exceeds_length` – covers 'errors when offset exceeds length'.
- `reads_non_utf8_lines` – covers 'reads non utf8 lines'.
- `trims_crlf_endings` – covers 'trims crlf endings'.
- `respects_limit_even_with_more_lines` – covers 'respects limit even with more lines'.
- `truncates_lines_longer_than_max_length` – covers 'truncates lines longer than max length'.
- `indentation_mode_captures_block` – covers 'indentation mode captures block'.
- `indentation_mode_expands_parents` – covers 'indentation mode expands parents'.
- `indentation_mode_respects_sibling_flag` – covers 'indentation mode respects sibling flag'.
- `indentation_mode_handles_python_sample` – covers 'indentation mode handles python sample'.
- `indentation_mode_handles_cpp_sample_shallow` – covers 'indentation mode handles cpp sample shallow'.
- `indentation_mode_handles_cpp_sample` – covers 'indentation mode handles cpp sample'.
- `indentation_mode_handles_cpp_sample_no_headers` – covers 'indentation mode handles cpp sample no headers'.
- `indentation_mode_handles_cpp_sample_siblings` – covers 'indentation mode handles cpp sample siblings'.

### codex-rs/core/src/tools/handlers/shell.rs
- `commands_generated_by_shell_command_handler_can_be_matched_by_is_known_safe_command` – covers 'commands generated by shell command handler can be matched by is known safe command'.

### codex-rs/core/src/tools/spec.rs
- `test_full_toolset_specs_for_gpt5_codex_unified_exec_web_search` – covers 'test full toolset specs for gpt5 codex unified exec web search'.
- `test_build_specs_gpt5_codex_default` – covers 'test build specs gpt5 codex default'.
- `test_build_specs_gpt51_codex_default` – covers 'test build specs gpt51 codex default'.
- `test_build_specs_gpt5_codex_unified_exec_web_search` – covers 'test build specs gpt5 codex unified exec web search'.
- `test_build_specs_gpt51_codex_unified_exec_web_search` – covers 'test build specs gpt51 codex unified exec web search'.
- `test_codex_mini_defaults` – covers 'test codex mini defaults'.
- `test_codex_5_1_mini_defaults` – covers 'test codex 5 1 mini defaults'.
- `test_gpt_5_1_defaults` – covers 'test gpt 5 1 defaults'.
- `test_codex_mini_unified_exec_web_search` – covers 'test codex mini unified exec web search'.
- `test_build_specs_default_shell_present` – covers 'test build specs default shell present'.
- `test_build_specs_shell_command_present` – covers 'test build specs shell command present'.
- `test_test_model_family_includes_sync_tool` – covers 'test test model family includes sync tool'.
- `test_build_specs_mcp_tools_converted` – covers 'test build specs mcp tools converted'.
- `test_build_specs_mcp_tools_sorted_by_name` – covers 'test build specs mcp tools sorted by name'.
- `test_mcp_tool_property_missing_type_defaults_to_string` – covers 'test mcp tool property missing type defaults to string'.
- `test_mcp_tool_integer_normalized_to_number` – covers 'test mcp tool integer normalized to number'.
- `test_mcp_tool_array_without_items_gets_default_string_items` – covers 'test mcp tool array without items gets default string items'.
- `test_mcp_tool_anyof_defaults_to_string` – covers 'test mcp tool anyof defaults to string'.
- `test_shell_tool` – covers 'test shell tool'.
- `test_shell_command_tool` – covers 'test shell command tool'.
- `test_get_openai_tools_mcp_tools_with_additional_properties_schema` – covers 'test get openai tools mcp tools with additional properties schema'.

### codex-rs/core/src/truncate.rs
- `truncate_middle_no_newlines_fallback` – covers 'truncate middle no newlines fallback'.
- `truncate_middle_prefers_newline_boundaries` – covers 'truncate middle prefers newline boundaries'.
- `truncate_middle_handles_utf8_content` – covers 'truncate middle handles utf8 content'.
- `truncate_middle_prefers_newline_boundaries_2` – covers 'truncate middle prefers newline boundaries 2'.
- `truncate_output_to_tokens_returns_original_when_under_limit` – covers 'truncate output to tokens returns original when under limit'.
- `truncate_output_to_tokens_reports_truncation_at_zero_limit` – covers 'truncate output to tokens reports truncation at zero limit'.
- `truncate_output_to_tokens_preserves_prefix_and_suffix` – covers 'truncate output to tokens preserves prefix and suffix'.
- `format_exec_output_truncates_large_error` – covers 'format exec output truncates large error'.
- `format_exec_output_marks_byte_truncation_without_omitted_lines` – covers 'format exec output marks byte truncation without omitted lines'.
- `format_exec_output_returns_original_when_within_limits` – covers 'format exec output returns original when within limits'.
- `format_exec_output_reports_omitted_lines_and_keeps_head_and_tail` – covers 'format exec output reports omitted lines and keeps head and tail'.
- `format_exec_output_prefers_line_marker_when_both_limits_exceeded` – covers 'format exec output prefers line marker when both limits exceeded'.
- `truncates_across_multiple_under_limit_texts_and_reports_omitted` – covers 'truncates across multiple under limit texts and reports omitted'.

### codex-rs/core/src/turn_diff_tracker.rs
- `accumulates_add_and_update` – covers 'accumulates add and update'.
- `accumulates_delete` – covers 'accumulates delete'.
- `accumulates_move_and_update` – covers 'accumulates move and update'.
- `move_without_1change_yields_no_diff` – covers 'move without 1change yields no diff'.
- `move_declared_but_file_only_appears_at_dest_is_add` – covers 'move declared but file only appears at dest is add'.
- `update_persists_across_new_baseline_for_new_file` – covers 'update persists across new baseline for new file'.
- `binary_files_differ_update` – covers 'binary files differ update'.
- `filenames_with_spaces_add_and_update` – covers 'filenames with spaces add and update'.

### codex-rs/core/src/unified_exec/mod.rs
- `push_chunk_trims_only_excess_bytes` – covers 'push chunk trims only excess bytes'.
- `unified_exec_persists_across_requests` – covers 'unified exec persists across requests'.
- `multi_unified_exec_sessions` – covers 'multi unified exec sessions'.
- `unified_exec_timeouts` – covers 'unified exec timeouts'.
- `reusing_completed_session_returns_unknown_session` – covers 'reusing completed session returns unknown session'.

### codex-rs/core/src/user_instructions.rs
- `test_user_instructions` – covers 'test user instructions'.
- `test_is_user_instructions` – covers 'test is user instructions'.

### codex-rs/core/src/user_notification.rs
- `test_user_notification` – covers 'test user notification'.

### codex-rs/core/src/user_shell_command.rs
- `detects_user_shell_command_text_variants` – covers 'detects user shell command text variants'.
- `formats_basic_record` – covers 'formats basic record'.
- `uses_aggregated_output_over_streams` – covers 'uses aggregated output over streams'.

### codex-rs/core/src/util.rs
- `test_try_parse_error_message` – covers 'test try parse error message'.
- `test_try_parse_error_message_no_error` – covers 'test try parse error message no error'.

### codex-rs/core/tests/chat_completions_payload.rs
- `omits_reasoning_when_none_present` – covers 'omits reasoning when none present'.
- `attaches_reasoning_to_previous_assistant` – covers 'attaches reasoning to previous assistant'.
- `attaches_reasoning_to_function_call_anchor` – covers 'attaches reasoning to function call anchor'.
- `attaches_reasoning_to_local_shell_call` – covers 'attaches reasoning to local shell call'.
- `drops_reasoning_when_last_role_is_user` – covers 'drops reasoning when last role is user'.
- `ignores_reasoning_before_last_user` – covers 'ignores reasoning before last user'.
- `skips_empty_reasoning_segments` – covers 'skips empty reasoning segments'.
- `suppresses_duplicate_assistant_messages` – covers 'suppresses duplicate assistant messages'.

### codex-rs/core/tests/chat_completions_sse.rs
- `streams_text_without_reasoning` – covers 'streams text without reasoning'.
- `streams_reasoning_from_string_delta` – covers 'streams reasoning from string delta'.
- `streams_reasoning_from_object_delta` – covers 'streams reasoning from object delta'.
- `streams_reasoning_from_final_message` – covers 'streams reasoning from final message'.
- `streams_reasoning_before_tool_call` – covers 'streams reasoning before tool call'.

### codex-rs/core/tests/responses_headers.rs
- `responses_stream_includes_subagent_header_on_review` – covers 'responses stream includes subagent header on review'.
- `responses_stream_includes_subagent_header_on_other` – covers 'responses stream includes subagent header on other'.

### codex-rs/core/tests/suite/abort_tasks.rs
- `interrupt_long_running_tool_emits_turn_aborted` – covers 'interrupt long running tool emits turn aborted'.
- `interrupt_tool_records_history_entries` – covers 'interrupt tool records history entries'.

### codex-rs/core/tests/suite/apply_patch_cli.rs
- `apply_patch_cli_multiple_operations_integration` – covers 'apply patch cli multiple operations integration'.
- `apply_patch_cli_multiple_chunks` – covers 'apply patch cli multiple chunks'.
- `apply_patch_cli_moves_file_to_new_directory` – covers 'apply patch cli moves file to new directory'.
- `apply_patch_cli_updates_file_appends_trailing_newline` – covers 'apply patch cli updates file appends trailing newline'.
- `apply_patch_cli_insert_only_hunk_modifies_file` – covers 'apply patch cli insert only hunk modifies file'.
- `apply_patch_cli_move_overwrites_existing_destination` – covers 'apply patch cli move overwrites existing destination'.
- `apply_patch_cli_move_without_content_change_has_no_turn_diff` – covers 'apply patch cli move without content change has no turn diff'.
- `apply_patch_cli_add_overwrites_existing_file` – covers 'apply patch cli add overwrites existing file'.
- `apply_patch_cli_rejects_invalid_hunk_header` – covers 'apply patch cli rejects invalid hunk header'.
- `apply_patch_cli_reports_missing_context` – covers 'apply patch cli reports missing context'.
- `apply_patch_cli_reports_missing_target_file` – covers 'apply patch cli reports missing target file'.
- `apply_patch_cli_delete_missing_file_reports_error` – covers 'apply patch cli delete missing file reports error'.
- `apply_patch_cli_rejects_empty_patch` – covers 'apply patch cli rejects empty patch'.
- `apply_patch_cli_delete_directory_reports_verification_error` – covers 'apply patch cli delete directory reports verification error'.
- `apply_patch_cli_rejects_path_traversal_outside_workspace` – covers 'apply patch cli rejects path traversal outside workspace'.
- `apply_patch_cli_rejects_move_path_traversal_outside_workspace` – covers 'apply patch cli rejects move path traversal outside workspace'.
- `apply_patch_cli_verification_failure_has_no_side_effects` – covers 'apply patch cli verification failure has no side effects'.
- `apply_patch_shell_heredoc_with_cd_updates_relative_workdir` – covers 'apply patch shell heredoc with cd updates relative workdir'.
- `apply_patch_shell_failure_propagates_error_and_skips_diff` – covers 'apply patch shell failure propagates error and skips diff'.
- `apply_patch_function_accepts_lenient_heredoc_wrapped_patch` – covers 'apply patch function accepts lenient heredoc wrapped patch'.
- `apply_patch_cli_end_of_file_anchor` – covers 'apply patch cli end of file anchor'.
- `apply_patch_cli_missing_second_chunk_context_rejected` – covers 'apply patch cli missing second chunk context rejected'.
- `apply_patch_emits_turn_diff_event_with_unified_diff` – covers 'apply patch emits turn diff event with unified diff'.
- `apply_patch_turn_diff_for_rename_with_content_change` – covers 'apply patch turn diff for rename with content change'.
- `apply_patch_aggregates_diff_across_multiple_tool_calls` – covers 'apply patch aggregates diff across multiple tool calls'.
- `apply_patch_aggregates_diff_preserves_success_after_failure` – covers 'apply patch aggregates diff preserves success after failure'.
- `apply_patch_change_context_disambiguates_target` – covers 'apply patch change context disambiguates target'.

### codex-rs/core/tests/suite/approvals.rs
- `approval_matrix_covers_all_modes` – covers 'approval matrix covers all modes'.

### codex-rs/core/tests/suite/auth_refresh.rs
- `refresh_token_succeeds_updates_storage` – covers 'refresh token succeeds updates storage'.
- `refresh_token_returns_permanent_error_for_expired_refresh_token` – covers 'refresh token returns permanent error for expired refresh token'.
- `refresh_token_returns_transient_error_on_server_failure` – covers 'refresh token returns transient error on server failure'.

### codex-rs/core/tests/suite/cli_stream.rs
- `chat_mode_stream_cli` – covers 'chat mode stream cli'.
- `exec_cli_applies_experimental_instructions_file` – covers 'exec cli applies experimental instructions file'.
- `responses_api_stream_cli` – covers 'responses api stream cli'.
- `integration_creates_and_checks_session_file` – covers 'integration creates and checks session file'.
- `integration_git_info_unit_test` – covers 'integration git info unit test'.

### codex-rs/core/tests/suite/client.rs
- `resume_includes_initial_messages_and_sends_prior_items` – covers 'resume includes initial messages and sends prior items'.
- `includes_conversation_id_and_model_headers_in_request` – covers 'includes conversation id and model headers in request'.
- `includes_base_instructions_override_in_request` – covers 'includes base instructions override in request'.
- `chatgpt_auth_sends_correct_request` – covers 'chatgpt auth sends correct request'.
- `prefers_apikey_when_config_prefers_apikey_even_with_chatgpt_tokens` – covers 'prefers apikey when config prefers apikey even with chatgpt tokens'.
- `includes_user_instructions_message_in_request` – covers 'includes user instructions message in request'.
- `includes_configured_effort_in_request` – covers 'includes configured effort in request'.
- `includes_no_effort_in_request` – covers 'includes no effort in request'.
- `includes_default_reasoning_effort_in_request_when_defined_by_model_family` – covers 'includes default reasoning effort in request when defined by model family'.
- `includes_default_verbosity_in_request` – covers 'includes default verbosity in request'.
- `configured_verbosity_not_sent_for_models_without_support` – covers 'configured verbosity not sent for models without support'.
- `configured_verbosity_is_sent` – covers 'configured verbosity is sent'.
- `includes_developer_instructions_message_in_request` – covers 'includes developer instructions message in request'.
- `azure_responses_request_includes_store_and_reasoning_ids` – covers 'azure responses request includes store and reasoning ids'.
- `token_count_includes_rate_limits_snapshot` – covers 'token count includes rate limits snapshot'.
- `usage_limit_error_emits_rate_limit_event` – covers 'usage limit error emits rate limit event'.
- `context_window_error_sets_total_tokens_to_model_window` – covers 'context window error sets total tokens to model window'.
- `azure_overrides_assign_properties_used_for_responses_url` – covers 'azure overrides assign properties used for responses url'.
- `env_var_overrides_loaded_auth` – covers 'env var overrides loaded auth'.
- `history_dedupes_streamed_and_final_messages_across_turns` – covers 'history dedupes streamed and final messages across turns'.

### codex-rs/core/tests/suite/codex_delegate.rs
- `codex_delegate_forwards_exec_approval_and_proceeds_on_approval` – covers 'codex delegate forwards exec approval and proceeds on approval'.
- `codex_delegate_forwards_patch_approval_and_proceeds_on_decision` – covers 'codex delegate forwards patch approval and proceeds on decision'.
- `codex_delegate_ignores_legacy_deltas` – covers 'codex delegate ignores legacy deltas'.

### codex-rs/core/tests/suite/compact.rs
- `summarize_context_three_requests_and_instructions` – covers 'summarize context three requests and instructions'.
- `manual_compact_uses_custom_prompt` – covers 'manual compact uses custom prompt'.
- `manual_compact_emits_estimated_token_usage_event` – covers 'manual compact emits estimated token usage event'.
- `multiple_auto_compact_per_task_runs_after_token_limit_hit` – covers 'multiple auto compact per task runs after token limit hit'.
- `auto_compact_persists_rollout_entries` – covers 'auto compact persists rollout entries'.
- `manual_compact_retries_after_context_window_error` – covers 'manual compact retries after context window error'.
- `manual_compact_twice_preserves_latest_user_messages` – covers 'manual compact twice preserves latest user messages'.
- `auto_compact_allows_multiple_attempts_when_interleaved_with_other_turn_events` – covers 'auto compact allows multiple attempts when interleaved with other turn events'.
- `auto_compact_triggers_after_function_call_over_95_percent_usage` – covers 'auto compact triggers after function call over 95 percent usage'.

### codex-rs/core/tests/suite/deprecation_notice.rs
- `emits_deprecation_notice_for_legacy_feature_flag` – covers 'emits deprecation notice for legacy feature flag'.

### codex-rs/core/tests/suite/exec.rs
- `exit_code_0_succeeds` – covers 'exit code 0 succeeds'.
- `truncates_output_lines` – covers 'truncates output lines'.
- `truncates_output_bytes` – covers 'truncates output bytes'.
- `exit_command_not_found_is_ok` – covers 'exit command not found is ok'.
- `write_file_fails_as_sandbox_error` – covers 'write file fails as sandbox error'.

### codex-rs/core/tests/suite/fork_conversation.rs
- `fork_conversation_twice_drops_to_first_message` – covers 'fork conversation twice drops to first message'.

### codex-rs/core/tests/suite/grep_files.rs
- `grep_files_tool_collects_matches` – covers 'grep files tool collects matches'.
- `grep_files_tool_reports_empty_results` – covers 'grep files tool reports empty results'.

### codex-rs/core/tests/suite/items.rs
- `user_message_item_is_emitted` – covers 'user message item is emitted'.
- `assistant_message_item_is_emitted` – covers 'assistant message item is emitted'.
- `reasoning_item_is_emitted` – covers 'reasoning item is emitted'.
- `web_search_item_is_emitted` – covers 'web search item is emitted'.
- `agent_message_content_delta_has_item_metadata` – covers 'agent message content delta has item metadata'.
- `reasoning_content_delta_has_item_metadata` – covers 'reasoning content delta has item metadata'.
- `reasoning_raw_content_delta_respects_flag` – covers 'reasoning raw content delta respects flag'.

### codex-rs/core/tests/suite/json_result.rs
- `codex_returns_json_result_for_gpt5` – covers 'codex returns json result for gpt5'.
- `codex_returns_json_result_for_gpt5_codex` – covers 'codex returns json result for gpt5 codex'.

### codex-rs/core/tests/suite/live_cli.rs
- `live_create_file_hello_txt` – covers 'live create file hello txt'.
- `live_print_working_directory` – covers 'live print working directory'.

### codex-rs/core/tests/suite/model_overrides.rs
- `override_turn_context_does_not_persist_when_config_exists` – covers 'override turn context does not persist when config exists'.
- `override_turn_context_does_not_create_config_file` – covers 'override turn context does not create config file'.

### codex-rs/core/tests/suite/model_tools.rs
- `model_selects_expected_tools` – covers 'model selects expected tools'.

### codex-rs/core/tests/suite/prompt_caching.rs
- `codex_mini_latest_tools` – covers 'codex mini latest tools'.
- `prompt_tools_are_consistent_across_requests` – covers 'prompt tools are consistent across requests'.
- `prefixes_context_and_instructions_once_and_consistently_across_requests` – covers 'prefixes context and instructions once and consistently across requests'.
- `overrides_turn_context_but_keeps_cached_prefix_and_key_constant` – covers 'overrides turn context but keeps cached prefix and key constant'.
- `per_turn_overrides_keep_cached_prefix_and_key_constant` – covers 'per turn overrides keep cached prefix and key constant'.
- `send_user_turn_with_no_changes_does_not_send_environment_context` – covers 'send user turn with no changes does not send environment context'.
- `send_user_turn_with_changes_sends_environment_context` – covers 'send user turn with changes sends environment context'.

### codex-rs/core/tests/suite/quota_exceeded.rs
- `quota_exceeded_emits_single_error_event` – covers 'quota exceeded emits single error event'.

### codex-rs/core/tests/suite/resume.rs
- `resume_includes_initial_messages_from_rollout_events` – covers 'resume includes initial messages from rollout events'.
- `resume_includes_initial_messages_from_reasoning_events` – covers 'resume includes initial messages from reasoning events'.

### codex-rs/core/tests/suite/resume_warning.rs
- `emits_warning_when_resumed_model_differs` – covers 'emits warning when resumed model differs'.

### codex-rs/core/tests/suite/review.rs
- `review_op_emits_lifecycle_and_review_output` – covers 'review op emits lifecycle and review output'.
- `review_uses_custom_review_model_from_config` – covers 'review uses custom review model from config'.
- `review_history_does_not_leak_into_parent_session` – covers 'review history does not leak into parent session'.

### codex-rs/core/tests/suite/rmcp_client.rs
- `streamable_http_tool_call_round_trip` – covers 'streamable http tool call round trip'.
- `streamable_http_with_oauth_round_trip` – covers 'streamable http with oauth round trip'.

### codex-rs/core/tests/suite/rollout_list_find.rs
- `find_locates_rollout_file_by_id` – covers 'find locates rollout file by id'.
- `find_handles_gitignore_covering_codex_home_directory` – covers 'find handles gitignore covering codex home directory'.
- `find_ignores_granular_gitignore_rules` – covers 'find ignores granular gitignore rules'.

### codex-rs/core/tests/suite/seatbelt.rs
- `if_parent_of_repo_is_writable_then_dot_git_folder_is_writable` – covers 'if parent of repo is writable then dot git folder is writable'.
- `if_git_repo_is_writable_root_then_dot_git_folder_is_read_only` – covers 'if git repo is writable root then dot git folder is read only'.
- `danger_full_access_allows_all_writes` – covers 'danger full access allows all writes'.
- `read_only_forbids_all_writes` – covers 'read only forbids all writes'.
- `python_getpwuid_works_under_seatbelt` – covers 'python getpwuid works under seatbelt'.
- `java_home_finds_runtime_under_seatbelt` – covers 'java home finds runtime under seatbelt'.

### codex-rs/core/tests/suite/shell_serialization.rs
- `shell_output_stays_json_without_freeform_apply_patch` – covers 'shell output stays json without freeform apply patch'.
- `shell_output_is_structured_with_freeform_apply_patch` – covers 'shell output is structured with freeform apply patch'.
- `shell_output_preserves_fixture_json_without_serialization` – covers 'shell output preserves fixture json without serialization'.
- `shell_output_structures_fixture_with_serialization` – covers 'shell output structures fixture with serialization'.
- `shell_output_for_freeform_tool_records_duration` – covers 'shell output for freeform tool records duration'.
- `shell_output_reserializes_truncated_content` – covers 'shell output reserializes truncated content'.
- `apply_patch_custom_tool_output_is_structured` – covers 'apply patch custom tool output is structured'.
- `apply_patch_custom_tool_call_creates_file` – covers 'apply patch custom tool call creates file'.
- `apply_patch_custom_tool_call_updates_existing_file` – covers 'apply patch custom tool call updates existing file'.
- `apply_patch_custom_tool_call_reports_failure_output` – covers 'apply patch custom tool call reports failure output'.
- `apply_patch_function_call_output_is_structured` – covers 'apply patch function call output is structured'.
- `shell_output_is_structured_for_nonzero_exit` – covers 'shell output is structured for nonzero exit'.
- `shell_command_output_is_structured` – covers 'shell command output is structured'.
- `local_shell_call_output_is_structured` – covers 'local shell call output is structured'.

### codex-rs/core/tests/suite/stream_error_allows_next_turn.rs
- `continue_after_stream_error` – covers 'continue after stream error'.

### codex-rs/core/tests/suite/stream_no_completed.rs
- `retries_on_early_close` – covers 'retries on early close'.

### codex-rs/core/tests/suite/tool_harness.rs
- `shell_tool_executes_command_and_streams_output` – covers 'shell tool executes command and streams output'.
- `update_plan_tool_emits_plan_update_event` – covers 'update plan tool emits plan update event'.
- `update_plan_tool_rejects_malformed_payload` – covers 'update plan tool rejects malformed payload'.
- `apply_patch_tool_executes_and_emits_patch_events` – covers 'apply patch tool executes and emits patch events'.
- `apply_patch_reports_parse_diagnostics` – covers 'apply patch reports parse diagnostics'.

### codex-rs/core/tests/suite/tool_parallelism.rs
- `read_file_tools_run_in_parallel` – covers 'read file tools run in parallel'.
- `non_parallel_tools_run_serially` – covers 'non parallel tools run serially'.
- `mixed_tools_fall_back_to_serial` – covers 'mixed tools fall back to serial'.
- `tool_results_grouped` – covers 'tool results grouped'.

### codex-rs/core/tests/suite/tools.rs
- `custom_tool_unknown_returns_custom_output_error` – covers 'custom tool unknown returns custom output error'.
- `shell_escalated_permissions_rejected_then_ok` – covers 'shell escalated permissions rejected then ok'.
- `sandbox_denied_shell_returns_original_output` – covers 'sandbox denied shell returns original output'.
- `unified_exec_spec_toggle_end_to_end` – covers 'unified exec spec toggle end to end'.
- `shell_timeout_includes_timeout_prefix_and_metadata` – covers 'shell timeout includes timeout prefix and metadata'.
- `shell_timeout_handles_background_grandchild_stdout` – covers 'shell timeout handles background grandchild stdout'.
- `shell_spawn_failure_truncates_exec_error` – covers 'shell spawn failure truncates exec error'.

### codex-rs/core/tests/suite/truncation.rs
- `truncate_function_error_trims_respond_to_model` – covers 'truncate function error trims respond to model'.
- `tool_call_output_exceeds_limit_truncated_for_model` – covers 'tool call output exceeds limit truncated for model'.
- `tool_call_output_truncated_only_once` – covers 'tool call output truncated only once'.
- `mcp_tool_call_output_exceeds_limit_truncated_for_model` – covers 'mcp tool call output exceeds limit truncated for model'.
- `mcp_image_output_preserves_image_and_no_text_summary` – covers 'mcp image output preserves image and no text summary'.

### codex-rs/core/tests/suite/undo.rs
- `undo_removes_new_file_created_during_turn` – covers 'undo removes new file created during turn'.
- `undo_restores_tracked_file_edit` – covers 'undo restores tracked file edit'.
- `undo_restores_untracked_file_edit` – covers 'undo restores untracked file edit'.
- `undo_reverts_only_latest_turn` – covers 'undo reverts only latest turn'.
- `undo_does_not_touch_unrelated_files` – covers 'undo does not touch unrelated files'.
- `undo_sequential_turns_consumes_snapshots` – covers 'undo sequential turns consumes snapshots'.
- `undo_without_snapshot_reports_failure` – covers 'undo without snapshot reports failure'.
- `undo_restores_moves_and_renames` – covers 'undo restores moves and renames'.
- `undo_does_not_touch_ignored_directory_contents` – covers 'undo does not touch ignored directory contents'.
- `undo_overwrites_manual_edits_after_turn` – covers 'undo overwrites manual edits after turn'.

### codex-rs/core/tests/suite/unified_exec.rs
- `unified_exec_emits_exec_command_begin_event` – covers 'unified exec emits exec command begin event'.
- `unified_exec_emits_exec_command_end_event` – covers 'unified exec emits exec command end event'.
- `unified_exec_emits_output_delta_for_exec_command` – covers 'unified exec emits output delta for exec command'.
- `unified_exec_emits_output_delta_for_write_stdin` – covers 'unified exec emits output delta for write stdin'.
- `unified_exec_emits_begin_for_write_stdin` – covers 'unified exec emits begin for write stdin'.
- `unified_exec_emits_begin_event_for_write_stdin_requests` – covers 'unified exec emits begin event for write stdin requests'.
- `exec_command_reports_chunk_and_exit_metadata` – covers 'exec command reports chunk and exit metadata'.
- `write_stdin_returns_exit_metadata_and_clears_session` – covers 'write stdin returns exit metadata and clears session'.
- `unified_exec_emits_end_event_when_session_dies_via_stdin` – covers 'unified exec emits end event when session dies via stdin'.
- `unified_exec_reuses_session_via_stdin` – covers 'unified exec reuses session via stdin'.
- `unified_exec_streams_after_lagged_output` – covers 'unified exec streams after lagged output'.
- `unified_exec_timeout_and_followup_poll` – covers 'unified exec timeout and followup poll'.
- `unified_exec_runs_under_sandbox` – covers 'unified exec runs under sandbox'.

### codex-rs/core/tests/suite/user_shell_cmd.rs
- `user_shell_cmd_ls_and_cat_in_temp_dir` – covers 'user shell cmd ls and cat in temp dir'.
- `user_shell_cmd_can_be_interrupted` – covers 'user shell cmd can be interrupted'.
- `user_shell_command_history_is_persisted_and_shared_with_model` – covers 'user shell command history is persisted and shared with model'.
- `user_shell_command_output_is_truncated_in_history` – covers 'user shell command output is truncated in history'.
- `user_shell_command_is_truncated_only_once` – covers 'user shell command is truncated only once'.

### codex-rs/core/tests/suite/view_image.rs
- `user_turn_with_local_image_attaches_image` – covers 'user turn with local image attaches image'.
- `view_image_tool_attaches_local_image` – covers 'view image tool attaches local image'.
- `view_image_tool_errors_when_path_is_directory` – covers 'view image tool errors when path is directory'.
- `view_image_tool_placeholder_for_non_image_files` – covers 'view image tool placeholder for non image files'.
- `view_image_tool_errors_when_file_missing` – covers 'view image tool errors when file missing'.

### codex-rs/exec/tests/event_processor_with_json_output.rs
- `session_configured_produces_thread_started_event` – covers 'session configured produces thread started event'.
- `task_started_produces_turn_started_event` – covers 'task started produces turn started event'.
- `web_search_end_emits_item_completed` – covers 'web search end emits item completed'.
- `plan_update_emits_todo_list_started_updated_and_completed` – covers 'plan update emits todo list started updated and completed'.
- `mcp_tool_call_begin_and_end_emit_item_events` – covers 'mcp tool call begin and end emit item events'.
- `mcp_tool_call_failure_sets_failed_status` – covers 'mcp tool call failure sets failed status'.
- `mcp_tool_call_defaults_arguments_and_preserves_structured_content` – covers 'mcp tool call defaults arguments and preserves structured content'.
- `plan_update_after_complete_starts_new_todo_list_with_new_id` – covers 'plan update after complete starts new todo list with new id'.
- `agent_reasoning_produces_item_completed_reasoning` – covers 'agent reasoning produces item completed reasoning'.
- `agent_message_produces_item_completed_agent_message` – covers 'agent message produces item completed agent message'.
- `error_event_produces_error` – covers 'error event produces error'.
- `warning_event_produces_error_item` – covers 'warning event produces error item'.
- `stream_error_event_produces_error` – covers 'stream error event produces error'.
- `error_followed_by_task_complete_produces_turn_failed` – covers 'error followed by task complete produces turn failed'.
- `exec_command_end_success_produces_completed_command_item` – covers 'exec command end success produces completed command item'.
- `exec_command_end_failure_produces_failed_command_item` – covers 'exec command end failure produces failed command item'.
- `exec_command_end_without_begin_is_ignored` – covers 'exec command end without begin is ignored'.
- `patch_apply_success_produces_item_completed_patchapply` – covers 'patch apply success produces item completed patchapply'.
- `patch_apply_failure_produces_item_completed_patchapply_failed` – covers 'patch apply failure produces item completed patchapply failed'.
- `task_complete_produces_turn_completed_with_usage` – covers 'task complete produces turn completed with usage'.

### codex-rs/exec/tests/suite/add_dir.rs
- `accepts_add_dir_flag` – covers 'accepts add dir flag'.
- `accepts_multiple_add_dir_flags` – covers 'accepts multiple add dir flags'.

### codex-rs/exec/tests/suite/apply_patch.rs
- `test_standalone_exec_cli_can_use_apply_patch` – covers 'test standalone exec cli can use apply patch'.
- `test_apply_patch_tool` – covers 'test apply patch tool'.
- `test_apply_patch_freeform_tool` – covers 'test apply patch freeform tool'.

### codex-rs/exec/tests/suite/auth_env.rs
- `exec_uses_codex_api_key_env_var` – covers 'exec uses codex api key env var'.

### codex-rs/exec/tests/suite/originator.rs
- `send_codex_exec_originator` – covers 'send codex exec originator'.
- `supports_originator_override` – covers 'supports originator override'.

### codex-rs/exec/tests/suite/output_schema.rs
- `exec_includes_output_schema_in_request` – covers 'exec includes output schema in request'.

### codex-rs/exec/tests/suite/resume.rs
- `exec_resume_last_appends_to_existing_file` – covers 'exec resume last appends to existing file'.
- `exec_resume_by_id_appends_to_existing_file` – covers 'exec resume by id appends to existing file'.
- `exec_resume_preserves_cli_configuration_overrides` – covers 'exec resume preserves cli configuration overrides'.

### codex-rs/exec/tests/suite/sandbox.rs
- `python_multiprocessing_lock_works_under_sandbox` – covers 'python multiprocessing lock works under sandbox'.
- `sandbox_distinguishes_command_and_policy_cwds` – covers 'sandbox distinguishes command and policy cwds'.
- `allow_unix_socketpair_recvfrom` – covers 'allow unix socketpair recvfrom'.

### codex-rs/exec/tests/suite/server_error_exit.rs
- `exits_non_zero_when_server_reports_error` – covers 'exits non zero when server reports error'.

### codex-rs/execpolicy/src/execv_checker.rs
- `test_check_valid_input_files` – covers 'test check valid input files'.

### codex-rs/execpolicy/tests/suite/bad.rs
- `verify_everything_in_bad_list_is_rejected` – covers 'verify everything in bad list is rejected'.

### codex-rs/execpolicy/tests/suite/cp.rs
- `test_cp_no_args` – covers 'test cp no args'.
- `test_cp_one_arg` – covers 'test cp one arg'.
- `test_cp_one_file` – covers 'test cp one file'.
- `test_cp_multiple_files` – covers 'test cp multiple files'.

### codex-rs/execpolicy/tests/suite/good.rs
- `verify_everything_in_good_list_is_allowed` – covers 'verify everything in good list is allowed'.

### codex-rs/execpolicy/tests/suite/head.rs
- `test_head_no_args` – covers 'test head no args'.
- `test_head_one_file_no_flags` – covers 'test head one file no flags'.
- `test_head_one_flag_one_file` – covers 'test head one flag one file'.
- `test_head_invalid_n_as_0` – covers 'test head invalid n as 0'.
- `test_head_invalid_n_as_nonint_float` – covers 'test head invalid n as nonint float'.
- `test_head_invalid_n_as_float` – covers 'test head invalid n as float'.
- `test_head_invalid_n_as_negative_int` – covers 'test head invalid n as negative int'.

### codex-rs/execpolicy/tests/suite/literal.rs
- `test_invalid_subcommand` – covers 'test invalid subcommand'.

### codex-rs/execpolicy/tests/suite/ls.rs
- `test_ls_no_args` – covers 'test ls no args'.
- `test_ls_dash_a_dash_l` – covers 'test ls dash a dash l'.
- `test_ls_dash_z` – covers 'test ls dash z'.
- `test_ls_dash_al` – covers 'test ls dash al'.
- `test_ls_one_file_arg` – covers 'test ls one file arg'.
- `test_ls_multiple_file_args` – covers 'test ls multiple file args'.
- `test_ls_multiple_flags_and_file_args` – covers 'test ls multiple flags and file args'.
- `test_flags_after_file_args` – covers 'test flags after file args'.

### codex-rs/execpolicy/tests/suite/parse_sed_command.rs
- `parses_simple_print_command` – covers 'parses simple print command'.
- `rejects_malformed_print_command` – covers 'rejects malformed print command'.

### codex-rs/execpolicy/tests/suite/pwd.rs
- `test_pwd_no_args` – covers 'test pwd no args'.
- `test_pwd_capital_l` – covers 'test pwd capital l'.
- `test_pwd_capital_p` – covers 'test pwd capital p'.
- `test_pwd_extra_args` – covers 'test pwd extra args'.

### codex-rs/execpolicy/tests/suite/sed.rs
- `test_sed_print_specific_lines` – covers 'test sed print specific lines'.
- `test_sed_print_specific_lines_with_e_flag` – covers 'test sed print specific lines with e flag'.
- `test_sed_reject_dangerous_command` – covers 'test sed reject dangerous command'.
- `test_sed_verify_e_or_pattern_is_required` – covers 'test sed verify e or pattern is required'.

### codex-rs/execpolicy2/tests/basic.rs
- `basic_match` – covers 'basic match'.
- `parses_multiple_policy_files` – covers 'parses multiple policy files'.
- `only_first_token_alias_expands_to_multiple_rules` – covers 'only first token alias expands to multiple rules'.
- `tail_aliases_are_not_cartesian_expanded` – covers 'tail aliases are not cartesian expanded'.
- `match_and_not_match_examples_are_enforced` – covers 'match and not match examples are enforced'.
- `strictest_decision_wins_across_matches` – covers 'strictest decision wins across matches'.
- `strictest_decision_across_multiple_commands` – covers 'strictest decision across multiple commands'.

### codex-rs/feedback/src/lib.rs
- `ring_buffer_drops_front_when_full` – covers 'ring buffer drops front when full'.

### codex-rs/file-search/src/lib.rs
- `verify_score_is_none_for_non_match` – covers 'verify score is none for non match'.
- `tie_breakers_sort_by_path_when_scores_equal` – covers 'tie breakers sort by path when scores equal'.

### codex-rs/linux-sandbox/tests/suite/landlock.rs
- `test_root_read` – covers 'test root read'.
- `test_dev_null_write` – covers 'test dev null write'.
- `test_writable_root` – covers 'test writable root'.
- `sandbox_blocks_curl` – covers 'sandbox blocks curl'.
- `sandbox_blocks_wget` – covers 'sandbox blocks wget'.
- `sandbox_blocks_ping` – covers 'sandbox blocks ping'.
- `sandbox_blocks_nc` – covers 'sandbox blocks nc'.
- `sandbox_blocks_ssh` – covers 'sandbox blocks ssh'.
- `sandbox_blocks_getent` – covers 'sandbox blocks getent'.
- `sandbox_blocks_dev_tcp_redirection` – covers 'sandbox blocks dev tcp redirection'.

### codex-rs/lmstudio/src/client.rs
- `test_fetch_models_happy_path` – covers 'test fetch models happy path'.
- `test_fetch_models_no_data_array` – covers 'test fetch models no data array'.
- `test_fetch_models_server_error` – covers 'test fetch models server error'.
- `test_check_server_happy_path` – covers 'test check server happy path'.
- `test_check_server_error` – covers 'test check server error'.
- `test_find_lms` – covers 'test find lms'.
- `test_find_lms_with_mock_home` – covers 'test find lms with mock home'.
- `test_from_host_root` – covers 'test from host root'.

### codex-rs/login/tests/suite/device_code_login.rs
- `device_code_login_integration_succeeds` – covers 'device code login integration succeeds'.
- `device_code_login_rejects_workspace_mismatch` – covers 'device code login rejects workspace mismatch'.
- `device_code_login_integration_handles_usercode_http_failure` – covers 'device code login integration handles usercode http failure'.
- `device_code_login_integration_persists_without_api_key_on_exchange_failure` – covers 'device code login integration persists without api key on exchange failure'.
- `device_code_login_integration_handles_error_payload` – covers 'device code login integration handles error payload'.

### codex-rs/login/tests/suite/login_server_e2e.rs
- `end_to_end_login_flow_persists_auth_json` – covers 'end to end login flow persists auth json'.
- `creates_missing_codex_home_dir` – covers 'creates missing codex home dir'.
- `forced_chatgpt_workspace_id_mismatch_blocks_login` – covers 'forced chatgpt workspace id mismatch blocks login'.
- `cancels_previous_login_server_when_port_is_in_use` – covers 'cancels previous login server when port is in use'.

### codex-rs/mcp-server/src/codex_tool_config.rs
- `verify_codex_tool_json_schema` – covers 'verify codex tool json schema'.
- `verify_codex_tool_reply_json_schema` – covers 'verify codex tool reply json schema'.

### codex-rs/mcp-server/src/outgoing_message.rs
- `test_send_event_as_notification` – covers 'test send event as notification'.
- `test_send_event_as_notification_with_meta` – covers 'test send event as notification with meta'.

### codex-rs/mcp-server/tests/suite/codex_tool.rs
- `test_shell_command_approval_triggers_elicitation` – covers 'test shell command approval triggers elicitation'.
- `test_patch_approval_triggers_elicitation` – covers 'test patch approval triggers elicitation'.
- `test_codex_tool_passes_base_instructions` – covers 'test codex tool passes base instructions'.

### codex-rs/mcp-types/tests/suite/initialize.rs
- `deserialize_initialize_request` – covers 'deserialize initialize request'.

### codex-rs/mcp-types/tests/suite/progress_notification.rs
- `deserialize_progress_notification` – covers 'deserialize progress notification'.

### codex-rs/ollama/src/client.rs
- `test_fetch_models_happy_path` – covers 'test fetch models happy path'.
- `test_probe_server_happy_path_openai_compat_and_native` – covers 'test probe server happy path openai compat and native'.
- `test_try_from_oss_provider_ok_when_server_running` – covers 'test try from oss provider ok when server running'.
- `test_try_from_oss_provider_err_when_server_missing` – covers 'test try from oss provider err when server missing'.

### codex-rs/ollama/src/parser.rs
- `test_pull_events_decoder_status_and_success` – covers 'test pull events decoder status and success'.
- `test_pull_events_decoder_progress` – covers 'test pull events decoder progress'.

### codex-rs/ollama/src/url.rs
- `test_base_url_to_host_root` – covers 'test base url to host root'.

### codex-rs/protocol/src/conversation_id.rs
- `test_conversation_id_default_is_not_zeroes` – covers 'test conversation id default is not zeroes'.

### codex-rs/protocol/src/models.rs
- `serializes_success_as_plain_string` – covers 'serializes success as plain string'.
- `serializes_failure_as_string` – covers 'serializes failure as string'.
- `serializes_image_outputs_as_array` – covers 'serializes image outputs as array'.
- `deserializes_array_payload_into_items` – covers 'deserializes array payload into items'.
- `deserialize_shell_tool_call_params` – covers 'deserialize shell tool call params'.
- `local_image_read_error_adds_placeholder` – covers 'local image read error adds placeholder'.
- `local_image_non_image_adds_placeholder` – covers 'local image non image adds placeholder'.

### codex-rs/protocol/src/num_format.rs
- `kmg` – covers 'kmg'.

### codex-rs/protocol/src/protocol.rs
- `item_started_event_from_web_search_emits_begin_event` – covers 'item started event from web search emits begin event'.
- `item_started_event_from_non_web_search_emits_no_legacy_events` – covers 'item started event from non web search emits no legacy events'.
- `serialize_event` – covers 'serialize event'.
- `vec_u8_as_base64_serialization_and_deserialization` – covers 'vec u8 as base64 serialization and deserialization'.
- `serialize_mcp_startup_update_event` – covers 'serialize mcp startup update event'.
- `serialize_mcp_startup_complete_event` – covers 'serialize mcp startup complete event'.

### codex-rs/responses-api-proxy/src/read_api_key.rs
- `reads_key_with_no_newlines` – covers 'reads key with no newlines'.
- `reads_key_with_short_reads` – covers 'reads key with short reads'.
- `reads_key_and_trims_newlines` – covers 'reads key and trims newlines'.
- `errors_when_no_input_provided` – covers 'errors when no input provided'.
- `errors_when_buffer_filled` – covers 'errors when buffer filled'.
- `propagates_io_error` – covers 'propagates io error'.
- `errors_on_invalid_utf8` – covers 'errors on invalid utf8'.
- `errors_on_invalid_characters` – covers 'errors on invalid characters'.

### codex-rs/rmcp-client/src/oauth.rs
- `load_oauth_tokens_reads_from_keyring_when_available` – covers 'load oauth tokens reads from keyring when available'.
- `load_oauth_tokens_falls_back_when_missing_in_keyring` – covers 'load oauth tokens falls back when missing in keyring'.
- `load_oauth_tokens_falls_back_when_keyring_errors` – covers 'load oauth tokens falls back when keyring errors'.
- `save_oauth_tokens_prefers_keyring_when_available` – covers 'save oauth tokens prefers keyring when available'.
- `save_oauth_tokens_writes_fallback_when_keyring_fails` – covers 'save oauth tokens writes fallback when keyring fails'.
- `delete_oauth_tokens_removes_all_storage` – covers 'delete oauth tokens removes all storage'.
- `delete_oauth_tokens_file_mode_removes_keyring_only_entry` – covers 'delete oauth tokens file mode removes keyring only entry'.
- `delete_oauth_tokens_propagates_keyring_errors` – covers 'delete oauth tokens propagates keyring errors'.
- `refresh_expires_in_from_timestamp_restores_future_durations` – covers 'refresh expires in from timestamp restores future durations'.
- `refresh_expires_in_from_timestamp_clears_expired_tokens` – covers 'refresh expires in from timestamp clears expired tokens'.

### codex-rs/rmcp-client/src/program_resolver.rs
- `test_unix_executes_script_without_extension` – covers 'test unix executes script without extension'.
- `test_windows_fails_without_extension` – covers 'test windows fails without extension'.
- `test_windows_succeeds_with_extension` – covers 'test windows succeeds with extension'.
- `test_resolved_program_executes_successfully` – covers 'test resolved program executes successfully'.

### codex-rs/rmcp-client/src/utils.rs
- `create_env_honors_overrides` – covers 'create env honors overrides'.
- `convert_call_tool_result_defaults_missing_content` – covers 'convert call tool result defaults missing content'.
- `convert_call_tool_result_preserves_existing_content` – covers 'convert call tool result preserves existing content'.

### codex-rs/rmcp-client/tests/resources.rs
- `rmcp_client_can_list_and_read_resources` – covers 'rmcp client can list and read resources'.

### codex-rs/stdio-to-uds/tests/stdio_to_uds.rs
- `pipes_stdin_and_stdout_through_socket` – covers 'pipes stdin and stdout through socket'.

### codex-rs/target/debug/build/crunchy-9533343f39afb76b/out/lib.rs
- `invalid_range` – covers 'invalid range'.
- `start_at_one_with_step` – covers 'start at one with step'.
- `start_at_one` – covers 'start at one'.
- `test_all` – covers 'test all'.

### codex-rs/tui/src/additional_dirs.rs
- `returns_none_for_workspace_write` – covers 'returns none for workspace write'.
- `returns_none_for_danger_full_access` – covers 'returns none for danger full access'.
- `warns_for_read_only` – covers 'warns for read only'.
- `returns_none_when_no_additional_dirs` – covers 'returns none when no additional dirs'.

### codex-rs/tui/src/app.rs
- `model_migration_prompt_only_shows_for_deprecated_models` – covers 'model migration prompt only shows for deprecated models'.
- `model_migration_prompt_respects_hide_flag_and_self_target` – covers 'model migration prompt respects hide flag and self target'.
- `update_reasoning_effort_updates_config` – covers 'update reasoning effort updates config'.
- `backtrack_selection_with_duplicate_history_targets_unique_turn` – covers 'backtrack selection with duplicate history targets unique turn'.
- `session_summary_skip_zero_usage` – covers 'session summary skip zero usage'.
- `session_summary_includes_resume_hint` – covers 'session summary includes resume hint'.

### codex-rs/tui/src/app_backtrack.rs
- `trim_transcript_for_first_user_drops_user_and_newer_cells` – covers 'trim transcript for first user drops user and newer cells'.
- `trim_transcript_preserves_cells_before_selected_user` – covers 'trim transcript preserves cells before selected user'.
- `trim_transcript_for_later_user_keeps_prior_history` – covers 'trim transcript for later user keeps prior history'.

### codex-rs/tui/src/ascii_animation.rs
- `frame_tick_must_be_nonzero` – covers 'frame tick must be nonzero'.

### codex-rs/tui/src/bottom_pane/approval_overlay.rs
- `ctrl_c_aborts_and_clears_queue` – covers 'ctrl c aborts and clears queue'.
- `shortcut_triggers_selection` – covers 'shortcut triggers selection'.
- `header_includes_command_snippet` – covers 'header includes command snippet'.
- `exec_history_cell_wraps_with_two_space_indent` – covers 'exec history cell wraps with two space indent'.
- `enter_sets_last_selected_index_without_dismissing` – covers 'enter sets last selected index without dismissing'.

### codex-rs/tui/src/bottom_pane/chat_composer.rs
- `footer_hint_row_is_separated_from_composer` – covers 'footer hint row is separated from composer'.
- `footer_mode_snapshots` – covers 'footer mode snapshots'.
- `esc_hint_stays_hidden_with_draft_content` – covers 'esc hint stays hidden with draft content'.
- `clear_for_ctrl_c_records_cleared_draft` – covers 'clear for ctrl c records cleared draft'.
- `question_mark_only_toggles_on_first_char` – covers 'question mark only toggles on first char'.
- `shortcut_overlay_persists_while_task_running` – covers 'shortcut overlay persists while task running'.
- `test_current_at_token_basic_cases` – covers 'test current at token basic cases'.
- `test_current_at_token_cursor_positions` – covers 'test current at token cursor positions'.
- `test_current_at_token_whitespace_boundaries` – covers 'test current at token whitespace boundaries'.
- `ascii_prefix_survives_non_ascii_followup` – covers 'ascii prefix survives non ascii followup'.
- `handle_paste_small_inserts_text` – covers 'handle paste small inserts text'.
- `empty_enter_returns_none` – covers 'empty enter returns none'.
- `handle_paste_large_uses_placeholder_and_replaces_on_submit` – covers 'handle paste large uses placeholder and replaces on submit'.
- `edit_clears_pending_paste` – covers 'edit clears pending paste'.
- `ui_snapshots` – covers 'ui snapshots'.
- `slash_popup_model_first_for_mo_ui` – covers 'slash popup model first for mo ui'.
- `slash_popup_model_first_for_mo_logic` – covers 'slash popup model first for mo logic'.
- `slash_init_dispatches_command_and_does_not_submit_literal_text` – covers 'slash init dispatches command and does not submit literal text'.
- `extract_args_supports_quoted_paths_single_arg` – covers 'extract args supports quoted paths single arg'.
- `extract_args_supports_mixed_quoted_and_unquoted` – covers 'extract args supports mixed quoted and unquoted'.
- `slash_tab_completion_moves_cursor_to_end` – covers 'slash tab completion moves cursor to end'.
- `slash_tab_then_enter_dispatches_builtin_command` – covers 'slash tab then enter dispatches builtin command'.
- `slash_mention_dispatches_command_and_inserts_at` – covers 'slash mention dispatches command and inserts at'.
- `test_multiple_pastes_submission` – covers 'test multiple pastes submission'.
- `test_placeholder_deletion` – covers 'test placeholder deletion'.
- `test_partial_placeholder_deletion` – covers 'test partial placeholder deletion'.
- `attach_image_and_submit_includes_image_paths` – covers 'attach image and submit includes image paths'.
- `attach_image_without_text_submits_empty_text_and_images` – covers 'attach image without text submits empty text and images'.
- `image_placeholder_backspace_behaves_like_text_placeholder` – covers 'image placeholder backspace behaves like text placeholder'.
- `backspace_with_multibyte_text_before_placeholder_does_not_panic` – covers 'backspace with multibyte text before placeholder does not panic'.
- `deleting_one_of_duplicate_image_placeholders_removes_matching_entry` – covers 'deleting one of duplicate image placeholders removes matching entry'.
- `pasting_filepath_attaches_image` – covers 'pasting filepath attaches image'.
- `selecting_custom_prompt_without_args_submits_content` – covers 'selecting custom prompt without args submits content'.
- `custom_prompt_submission_expands_arguments` – covers 'custom prompt submission expands arguments'.
- `custom_prompt_submission_accepts_quoted_values` – covers 'custom prompt submission accepts quoted values'.
- `slash_path_input_submits_without_command_error` – covers 'slash path input submits without command error'.
- `slash_with_leading_space_submits_as_text` – covers 'slash with leading space submits as text'.
- `custom_prompt_invalid_args_reports_error` – covers 'custom prompt invalid args reports error'.
- `custom_prompt_missing_required_args_reports_error` – covers 'custom prompt missing required args reports error'.
- `selecting_custom_prompt_with_args_expands_placeholders` – covers 'selecting custom prompt with args expands placeholders'.
- `numeric_prompt_positional_args_does_not_error` – covers 'numeric prompt positional args does not error'.
- `selecting_custom_prompt_with_no_args_inserts_template` – covers 'selecting custom prompt with no args inserts template'.
- `selecting_custom_prompt_preserves_literal_dollar_dollar` – covers 'selecting custom prompt preserves literal dollar dollar'.
- `selecting_custom_prompt_reuses_cached_arguments_join` – covers 'selecting custom prompt reuses cached arguments join'.
- `burst_paste_fast_small_buffers_and_flushes_on_stop` – covers 'burst paste fast small buffers and flushes on stop'.
- `burst_paste_fast_large_inserts_placeholder_on_flush` – covers 'burst paste fast large inserts placeholder on flush'.
- `humanlike_typing_1000_chars_appears_live_no_placeholder` – covers 'humanlike typing 1000 chars appears live no placeholder'.

### codex-rs/tui/src/bottom_pane/chat_composer_history.rs
- `duplicate_submissions_are_not_recorded` – covers 'duplicate submissions are not recorded'.
- `navigation_with_async_fetch` – covers 'navigation with async fetch'.
- `reset_navigation_resets_cursor` – covers 'reset navigation resets cursor'.

### codex-rs/tui/src/bottom_pane/command_popup.rs
- `filter_includes_init_when_typing_prefix` – covers 'filter includes init when typing prefix'.
- `selecting_init_by_exact_match` – covers 'selecting init by exact match'.
- `model_is_first_suggestion_for_mo` – covers 'model is first suggestion for mo'.
- `prompt_discovery_lists_custom_prompts` – covers 'prompt discovery lists custom prompts'.
- `prompt_name_collision_with_builtin_is_ignored` – covers 'prompt name collision with builtin is ignored'.
- `prompt_description_uses_frontmatter_metadata` – covers 'prompt description uses frontmatter metadata'.
- `prompt_description_falls_back_when_missing` – covers 'prompt description falls back when missing'.

### codex-rs/tui/src/bottom_pane/feedback_view.rs
- `feedback_view_bad_result` – covers 'feedback view bad result'.
- `feedback_view_good_result` – covers 'feedback view good result'.
- `feedback_view_bug` – covers 'feedback view bug'.
- `feedback_view_other` – covers 'feedback view other'.

### codex-rs/tui/src/bottom_pane/footer.rs
- `footer_snapshots` – covers 'footer snapshots'.

### codex-rs/tui/src/bottom_pane/list_selection_view.rs
- `renders_blank_line_between_title_and_items_without_subtitle` – covers 'renders blank line between title and items without subtitle'.
- `renders_blank_line_between_subtitle_and_items` – covers 'renders blank line between subtitle and items'.
- `renders_search_query_line_when_enabled` – covers 'renders search query line when enabled'.
- `width_changes_do_not_hide_rows` – covers 'width changes do not hide rows'.
- `narrow_width_keeps_all_rows_visible` – covers 'narrow width keeps all rows visible'.
- `snapshot_model_picker_width_80` – covers 'snapshot model picker width 80'.
- `snapshot_narrow_width_preserves_third_option` – covers 'snapshot narrow width preserves third option'.

### codex-rs/tui/src/bottom_pane/mod.rs
- `ctrl_c_on_modal_consumes_and_shows_quit_hint` – covers 'ctrl c on modal consumes and shows quit hint'.
- `overlay_not_shown_above_approval_modal` – covers 'overlay not shown above approval modal'.
- `composer_shown_after_denied_while_task_running` – covers 'composer shown after denied while task running'.
- `status_indicator_visible_during_command_execution` – covers 'status indicator visible during command execution'.
- `status_and_composer_fill_height_without_bottom_padding` – covers 'status and composer fill height without bottom padding'.
- `queued_messages_visible_when_status_hidden_snapshot` – covers 'queued messages visible when status hidden snapshot'.
- `status_and_queued_messages_snapshot` – covers 'status and queued messages snapshot'.

### codex-rs/tui/src/bottom_pane/prompt_args.rs
- `expand_arguments_basic` – covers 'expand arguments basic'.
- `quoted_values_ok` – covers 'quoted values ok'.
- `invalid_arg_token_reports_error` – covers 'invalid arg token reports error'.
- `missing_required_args_reports_error` – covers 'missing required args reports error'.
- `escaped_placeholder_is_ignored` – covers 'escaped placeholder is ignored'.
- `escaped_placeholder_remains_literal` – covers 'escaped placeholder remains literal'.

### codex-rs/tui/src/bottom_pane/queued_user_messages.rs
- `desired_height_empty` – covers 'desired height empty'.
- `desired_height_one_message` – covers 'desired height one message'.
- `render_one_message` – covers 'render one message'.
- `render_two_messages` – covers 'render two messages'.
- `render_more_than_three_messages` – covers 'render more than three messages'.
- `render_wrapped_message` – covers 'render wrapped message'.
- `render_many_line_message` – covers 'render many line message'.

### codex-rs/tui/src/bottom_pane/scroll_state.rs
- `wrap_navigation_and_visibility` – covers 'wrap navigation and visibility'.

### codex-rs/tui/src/bottom_pane/textarea.rs
- `insert_and_replace_update_cursor_and_text` – covers 'insert and replace update cursor and text'.
- `delete_backward_and_forward_edges` – covers 'delete backward and forward edges'.
- `delete_backward_word_and_kill_line_variants` – covers 'delete backward word and kill line variants'.
- `delete_forward_word_variants` – covers 'delete forward word variants'.
- `delete_forward_word_handles_atomic_elements` – covers 'delete forward word handles atomic elements'.
- `delete_backward_word_respects_word_separators` – covers 'delete backward word respects word separators'.
- `delete_forward_word_respects_word_separators` – covers 'delete forward word respects word separators'.
- `yank_restores_last_kill` – covers 'yank restores last kill'.
- `cursor_left_and_right_handle_graphemes` – covers 'cursor left and right handle graphemes'.
- `control_b_and_f_move_cursor` – covers 'control b and f move cursor'.
- `control_b_f_fallback_control_chars_move_cursor` – covers 'control b f fallback control chars move cursor'.
- `delete_backward_word_alt_keys` – covers 'delete backward word alt keys'.
- `delete_backward_word_handles_narrow_no_break_space` – covers 'delete backward word handles narrow no break space'.
- `delete_forward_word_with_without_alt_modifier` – covers 'delete forward word with without alt modifier'.
- `control_h_backspace` – covers 'control h backspace'.
- `altgr_ctrl_alt_char_inserts_literal` – covers 'altgr ctrl alt char inserts literal'.
- `cursor_vertical_movement_across_lines_and_bounds` – covers 'cursor vertical movement across lines and bounds'.
- `home_end_and_emacs_style_home_end` – covers 'home end and emacs style home end'.
- `end_of_line_or_down_at_end_of_text` – covers 'end of line or down at end of text'.
- `word_navigation_helpers` – covers 'word navigation helpers'.
- `wrapping_and_cursor_positions` – covers 'wrapping and cursor positions'.
- `cursor_pos_with_state_basic_and_scroll_behaviors` – covers 'cursor pos with state basic and scroll behaviors'.
- `wrapped_navigation_across_visual_lines` – covers 'wrapped navigation across visual lines'.
- `cursor_pos_with_state_after_movements` – covers 'cursor pos with state after movements'.
- `wrapped_navigation_with_newlines_and_spaces` – covers 'wrapped navigation with newlines and spaces'.
- `wrapped_navigation_with_wide_graphemes` – covers 'wrapped navigation with wide graphemes'.
- `fuzz_textarea_randomized` – covers 'fuzz textarea randomized'.

### codex-rs/tui/src/chatwidget/tests.rs
- `resumed_initial_messages_render_history` – covers 'resumed initial messages render history'.
- `entered_review_mode_uses_request_hint` – covers 'entered review mode uses request hint'.
- `entered_review_mode_defaults_to_current_changes_banner` – covers 'entered review mode defaults to current changes banner'.
- `exited_review_mode_emits_results_and_finishes` – covers 'exited review mode emits results and finishes'.
- `helpers_are_available_and_do_not_panic` – covers 'helpers are available and do not panic'.
- `rate_limit_warnings_emit_thresholds` – covers 'rate limit warnings emit thresholds'.
- `test_rate_limit_warnings_monthly` – covers 'test rate limit warnings monthly'.
- `rate_limit_switch_prompt_skips_when_on_lower_cost_model` – covers 'rate limit switch prompt skips when on lower cost model'.
- `rate_limit_switch_prompt_shows_once_per_session` – covers 'rate limit switch prompt shows once per session'.
- `rate_limit_switch_prompt_respects_hidden_notice` – covers 'rate limit switch prompt respects hidden notice'.
- `rate_limit_switch_prompt_defers_until_task_complete` – covers 'rate limit switch prompt defers until task complete'.
- `rate_limit_switch_prompt_popup_snapshot` – covers 'rate limit switch prompt popup snapshot'.
- `exec_approval_emits_proposed_command_and_decision_history` – covers 'exec approval emits proposed command and decision history'.
- `exec_approval_decision_truncates_multiline_and_long_commands` – covers 'exec approval decision truncates multiline and long commands'.
- `empty_enter_during_task_does_not_queue` – covers 'empty enter during task does not queue'.
- `alt_up_edits_most_recent_queued_message` – covers 'alt up edits most recent queued message'.
- `enqueueing_history_prompt_multiple_times_is_stable` – covers 'enqueueing history prompt multiple times is stable'.
- `streaming_final_answer_keeps_task_running_state` – covers 'streaming final answer keeps task running state'.
- `ctrl_c_shutdown_ignores_caps_lock` – covers 'ctrl c shutdown ignores caps lock'.
- `ctrl_c_cleared_prompt_is_recoverable_via_history` – covers 'ctrl c cleared prompt is recoverable via history'.
- `exec_history_cell_shows_working_then_completed` – covers 'exec history cell shows working then completed'.
- `exec_history_cell_shows_working_then_failed` – covers 'exec history cell shows working then failed'.
- `exec_history_shows_unified_exec_startup_commands` – covers 'exec history shows unified exec startup commands'.
- `review_popup_custom_prompt_action_sends_event` – covers 'review popup custom prompt action sends event'.
- `slash_init_skips_when_project_doc_exists` – covers 'slash init skips when project doc exists'.
- `slash_quit_requests_exit` – covers 'slash quit requests exit'.
- `slash_exit_requests_exit` – covers 'slash exit requests exit'.
- `slash_undo_sends_op` – covers 'slash undo sends op'.
- `slash_rollout_displays_current_path` – covers 'slash rollout displays current path'.
- `slash_rollout_handles_missing_path` – covers 'slash rollout handles missing path'.
- `undo_success_events_render_info_messages` – covers 'undo success events render info messages'.
- `undo_failure_events_render_error_message` – covers 'undo failure events render error message'.
- `undo_started_hides_interrupt_hint` – covers 'undo started hides interrupt hint'.
- `review_commit_picker_shows_subjects_without_timestamps` – covers 'review commit picker shows subjects without timestamps'.
- `custom_prompt_submit_sends_review_op` – covers 'custom prompt submit sends review op'.
- `custom_prompt_enter_empty_does_not_send` – covers 'custom prompt enter empty does not send'.
- `view_image_tool_call_adds_history_cell` – covers 'view image tool call adds history cell'.
- `interrupt_exec_marks_failed_snapshot` – covers 'interrupt exec marks failed snapshot'.
- `interrupted_turn_error_message_snapshot` – covers 'interrupted turn error message snapshot'.
- `review_custom_prompt_escape_navigates_back_then_dismisses` – covers 'review custom prompt escape navigates back then dismisses'.
- `review_branch_picker_escape_navigates_back_then_dismisses` – covers 'review branch picker escape navigates back then dismisses'.
- `model_selection_popup_snapshot` – covers 'model selection popup snapshot'.
- `approvals_selection_popup_snapshot` – covers 'approvals selection popup snapshot'.
- `approvals_popup_includes_wsl_note_for_auto_mode` – covers 'approvals popup includes wsl note for auto mode'.
- `full_access_confirmation_popup_snapshot` – covers 'full access confirmation popup snapshot'.
- `windows_auto_mode_instructions_popup_lists_install_steps` – covers 'windows auto mode instructions popup lists install steps'.
- `model_reasoning_selection_popup_snapshot` – covers 'model reasoning selection popup snapshot'.
- `single_reasoning_option_skips_selection` – covers 'single reasoning option skips selection'.
- `feedback_selection_popup_snapshot` – covers 'feedback selection popup snapshot'.
- `feedback_upload_consent_popup_snapshot` – covers 'feedback upload consent popup snapshot'.
- `reasoning_popup_escape_returns_to_model_popup` – covers 'reasoning popup escape returns to model popup'.
- `exec_history_extends_previous_when_consecutive` – covers 'exec history extends previous when consecutive'.
- `disabled_slash_command_while_task_running_snapshot` – covers 'disabled slash command while task running snapshot'.
- `approval_modal_exec_snapshot` – covers 'approval modal exec snapshot'.
- `approval_modal_exec_without_reason_snapshot` – covers 'approval modal exec without reason snapshot'.
- `approval_modal_patch_snapshot` – covers 'approval modal patch snapshot'.
- `interrupt_restores_queued_messages_into_composer` – covers 'interrupt restores queued messages into composer'.
- `interrupt_prepends_queued_messages_before_existing_composer_text` – covers 'interrupt prepends queued messages before existing composer text'.
- `ui_snapshots_small_heights_idle` – covers 'ui snapshots small heights idle'.
- `ui_snapshots_small_heights_task_running` – covers 'ui snapshots small heights task running'.
- `status_widget_and_approval_modal_snapshot` – covers 'status widget and approval modal snapshot'.
- `status_widget_active_snapshot` – covers 'status widget active snapshot'.
- `background_event_updates_status_header` – covers 'background event updates status header'.
- `apply_patch_events_emit_history_cells` – covers 'apply patch events emit history cells'.
- `apply_patch_manual_approval_adjusts_header` – covers 'apply patch manual approval adjusts header'.
- `apply_patch_manual_flow_snapshot` – covers 'apply patch manual flow snapshot'.
- `apply_patch_approval_sends_op_with_submission_id` – covers 'apply patch approval sends op with submission id'.
- `apply_patch_full_flow_integration_like` – covers 'apply patch full flow integration like'.
- `apply_patch_untrusted_shows_approval_modal` – covers 'apply patch untrusted shows approval modal'.
- `apply_patch_request_shows_diff_summary` – covers 'apply patch request shows diff summary'.
- `plan_update_renders_history_cell` – covers 'plan update renders history cell'.
- `stream_error_updates_status_indicator` – covers 'stream error updates status indicator'.
- `warning_event_adds_warning_history_cell` – covers 'warning event adds warning history cell'.
- `multiple_agent_messages_in_single_turn_emit_multiple_headers` – covers 'multiple agent messages in single turn emit multiple headers'.
- `final_reasoning_then_message_without_deltas_are_rendered` – covers 'final reasoning then message without deltas are rendered'.
- `deltas_then_same_final_message_are_rendered_snapshot` – covers 'deltas then same final message are rendered snapshot'.
- `chatwidget_exec_and_status_layout_vt100_snapshot` – covers 'chatwidget exec and status layout vt100 snapshot'.
- `chatwidget_markdown_code_blocks_vt100_snapshot` – covers 'chatwidget markdown code blocks vt100 snapshot'.
- `chatwidget_tall` – covers 'chatwidget tall'.

### codex-rs/tui/src/clipboard_paste.rs
- `normalize_file_url` – covers 'normalize file url'.
- `normalize_file_url_windows` – covers 'normalize file url windows'.
- `normalize_shell_escaped_single_path` – covers 'normalize shell escaped single path'.
- `normalize_simple_quoted_path_fallback` – covers 'normalize simple quoted path fallback'.
- `normalize_single_quoted_unix_path` – covers 'normalize single quoted unix path'.
- `normalize_multiple_tokens_returns_none` – covers 'normalize multiple tokens returns none'.
- `pasted_image_format_png_jpeg_unknown` – covers 'pasted image format png jpeg unknown'.
- `normalize_single_quoted_windows_path` – covers 'normalize single quoted windows path'.
- `normalize_unquoted_windows_path_with_spaces` – covers 'normalize unquoted windows path with spaces'.
- `normalize_unc_windows_path` – covers 'normalize unc windows path'.
- `pasted_image_format_with_windows_style_paths` – covers 'pasted image format with windows style paths'.

### codex-rs/tui/src/custom_terminal.rs
- `diff_buffers_does_not_emit_clear_to_end_for_full_width_row` – covers 'diff buffers does not emit clear to end for full width row'.
- `diff_buffers_clear_to_end_starts_after_wide_char` – covers 'diff buffers clear to end starts after wide char'.

### codex-rs/tui/src/diff_render.rs
- `ui_snapshot_wrap_behavior_insert` – covers 'ui snapshot wrap behavior insert'.
- `ui_snapshot_apply_update_block` – covers 'ui snapshot apply update block'.
- `ui_snapshot_apply_update_with_rename_block` – covers 'ui snapshot apply update with rename block'.
- `ui_snapshot_apply_multiple_files_block` – covers 'ui snapshot apply multiple files block'.
- `ui_snapshot_apply_add_block` – covers 'ui snapshot apply add block'.
- `ui_snapshot_apply_delete_block` – covers 'ui snapshot apply delete block'.
- `ui_snapshot_apply_update_block_wraps_long_lines` – covers 'ui snapshot apply update block wraps long lines'.
- `ui_snapshot_apply_update_block_wraps_long_lines_text` – covers 'ui snapshot apply update block wraps long lines text'.
- `ui_snapshot_apply_update_block_line_numbers_three_digits_text` – covers 'ui snapshot apply update block line numbers three digits text'.
- `ui_snapshot_apply_update_block_relativizes_path` – covers 'ui snapshot apply update block relativizes path'.

### codex-rs/tui/src/exec_command.rs
- `test_escape_command` – covers 'test escape command'.
- `test_strip_bash_lc_and_escape` – covers 'test strip bash lc and escape'.

### codex-rs/tui/src/history_cell.rs
- `mcp_tools_output_masks_sensitive_values` – covers 'mcp tools output masks sensitive values'.
- `empty_agent_message_cell_transcript` – covers 'empty agent message cell transcript'.
- `prefixed_wrapped_history_cell_indents_wrapped_lines` – covers 'prefixed wrapped history cell indents wrapped lines'.
- `active_mcp_tool_call_snapshot` – covers 'active mcp tool call snapshot'.
- `completed_mcp_tool_call_success_snapshot` – covers 'completed mcp tool call success snapshot'.
- `completed_mcp_tool_call_error_snapshot` – covers 'completed mcp tool call error snapshot'.
- `completed_mcp_tool_call_multiple_outputs_snapshot` – covers 'completed mcp tool call multiple outputs snapshot'.
- `completed_mcp_tool_call_wrapped_outputs_snapshot` – covers 'completed mcp tool call wrapped outputs snapshot'.
- `completed_mcp_tool_call_multiple_outputs_inline_snapshot` – covers 'completed mcp tool call multiple outputs inline snapshot'.
- `session_header_includes_reasoning_level_when_present` – covers 'session header includes reasoning level when present'.
- `session_header_directory_center_truncates` – covers 'session header directory center truncates'.
- `session_header_directory_front_truncates_long_segment` – covers 'session header directory front truncates long segment'.
- `coalesces_sequential_reads_within_one_call` – covers 'coalesces sequential reads within one call'.
- `coalesces_reads_across_multiple_calls` – covers 'coalesces reads across multiple calls'.
- `coalesced_reads_dedupe_names` – covers 'coalesced reads dedupe names'.
- `multiline_command_wraps_with_extra_indent_on_subsequent_lines` – covers 'multiline command wraps with extra indent on subsequent lines'.
- `single_line_command_compact_when_fits` – covers 'single line command compact when fits'.
- `single_line_command_wraps_with_four_space_continuation` – covers 'single line command wraps with four space continuation'.
- `multiline_command_without_wrap_uses_branch_then_eight_spaces` – covers 'multiline command without wrap uses branch then eight spaces'.
- `multiline_command_both_lines_wrap_with_correct_prefixes` – covers 'multiline command both lines wrap with correct prefixes'.
- `stderr_tail_more_than_five_lines_snapshot` – covers 'stderr tail more than five lines snapshot'.
- `ran_cell_multiline_with_stderr_snapshot` – covers 'ran cell multiline with stderr snapshot'.
- `user_history_cell_wraps_and_prefixes_each_line_snapshot` – covers 'user history cell wraps and prefixes each line snapshot'.
- `plan_update_with_note_and_wrapping_snapshot` – covers 'plan update with note and wrapping snapshot'.
- `plan_update_without_note_snapshot` – covers 'plan update without note snapshot'.
- `reasoning_summary_block` – covers 'reasoning summary block'.
- `reasoning_summary_block_returns_reasoning_cell_when_feature_disabled` – covers 'reasoning summary block returns reasoning cell when feature disabled'.
- `reasoning_summary_block_falls_back_when_header_is_missing` – covers 'reasoning summary block falls back when header is missing'.
- `reasoning_summary_block_falls_back_when_summary_is_missing` – covers 'reasoning summary block falls back when summary is missing'.
- `reasoning_summary_block_splits_header_and_summary_when_present` – covers 'reasoning summary block splits header and summary when present'.
- `deprecation_notice_renders_summary_with_details` – covers 'deprecation notice renders summary with details'.

### codex-rs/tui/src/insert_history.rs
- `writes_bold_then_regular_spans` – covers 'writes bold then regular spans'.
- `vt100_blockquote_line_emits_green_fg` – covers 'vt100 blockquote line emits green fg'.
- `vt100_blockquote_wrap_preserves_color_on_all_wrapped_lines` – covers 'vt100 blockquote wrap preserves color on all wrapped lines'.
- `vt100_colored_prefix_then_plain_text_resets_color` – covers 'vt100 colored prefix then plain text resets color'.
- `vt100_deep_nested_mixed_list_third_level_marker_is_colored` – covers 'vt100 deep nested mixed list third level marker is colored'.

### codex-rs/tui/src/lib.rs
- `untrusted_project_skips_trust_prompt` – covers 'untrusted project skips trust prompt'.

### codex-rs/tui/src/live_wrap.rs
- `rows_do_not_exceed_width_ascii` – covers 'rows do not exceed width ascii'.
- `rows_do_not_exceed_width_emoji_cjk` – covers 'rows do not exceed width emoji cjk'.
- `fragmentation_invariance_long_token` – covers 'fragmentation invariance long token'.
- `newline_splits_rows` – covers 'newline splits rows'.
- `rewrap_on_width_change` – covers 'rewrap on width change'.

### codex-rs/tui/src/markdown.rs
- `citations_render_as_plain_text` – covers 'citations render as plain text'.
- `indented_code_blocks_preserve_leading_whitespace` – covers 'indented code blocks preserve leading whitespace'.
- `append_markdown_preserves_full_text_line` – covers 'append markdown preserves full text line'.
- `append_markdown_matches_tui_markdown_for_ordered_item` – covers 'append markdown matches tui markdown for ordered item'.
- `append_markdown_keeps_ordered_list_line_unsplit_in_context` – covers 'append markdown keeps ordered list line unsplit in context'.

### codex-rs/tui/src/markdown_render.rs
- `wraps_plain_text_when_width_provided` – covers 'wraps plain text when width provided'.
- `wraps_list_items_preserving_indent` – covers 'wraps list items preserving indent'.
- `wraps_nested_lists` – covers 'wraps nested lists'.
- `wraps_ordered_lists` – covers 'wraps ordered lists'.
- `wraps_blockquotes` – covers 'wraps blockquotes'.
- `wraps_blockquotes_inside_lists` – covers 'wraps blockquotes inside lists'.
- `wraps_list_items_containing_blockquotes` – covers 'wraps list items containing blockquotes'.
- `does_not_wrap_code_blocks` – covers 'does not wrap code blocks'.

### codex-rs/tui/src/markdown_render_tests.rs
- `empty` – covers 'empty'.
- `paragraph_single` – covers 'paragraph single'.
- `paragraph_soft_break` – covers 'paragraph soft break'.
- `paragraph_multiple` – covers 'paragraph multiple'.
- `headings` – covers 'headings'.
- `blockquote_single` – covers 'blockquote single'.
- `blockquote_soft_break` – covers 'blockquote soft break'.
- `blockquote_multiple_with_break` – covers 'blockquote multiple with break'.
- `blockquote_three_paragraphs_short_lines` – covers 'blockquote three paragraphs short lines'.
- `blockquote_nested_two_levels` – covers 'blockquote nested two levels'.
- `blockquote_with_list_items` – covers 'blockquote with list items'.
- `blockquote_with_ordered_list` – covers 'blockquote with ordered list'.
- `blockquote_list_then_nested_blockquote` – covers 'blockquote list then nested blockquote'.
- `list_item_with_inline_blockquote_on_same_line` – covers 'list item with inline blockquote on same line'.
- `blockquote_surrounded_by_blank_lines` – covers 'blockquote surrounded by blank lines'.
- `blockquote_in_ordered_list_on_next_line` – covers 'blockquote in ordered list on next line'.
- `blockquote_in_unordered_list_on_next_line` – covers 'blockquote in unordered list on next line'.
- `blockquote_two_paragraphs_inside_ordered_list_has_blank_line` – covers 'blockquote two paragraphs inside ordered list has blank line'.
- `blockquote_inside_nested_list` – covers 'blockquote inside nested list'.
- `list_item_text_then_blockquote` – covers 'list item text then blockquote'.
- `list_item_blockquote_then_text` – covers 'list item blockquote then text'.
- `list_item_text_blockquote_text` – covers 'list item text blockquote text'.
- `blockquote_with_heading_and_paragraph` – covers 'blockquote with heading and paragraph'.
- `blockquote_heading_inherits_heading_style` – covers 'blockquote heading inherits heading style'.
- `blockquote_with_code_block` – covers 'blockquote with code block'.
- `blockquote_with_multiline_code_block` – covers 'blockquote with multiline code block'.
- `nested_blockquote_with_inline_and_fenced_code` – covers 'nested blockquote with inline and fenced code'.
- `list_unordered_single` – covers 'list unordered single'.
- `list_unordered_multiple` – covers 'list unordered multiple'.
- `list_ordered` – covers 'list ordered'.
- `list_nested` – covers 'list nested'.
- `list_ordered_custom_start` – covers 'list ordered custom start'.
- `nested_unordered_in_ordered` – covers 'nested unordered in ordered'.
- `nested_ordered_in_unordered` – covers 'nested ordered in unordered'.
- `loose_list_item_multiple_paragraphs` – covers 'loose list item multiple paragraphs'.
- `tight_item_with_soft_break` – covers 'tight item with soft break'.
- `deeply_nested_mixed_three_levels` – covers 'deeply nested mixed three levels'.
- `loose_items_due_to_blank_line_between_items` – covers 'loose items due to blank line between items'.
- `mixed_tight_then_loose_in_one_list` – covers 'mixed tight then loose in one list'.
- `ordered_item_with_indented_continuation_is_tight` – covers 'ordered item with indented continuation is tight'.
- `inline_code` – covers 'inline code'.
- `strong` – covers 'strong'.
- `emphasis` – covers 'emphasis'.
- `strikethrough` – covers 'strikethrough'.
- `strong_emphasis` – covers 'strong emphasis'.
- `link` – covers 'link'.
- `code_block_unhighlighted` – covers 'code block unhighlighted'.
- `code_block_multiple_lines_root` – covers 'code block multiple lines root'.
- `code_block_indented` – covers 'code block indented'.
- `horizontal_rule_renders_em_dashes` – covers 'horizontal rule renders em dashes'.
- `code_block_with_inner_triple_backticks_outer_four` – covers 'code block with inner triple backticks outer four'.
- `code_block_inside_unordered_list_item_is_indented` – covers 'code block inside unordered list item is indented'.
- `code_block_multiple_lines_inside_unordered_list` – covers 'code block multiple lines inside unordered list'.
- `code_block_inside_unordered_list_item_multiple_lines` – covers 'code block inside unordered list item multiple lines'.
- `markdown_render_complex_snapshot` – covers 'markdown render complex snapshot'.
- `ordered_item_with_code_block_and_nested_bullet` – covers 'ordered item with code block and nested bullet'.
- `nested_five_levels_mixed_lists` – covers 'nested five levels mixed lists'.
- `html_inline_is_verbatim` – covers 'html inline is verbatim'.
- `html_block_is_verbatim_multiline` – covers 'html block is verbatim multiline'.
- `html_in_tight_ordered_item_soft_breaks_with_space` – covers 'html in tight ordered item soft breaks with space'.
- `html_continuation_paragraph_in_unordered_item_indented` – covers 'html continuation paragraph in unordered item indented'.
- `unordered_item_continuation_paragraph_is_indented` – covers 'unordered item continuation paragraph is indented'.
- `ordered_item_continuation_paragraph_is_indented` – covers 'ordered item continuation paragraph is indented'.
- `nested_item_continuation_paragraph_is_indented` – covers 'nested item continuation paragraph is indented'.

### codex-rs/tui/src/markdown_stream.rs
- `no_commit_until_newline` – covers 'no commit until newline'.
- `finalize_commits_partial_line` – covers 'finalize commits partial line'.
- `e2e_stream_blockquote_simple_is_green` – covers 'e2e stream blockquote simple is green'.
- `e2e_stream_blockquote_nested_is_green` – covers 'e2e stream blockquote nested is green'.
- `e2e_stream_blockquote_with_list_items_is_green` – covers 'e2e stream blockquote with list items is green'.
- `e2e_stream_nested_mixed_lists_ordered_marker_is_light_blue` – covers 'e2e stream nested mixed lists ordered marker is light blue'.
- `e2e_stream_blockquote_wrap_preserves_green_style` – covers 'e2e stream blockquote wrap preserves green style'.
- `heading_starts_on_new_line_when_following_paragraph` – covers 'heading starts on new line when following paragraph'.
- `heading_not_inlined_when_split_across_chunks` – covers 'heading not inlined when split across chunks'.
- `lists_and_fences_commit_without_duplication` – covers 'lists and fences commit without duplication'.
- `utf8_boundary_safety_and_wide_chars` – covers 'utf8 boundary safety and wide chars'.
- `e2e_stream_deep_nested_third_level_marker_is_light_blue` – covers 'e2e stream deep nested third level marker is light blue'.
- `empty_fenced_block_is_dropped_and_separator_preserved_before_heading` – covers 'empty fenced block is dropped and separator preserved before heading'.
- `paragraph_then_empty_fence_then_heading_keeps_heading_on_new_line` – covers 'paragraph then empty fence then heading keeps heading on new line'.
- `loose_list_with_split_dashes_matches_full_render` – covers 'loose list with split dashes matches full render'.
- `loose_vs_tight_list_items_streaming_matches_full` – covers 'loose vs tight list items streaming matches full'.
- `fuzz_class_bullet_duplication_variant_1` – covers 'fuzz class bullet duplication variant 1'.
- `fuzz_class_bullet_duplication_variant_2` – covers 'fuzz class bullet duplication variant 2'.
- `streaming_html_block_then_text_matches_full` – covers 'streaming html block then text matches full'.

### codex-rs/tui/src/model_migration.rs
- `prompt_snapshot` – covers 'prompt snapshot'.
- `prompt_snapshot_gpt5_family` – covers 'prompt snapshot gpt5 family'.
- `prompt_snapshot_gpt5_codex` – covers 'prompt snapshot gpt5 codex'.
- `prompt_snapshot_gpt5_codex_mini` – covers 'prompt snapshot gpt5 codex mini'.
- `escape_key_accepts_prompt` – covers 'escape key accepts prompt'.

### codex-rs/tui/src/onboarding/auth.rs
- `api_key_flow_disabled_when_chatgpt_forced` – covers 'api key flow disabled when chatgpt forced'.
- `saving_api_key_is_blocked_when_chatgpt_forced` – covers 'saving api key is blocked when chatgpt forced'.

### codex-rs/tui/src/onboarding/trust_directory.rs
- `release_event_does_not_change_selection` – covers 'release event does not change selection'.
- `renders_snapshot_for_git_repo` – covers 'renders snapshot for git repo'.

### codex-rs/tui/src/onboarding/welcome.rs
- `welcome_renders_animation_on_first_draw` – covers 'welcome renders animation on first draw'.
- `ctrl_dot_changes_animation_variant` – covers 'ctrl dot changes animation variant'.

### codex-rs/tui/src/onboarding/windows.rs
- `windows_step_hidden_after_continue` – covers 'windows step hidden after continue'.
- `windows_step_complete_after_install_selection` – covers 'windows step complete after install selection'.

### codex-rs/tui/src/pager_overlay.rs
- `edit_prev_hint_is_visible` – covers 'edit prev hint is visible'.
- `transcript_overlay_snapshot_basic` – covers 'transcript overlay snapshot basic'.
- `transcript_overlay_apply_patch_scroll_vt100_clears_previous_page` – covers 'transcript overlay apply patch scroll vt100 clears previous page'.
- `transcript_overlay_keeps_scroll_pinned_at_bottom` – covers 'transcript overlay keeps scroll pinned at bottom'.
- `transcript_overlay_preserves_manual_scroll_position` – covers 'transcript overlay preserves manual scroll position'.
- `static_overlay_snapshot_basic` – covers 'static overlay snapshot basic'.
- `static_overlay_wraps_long_lines` – covers 'static overlay wraps long lines'.
- `pager_view_content_height_counts_renderables` – covers 'pager view content height counts renderables'.
- `pager_view_ensure_chunk_visible_scrolls_down_when_needed` – covers 'pager view ensure chunk visible scrolls down when needed'.
- `pager_view_ensure_chunk_visible_scrolls_up_when_needed` – covers 'pager view ensure chunk visible scrolls up when needed'.
- `pager_view_is_scrolled_to_bottom_accounts_for_wrapped_height` – covers 'pager view is scrolled to bottom accounts for wrapped height'.

### codex-rs/tui/src/render/highlight.rs
- `dims_expected_bash_operators` – covers 'dims expected bash operators'.
- `dims_redirects_and_strings` – covers 'dims redirects and strings'.
- `highlights_command_and_strings` – covers 'highlights command and strings'.
- `highlights_heredoc_body_as_string` – covers 'highlights heredoc body as string'.

### codex-rs/tui/src/resume_picker.rs
- `preview_uses_first_message_input_text` – covers 'preview uses first message input text'.
- `rows_from_items_preserves_backend_order` – covers 'rows from items preserves backend order'.
- `row_uses_tail_timestamp_for_updated_at` – covers 'row uses tail timestamp for updated at'.
- `resume_table_snapshot` – covers 'resume table snapshot'.
- `pageless_scrolling_deduplicates_and_keeps_order` – covers 'pageless scrolling deduplicates and keeps order'.
- `ensure_minimum_rows_prefetches_when_underfilled` – covers 'ensure minimum rows prefetches when underfilled'.
- `page_navigation_uses_view_rows` – covers 'page navigation uses view rows'.
- `up_at_bottom_does_not_scroll_when_visible` – covers 'up at bottom does not scroll when visible'.
- `set_query_loads_until_match_and_respects_scan_cap` – covers 'set query loads until match and respects scan cap'.

### codex-rs/tui/src/status/tests.rs
- `status_snapshot_includes_reasoning_details` – covers 'status snapshot includes reasoning details'.
- `status_snapshot_includes_monthly_limit` – covers 'status snapshot includes monthly limit'.
- `status_card_token_usage_excludes_cached_tokens` – covers 'status card token usage excludes cached tokens'.
- `status_snapshot_truncates_in_narrow_terminal` – covers 'status snapshot truncates in narrow terminal'.
- `status_snapshot_shows_missing_limits_message` – covers 'status snapshot shows missing limits message'.
- `status_snapshot_shows_empty_limits_message` – covers 'status snapshot shows empty limits message'.
- `status_snapshot_shows_stale_limits_message` – covers 'status snapshot shows stale limits message'.
- `status_context_window_uses_last_usage` – covers 'status context window uses last usage'.

### codex-rs/tui/src/status_indicator_widget.rs
- `fmt_elapsed_compact_formats_seconds_minutes_hours` – covers 'fmt elapsed compact formats seconds minutes hours'.
- `renders_with_working_header` – covers 'renders with working header'.
- `renders_truncated` – covers 'renders truncated'.
- `timer_pauses_when_requested` – covers 'timer pauses when requested'.

### codex-rs/tui/src/streaming/controller.rs
- `controller_loose_vs_tight_with_commit_ticks_matches_full` – covers 'controller loose vs tight with commit ticks matches full'.

### codex-rs/tui/src/text_formatting.rs
- `test_truncate_text` – covers 'test truncate text'.
- `test_truncate_empty_string` – covers 'test truncate empty string'.
- `test_truncate_max_graphemes_zero` – covers 'test truncate max graphemes zero'.
- `test_truncate_max_graphemes_one` – covers 'test truncate max graphemes one'.
- `test_truncate_max_graphemes_two` – covers 'test truncate max graphemes two'.
- `test_truncate_max_graphemes_three_boundary` – covers 'test truncate max graphemes three boundary'.
- `test_truncate_text_shorter_than_limit` – covers 'test truncate text shorter than limit'.
- `test_truncate_text_exact_length` – covers 'test truncate text exact length'.
- `test_truncate_emoji` – covers 'test truncate emoji'.
- `test_truncate_unicode_combining_characters` – covers 'test truncate unicode combining characters'.
- `test_truncate_very_long_text` – covers 'test truncate very long text'.
- `test_format_json_compact_simple_object` – covers 'test format json compact simple object'.
- `test_format_json_compact_nested_object` – covers 'test format json compact nested object'.
- `test_center_truncate_doesnt_truncate_short_path` – covers 'test center truncate doesnt truncate short path'.
- `test_center_truncate_truncates_long_path` – covers 'test center truncate truncates long path'.
- `test_center_truncate_truncates_long_windows_path` – covers 'test center truncate truncates long windows path'.
- `test_center_truncate_handles_long_segment` – covers 'test center truncate handles long segment'.
- `test_format_json_compact_array` – covers 'test format json compact array'.
- `test_format_json_compact_already_compact` – covers 'test format json compact already compact'.
- `test_format_json_compact_with_whitespace` – covers 'test format json compact with whitespace'.
- `test_format_json_compact_invalid_json` – covers 'test format json compact invalid json'.
- `test_format_json_compact_empty_object` – covers 'test format json compact empty object'.
- `test_format_json_compact_empty_array` – covers 'test format json compact empty array'.
- `test_format_json_compact_primitive_values` – covers 'test format json compact primitive values'.

### codex-rs/tui/src/update_action.rs
- `detects_update_action_without_env_mutation` – covers 'detects update action without env mutation'.

### codex-rs/tui/src/update_prompt.rs
- `update_prompt_snapshot` – covers 'update prompt snapshot'.
- `update_prompt_confirm_selects_update` – covers 'update prompt confirm selects update'.
- `update_prompt_dismiss_option_leaves_prompt_in_normal_state` – covers 'update prompt dismiss option leaves prompt in normal state'.
- `update_prompt_dont_remind_selects_dismissal` – covers 'update prompt dont remind selects dismissal'.
- `update_prompt_ctrl_c_skips_update` – covers 'update prompt ctrl c skips update'.
- `update_prompt_navigation_wraps_between_entries` – covers 'update prompt navigation wraps between entries'.

### codex-rs/tui/src/updates.rs
- `parses_version_from_cask_contents` – covers 'parses version from cask contents'.
- `extracts_version_from_latest_tag` – covers 'extracts version from latest tag'.
- `latest_tag_without_prefix_is_invalid` – covers 'latest tag without prefix is invalid'.
- `prerelease_version_is_not_considered_newer` – covers 'prerelease version is not considered newer'.
- `plain_semver_comparisons_work` – covers 'plain semver comparisons work'.
- `whitespace_is_ignored` – covers 'whitespace is ignored'.

### codex-rs/tui/src/wrapping.rs
- `trivial_unstyled_no_indents_wide_width` – covers 'trivial unstyled no indents wide width'.
- `simple_unstyled_wrap_narrow_width` – covers 'simple unstyled wrap narrow width'.
- `simple_styled_wrap_preserves_styles` – covers 'simple styled wrap preserves styles'.
- `with_initial_and_subsequent_indents` – covers 'with initial and subsequent indents'.
- `empty_initial_indent_subsequent_spaces` – covers 'empty initial indent subsequent spaces'.
- `empty_input_yields_single_empty_line` – covers 'empty input yields single empty line'.
- `leading_spaces_preserved_on_first_line` – covers 'leading spaces preserved on first line'.
- `multiple_spaces_between_words_dont_start_next_line_with_spaces` – covers 'multiple spaces between words dont start next line with spaces'.
- `break_words_false_allows_overflow_for_long_word` – covers 'break words false allows overflow for long word'.
- `hyphen_splitter_breaks_at_hyphen` – covers 'hyphen splitter breaks at hyphen'.
- `indent_consumes_width_leaving_one_char_space` – covers 'indent consumes width leaving one char space'.
- `wide_unicode_wraps_by_display_width` – covers 'wide unicode wraps by display width'.
- `styled_split_within_span_preserves_style` – covers 'styled split within span preserves style'.
- `wrap_lines_applies_initial_indent_only_once` – covers 'wrap lines applies initial indent only once'.
- `wrap_lines_without_indents_is_concat_of_single_wraps` – covers 'wrap lines without indents is concat of single wraps'.
- `wrap_lines_borrowed_applies_initial_indent_only_once` – covers 'wrap lines borrowed applies initial indent only once'.
- `wrap_lines_borrowed_without_indents_is_concat_of_single_wraps` – covers 'wrap lines borrowed without indents is concat of single wraps'.
- `wrap_lines_accepts_borrowed_iterators` – covers 'wrap lines accepts borrowed iterators'.
- `wrap_lines_accepts_str_slices` – covers 'wrap lines accepts str slices'.
- `line_height_counts_double_width_emoji` – covers 'line height counts double width emoji'.
- `word_wrap_does_not_split_words_simple_english` – covers 'word wrap does not split words simple english'.

### codex-rs/tui/tests/suite/status_indicator.rs
- `ansi_escape_line_strips_escape_sequences` – covers 'ansi escape line strips escape sequences'.

### codex-rs/tui/tests/suite/vt100_history.rs
- `basic_insertion_no_wrap` – covers 'basic insertion no wrap'.
- `long_token_wraps` – covers 'long token wraps'.
- `emoji_and_cjk` – covers 'emoji and cjk'.
- `mixed_ansi_spans` – covers 'mixed ansi spans'.
- `cursor_restoration` – covers 'cursor restoration'.
- `word_wrap_no_mid_word_split` – covers 'word wrap no mid word split'.
- `em_dash_and_space_word_wrap` – covers 'em dash and space word wrap'.

### codex-rs/tui/tests/suite/vt100_live_commit.rs
- `live_001_commit_on_overflow` – covers 'live 001 commit on overflow'.

### codex-rs/utils/cache/src/lib.rs
- `stores_and_retrieves_values` – covers 'stores and retrieves values'.
- `evicts_least_recently_used` – covers 'evicts least recently used'.
- `disabled_without_runtime` – covers 'disabled without runtime'.

### codex-rs/utils/git/src/apply.rs
- `apply_add_success` – covers 'apply add success'.
- `apply_modify_conflict` – covers 'apply modify conflict'.
- `apply_modify_skipped_missing_index` – covers 'apply modify skipped missing index'.
- `apply_then_revert_success` – covers 'apply then revert success'.
- `revert_preflight_does_not_stage_index` – covers 'revert preflight does not stage index'.
- `preflight_blocks_partial_changes` – covers 'preflight blocks partial changes'.

### codex-rs/utils/image/src/lib.rs
- `returns_original_image_when_within_bounds` – covers 'returns original image when within bounds'.
- `downscales_large_image` – covers 'downscales large image'.
- `fails_cleanly_for_invalid_images` – covers 'fails cleanly for invalid images'.
- `reprocesses_updated_file_contents` – covers 'reprocesses updated file contents'.

### codex-rs/utils/json-to-toml/src/lib.rs
- `json_number_to_toml` – covers 'json number to toml'.
- `json_array_to_toml` – covers 'json array to toml'.
- `json_bool_to_toml` – covers 'json bool to toml'.
- `json_float_to_toml` – covers 'json float to toml'.
- `json_null_to_toml` – covers 'json null to toml'.
- `json_object_nested` – covers 'json object nested'.

### codex-rs/utils/readiness/src/lib.rs
- `subscribe_and_mark_ready_roundtrip` – covers 'subscribe and mark ready roundtrip'.
- `subscribe_after_ready_returns_none` – covers 'subscribe after ready returns none'.
- `mark_ready_rejects_unknown_token` – covers 'mark ready rejects unknown token'.
- `wait_ready_unblocks_after_mark_ready` – covers 'wait ready unblocks after mark ready'.
- `mark_ready_twice_uses_single_token` – covers 'mark ready twice uses single token'.
- `is_ready_without_subscribers_marks_flag_ready` – covers 'is ready without subscribers marks flag ready'.
- `subscribe_returns_error_when_lock_is_held` – covers 'subscribe returns error when lock is held'.

### codex-rs/utils/tokenizer/src/lib.rs
- `cl100k_base_roundtrip_simple` – covers 'cl100k base roundtrip simple'.
- `preserves_whitespace_and_special_tokens_flag` – covers 'preserves whitespace and special tokens flag'.
- `model_mapping_builds_tokenizer` – covers 'model mapping builds tokenizer'.
- `unknown_model_defaults_to_o200k_base` – covers 'unknown model defaults to o200k base'.
- `warm_model_cache_without_runtime_is_noop` – covers 'warm model cache without runtime is noop'.