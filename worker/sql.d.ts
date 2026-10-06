// I file .sql vengono inclusi nel Worker come testo (regola in wrangler.toml)
declare module '*.sql' {
  const sql: string;
  export default sql;
}
