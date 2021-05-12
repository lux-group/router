const express = require("express");
const { copyFileSync, writeFileSync } = require("fs");
const generateServerTypes = require("openapi-typescript").default;

const generateTypes = (mount, path) => {
  const router = mount(express());
  const openApiSpec = router.toSwagger();
  if (process.env.DEBUG) console.log(JSON.stringify(openApiSpec, null, 2));

  const serverTypes = generateServerTypes(openApiSpec);
  if (process.env.DEBUG) console.log(serverTypes);
  writeFileSync(`${path}/server.ts`, serverTypes);

  copyFileSync(`${__dirname}/index.ts.source`, `${path}/index.ts`);
}

module.exports = generateTypes