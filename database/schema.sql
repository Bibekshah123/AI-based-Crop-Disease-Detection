create table if not exists users (
    id serial primary key,
    username text unique not null,
    email text unique not null,
    password text not null,
    created_at timestamp default now()
);

create table if not exists predictions (
    id uuid primary key default gen_random_uuid(),
    username text not null references users(username),
    timestamp timestamp default now(),
    disease text not null,
    disease_np text default '',
    confidence real not null,
    crop_type text default '',
    is_unknown boolean default false,
    not_leaf boolean default false,
    message text default '',
    cause text default '',
    cause_np text default '',
    symptoms text default '',
    symptoms_np text default '',
    treatment text default '',
    treatment_np text default '',
    prevention text default '',
    prevention_np text default '',
    top_5_predictions text default '[]',
    gradcam_image text default '',
    thumbnail text default ''
);

create index if not exists idx_predictions_username on predictions(username);
create index if not exists idx_predictions_timestamp on predictions(timestamp desc);
