# Stage 3 disposable MySQL

The primary Stage 3 test database is available only through the `ai-blog-stage3-test` Compose project at `127.0.0.1:33307 -> 3306/tcp`. Its named volume, `ai_blog_stage3_disposable_mysql_data`, is disposable and belongs only to that project. It never mounts the Windows MySQL data directory or uses host networking.

Destructive migration fixtures use a separate disposable MySQL environment: the `ai-blog-stage3-fixtures` Compose project at `127.0.0.1:33310 -> 3306/tcp`, with its independent `ai_blog_stage3_fixture_mysql_data` volume. The two projects do not share database storage, credentials, or Compose resources.

Credentials are supplied from Git-ignored local configuration and must not be passed through arbitrary command-line overrides. Do not run `down --volumes` against any other Compose project.
