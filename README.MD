ОТЧИСТКА БД:
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'touragency';"
psql -U postgres -c "DROP DATABASE IF EXISTS touragency;"

Запуск:
psql -U postgres -f db/init.sql
node fix-password.js
node server.js