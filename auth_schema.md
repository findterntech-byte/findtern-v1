## Auth & Admin Schema Design

### Tables

- **users**
  - Stores intern/user accounts created from `/signup`.
  - Key columns: `id`, `first_name`, `last_name`, `email (unique)`, `country_code`, `phone_number`, `password`, `agreed_to_terms`.

- **employers**
  - Stores employer/company accounts created from `/employer/signup`.
  - Key columns: `id`, `name`, `company_name`, `company_email (unique)`, `country_code`, `phone_number`, `password`, `agreed_to_terms`, `website_url`, `company_size`, `city`, `state`, `bank` and GST details, timestamps.

- **admins**
  - Stores admin accounts that can log in using `/admin/login`.
  - Key columns: `id`, `email (unique)`, `password`, `name`, `role`, `created_at`.

- **projects**
  - Stores projects created by employers (linked via `employer_id`).
  - Key columns: `id`, `employer_id`, `project_name`, `skills (jsonb)`, `scope_of_work`, `full_time_offer`, `location_type`, `status`, `created_at`.

### API Routes (Node + Express)

- **POST `/api/auth/signup`**
  - Body: validated with Zod using `insertUserSchema`.
  - Creates a new row in `users` via Drizzle ORM (Postgres).

- **POST `/api/auth/login`**
  - Body: `{ email, password }` (validated).
  - Verifies against `users` table and returns user (without password).

- **POST `/api/auth/employer/signup`**
  - Body: validated with `insertEmployerSchema`.
  - Creates a new employer row in `employers`.

- **POST `/api/admin/login`**
  - Body: `{ email, password }` (validated).
  - Verifies against `admins` table and returns admin (without password).

- **Admin CRUD**
  - `GET /api/admin/users` – list users.
  - `GET /api/admin/users/:id` – get single user.
  - `PUT /api/admin/users/:id` – update user.
  - `DELETE /api/admin/users/:id` – delete user.
  - `GET /api/admin/employers` – list employers.
  - `GET /api/admin/employers/:id` – get single employer.
  - `PUT /api/admin/employers/:id` – update employer.
  - `DELETE /api/admin/employers/:id` – delete employer.

All these endpoints use Postgres via Drizzle ORM (`server/storage.ts`) and the React frontend forms already validate input using `react-hook-form` + `zod` before sending data to these APIs.


