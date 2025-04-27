import { ChangeLog } from "./changelog";

const SQL_ALTER_TABLE_COMPANY_ADD_COLUMN_CAPITAL = `
  ALTER TABLE company ADD COLUMN reg_capital_value NUMERIC(17,2);
  ALTER TABLE company ADD COLUMN reg_capital_currency VARCHAR(255);
  ALTER TABLE company ADD COLUMN paidin_capital_value NUMERIC(17,2);
  ALTER TABLE company ADD COLUMN paidin_capital_currency VARCHAR(255);
  `;

export class ChangeLogV13 extends ChangeLog {
  getSqlList() {
    const sqlList = [SQL_ALTER_TABLE_COMPANY_ADD_COLUMN_CAPITAL];
    return sqlList;
  }
}
