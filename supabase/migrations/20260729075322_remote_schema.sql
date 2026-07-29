alter table "public"."transactions" drop constraint "transactions_recurrence_check";


  create table "public"."category_items" (
    "id" uuid not null default gen_random_uuid(),
    "wallet_id" uuid not null,
    "category_id" uuid not null,
    "name" text not null,
    "default_amount_cents" bigint,
    "recurrence" text not null default 'none'::text,
    "next_due_on" date,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."category_items" enable row level security;

alter table "public"."transactions" add column "category_item_id" uuid;

CREATE UNIQUE INDEX category_items_cat_name_idx ON public.category_items USING btree (category_id, lower(name));

CREATE INDEX category_items_due_idx ON public.category_items USING btree (wallet_id, next_due_on) WHERE ((recurrence <> 'none'::text) AND (archived_at IS NULL));

CREATE UNIQUE INDEX category_items_pkey ON public.category_items USING btree (id);

CREATE INDEX category_items_wallet_idx ON public.category_items USING btree (wallet_id);

CREATE INDEX transactions_item_idx ON public.transactions USING btree (category_item_id) WHERE (category_item_id IS NOT NULL);

alter table "public"."category_items" add constraint "category_items_pkey" PRIMARY KEY using index "category_items_pkey";

alter table "public"."category_items" add constraint "category_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE not valid;

alter table "public"."category_items" validate constraint "category_items_category_id_fkey";

alter table "public"."category_items" add constraint "category_items_default_amount_cents_check" CHECK (((default_amount_cents IS NULL) OR (default_amount_cents >= 0))) not valid;

alter table "public"."category_items" validate constraint "category_items_default_amount_cents_check";

alter table "public"."category_items" add constraint "category_items_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 40))) not valid;

alter table "public"."category_items" validate constraint "category_items_name_check";

alter table "public"."category_items" add constraint "category_items_recurrence_anchor_ck" CHECK ((((recurrence = 'none'::text) AND (next_due_on IS NULL)) OR ((recurrence <> 'none'::text) AND (next_due_on IS NOT NULL)))) not valid;

alter table "public"."category_items" validate constraint "category_items_recurrence_anchor_ck";

alter table "public"."category_items" add constraint "category_items_recurrence_check" CHECK ((recurrence = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]))) not valid;

alter table "public"."category_items" validate constraint "category_items_recurrence_check";

alter table "public"."category_items" add constraint "category_items_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE not valid;

alter table "public"."category_items" validate constraint "category_items_wallet_id_fkey";

alter table "public"."transactions" add constraint "transactions_category_item_id_fkey" FOREIGN KEY (category_item_id) REFERENCES public.category_items(id) ON DELETE RESTRICT not valid;

alter table "public"."transactions" validate constraint "transactions_category_item_id_fkey";

alter table "public"."transactions" add constraint "transactions_recurrence_check" CHECK ((recurrence = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_recurrence_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.tg_category_items_wallet_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cat_wallet uuid;
begin
  select wallet_id into v_cat_wallet from public.categories where id = new.category_id;
  if v_cat_wallet is null or v_cat_wallet <> new.wallet_id then
    raise exception 'category_items.wallet_id (%) must match its category''s wallet (%)', new.wallet_id, v_cat_wallet;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_transactions_item_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_item_cat uuid; v_item_wallet uuid;
begin
  if new.category_item_id is null then return new; end if;
  select category_id, wallet_id into v_item_cat, v_item_wallet
    from public.category_items where id = new.category_item_id;
  if v_item_cat is null or v_item_cat <> new.category_id or v_item_wallet <> new.wallet_id then
    raise exception 'transactions.category_item_id must reference an item in the same category and wallet';
  end if;
  return new;
end;
$function$
;

grant delete on table "public"."category_items" to "anon";

grant insert on table "public"."category_items" to "anon";

grant references on table "public"."category_items" to "anon";

grant select on table "public"."category_items" to "anon";

grant trigger on table "public"."category_items" to "anon";

grant truncate on table "public"."category_items" to "anon";

grant update on table "public"."category_items" to "anon";

grant delete on table "public"."category_items" to "authenticated";

grant insert on table "public"."category_items" to "authenticated";

grant references on table "public"."category_items" to "authenticated";

grant select on table "public"."category_items" to "authenticated";

grant trigger on table "public"."category_items" to "authenticated";

grant truncate on table "public"."category_items" to "authenticated";

grant update on table "public"."category_items" to "authenticated";

grant delete on table "public"."category_items" to "service_role";

grant insert on table "public"."category_items" to "service_role";

grant references on table "public"."category_items" to "service_role";

grant select on table "public"."category_items" to "service_role";

grant trigger on table "public"."category_items" to "service_role";

grant truncate on table "public"."category_items" to "service_role";

grant update on table "public"."category_items" to "service_role";


  create policy "category_items_delete_member"
  on "public"."category_items"
  as permissive
  for delete
  to public
using (public.is_wallet_member(wallet_id));



  create policy "category_items_insert_member"
  on "public"."category_items"
  as permissive
  for insert
  to public
with check (public.is_wallet_member(wallet_id));



  create policy "category_items_select_member"
  on "public"."category_items"
  as permissive
  for select
  to public
using (public.is_wallet_member(wallet_id));



  create policy "category_items_update_member"
  on "public"."category_items"
  as permissive
  for update
  to public
using (public.is_wallet_member(wallet_id))
with check (public.is_wallet_member(wallet_id));


CREATE TRIGGER category_items_set_updated_at BEFORE UPDATE ON public.category_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER category_items_wallet_guard BEFORE INSERT OR UPDATE OF wallet_id, category_id ON public.category_items FOR EACH ROW EXECUTE FUNCTION public.tg_category_items_wallet_guard();

CREATE TRIGGER transactions_item_guard BEFORE INSERT OR UPDATE OF category_item_id, category_id, wallet_id ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.tg_transactions_item_guard();


