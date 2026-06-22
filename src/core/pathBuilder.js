'use strict';

function buildMonthPath(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}/${year}-${month}`;
}

module.exports = { buildMonthPath };
