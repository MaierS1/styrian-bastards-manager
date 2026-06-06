alter table public.documents
  drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_check
  check (
    category = any (
      array[
        'statuten'::text,
        'vollmacht'::text,
        'bescheid'::text,
        'vertrag'::text,
        'formular'::text,
        'sonstiges'::text,
        'vereinsdokumente'::text
      ]
    )
  );
