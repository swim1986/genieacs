/**
 * Copyright 2013-2016  Zaid Abdulla
 *
 * GenieACS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * GenieACS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with GenieACS.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

const jobs = new Set();
const fileName = process.argv[2];
let script;

function errorToFault(err) {
  if (!err)
    return null;

  return {
    code: `ext.${err.name}`,
    message: err.message,
    detail: {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  }
}

process.on("uncaughtException", function(err) {
  let fault = errorToFault(err);
  jobs.forEach(function(jobId) {
    process.send([jobId, fault]);
  });
  jobs.clear();
  process.disconnect();
});

process.on("message", function(message) {
  jobs.add(message[0]);

  if (!script) {
    let cwd = process.env["GENIEACS_CONFIG_DIR"] + "/ext";
    process.chdir(cwd);
    script = require(`${cwd}/${fileName}`);
  }

  script[message[1][0]](message[1].slice(1), function(err, res) {
    if (!jobs.delete(message[0]))
      return;

    process.send([message[0], errorToFault(err), res]);
  });
});
