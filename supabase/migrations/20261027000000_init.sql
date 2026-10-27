-- João da Obra — schema inicial
-- Todas as tabelas ficam com RLS ligado e sem policies: só o service role (servidor) lê e escreve.


-- Conversas e mensagens ------------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  channel text not null default 'whatsapp' check (channel in ('web', 'whatsapp')),
  customer_name text,
  city text,
  cep text,
  lat double precision,
  lng double precision,
  status text not null default 'ativa' check (status in ('ativa', 'escalada')),
  failed_attempts int not null default 0,
  card_verify_failures int not null default 0,
  escalation_reason text,
  escalated_at timestamptz,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index conversations_last_message_idx on conversations (last_message_at desc);
create index conversations_status_idx on conversations (status);

create table messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  payload jsonb,
  tool_calls jsonb,
  intent text,
  wa_message_id text unique,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at desc);
create index messages_intent_idx on messages (intent) where intent is not null;

-- Lojas e feriados -----------------------------------------------------------

create table stores (
  id int generated always as identity primary key,
  slug text not null unique,
  name text not null,
  address text not null,
  neighborhood text,
  city text not null,
  cep text,
  lat double precision not null,
  lng double precision not null,
  whatsapp text[] not null default '{}',
  phone text,
  -- {"week": {"mon": [["08:00","19:00"]], ...}, "holiday": [...], "seasonal": [...]}; null = horário a confirmar
  hours jsonb,
  active boolean not null default true
);

create table holidays (
  date date not null,
  name text not null,
  scope text not null check (scope in ('nacional', 'estadual', 'municipal')),
  city text,
  primary key (date, name)
);

-- Catálogo de fallback e Dia T -------------------------------------------------

create table products (
  id int generated always as identity primary key,
  name text not null,
  category text not null,
  subcategory text,
  brand text,
  price numeric(10, 2) not null check (price > 0),
  link text not null,
  image_url text,
  keywords text[] not null default '{}',
  active boolean not null default true
);
create index products_category_idx on products (category);

create table ofertas_dia_t (
  id int generated always as identity primary key,
  product_name text not null,
  price numeric(10, 2) not null check (price > 0),
  normal_price numeric(10, 2),
  link text not null,
  image_url text,
  date date not null
);
create index ofertas_dia_t_date_idx on ofertas_dia_t (date);

-- Promoção 60 anos -----------------------------------------------------------

create table promo_rules (
  id int generated always as identity primary key,
  slug text not null unique,
  title text not null,
  content text not null,
  keywords text[] not null default '{}',
  sort_order int not null default 0
);

create table cupons (
  id bigint generated always as identity primary key,
  numero_sorte char(6) not null,
  cpf text not null,
  numero_nf text not null,
  valor_nf numeric(10, 2) not null,
  valor_dia_t numeric(10, 2) not null default 0,
  mes_sorteio char(7) not null, -- YYYY-MM
  conversation_id uuid references conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mes_sorteio, numero_sorte)
);
create index cupons_nf_idx on cupons (numero_nf);
create index cupons_cpf_idx on cupons (cpf);

-- Integrações simuladas ------------------------------------------------------

create table mock_orders (
  id int generated always as identity primary key,
  order_number text not null unique,
  cpf text not null,
  customer_name text not null,
  status text not null check (
    status in ('pagamento_aprovado', 'separando', 'saiu_para_entrega', 'entregue', 'retirada_disponivel', 'atrasado')
  ),
  delivery_type text not null check (delivery_type in ('entrega', 'retirada')),
  store_slug text,
  items jsonb not null default '[]',
  total numeric(10, 2) not null,
  timeline jsonb not null default '[]',
  eta date,
  created_at timestamptz not null default now()
);
create index mock_orders_cpf_idx on mock_orders (cpf);

create table mock_card_holders (
  id int generated always as identity primary key,
  cpf text not null unique,
  birth_date date not null,
  name text not null,
  last4 char(4) not null,
  limit_total numeric(10, 2) not null,
  limit_available numeric(10, 2) not null,
  invoice jsonb not null,
  open_debts jsonb not null default '[]',
  recent_purchases jsonb not null default '[]'
);

-- Cache de geocodificação (respeita a política de uso do Nominatim) -----------

create table geo_cache (
  key text primary key,
  value jsonb,
  created_at timestamptz not null default now()
);

-- RLS ------------------------------------------------------------------------

alter table conversations enable row level security;
alter table messages enable row level security;
alter table stores enable row level security;
alter table holidays enable row level security;
alter table products enable row level security;
alter table ofertas_dia_t enable row level security;
alter table promo_rules enable row level security;
alter table cupons enable row level security;
alter table mock_orders enable row level security;
alter table mock_card_holders enable row level security;
alter table geo_cache enable row level security;

-- Métricas do painel ---------------------------------------------------------

create view admin_metrics_intents with (security_invoker = true) as
  select intent, count(*)::int as total
  from messages
  where role = 'assistant' and intent is not null
  group by intent
  order by total desc;

create view admin_metrics_tools with (security_invoker = true) as
  select t ->> 'name' as tool, count(*)::int as total
  from messages, jsonb_array_elements(coalesce(tool_calls, '[]'::jsonb)) as t
  where role = 'assistant'
  group by 1
  order by total desc;
