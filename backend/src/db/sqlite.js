/**
 * Wrapper de sql.js que imita la API de better-sqlite3 (síncrona).
 */
const fs = require('fs');

class SQLiteWrapper {
  constructor(sqlJs, filePath) {
    this.path = filePath;
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      this.db = new sqlJs.Database(buf);
    } else {
      this.db = new sqlJs.Database();
    }
    this.db.run('PRAGMA foreign_keys = ON');
  }

  pragma() {
    // no-op: configurado en constructor
  }

  // Ejecuta múltiples sentencias SQL (para esquema)
  exec(sql) {
    this.db.exec(sql);
    this._save();
  }

  prepare(sql) {
    const self = this;
    return {
      run(...args) {
        const params = args.length > 0 ? args : [];
        self.db.run(sql, params);
        // Leer el rowid ANTES de _save para evitar que otra op lo sobreescriba
        const res = self.db.exec('SELECT last_insert_rowid()');
        const rowid = res[0]?.values[0][0] ?? 0;
        self._save();
        return { lastInsertRowid: rowid, changes: 1 };
      },
      get(...args) {
        const stmt = self.db.prepare(sql);
        if (args.length > 0) stmt.bind(args);
        const hasRow = stmt.step();
        const row = hasRow ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
      },
      all(...args) {
        const stmt = self.db.prepare(sql);
        if (args.length > 0) stmt.bind(args);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      }
    };
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self.db.run('BEGIN');
      try {
        const result = fn(...args);
        self.db.run('COMMIT');
        self._save();
        return result;
      } catch (err) {
        self.db.run('ROLLBACK');
        throw err;
      }
    };
  }

  _save() {
    const data = this.db.export();
    fs.writeFileSync(this.path, Buffer.from(data));
  }
}

module.exports = SQLiteWrapper;
