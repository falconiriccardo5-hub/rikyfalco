-- Recuperata dal database di produzione (supabase_migrations.schema_migrations).
revoke execute on function public.audit_trigger(), public.handle_new_user(), public.on_payment_paid(), public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.is_admin(), public.setting_int(text,int) from public, anon;
grant execute on function public.is_admin(), public.setting_int(text,int) to authenticated;
create or replace function public.guard_automations() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'forbidden'; end if;
end $$;
revoke execute on function public.guard_automations() from public, anon;
do $$ begin
  execute replace(pg_get_functiondef('public.run_daily_automations()'::regprocedure),
    'perform set_config(''app.source'', ''cron'', true);',
    'perform public.guard_automations(); perform set_config(''app.source'', case when auth.uid() is null then ''cron'' else ''ui'' end, true);');
end $$;
